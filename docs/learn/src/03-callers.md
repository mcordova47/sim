# Module 3. Who calls your code

**Goal.** Know, for any piece of code you will write, what calls it, when, and what it may touch.

**Effort.** An evening. You said you understand the loop at a high level, so this module starts where that stops.

**Read.**
- [`src/main.ts`](../../src/main.ts) lines 128 to 146 (the loop starts; `update` reads the keyboard into `Controls`, `render` draws). That is the only place the loop meets the game.
- [`src/game/game.ts`](../../src/game/game.ts) lines 696 to 768 (`update`) and 780 to 820 (`render`); lines 197 to 254 (the constructor wires `InteractionSystem` callbacks to `events.emit`).
- [`src/game/interaction.ts`](../../src/game/interaction.ts) lines 141 to 262 (`update`: find what you face, start a task) and 302 to 348 (`finish`).
- [`src/game/activity.ts`](../../src/game/activity.ts) lines 112 to 176 (the `Activity` interface) and 178 to 197 (`BaseActivity`).
- [`src/game/events.ts`](../../src/game/events.ts) lines 9 to 51.

**The idea first.** One frame is: the loop calls `game.update(1/60, controls)` zero or more times, then `game.render(ctx, alpha)` once. `update` is the only place the simulation changes; `render` only reads. Inside `update`, one of three things has the controls: an open dialog, the pause screen (the clock stands still), or the interaction system. The interaction system either finds the task you face and starts its activity, or ticks the running one. When an activity is `done`, `finish` runs: the task's `effects` are applied (that is where `stateChanged` events come from), then the score is paid, then `taskComplete` is emitted, and features such as sound, particles and achievements react without `Game` knowing they exist.

In Elm terms: `Controls` is the message of the frame, `Game.update` is `update`, `Game.render` is `view`, features and layers are subscriptions and overlays. Unlike Elm there is no pure model value to return: everything mutates.

**What may I touch?** A short contract, five rules:

| Your code is | The game calls it | You may | You may not |
|---|---|---|---|
| An **activity** | `constructor`, then `start()` once after `taskStart`, then `update(dt, controls)` each frame (not while a dialog is open), `draw` each frame, `cancel()` on Escape | set `progress`, call `finish(...)`, use `host` (`openDialog`, `cue`, `setState`, `random`) | side effects in the constructor; `Math.random` (use `host.random`); read the keyboard (read `controls`) |
| A **layer** (a feature's picture) | `update(dt)`, `drawWorld` inside the camera, `drawHud` after the HUD | read `game`, draw | change the simulation from a draw hook; rely on canvas state you set (the game resets it) |
| An **event listener** | when the event is emitted | read the payload, do your own thing | edit the payload (everyone shares it); throw and expect others to stop (a throw is logged and skipped) |
| **Data** (tasks, maps, text) | read by the interpreters | change freely; load checks and tests catch typos | invent a field the types do not have |
| A **render** function | every frame | read | mutate |

Files you should not need to change for ordinary work: `loop.ts`, `main.ts`, `game.ts`, `interaction.ts`, `player.ts`, `grid.ts`, `camera.ts`. The exception is when a feature genuinely needs a hook (mobile did). If you think you need to edit `game.ts`, first look for an event or a `Layer` that does it.

**Task: trace one task.**
1. Branch `learn/trace`. Create `src/learn/trace.test.ts`.
2. Build a real game: `new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, random: () => 0.5 })`. Subscribe to `taskStart`, `stateChanged` and `taskComplete` on `game.events` and push a short string for each into an array.
3. Put the player at the coffee spot and press E. Use the helper pattern from [`src/game/battery.test.ts`](../../src/game/battery.test.ts) lines 17 to 26: `taskSpots(rooms.main).find((s) => s.id === "coffee")` from [`src/game/plan-checks.ts:28`](../../src/game/plan-checks.ts), then `game.player.placeAt(col, row, face)`, one `game.update(1/60, NO_INPUT)`, then one update with `{ ...NO_INPUT, interactPressed: true }`, then update until `game.interaction.busy` is false.
4. Before you run it, write on paper the exact list of events you expect for the whole run, including everything before `taskStart`.
5. Run it. Then rewrite the test to assert the real list, and add one sentence of comment explaining why each `stateChanged` sits where it does.

**Checks.** The test is green and asserts: `taskStart`, then the changes for `dishes`, `mug`, `energy`, `mood` in that order, then `taskComplete` last. (The log also begins with three `stateChanged` events, `energy`, `mood`, `battery`, before `taskStart`: the apartment ticking while the player stood still. Whether your prediction included them is the lesson.) Coffee runs 6 seconds, about 360 updates.

**Hints.** Which comes first inside `finish`, the effects or the `onComplete`? Which events fire when time passes and nothing is happening, and how often (see the comment on `onChange` in `state.ts`)?

**If you are stuck.** `interaction.ts:302` (`finish`) then `game.ts:197` to 232.

**Afterwards** you can say where any new code of yours sits in a frame, and you know the four hooks you may use. Modules [9](09-features.md) and [10](10-new-activity.md) are uses of this table.

---

Previous: [Module 2. Words, and the guard rails around them](02-words.md) | [Index](README.md) | Next: [Module 4. A task is data (and an achievement for it)](04-tasks-are-data.md)
