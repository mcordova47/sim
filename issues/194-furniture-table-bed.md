---
id: "194"
title: "Furniture: replacements for the dining table and the bed"
short: "Table and bed"
status: todo
owner: marc + claude
depends_on: ["193", "192"]
summary: "Replacement dining tables and beds, with their several looks, as items."
kind: build
changelog: "New dining tables and beds can turn up and replace the old ones."
---

## Goal
The last pieces of step N of `docs/decor-expansion-design.md` (section 8): the dining table (64x32 at (16, 16): keep the coffee slot of issue 168 (the apparatus on top), the mug prop and the plate variant, the eating pose at local x 24-39: TWO sprites per design, `table` and `table-plate`) and the queen bed (80x96 at (192, 32): the made and unmade looks and the sleep poses, which are full 80x96 pictures including the bed (`player-sleep-bed`, `player-sleep-bed-unmade`, drawn over the bed at 0,0): FOUR big sprites per design). They need the item looks by state of issue 193. Furniture arrives through the delivery pipe and the item pool, one piece at a time, never a reward.

## Acceptance criteria
- Per piece: a furniture slot (as issue 192) with the current piece as the default, candidates on the options page first and an open decision for Marc to pick, the looks per state (193), the sleep poses and the typing/eating poses still correct with each design (say how the pose pictures are produced for another bed: the sleep pictures include the bed: a generator-style recolour or a redraw: investigate and say), the THINGS cell for a 80x96 thing, ladder and pool (hard tier), tests, golden frames unchanged for a fresh game; Look at all art and the result in the running game yourself (dev server with `?own=` ids; see docs/decor.md) at 1x and 8x on desktop and phone size and say what you saw; the reviewer must too; give Marc exact commands with absolute `~/...` paths.
- Stage per piece if needed. Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean; golden frames for a fresh game unchanged unless the issue says which change; new strings into docs/text-review.md; docs/decor.md 'What issue NNN built' (use this issue's number); a `changelog:` line (at most 140 characters) stays.

## Progress log
- 2026-11-25 (planner): filed on main from the merged designs; not started (Marc asked to file the remaining build issues without starting them).
