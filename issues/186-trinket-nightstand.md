---
id: "186"
title: "Trinkets: a place on the nightstand"
short: "Nightstand trinkets"
status: todo
owner: marc + claude
depends_on: ["185"]
summary: "A second trinket place on the nightstand, with its Examine and Display tasks."
kind: build
changelog: "You can put a small trinket on the nightstand too."
---

## Goal
Stage C of `docs/trinket-display-design.md` (issue 173), with Marc's answers (d2: several small places; d6: the prompt only appears where the item is): a slot `trinket-night` for one small item in the 10 px gap of the nightstand (abs (230, 8), 16x16 cell; the design's audit in section 6 checked it against the map: the phone prop, the lamp-free top, the stand tile; recheck it), kinds as the desk (trinket and instrument), object 'nightstand', a prop on the nightstand piece, empty by default, with its Display trinket swap task and its Examine task (the card of issue 185) offered only when the slot holds something, in the nightstand tile that contains the slot's centre x.

## Acceptance criteria
- The slot, prop and tasks per the design (section 6 and 9); check the task spots (the nightstand already has Order takeout and Charge your phone), the choice cycle order (Examine just before the swap task) and that nothing hides a prompt or the phone; the trinkets are the same items as the desk's (an item shows in one place at a time: the swap rule of issue 073, so putting the telescope on the nightstand takes it from the desk).
- Tests (slot list pinned, swap and examine on this slot, fresh game unchanged); Look at all art and the result in the running game yourself (dev server with `?own=` ids; see docs/decor.md) at 1x and 8x on desktop and phone size and say what you saw; the reviewer must too; give Marc exact commands with absolute `~/...` paths.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean; golden frames for a fresh game unchanged unless the issue says which change; new strings into docs/text-review.md; docs/decor.md 'What issue NNN built' (use this issue's number); a `changelog:` line (at most 140 characters) stays.

## Progress log
- 2026-11-25 (planner): filed on main from the merged designs; not started (Marc asked to file the remaining build issues without starting them).
