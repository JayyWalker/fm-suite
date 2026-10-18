# Change Staff Member's Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an existing staff member's role be changed via the edit form, resetting `attributes` to the new role's defaults with no carryover.

**Architecture:** Reverse role-immutability at its three enforcement points in dependency order — the repository's patch handling (including a latent merge-vs-replace bug the role switch would otherwise expose), the backend's PATCH schema and validation, then the two frontend layers that currently prevent `role` from ever reaching the backend (`App.tsx`'s explicit strip, and `StaffForm`'s missing UI control).

**Tech Stack:** TypeScript, Fastify, better-sqlite3, Vitest (backend); React, Vite, Vitest (frontend) — unchanged, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-18-change-staff-role-design.md`

## Global Constraints

- Role is validated via the Fastify schema's `enum: STAFF_ROLES` — never a hand-rolled check (same pattern `createStaffSchema` already uses).
- `attributes` is always validated against the role the record *will* have after the patch applies, never the role it had before.
- No confirmation prompt before a role switch resets attributes (explicit user decision) — Cancel remains the only undo.
- No partial/smart carryover of attributes between old and new role — a role switch always resets to the new role's defaults, full stop.

## Review Focus

- **Stale ratings after a role switch.** The spec implies but no task's tests directly pin: after a PATCH changes role, the response's `categories`/`bestFit` must reflect the *new* role's scoring, not leftover shape from the old one. Pinned in Task 2.
- **Scout's `nationKnowledge` array surviving a role switch in either direction.** Scout is the one role whose attributes include a structurally different field (an array, not a number) — switching away from Scout must not leave `nationKnowledge` dangling in the submitted attributes, and switching into Scout must start it empty. Pinned in Task 4.
- **Attributes shaped for the old role must be rejected on a role-changing PATCH**, not silently accepted with a mismatched shape — the spec's central anti-goal. Pinned in Task 2.
- **The dialog title must track the currently-selected role, not the role the form opened with**, once role can change mid-edit — a stale title ("Edit coach" while every field below shows Physio's defaults) would visibly contradict the form. Pinned in Task 4.
- **The 14 existing `App.test.tsx` assertions that currently assert `role` is *absent* from the PATCH payload** are exactly backwards for the new behavior — if left stale they'd mask the real fix (`App.tsx` no longer stripping `role`) not actually being exercised. Pinned in Task 3.

---

### Task 1: Backend — `StaffRepository.update()` replaces attributes and accepts role

**Files:**
- Modify: `backend/src/staffRepository.ts`
- Test: `backend/src/staffRepository.test.ts`

**Interfaces:**
- Produces: `StaffRepository.update(id: number, patch: Partial<Pick<StaffInput, "name" | "tags" | "role" | "attributes">>): StaffRecord | undefined` — `role` is now an accepted patch field; when `attributes` is provided it fully replaces the existing value (no merge); when omitted, the existing `attributes`/`role` are kept unchanged. Consumed by Task 2's PATCH handler.

- [ ] **Step 1: Write the failing tests**

In `backend/src/staffRepository.test.ts`, rename the existing `"update merges a partial patch into the existing record without changing its role"` test to `"update keeps the existing role and attributes when the patch omits them"` (its body and assertions are unchanged — this test already only exercises the omitted-fields case, the name was just inaccurate once "merge" stops being what happens). Then add one new test directly below it:

```ts
test("update can change role and attributes together, with no keys left over from the old role", () => {
  const created = repo.create({ name: "Coach F", role: "coach", tags: [], attributes: coachAttributes() });
  const physioAttributes = { physiotherapy: 5, determination: 4, adaptability: 4, manManagement: 4 };

  const updated = repo.update(created.id, { role: "physio", attributes: physioAttributes });

  expect(updated?.role).toBe("physio");
  expect(updated?.attributes).toEqual(physioAttributes);
  expect(Object.keys(updated!.attributes)).not.toContain("attacking");
});
```

This single test proves both halves of the fix at once: `updated?.role` only becomes `"physio"` once the `UPDATE` statement writes the `role` column, and `Object.keys(...).not.toContain("attacking")` only holds once `attributes` is replaced rather than merged — the current merge (`{ ...existing.attributes, ...patch.attributes }`) would combine Coach's `attacking` key with Physio's `physiotherapy` key into one object, so this assertion is a genuine proof of replace-not-merge, unlike a same-role patch (where every key already overlaps and merge and replace produce identical results).

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- staffRepository` (from `backend/`)

