---
id: 065
title: Both windows' blinds; the dinner plate only when there is dinner
status: review
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

- 2026-10-26: started. Plan: share one blinds object between `w` and `W`, add `plate` state and the table variants, two table sprites, tests, docs, re-record the golden.
- 2026-10-26: done (an interrupted session was resumed from the uncommitted diff; nothing was redone).
  - **Blinds:** `w` and `W` now use one `WINDOW_BLINDS` object in `apartment.ts` (sprite `window-blinds`, variants `-open`/`-closed` from `blinds`, tasks open and close). Either window changes both. The upper window can only be reached from row 4 (the radiator is west of its top tile); the lower from rows 6 and 7. The plain `window` sprite file stays. `scripts/main-room-mockup.mjs` no longer forces `w` to the plain window. Daylight dimming is unchanged (it reads `blinds`, not a window).
  - **Plate:** new state `plate` (0/1, initial 0, saved with the other vars; an old save keeps 0). `reheat` and `cook` set 1, `eat-dinner` sets 0. `eat-dinner` still has no plate requirement (it just leaves it at 0). `sleep` has no plate effect. Table variants: `table-plate` when `plate` >= 1, else `table`.
  - **Art:** `table-plate.sprite` is the old table (palette only, 64x32); `table.sprite` has the plate area (x22..29, y14..16) redrawn as bare wood and a small tangerine mug at the east side (x41..46, y15..17), placed outside x24..39 so the `player-eat-table` pose (which redraws the table's lower row from x24) does not cut it. Looked at both at 8x with the pose drawn over them: no clash.
  - **Golden re-recorded** (`UPDATE_GOLDEN=1 npm test`): the table no longer draws the plate by default (every scenario with the table changed), both east windows draw the blinds sprite instead of the plain window, and I added two scenarios (`plate`: plate 1 at 19:00; `blinds-closed-day`: closed blinds at noon) so the new looks are guarded. That adds frames to the JSON. Rendered with the dev server in headless Chrome first.
  - **Checks:** rendered main room at 1x and 4x, plate on and off x blinds open and closed, day (clock 12) and `?hour=23`, all 16, and looked at them (both windows follow the blinds in the game at the right edge, and in the mockup `art/main-room-mockup*.png`, which is gitignored); plate and mug read on the table. `npm run sprites`, `npm test` (1684 pass) and `npm run build` pass.
  - **Tests:** `src/game/blinds-and-plate.test.ts` (both windows reachable, each offers the right task, either changes both, variants; plate rules, eat without plate, sleep, table variants), a save round trip and old-save case in `achievements/feature.test.ts`, `apartment.test.ts` updated for the windows. Docs: `docs/tasks.md`, `docs/state.md`, `docs/floor-plan.md`.
  - **Not checked:** how it feels in a play session (the table's eat pose with a plate in a real run was checked only by compositing the sprites). Expect conflicts with issue 062 stage 3a in `apartment.ts` and `golden/main-room-frames.json` at merge (re-record the golden after merging).
