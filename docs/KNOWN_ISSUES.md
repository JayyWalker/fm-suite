# Known Issues

A running log of known bugs, gaps, and deferred items across the project.
Newest entries go on top. Each entry stays until it's actually fixed.

For a code-related entry, the relevant file should carry a short comment
pointing here — this doc is where the full reasoning and fix direction live,
not duplicated inline in code or in feature specs.

---

## OCR name import: fails safe to blank on a few real screenshot layouts

**Where:** `backend/src/ocr/parseName.ts`
**Since:** 2026-10-20 (screenshot/OCR input feature)
**Status:** open, by design (fails safe rather than guessing)

`parseName` finds the staff member's name by scanning for FM26's header
line shape, "`<Name> <id-marker>: <digits>)`" (the id-marker is OCR noise
like "qo:", "(o:", "ap:" that varies by capture, so it's identified by
position — the word right before the colon — not matched literally).
Checked against all 11 real screenshots in `sample-screenshots/`, 3 come
back with `name: null` instead of the real name:

- Two screenshots' name lines simply don't OCR at all (no colon+digits
  line anywhere in the output).
- One (`hoyd-edorta-murua-coaching.png`) has a stray noise line ("Ula (D:
  812003") that matches the id-marker shape *above* the real name line,
  which has no colon in that capture. `parseName` rejects any match that
  resolves to a single word (real names are always 2+ words), so this one
  correctly falls back to `null` rather than importing "Ula" — but that
  means the real name isn't recovered either.

**Fix:** no code fix planned — a blank name the user fills in by hand is
the correct fallback for a layout this heuristic can't parse; the
alternative (guessing) risks a confidently wrong import with no warning,
which is worse. If a future capture reveals a name-bearing line with a
different, reliable shape, extend `parseName` to also try it.

## OCR screenshot import: Technical Director can get the wrong value

**Where:** `backend/src/ocr/parseAttributes.ts`
**Since:** 2026-10-15 (screenshot/OCR input feature)
**Status:** open, fix verified but not applied

Uploading a real FM26 screenshot for the Technical Director role can
silently import the wrong value for `judgingStaffAbility`. The parser
resolves each label on its *first* matching OCR line, but "Judging Player
Ability" and "Judging Staff Ability" are close enough (edit-distance 5) to
collide, and FM26 always renders JPA first on screen — so Technical
Director's score picks up JPA's value instead, at high confidence, with no
warning shown. Confirmed on two real screenshots (6 instead of 2, 4 instead
of 3).

**Fix:** prefer the lowest-distance label match per OCR line instead of
first-seen-wins. Requires surfacing the match distance from
`extractLinePairs` (currently discarded).

## OCR nation-knowledge import: some unreadable nations drop silently

**Where:** `backend/src/ocr/parseNationKnowledge.ts`
**Since:** 2026-10-15 (screenshot/OCR input feature)
**Status:** open, low likelihood

`unmatched` is only populated when a knowledge-tier-only word (`None`,
`Minimal`, `Extensive`, `Exceptional`, `Complete`) appears with no plausible
nation before it — deliberately narrowed, since `Good`/`Very Good` also
appear on the unrelated 8-word ability scale and would otherwise cause false
positives from nearby attribute rows. Side effect: a nation whose name OCRs
badly *and* whose tier happens to be `Good` or `Very Good` is dropped with
no warning at all, instead of surfacing in `unmatched`.

**Fix:** anchor on the "Scouting Knowledge" panel header, then report
orphaned tier words regardless of which word anchored them, once panel
context is established.

## OCR label coverage: most roles have never been checked against a real screenshot

**Where:** `backend/src/ocr/attributeLabels.ts`
**Since:** 2026-10-20 (found while investigating a user report)
**Status:** open, caution

Found by running `parseAttributes` directly against real captured OCR output
(`realScreenshotFixtures.ts`): `sportsScientist`/`headOfSportsScience`'s
label for their `fitness` field said `"Fitness"`, but FM26 actually prints
**"Sports Science"** on screen — so the role's own signature attribute was
*always* unmatched, silently, no matter how clean the OCR read. Fixed (the
label now says `"Sports Science"`), but the way it was found matters: this
app's internal field names and FM26's on-screen labels were simply assumed
to match when each role was built, and nothing ever checked that assumption
against a real screenshot except the two roles (`physio`/`sportsScientist`
on the Medical tab, `scout`/`technicalDirector`/`coach` on the Scouting tab)
covered by the two fixtures in `realScreenshotFixtures.ts`. The other 10
roles' labels have never been verified this way — any of them could have
the same kind of silent mismatch.

**Fix:** no code fix — this is a coverage gap. Checking a role's labels
against a real screenshot (ask for one, or reuse an existing fixture if the
role appears on the Medical or Scouting tab) is the only way to catch this
class of bug; the existing synthetic tests can't, since they're written
from the same label strings being tested.

## OCR label mismatch: "Man Management" vs FM26's "People Management"

**Where:** `backend/src/ocr/attributeLabels.ts`
**Since:** 2026-10-15 (screenshot/OCR input feature)
**Status:** open, currently works by coincidence

FM26 actually renders this attribute as "People Management"; the label map
says "Man Management". It currently matches anyway because the trailing
token "Management" alone sits exactly at the fuzzy-match distance threshold
— but any further OCR error on that word breaks the match (fails safe into
`unmatched`, never a wrong value, just a missed one).

**Fix:** one-line label string correction, once confirmed against more real
screenshots.

## OCR parsing: minor same-root-cause gaps

**Where:** `backend/src/ocr/parseAttributes.ts`, `parseNationKnowledge.ts`
**Since:** 2026-10-15 (screenshot/OCR input feature)
**Status:** open, minor

- A low-confidence *first* reading of a label can permanently block a later,
  higher-confidence reading of the same label from ever superseding it (the
  field still ends up filled, correctly flagged as low-confidence, just with
  the worse of the two readings rather than the better one).
- `parseNationKnowledge` doesn't dedupe repeated OCR reads of the same
  nation within a single parse (the frontend's merge step already handles
  duplicates *across* separate uploads, just not within one).