Expected: the renamed test passes unchanged (it never touches `role` or exercises the merge path). The new test fails on `expect(updated?.role).toBe("physio")` — the repository's current SQL `UPDATE` never writes the `role` column, so `updated?.role` is still `"coach"`.

- [ ] **Step 3: Implement the fix in `backend/src/staffRepository.ts`**

Widen the `update()` patch parameter type to include `role`:

```ts
update(id: number, patch: Partial<Pick<StaffInput, "name" | "tags" | "role" | "attributes">>): StaffRecord | undefined {
```

Change the merge to a replace-when-provided:

```ts
const merged = {
  name: patch.name ?? existing.name,
  role: patch.role ?? existing.role,
  tags: patch.tags ?? existing.tags,
  attributes: patch.attributes ?? existing.attributes,
};
```

Add `role` to the SQL `UPDATE` statement and its bound parameters:

```ts
this.db
  .prepare(
    `UPDATE staff SET name = @name, role = @role, tags = @tags, attributes = @attributes, updated_at = @updatedAt
     WHERE id = @id`
  )
  .run({
    id,
    name: merged.name,
    role: merged.role,
    tags: JSON.stringify(merged.tags),
    attributes: JSON.stringify(merged.attributes),
    updatedAt: now,
  });
```

(The `staff` table already has a `role TEXT NOT NULL` column per `backend/src/db.ts` — this is the first `UPDATE` statement to reference it, no migration needed.)

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npm test -- staffRepository` (from `backend/`)

Expected: all tests in the file pass, including the new one and the renamed one.

- [ ] **Step 5: Run the full backend suite and typecheck**

Run: `npm test && npm run typecheck` (from `backend/`)

Expected: all green — this task doesn't change any other file's required shape yet (Task 2 updates the callers).

- [ ] **Step 6: Commit**

```bash
git add backend/src/staffRepository.ts backend/src/staffRepository.test.ts
git commit -m "Make StaffRepository.update() replace attributes and accept role changes"
```

---

### Task 2: Backend — `PATCH /staff/:id` accepts and validates role changes

**Files:**
- Modify: `backend/src/staffSchemas.ts`
- Modify: `backend/src/server.ts`
- Test: `backend/src/server.test.ts`

**Interfaces:**
- Consumes: `StaffRepository.update()`'s widened patch type (Task 1).
- Produces: `PATCH /staff/:id` now accepts an optional `role` field in its body; when present, `attributes` must also be present and must validate against the new role; `toResponse()` (unchanged) recomputes `categories`/`bestFit` from whatever role/attributes `repo.update()` returns, so a role-switch response reflects the new role automatically — pin this with a test, don't just rely on it following from the existing code path.

- [ ] **Step 1: Write the failing tests**

In `backend/src/server.test.ts`, replace the `"rejects a role in the PATCH body with a 400 instead of changing it"` test (around line 495) with:

```ts
test("changes role and attributes together when attributes match the new role's shape", async () => {
  const created = await app.inject({
    method: "POST",
    url: "/staff",
    payload: { name: "Switchable", role: "coach", attributes: coachAttributes() },
  });
  const id = created.json().id;

  const res = await app.inject({
    method: "PATCH",
    url: `/staff/${id}`,
    payload: { role: "physio", attributes: physioAttributes() },
  });

  expect(res.statusCode).toBe(200);
  expect(res.json().role).toBe("physio");
  expect(res.json().attributes).toEqual(physioAttributes());
});

