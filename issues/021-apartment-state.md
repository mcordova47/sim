---
id: 021
title: Apartment state and tasks that change it
status: todo
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
