# Change Staff Member's Role — Design

## Context

Role has been immutable after creation since the original design, enforced
at three independent layers: the backend's `PATCH /staff/:id` schema
doesn't accept a `role` field, `StaffRepository.update()`'s TypeScript
signature and SQL statement never reference the `role` column, and the
frontend's edit form has no control to change it once a role is picked.

The user's real need isn't tracking an in-game career move — it's
correcting a role picked wrong at creation time, caught shortly after. This
scopes the feature down considerably: no history of past roles, no
attempt to preserve any attribute data across the switch.

## Goals

- Let an existing staff member's role be changed after creation, via the
  edit form.
- When role changes, reset `attributes` to the new role's defaults —
  no attempt to carry over matching fields (explicit user decision).
- No confirmation prompt before the reset happens (explicit user
  decision) — Cancel is the existing escape hatch if the switch was a
  mistake.

## Non-goals

- No role-change history or audit trail.
- No partial/smart carryover of attributes between old and new role
  (e.g. keeping `determination` because both roles happen to have it).
- No redesign of the staff-creation flow's full-screen "Choose a role"
  button grid — this feature only adds a way to change role on an
  *existing* staff member via the edit form.

## Anti-goals

- Silently corrupting `attributes` on a role switch (stale keys from the
  old role lingering alongside the new role's keys) would defeat the
  point even if nothing crashes — the fix in this design (replace, not
  merge; see below) exists specifically to prevent this.

## Constraints

- Follow the project's existing validation pattern: role must still be
  validated against `STAFF_ROLES` via the Fastify schema's `enum`, the
  same way `POST /staff` already does it — not a hand-rolled check.
- `attributes` must always be validated against the role the record
  *will* have after the patch applies, not the role it had before.

## Design

### Backend: a real bug in `StaffRepository.update()`, found while scoping this

`StaffRepository.update()` currently does:

```ts
attributes: { ...existing.attributes, ...patch.attributes },
```

This is a shallow **merge**, not a replace. It's harmless today because
every caller (the frontend always submits a complete attributes object)
happens to send every key the merge would need anyway. It stops being
harmless the moment role can change: switching from Coach (`attacking`,
`defending`, ...) to Physio (`physiotherapy`, ...) would merge the old
role's keys into the new role's object, producing something that fails
`validateAttributes`'s exact-key-count check — or, if that check weren't
there, would silently carry dead keys forward forever.

**Fix:** change `update()` to replace `attributes` wholesale when
provided, not merge it:

```ts
attributes: patch.attributes ?? existing.attributes,
```

This is behavior-preserving for every existing caller (nothing today
sends a partial `attributes` patch) and is the only way a role switch can
produce a clean, correctly-shaped `attributes` object.

### Backend: `PATCH /staff/:id` accepts `role`, requires it alongside `attributes`

`backend/src/staffSchemas.ts`'s `updateStaffSchema` gains `role` as an
optional property, validated via `enum: STAFF_ROLES` (reusing the same
array `createStaffSchema` already validates against):

```ts
export const updateStaffSchema = {
  params: { /* unchanged */ },
  body: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1 },
      tags: { type: "array", items: { type: "string" } },
      role: { type: "string", enum: STAFF_ROLES },
      attributes: { type: "object" },
    },
    additionalProperties: false,
  },
};
```

In `backend/src/server.ts`'s PATCH handler, when `role` is present in the
body, `attributes` must be present too, and both are validated against
the **new** role — never the record's existing role:

```ts
app.patch("/staff/:id", { schema: updateStaffSchema }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const existing = repo.getById(Number(id));
  if (!existing) {
    return reply.code(404).send({ error: "Staff member not found" });
  }
  const body = request.body as Partial<{
    name: string;
    tags: string[];
    role: string;
    attributes: Record<string, unknown>;
  }>;

  if (body.role && !body.attributes) {
    return reply.code(400).send({ error: "attributes are required when changing role" });
  }

  const targetRole = (body.role ?? existing.role) as StaffRole;
  if (body.attributes && !validateAttributes(ROLES[targetRole].attributesSchema, body.attributes)) {
    return reply.code(400).send({ error: `attributes do not match the ${targetRole} role's required shape` });
  }

  const updated = repo.update(Number(id), body);
  return toResponse(updated!);
});
```

`StaffRepository.update()`'s patch type widens from
`Partial<Pick<StaffInput, "name" | "tags" | "attributes">>` to also allow
`role`, and its SQL `UPDATE` statement gains the `role` column.

The existing test `"rejects a role in the PATCH body with a 400 instead
of changing it"` (`backend/src/server.test.ts:495`) asserts the exact
behavior this feature reverses — it gets replaced with tests for the new
behavior (role changes successfully with matching attributes; role change
without attributes is rejected; role change with attributes shaped for
the *old* role is rejected).

