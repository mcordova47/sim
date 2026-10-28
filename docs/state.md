# Apartment state: how to extend it

The state is a few numbers about the apartment and the character (dirty dishes, bed made, energy, the clock). Tasks read and change them; objects look different because of them. Everything is data. The code is `src/game/state.ts`; the list of variables is `src/game/state-vars.ts`.

## Add a variable
Add a line to `STATE_VARS` in `state-vars.ts`:

```ts
{ id: "laundry", initial: 0, min: 0, max: 5, meaning: "Piles of dirty laundry, a count." }
```

`min` and `max` are inclusive; values are clamped to them. A flag is 0 or 1. `wrap: true` makes it come round the other side instead (the clock); it needs `max` greater than `min`, and the state refuses to start otherwise. `initial` must be inside the range.

## Add a requirement
On a task in `tasks.ts`, `requires` lists conditions, each with a `reason` shown in the prompt when it is not met (font characters only, so capitals, digits and basic punctuation):

```ts
requires: [{ var: "dishes", min: 1, reason: "NO DIRTY DISHES" }]
requires: [{ anyOf: [{ var: "energy", max: 60 }, { var: "clock", min: 22 }], reason: "NOT TIRED YET" }]
```

`min` and `max` are optional and inclusive. The first unmet reason is shown. The press also emits `taskBlocked` (`reason: "requirement"`, with the message).

## Add an effect
`effects` change the state when the task finishes: `{ var: "dishes", add: -1 }` or `{ var: "bedMade", set: 1 }`. `set` wins over `add`. Results are clamped (or wrapped). `pointsBonus: { var, perUnit }` adds points for each unit the variable holds when the task finishes, before its effects change it.

## Add a variant (how an object looks)
In a tile-map legend entry, `variants` lists looks by rule; the first whose `when` holds is drawn, and the last should have no `when` as the fallback. `sprite` names the art; `label` and `color` are the placeholder until it exists:

```ts
variants: [
  { sprite: "laundry-2", when: [{ var: "laundry", min: 2 }], label: "LAUNDRY 2+", color: "brick" },
  { sprite: "laundry-0", label: "CLEAN", color: "paper" },
]
```

A solid can also be conditional with `blockedWhen` (a pile in the way); the grid is rebuilt on every state change.

## Typos fail when the level is built
`validateLevel` (run by `parseTileMap` and by `Game` for every room it loads) checks every variable name used by a task's `requires`, `effects` and `pointsBonus`, a cutscene's `set` steps, a variant's `when` and a solid's `blockedWhen`. A room meant for a game with its own variables passes `knownVars` in the `parseTileMap` options (and the `Game` checks against its own state). The error names the room and the task or object, for example `main: task "dishes" effects uses the unknown state variable "dishs"`. So a typo in the task list stops the game at load and in the tests, not when the task is first used.

## Variables added later
- `blinds` (0 closed, 1 open): both east windows follow it (issue 065).
- `plate` (0 or 1, issue 065): a dinner plate is out on the dining table. Reheat leftovers and Cook dinner set it to 1, Eat dinner sets it to 0, sleeping leaves it. Eating dinner does not require it. The table's variant list picks `table-plate` or `table` from it.
- `mug` also controls the `coffee mug` prop on the table (a prop with a `when` rule, `mug` max 0; slot id `prop-table`, not registered for swapping): it shows while the mug rests on the table and hides while a full mug is carried or waiting.

- `boxes` (1 a stack, 0 flattened, 2 gone, issues 066 and 070; 1 and 0 keep their 066 meaning so nothing saved changes, 2 is new and only means the boxes were taken out): the cardboard boxes in the kitchen. It starts at 1, today's look, so an older save without it shows the stack. Flatten the boxes needs 1 (otherwise `NO BOXES TO FLATTEN`) and sets 0; Take out the recycling (`recycle-boxes`, at the boxes, only when flat; there is no recycling bin) sets 2; opening a package at the front door (`collect-delivery`) sets 1 again from any of the three. There is only ever one stack, however many packages arrive. The object's variant list picks `boxes-gone`, `boxes` or `boxes-flat` from it. `?set=boxes:0` shows the flat look in the dev server.

- `battery` (0 to 100, issue 088): the phone's charge, drawn as a phone and a bar in the ribbon's last slot. Starts at 40. Only `charge-phone` changes it (sets 100); nothing drains it with time and no task reads it. A save without it starts at 40.

## Decor is not state
The package by the front door follows the delivery queue through the derived variable `parcel` (0 or 1, set by the game each frame, never by a task; `docs/decor.md`, stage 3a). Sleeping and napping move the clock by an effect, and `State.onClockSkip` tells the delivery queue how many hours were skipped (for sleep, the real number: the wake hour is at least 7 hours on and never before 06:30, see below).

Which painting, plant or lamp is in a slot is kept in the decor store (`game.decor`, issue 062, `docs/decor.md`), not in state variables: it is a list of ids, not numbers. The plant's growth and dryness stay state variables (`plantStage`, `plantDry`); the decor slot says which sprites they choose between.

## Events
`game.events.on("stateChanged", ({ id, value, previous }) => ...)`.

- **Task effects:** all of a task's effects are applied first, then one event per variable that changed, in the order the variables first appear in `effects`. A listener on the first event sees every later effect already applied (sleeping: energy is 100 and the bed is unmade in the event for either). A variable touched twice reports once, from its first previous value to its last; a net zero reports nothing.
- **Time:** each tick moves the clock, energy, mood and the snake plant's dry hours (`plantDry`, issue 063) together and then reports them, in that order. A time-driven change reports only when the whole-number part (the floor) changes.
- **The clock for lighting (009d):** the clock event fires once per whole in-game hour (24 a day, midnight included once), when the floor of the hour changes. `value` is the exact time at that moment, a frame past the hour. For smooth light between hours, do not wait for events: read `game.state.get("clock")` each frame (hours since midnight, 0 up to 24). Use the event to step things that change on the hour and the per-frame read for anything continuous.
- A change that spans several hours in one go (sleep's `clock` wake, a very long tick) reports one event, not one per hour.
- **The wake effect (issue 078).** `Effect` has two more forms. `{ var: "clock", wake: { atLeast: 7, notBefore: 6.5 } }` moves the clock on by `wakeJump(clock, rule)`: `atLeast` hours, and further if that would land between midnight and `notBefore` o'clock, up to `notBefore` (22:00 lands at 06:30, 02:00 at 09:00). It is worked out once from the clock as it is when the list is applied, then behaves as an `add` of that many hours: `onClockSkip` gets them, one `clock` event. `{ var: "plantDry", addSkipped: true }` adds the hours that the same list's `wake` moved the clock, so the soil dries for the real hours. A list without a `wake` makes `addSkipped` add nothing. The sleep activity holds the clock for the whole sequence, so the jump it shows in the light (`scene.skipHours`) is the one the effects then make.
- Energy reports once per whole point on the way down; the yawn fires when it crosses `ENERGY.lowBelow`.