test("reflects the new role's categories immediately after a role-switch PATCH", async () => {
  const created = await app.inject({
    method: "POST",
    url: "/staff",
    payload: { name: "Rescored", role: "coach", attributes: coachAttributes() },
  });
  const id = created.json().id;

  const res = await app.inject({
    method: "PATCH",
    url: `/staff/${id}`,
    payload: { role: "physio", attributes: physioAttributes() },
  });

  expect(res.statusCode).toBe(200);
  expect(Object.keys(res.json().categories)).toEqual(["Physiotherapy"]);
  expect(res.json().categories.Attacking).toBeUndefined();
});

test("rejects a role change with no attributes in the same PATCH", async () => {
  const created = await app.inject({
    method: "POST",
    url: "/staff",
    payload: { name: "No Attrs", role: "coach", attributes: coachAttributes() },
  });
  const id = created.json().id;

  const res = await app.inject({ method: "PATCH", url: `/staff/${id}`, payload: { role: "physio" } });

  expect(res.statusCode).toBe(400);
  expect((await app.inject({ method: "GET", url: `/staff/${id}` })).json().role).toBe("coach");
});

test("rejects a role change whose attributes are shaped for the old role, not the new one", async () => {
  const created = await app.inject({
    method: "POST",
    url: "/staff",
    payload: { name: "Mismatched Switch", role: "coach", attributes: coachAttributes() },
  });
  const id = created.json().id;

  const res = await app.inject({
    method: "PATCH",
    url: `/staff/${id}`,
    payload: { role: "physio", attributes: coachAttributes() },
  });

  expect(res.statusCode).toBe(400);
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npm test -- server` (from `backend/`)

Expected: the first two tests fail — they expect 200, but the schema's `additionalProperties: false` currently rejects any body containing `role` at all, returning 400. The third and fourth tests ("rejects a role change with no attributes" and "...attributes shaped for the old role") already pass today, for the wrong reason: the same blanket schema rejection already returns 400 for any `role`-bearing body, coincidentally matching what those two tests expect. This is expected, not a problem — the schema change in Step 3 removes that blanket rejection, so Steps 3-4 must preserve both outcomes deliberately (via the new `body.role && !body.attributes` guard and the existing shape check) rather than inheriting them for free. Confirm after Step 4 that all 4 tests pass for the right reason, not just that they still pass.

- [ ] **Step 3: Update `backend/src/staffSchemas.ts`**

Add `role` to `updateStaffSchema`'s body properties:

```ts
export const updateStaffSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", pattern: "^[0-9]+$" } },
  },
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

- [ ] **Step 4: Update the PATCH handler in `backend/src/server.ts`**

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

  const updated = repo.update(Number(id), body as Partial<Pick<StaffInput, "name" | "tags" | "role" | "attributes">>);
  return toResponse(updated!);
});
```

Change the existing import line
`import { StaffRepository, type StaffRecord } from "./staffRepository";`
to
`import { StaffRepository, type StaffRecord, type StaffInput } from "./staffRepository";`

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `npm test -- server` (from `backend/`)

Expected: all tests in the file pass, including the 4 new ones.

- [ ] **Step 6: Run the full backend suite and typecheck**

Run: `npm test && npm run typecheck` (from `backend/`)

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add backend/src/staffSchemas.ts backend/src/server.ts backend/src/server.test.ts
git commit -m "Let PATCH /staff/:id change role when attributes match the new shape"
```

---

### Task 3: Frontend — `App.tsx` stops stripping `role` from edit PATCHes

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

**Interfaces:**
- Produces: `handleSubmit` now sends the full `StaffInput` (including `role`) on every edit PATCH, not a `role`-stripped copy. Nothing later depends on this beyond the behavior itself — Task 4 adds the UI that lets `role` actually differ from the original.