### Frontend: a role dropdown in the form's Identity section

`frontend/src/components/StaffForm.tsx` gains a role `<select>` in the
existing "Identity" section (alongside Name and Tags), visible whenever
`selectedRole` is set — which covers both editing an existing staff
member and having already picked a role while creating a new one.
Changing it calls the same `handleSelectRole(role)` already used by the
initial role-picker buttons, which already does exactly what's wanted:
sets `attributes` to `ROLES[role].defaultAttributes`, clears
`nationKnowledge`, clears `warnings`. No new state or reset logic is
needed — this is new UI wired to an existing handler.

```tsx
<label className={styles.field}>
  Role
  <select aria-label="Role" value={selectedRole} onChange={(e) => handleSelectRole(e.target.value as StaffRole)}>
    {STAFF_ROLES.map((role) => (
      <option key={role} value={role}>
        {ROLES[role].label}
      </option>
    ))}
  </select>
</label>
```

No confirmation dialog — switching the dropdown resets attributes
immediately, same as picking a role for the first time. Cancel discards
the whole in-progress edit, including an accidental role switch, same as
it does for every other field today.

The dialog's title is currently bound to `initialValue.role` in the edit
branch, not `selectedRole` — so once the dropdown lets role change mid-edit,
the header would keep showing the *original* role even after switching
(e.g. "Edit coach" while every attribute field below now shows Physio's
defaults). Fix: bind the edit-branch title to `selectedRole` instead of
`initialValue.role`, matching how the create-branch title already tracks
`selectedRole`.

### Frontend: `App.tsx` currently strips `role` before every edit PATCH

The actual reason role has never reached the backend on an edit isn't
`StaffForm` — its `handleSubmit` already includes `role` in every
`onSubmit` payload. It's `App.tsx`'s edit submit handler:

```tsx
async function handleSubmit(input: StaffInput) {
  if (editing) {
    const { role: _role, ...patch } = input;   // strips role before PATCHing
    await updateStaff(editing.id, patch);
  } else {
    await createStaff(input);
  }
  ...
```

This destructure exists because the old schema rejected `role` outright.
With the schema now accepting it, this needs to stop stripping it — send
`role` unconditionally on every edit PATCH, the same way `name`, `tags`,
and `attributes` are already sent unconditionally today (StaffForm always
submits a complete object, never a true partial patch, so there's no
reason to special-case `role` differently from its neighboring fields).

### Testing

- Backend: `StaffRepository` test for `update()` replacing (not merging)
  `attributes`, including a role-switch case where the old role's keys
  must not survive in the result. Endpoint tests replacing the removed
  "rejects a role in the PATCH body" test: role change succeeds when
  `attributes` matches the new role's shape; role change without
  `attributes` is rejected; role change with `attributes` shaped for the
  old role is rejected; a non-role patch (name/tags only) still works
  unchanged.
- Frontend: `StaffForm` test that changing the role dropdown while
  editing resets the attribute fields shown to the new role's defaults
  (reusing the same assertions the existing "picking a role shows its
  default attributes" tests already make, applied to the dropdown instead
  of the initial picker buttons); a test that the edit-branch title
  updates when the dropdown changes role. `App.tsx` test confirming
  `updateStaff` is called with the new `role` included after an edit
  where the role was changed.

## What's left to the builder

- Exact wording of the 400 error messages (the design shows reasonable
  defaults above; match the existing terse style of this codebase's other
  error messages).
- Whether the role `<select>`'s options render in `STAFF_ROLES` order
  (matching the creation picker's order) — yes, for consistency; no other
  ordering was discussed or needed.
