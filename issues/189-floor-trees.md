---
id: "189"
title: "Plant pots, stage E: small trees in the floor nook"
short: "Floor trees"
status: todo
owner: marc + claude
depends_on: ["172", "182"]
summary: "A floor slot in the shut-in square next to the sofa, lamp and record stand, for small trees."
kind: build
changelog: "Small trees can stand in the nook next to the sofa, the lamp and the record stand."
---

## Goal
Stage E of `docs/plant-pots-design.md` (issue 179, section 7), with Marc's answers (d2: trees on the floor later; d8: 16x16 small trees in the shut-in square, with a swap task on the record stand): the only unreachable floor tile is col 8, row 7, abs (128, 112), shut in by the lamp table, the record stand and two walls (reachable standing spots col 9 row 6 and col 10 row 7). A slot `tree-floor` (kind plant, `plantKind: "tree"`, 16x16, empty by default so a fresh game is unchanged) with a prop on that tile, a swap task offered on the record stand piece (the record stand now has its own 'Change record stand' task: check the choice cycle and the zones, and the task spots) or the lamp table, whichever the design and the map allow, and three small trees as still items (a potted palm, a rubber plant, a fiddle-leaf fig), the crown staying inside the tile (a tall 16x32 tree was rejected: it would cover the lamp).

## Acceptance criteria
- The slot, prop, task and the three trees (sprites palette only, no text, deadpan notes, `from: A PACKAGE`); draw order against the lamp table, the record stand and the player; the tile stays unreachable and solid as before; tests; New items join the random-encounter item pool (issue 163) by their kind, are placed in the ladder (`src/game/encounter-ladder.ts`: the test fails until they are) with a difficulty tier you suggest (easy, normal or hard), and have NO milestone gift days (Marc wants to space arrivals separately; the pool and ladder of issue 183 give the pacing).
- Look at all art and the result in the running game yourself (dev server with `?own=` ids; see docs/decor.md) at 1x and 8x on desktop and phone size and say what you saw; the reviewer must too; give Marc exact commands with absolute `~/...` paths.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean; golden frames for a fresh game unchanged unless the issue says which change; new strings into docs/text-review.md; docs/decor.md 'What issue NNN built' (use this issue's number); a `changelog:` line (at most 140 characters) stays.

## Progress log
- 2026-11-25 (planner): filed on main from the merged designs; not started (Marc asked to file the remaining build issues without starting them).