This task does not yet let a user change role through the UI (that's Task 4) — it only stops the frontend from silently discarding `role` on every edit, so the existing roundtrip (role unchanged, resubmitted as-is) now actually includes it.

- [ ] **Step 1: Write the failing tests**

In `frontend/src/App.test.tsx`, there are 14 existing assertions of the shape `expect(staffApi.updateStaff).toHaveBeenCalledWith(<member>.id, { name: ..., tags: ..., attributes: ... })` — each missing a `role` key, because that's what the code being changed currently produces. Update each to include `role: <member>.role` as the first property. The 13 tests named `"editing a <Role> and saving sends its own attributes without a role key"` (lines 122, 149, 176, 203, 237, 264, 291, 318, 345, 372, 399, 426, 453) and the 1 test `"saving after switching the edit target updates the newly selected coach, not the previous one"` (line ~503). Rename each of the 13 `"...without a role key"` tests to `"...and includes its role"` (drop the `without a role key` framing since it now does the opposite).

Example (apply the same shape to all 14 — each uses its own fixture variable already in scope):

```ts
test("editing a physio and saving sends its own attributes and includes its role", async () => {
  // ...unchanged setup above this point...
  expect(staffApi.updateStaff).toHaveBeenCalledWith(physio.id, {
    role: physio.role,
    name: physio.name,
    tags: physio.tags,
    attributes: physio.attributes,
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npm test -- App` (from `frontend/`)

Expected: all 14 updated assertions fail — the current `handleSubmit` still strips `role` via `const { role: _role, ...patch } = input`, so the actual call omits `role` while the test now expects it.

- [ ] **Step 3: Update `handleSubmit` in `frontend/src/App.tsx`**

```ts
async function handleSubmit(input: StaffInput) {
  try {
    if (editing) {
      await updateStaff(editing.id, input);
    } else {
      await createStaff(input);
    }
    setShowForm(false);
    setEditing(null);
    setError(null);
    await refresh();
  } catch (err) {
    setError(errorMessage(err));
  }
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npm test -- App` (from `frontend/`)

Expected: all tests in the file pass, including the 14 updated ones.

- [ ] **Step 5: Run the full frontend suite and typecheck**

Run: `npm test && npm run typecheck` (from `frontend/`)

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.tsx frontend/src/App.test.tsx
git commit -m "Stop stripping role from edit PATCH requests"
```

---

### Task 4: Frontend — role dropdown in `StaffForm`, title fix, stale-test cleanup

**Files:**
- Modify: `frontend/src/components/StaffForm.tsx`
- Modify: `frontend/src/components/StaffForm.test.tsx`
- Modify: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `handleSelectRole(role: StaffRole)` (already defined in `StaffForm.tsx`, unchanged — sets `attributes` to `ROLES[role].defaultAttributes`, clears `nationKnowledge`, clears `warnings`). `App.tsx` no longer stripping `role` (Task 3), so the end-to-end test in this task can assert on the real PATCH payload.
- Produces: a visible, working role switch in the edit form. No new exported interfaces — this is the last task.

- [ ] **Step 1: Remove the now-false test in `StaffForm.test.tsx`**

Delete the test `"choosing a role replaces the picker, so the role cannot be switched in place"` (around line 303) and its comment block — its entire premise (role cannot be switched once chosen, documented as a reason a "switch and back" test can't exist) is what this task reverses. The steps below add real switching tests in its place.

- [ ] **Step 2: Write the failing tests**

In `frontend/src/components/StaffForm.test.tsx`, add:

```ts
test("shows a role dropdown once a role is selected, defaulting to the chosen role", () => {
  render(<StaffForm onSubmit={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Coach" }));

  expect(screen.getByLabelText("Role")).toHaveValue("coach");
});

test("switching the role dropdown resets attribute fields to the new role's defaults", () => {
  render(<StaffForm initialValue={coachInitialValue} onSubmit={vi.fn()} />);
  expect(screen.getByLabelText("Attacking")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "physio" } });

  expect(screen.queryByLabelText("Attacking")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Physiotherapy")).toHaveValue("4");
});

test("switching the role dropdown updates the dialog title", () => {
  render(<StaffForm initialValue={coachInitialValue} onSubmit={vi.fn()} />);
  expect(screen.getByText("Edit coach")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "physio" } });

  expect(screen.getByText("Edit physio")).toBeInTheDocument();
});

