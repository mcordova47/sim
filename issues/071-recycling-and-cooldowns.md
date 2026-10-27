---
id: 071
title: No recycling bin; recycle from the boxes; no cooldowns on state-gated tasks
status: todo
owner: claude
depends_on: []
---

## Goal
From Marc's playtest of 070 (2026-10-26):
1. There is no recycling bin in the real apartment, only a garbage bin: remove the recycling bin from the kitchen. "Take out the recycling" (issue 070) is done from the boxes themselves.
2. There is a cooldown between sleeping and making the bed that should not exist: you make the bed, sleep (the bed becomes unmade), and `make-bed` is still cooling down from the first time. A task that already needs the state to be right (the bed unmade, the blinds in the other position, a mug waiting) does not need a time cooldown as well.

## Acceptance criteria
- **Kitchen:** remove the recycling bin object `Y` (`recycling` sprite) from `KITCHEN_MAP`; its tile becomes plain walkable floor (check the map and the `wall-tiles` classification, the kitchen render, and reachability; every task still reachable, the golden main-room frames untouched). Keep `art/src/recycling.sprite` out of the room (delete it if nothing else uses it, and its PNG; list it in the log). `take-trash` is done only at the garbage bin (`N`). `recycle-boxes` moves to the boxes object (`X`): it is offered there when the boxes are flat (the `hidden` rule from 070 still applies at that object); `flatten-boxes` stays there. At the boxes, flat boxes offer 'Take out the recycling' and a stack offers 'Flatten the boxes' (when both could start, the Tab choice applies; they exclude each other by state, so they should never overlap). The ordinary trash is no longer blocked by flat boxes because the recycling task is no longer at the bin: remove the `exclusive` link between the two tasks and re-check the choice cycle and the refusal-line logic from 070 (simplify it if it is now dead).
- **Cooldowns:** audit every task and set `cooldown: 0` on the ones that already gate themselves by state, so a time cooldown only remains where nothing else stops spamming: at least `make-bed`, `open-blinds`, `close-blinds`, `coffee` (it needs an empty mug), `drink-coffee`, `flatten-boxes`, `recycle-boxes`, `collect-delivery` (check its current value), the plate tasks if any, the water-plant variants if state gated (keep a cooldown where the state does not stop repeated use, such as dishes with a pile, records, doomscroll, guitar). Write the audit as a table in `docs/tasks.md` (task, gate, cooldown, why). Points and the repeat-penalty rules stay as they are (repeating the same task quickly still pays less), only the blocking changes.
- Sleeping then making the bed works at once: a test makes the bed, sleeps (give it energy < the sleep line), and then `make-bed` is offered immediately (no cooldown message); the same for blinds and coffee.
- Tests for the kitchen change (the map, reachability, the tasks at the boxes and the bin, no recycling object, the golden frames), the cooldown table (every state-gated task has cooldown 0 and a test per example), docs updated. Render the kitchen's north-east corner at 1x and 4x and look. `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log
