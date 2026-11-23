---
id: "148"
title: "Decor expansion: design note"
short: "Decor expansion design"
status: review
owner: claude
depends_on: []
summary: "A design note for ten decor ideas: where each goes, what it costs, and the order to build them."
kind: design
unverified:
  - "How the ideas look and feel in the game is unchecked: nothing is built; the Ñ accent in a 9 px swap-list row and a 64x32 rug in the THINGS grid cell were reasoned from the code, not rendered."
  - "Pixel positions come from my own render of the map and sprites and from reading the sprite files; the reviewer re-checks them."
needs: [{who: marc, kind: decide, why: "Confirm the ten decor ideas, the build order and the questions at the end of docs/decor-expansion-design.md", since: 2026-11-23}]
---

## Goal
Marc (2026-11-23) wants many more decor options. Write `docs/decor-expansion-design.md`: for each of ten ideas (an empty pot, live cut flowers, trinkets, instruments, clothes, coffee apparatus, a rug, replacement furniture, a second plant slot, takeout) say where it shows up (checked against the real maps and sprites), what the engine needs, the art needed, the quiet-collecting risks, a size and any open question with a recommended default. Then a build order, a table of the new slots and a short question list for Marc. No code and no art. The plants and dried arrangements themselves are issue 147 and are not designed here.

## Acceptance criteria
- Every idea has its own section answering the questions above, with pixel positions and sizes that match `apartment.ts` and the sprites in `art/src`, and engine claims that match `src/game`.
- A recommended order of build issues with sizes and dependencies, a table of all new slots, and a list of questions for Marc with recommended defaults.
- `docs/decor.md` has a one-line pointer to the note; nothing else outside this issue file and the new doc is edited.
- `npm run issues:check -- --validate` passes; an independent review with a written entry.

## Progress log
- 2026-11-23 (claude): plan: read decor.md, the inventory, art and floor notes, the engine (decor-data, decor, deliveries, apartment, tasks, game draw order) and the room sprites; render the main room from the real map and sprites to check positions; write docs/decor-expansion-design.md and a one-line pointer in docs/decor.md. reference-photos/ is not read or described.
- 2026-11-23 (claude): written. Files: docs/decor-expansion-design.md (new), docs/decor.md (one pointer line at the top), this issue file. Ten sections, shared engine pieces P1 to P8, a slot table, an ordered build plan (A to P) and 12 questions with recommended defaults. Checked by a render of the main room composed from the real map and sprites (outside the repo), and by reading decor-data.ts, decor.ts, deliveries.ts, tasks.ts, apartment.ts, poses.ts, game.ts (draw order), outfits.ts and the sprite files. `npm run issues:check -- --validate` passes (181 files valid, warnings are on other issues). Not checked: anything about how it plays (nothing is built). reference-photos/ was not read or described.
