---
id: 021
title: Apartment state and tasks that change it
status: done
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

- 2026-10-23: **Review (reviewer, independent). Verdict: approve.** `npm run build` passes; `npm test` 165 of 165 pass. I also ran 20 throwaway checks outside the repo (state wrap and clamping, set-over-add, unknown variables, `anyOf`, reason ordering, points bonus before effects, a pile that blocks while the player stands on it or is mid-step, several tasks on one object, event order, yawn once per crossing, reasons and prompts against the font and view width, every variable the placeholder level uses exists in `STATE_VARS`). Everything matched the criteria; the two failed probes are minor notes 1 and 4 below.
  - Pass: state variables in one data file (`state-vars.ts`) with id, initial, range, meaning.
  - Pass: `requires` / `effects` on tasks; washing needs dishes and clears them, snack adds one, bed make and sleep (sleep restores energy, unmakes the bed, moves the clock on 7 hours), work costs energy.
  - Pass: unmet reason in the prompt ("NO DIRTY DISHES"), data-driven, font characters checked; `taskBlocked` carries the message.
  - Pass: points hook (`pointsBonus`), counted before effects: 4 dishes gave 60 for a task worth 20 plus 10 each.
  - Pass: sprite variants by rule chosen each frame; placeholder shows label and colour.
  - Pass: energy falls with clock and work, HUD meter, low energy slows steps (fixed per step, so no mid-step jump) and yawns once per crossing; tuned in `config.ts`; sleeping restores it.
  - Pass: clock in state, pace in `config.ts`, wraps at 24 (also for negative and exactly 24).
  - Pass: `stateChanged` event. Walkability: `Grid.setSolids` rebuild on state change; a player standing on a tile that becomes blocked can still walk off it, and a step already in progress finishes (no stuck state).
  - Can't verify (no browser): status panel layout, placeholder labels fitting 1 to 2 tile objects, tired step speed feel, clock pace of 2 game minutes per second.
  - Not done, accepted: the `bump` latch reset after a task. The issue says to fix it "if sound makes it audible"; no sound exists yet, so it should be picked up in 009a. Dialog yawn line waits on 023, as the criterion allows.
  - Out-of-scope check: only files named in the log, plus this issue file, changed; `PLAN.md` and other issues untouched; nothing from `reference-photos/`.
  - Minor notes (not blocking): (1) The clock `stateChanged` fires at x:30 (rounding), not on the hour, with an extra event at midnight (`0` then `0.5`), so 25 events a day; 009d should not rely on it for exact hours and may want floor instead of round. (2) A task's effects emit one `stateChanged` per variable as they apply, so a listener on the first sees later effects not yet applied (sleep: energy 100 while the bed is still made). (3) In the placeholder room, with the bed unmade and the character tired, "Make the bed" is offered first, so sleeping needs the bed made first (and sleep unmakes it again); fine as a placeholder, revisit with 024. (4) A variable with `min == max` and `wrap` goes NaN; the constructor could reject it. (5) Requirement and effect variable names are only checked when read; a typo throws at run time, not at load. The placeholder-level test covers current data only.
  - PLAN.md table needs updating by the planner. Branch to merge: `issue/021-apartment-state`.
- 2026-10-23 (planner): Marc played the branch and said it feels great; merged. The reviewer's minor notes became issue 027 (unknown variable names failing at load, a `min` equal to `max` with `wrap`, `stateChanged` events arriving only after all of a task's effects have applied, and what 009d can rely on for the clock). Left for the personal task list (024): in the placeholder room, with the bed unmade and the character tired, "Make the bed" is offered before sleeping, so sleep needs the bed made first. The `bump` latch reset after a task waits for the sound issue (009a).
