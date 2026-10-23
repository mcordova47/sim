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
`validateLevel` (run by `parseTileMap` and by `Game` for every room it loads) checks every variable name used by a task's `requires`, `effects` and `pointsBonus`, a cutscene's `set` steps, a variant's `when` and a solid's `blockedWhen`. The error names the room and the task or object, for example `main: task "dishes" effects uses the unknown state variable "dishs"`. So a typo in the task list stops the game at load and in the tests, not when the task is first used.

## Events
`game.events.on("stateChanged", ({ id, value, previous }) => ...)`.

- **Task effects:** all of a task's effects are applied first, then one event per variable that changed, in the order the variables first appear in `effects`. A listener on the first event sees every later effect already applied (sleeping: energy is 100 and the bed is unmade in the event for either). A variable touched twice reports once, from its first previous value to its last; a net zero reports nothing.
- **Time:** each tick moves the clock and energy together and then reports them, clock first. A time-driven change reports only when the whole-number part (the floor) changes.
- **The clock for lighting (009d):** the clock event fires once per whole in-game hour (24 a day, midnight included once), when the floor of the hour changes. `value` is the exact time at that moment, a frame past the hour. For smooth light between hours, do not wait for events: read `game.state.get("clock")` each frame (hours since midnight, 0 up to 24). Use the event to step things that change on the hour and the per-frame read for anything continuous.
- Energy reports once per whole point on the way down; the yawn fires when it crosses `ENERGY.lowBelow`.
