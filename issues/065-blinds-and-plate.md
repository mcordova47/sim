---
id: 065
title: Both windows' blinds; the dinner plate only when there is dinner
status: todo
owner: claude
depends_on: []
---

## Goal
From Marc's playtest of 062 stage 3a (2026-10-26):
1. **Blinds:** there is no way to open or close the other blinds. Opening one should open the other (both windows follow the one `blinds` state).
2. **Dinner plate:** the plate on the table (the small striped plate at the front edge of the `table` sprite, under the cup) should only be there after you reheat leftovers (or cook) and go away after you eat; by then the dishes already show at the counter.

## Acceptance criteria
- **Blinds:** the other east window (`w`, which today uses the plain `window` sprite) becomes a blinds window like `W`: it draws `window-blinds-open` or `window-blinds-closed` from the same `blinds` state and offers the same open and close tasks, so either window's task changes both. Check the task spots and reachability (both windows reachable, each offers exactly the task that applies now), the golden main-room frames (this changes the default look of the upper window: record why and re-record per the README), and the day and night lighting (blinds dim the room by day, 009d). The plain `window` sprite stays for any later use.
- **Plate:** a new state variable `plate` (0 or 1, saved, tolerant of old saves; default 0). `reheat` and `cook` set it to 1; `eat-dinner` sets it to 0 (and sleeping does not clear it). `eat-dinner` is still available without a plate (do not add a requirement; say so in the log; it eats the plate if one is there). The table draws a variant by state: `table-plate` (today's `table` sprite with the plate) when `plate` is 1 and `table` (the same table with the plate area redrawn as bare wood and a small free-standing mug/clutter arrangement, so it reads as a table, not as a missing piece) when 0. Art: edit `art/src/table.sprite` and add `art/src/table-plate.sprite` from the current one (palette only, 64x32, same everything else; read the table and coffee station photos in `/Users/marccordova/Dev/repos/mcordova47/life/reference-photos/` by absolute path, never copied into the repo). The `eat-table` pose and the table variants must not clash visually (the pose draws a bowl at the table's front edge; check both at 1x and 4x).
- Wording and docs: `docs/tasks.md` and `docs/state.md` list the new state; tests for the plate rules (reheat, cook, eat-dinner, save round trip, old saves), the two blinds windows (both change together; both offer the right task) and the table variants; the sprite-exists test passes.
- Render the main room headless at 1x and 4x with the plate on and off, and the east wall with blinds open and closed, and look at them. `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log
