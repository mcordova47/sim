---
id: "188"
title: "Plant pots, stage B: low plants for the bowl"
short: "Low plants"
status: todo
owner: marc + claude
depends_on: ["182"]
summary: "Four low plants (moss, succulent, cactus, bonsai) for the bowl pot."
kind: build
changelog: "Four small plants (moss, a succulent, a cactus and a bonsai) can sit in the bookshelf's bowl."
---

## Goal
Stage B of `docs/plant-pots-design.md` (issue 179, section 3), with Marc's answers (d1: the third pot takes low and small plants; d3: low plants are live but very slow and easy, never punished, which is a LATER stage (issue 190): this stage makes them still items; d4/d5/d6: strict kinds, the bowl drawn 2 px lower so a low plant gets 4 clear rows above its rim). Four items of `plantKind: "low"` for the `pot-bowl` slot (issue 182 built the slot, the kinds and the empty bowl): a moss pot, a succulent, a cactus and a small bonsai, each a still 16x16 item that fits the bowl's clear rows (the design worries whether 4 rows are enough for a bonsai: check and say), palette only, no text, deadpan names and notes within 80 characters, `from: A PACKAGE`.

## Acceptance criteria
- The four items and sprites; `plantKind` and the bowl's `plantKinds` accept them (and nothing else); the 'Change plants' list (issue 182) shows them for the bowl; THINGS entries; New items join the random-encounter item pool (issue 163) by their kind, are placed in the ladder (`src/game/encounter-ladder.ts`: the test fails until they are) with a difficulty tier you suggest (easy, normal or hard), and have NO milestone gift days (Marc wants to space arrivals separately; the pool and ladder of issue 183 give the pacing).
- The `look` of the bowl with each plant, the draw order with the pothos overhang (issue 149: the pothos vine crosses the bowl, accepted), a still plant does not use the plant care variables; tests; Look at all art and the result in the running game yourself (dev server with `?own=` ids; see docs/decor.md) at 1x and 8x on desktop and phone size and say what you saw; the reviewer must too; give Marc exact commands with absolute `~/...` paths.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean; golden frames for a fresh game unchanged unless the issue says which change; new strings into docs/text-review.md; docs/decor.md 'What issue NNN built' (use this issue's number); a `changelog:` line (at most 140 characters) stays.

## Progress log
- 2026-11-25 (planner): filed on main from the merged designs; not started (Marc asked to file the remaining build issues without starting them).