test("switching away from scout via the dropdown clears nationKnowledge from what gets submitted", () => {
  const onSubmit = vi.fn();
  render(<StaffForm initialValue={scoutInitialValue} onSubmit={onSubmit} />);

  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "physio" } });
  fireEvent.click(screen.getByText("Save"));

  const submitted = onSubmit.mock.calls[0][0];
  expect(submitted.attributes.nationKnowledge).toBeUndefined();
});

test("switching into scout via the dropdown starts nationKnowledge empty", () => {
  render(<StaffForm initialValue={coachInitialValue} onSubmit={vi.fn()} />);

  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "scout" } });

  expect(screen.queryByLabelText("Nation 1")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add nation" })).toBeInTheDocument();
});
```

In `frontend/src/App.test.tsx`, add one end-to-end test confirming the full round trip through `App` now works (place it near the other `"editing a ..."` tests):

```ts
test("switching a coach to physio via the role dropdown and saving sends the new role with reset attributes", async () => {
  const coach = member({ id: 7, name: "Switch Me", role: "coach" });
  const afterSwitch = member({ id: 7, name: "Switch Me", role: "physio" });
  vi.mocked(staffApi.listStaff).mockResolvedValue([coach]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(afterSwitch);

  render(<App />);
  await screen.findByText("Switch Me");

  fireEvent.click(rowFor("Switch Me"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "physio" } });
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  const [, patch] = vi.mocked(staffApi.updateStaff).mock.calls[0];
  expect(patch.role).toBe("physio");
  expect(patch.attributes).toEqual(expect.objectContaining({ physiotherapy: 4 }));
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `npm test -- StaffForm App` (from `frontend/`)

Expected: all new tests fail — every one of them calls `screen.getByLabelText("Role")`, which doesn't exist yet, so each fails at that line (not yet reaching whatever it's really testing — attribute reset, title update, or `nationKnowledge` handling). That's expected: Step 4 adds the control these tests all depend on; Step 5 (the title fix) only becomes independently verifiable once it does.

- [ ] **Step 4: Add the role dropdown to `frontend/src/components/StaffForm.tsx`**

In the "Identity" section, after the Tags field:

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

- [ ] **Step 5: Fix the title binding**

Change the `title` computation's edit branch from `initialValue.role` to `selectedRole`:

```ts
const title = initialValue
  ? `Edit ${ROLES[selectedRole!].label.toLowerCase()}`
  : selectedRole
    ? `Add ${ROLES[selectedRole].label.toLowerCase()}`
    : "Add staff";
```

(`selectedRole` is non-null whenever `initialValue` is set, since it's initialized from `initialValue?.role` and `initialValue` always carries a role — the `!` is safe here the same way the existing code already treats `initialValue.role` as always-present.)

- [ ] **Step 6: Run the tests to confirm they pass**

Run: `npm test -- StaffForm App` (from `frontend/`)

Expected: all tests pass, including the 5 new `StaffForm` tests and the 1 new `App` test.

- [ ] **Step 7: Run the full frontend suite and typecheck**

Run: `npm test && npm run typecheck` (from `frontend/`)

Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/StaffForm.tsx frontend/src/components/StaffForm.test.tsx frontend/src/App.test.tsx
git commit -m "Add a role dropdown to the edit form, wired to the existing role-switch handler"
```

---

### Task 5: Full-branch verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full backend suite**

Run: `npm test && npm run typecheck` (from `backend/`)

Expected: all green.

- [ ] **Step 2: Run the full frontend suite**

Run: `npm test && npm run typecheck` (from `frontend/`)

Expected: all green.

- [ ] **Step 3: Manually exercise the feature end-to-end**

Start both servers, create a Coach, edit them, switch the role dropdown to Physio, confirm the attribute fields change to Physio's defaults and the title updates, save, and confirm the roster shows them as a Physio with freshly-defaulted attributes. This is a manual smoke test, not an automated step — note the outcome in the final report.

- [ ] **Step 4: Confirm no stray diffs**

Run: `git status` (from repo root)

Expected: only the files this plan names are modified.
