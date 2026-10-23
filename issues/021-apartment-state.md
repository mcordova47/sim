---
id: 021
title: Apartment state and tasks that change it
status: review
owner: claude
depends_on: [019]
---

## Goal
Make doing things matter: eating makes dirty dishes, washing them removes them, making the bed changes how the bed looks and sleeping unmakes it, and the character gets tired when it is late or after working a lot. All of it is data, so adding a thing to track is a data change.

## Acceptance criteria
- A single data file lists the state variables (id, initial value, range, a one-line meaning). To start: dirty dishes (a count), bed made (a flag), energy (0 to 100), and a clock (the time of day). Others (hunger, laundry, tidiness) can be added later as data.
- Tasks gain optional `requires` (conditions on state) and `effects` (changes to state). Examples: washing dishes needs dirty dishes and removes them; eating adds dishes; making the bed needs the bed unmade; sleeping needs energy below a level (or it being late), restores energy and unmakes the bed; working costs energy.
- A task that cannot be done right now shows why in its prompt (for example "NO DIRTY DISHES") instead of silently disappearing. Reasons are data, and use only characters the font has.
- Points may depend on state through one clear hook (for example more dishes means more points for washing them), with tests.
- Objects can change how they look with state: an object lists sprite variants by rule (for example `bed-made` and `bed-unmade`, or `dishes-0` to `dishes-3`), and the game picks the right one each frame. Until the art exists the placeholder shows the state clearly (a label or a different colour).
- Energy: it falls with the clock and with work, shows as a small HUD meter, and has a visible effect when low (for example a slower step time, with a yawn line in a dialog once dialogs exist), all tuned in `config.ts`. Sleeping restores it.
- The clock lives here (game time advances it; how fast is in `config.ts`) and is what the day and night cycle (009d) later builds its lighting on.
- A `stateChanged` event so sound, particles and achievements can react.
- Tests (no browser): requirements and effects, unavailable reasons, variants chosen by state, energy rise and fall, clock wrap, points hook, event.

## Things the 019 review found that this issue must handle
- **Walkability can change with state.** `Game` builds its `Grid` once from the level's solids, so anything that blocks or unblocks a tile (a door, a pile of laundry) needs an update API on `Grid` or a rebuild. Decide which and test it.
- **The `bump` latch resets when a task locks the player**, so holding a direction into the object just used bumps once more after each task. Fix it if sound makes it audible.

## Notes
- The task text and balance are placeholders until the personal task list (024) is written. This issue builds the system with a few example tasks.

## Progress log

- 2026-10-23: Started. Plan: `state.ts` (variables, checks, effects, clock and energy tick) with data in `state-vars.ts`; `requires`/`effects`/`pointsBonus` on `Interactable`; unmet reasons in the prompt; sprite variants per object (placeholder label and colour); conditional solids that rebuild the `Grid`; clock and energy meter in a new status panel; `stateChanged` event; example tasks in the placeholder room; tests.
- 2026-10-23: Built, status `review`. `npm run build` passes; `npm test` 165 tests pass (33 new in `state.test.ts`, `apartment.test.ts`, `placeholder-level.test.ts`).
  - **State:** `src/game/state.ts` (`ApartmentState`: get, checks, `anyOf` requirements, add/set effects clamped or wrapped, `tick`, `onChange`, `formatClock`); variables are data in `state-vars.ts` (dishes, bedMade, energy, clock). Clock and energy tuning in `config.ts` (`CLOCK`, `ENERGY`).
  - **Tasks:** `Interactable` gains `requires`, `effects`, `pointsBonus`. Effects apply on finish; the bonus is counted before them. `InteractionSystem.unavailableReason` / `canStart`; the prompt shows the reason greyed ("NO DIRTY DISHES"); a press emits `taskBlocked` with `reason: "requirement"` and a `message`. An object can have several tasks (`tasks` in the tile-map legend); the first doable one is offered.
  - **Looks:** `appearance.ts` (`Variant`, `pickVariant`). Tile-map legend `variants`; the game draws the matching variant each frame as a coloured block with a label (bed made / unmade, dishes 0 to 3+). Sprite names are stored for when the art exists.
  - **Walkability:** decided on rebuilding the grid. `Grid.setSolids`, and `Solid.blockedWhen` (legend `blockedWhen`); `Game` rebuilds on every `stateChanged` if any solid is conditional. Tested with a pile that blocks until the bed is made.
  - **Energy:** falls with the clock and work; HUD status panel top right (clock and meter, red when low); below `ENERGY.lowBelow` steps are 1.6x slower (`Player.stepTimeScale`, fixed per step) and a "YAWN..." popup shows once on crossing. Sleep restores it, unmakes the bed and moves the clock on 7 hours.
  - **Events:** `stateChanged {id, value, previous}`, for effects at once and for time-driven changes when the rounded value changes (clock hourly, energy by point).
  - **Placeholder room:** bed (make bed, sleep), fridge (snack adds a dish), sink (dishes, bonus per dish), desk (work costs energy).
  - **Not done:** the `bump` latch reset after a task. Nothing audible exists yet, and a fix means `Game` has to stop calling `player.update` while busy and clear the per-update flags; left for the sound issue (009a). The yawn is a popup; a dialog line waits on 023.
  - **Not checked:** how it looks and feels in a browser (status panel layout, placeholder labels fitting in 1 to 2 tile objects, tired step speed, clock pace of 2 game minutes per second).
  - Files: `game/{state,state-vars,appearance}.ts` (new), `game/{config,events,game,grid,interactable,interaction,level,placeholder-level,player,tilemap,world}.ts`, `render/{hud,layout,world-ui}.ts`, tests.
