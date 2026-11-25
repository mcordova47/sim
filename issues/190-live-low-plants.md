---
id: "190"
title: "Plant pots, stage F: live low plants that need a mist"
short: "Live low plants"
status: todo
owner: marc + claude
depends_on: ["188", "171"]
summary: "The bowl's low plants become slow, easy, never-punished live plants that want a mist now and then."
kind: build
changelog: "The bowl's small plants now want a gentle mist now and then."
---

## Goal
Stage F of `docs/plant-pots-design.md` (issue 179, sections 4 and 5), with Marc's answer (d3: houseplants live, dried arrangements still, the third pot's low plants live but very slow and easy, never punished): a slow 'mist' care loop for the bowl: one variable on the bowl's own clock (stage C of the plan, the per-slot clock built with the cut flowers of issue 171), one free task (for example 'Mist plant', no 'the', item-aware text), a drooping look per low plant (one wilted sprite each), never a loss and never a penalty (a dry plant is just a sad sprite until you mist it). Live low plants fit the bowl only (the sill takes still plants until live sill plants exist, d10).

## Acceptance criteria
- The variable and clock on the bowl (not the plant pot's `plantDry`: care code stays per pot), the task offered only when the bowl holds a live low plant, the wilted sprites (four), saves and sync (the decor and state fields; check `sync/merge.ts`), the frozen rule while the item is in the inventory, tests (time, sleep, swapping, the droop and recovery), the interplay with the item pool (live low plants are the same items as stage B's still ones, now live: say how an old save with one displayed loads); Look at all art and the result in the running game yourself (dev server with `?own=` ids; see docs/decor.md) at 1x and 8x on desktop and phone size and say what you saw; the reviewer must too; give Marc exact commands with absolute `~/...` paths.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean; golden frames for a fresh game unchanged unless the issue says which change; new strings into docs/text-review.md; docs/decor.md 'What issue NNN built' (use this issue's number); a `changelog:` line (at most 140 characters) stays.

## Progress log
- 2026-11-25 (planner): filed on main from the merged designs; not started (Marc asked to file the remaining build issues without starting them).
