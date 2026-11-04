# Module 9. Features and events: write a listener

**Goal.** Add a feature that reacts to an event and draws something, without touching `game.ts`.

**Effort.** An evening. Practice, not for shipping.

**Read.** [`src/game/features.ts`](../../src/game/features.ts) (the whole file, 28 lines); [`src/game/events.ts`](../../src/game/events.ts) lines 53 to 88 (`Emitter`: a listener that throws is logged and skipped); [`src/game/game.ts`](../../src/game/game.ts) lines 60 to 73 (`Layer`) and 520 to 530 (`addLayer`); [`src/game/time-of-day/feature.ts`](../../src/game/time-of-day/feature.ts) lines 1 to 60 (a small layer class); [`src/game/achievements/toasts.ts`](../../src/game/achievements/toasts.ts) (a timed on-screen thing).

**The idea.** A feature is a class that subscribes to events in its constructor and, if it draws, registers a layer. `features.ts` switches features on with one line each, so `game.ts` does not know them. It is the observer pattern; the event union in `events.ts` is your `Msg` type for subscriptions.

**Task: a noon note.** When the clock passes 12:00, show `NOON` in the middle of the HUD for three seconds.
1. Branch `learn/noon-note`.
2. Create `src/game/noon-note/feature.ts`: a class implementing `Layer` with `name`, `update(dt)` and `drawHud(ctx)` (use `drawText` and `COLOR.butter`, centered at `VIEW.width / 2`). Subscribe to `stateChanged` in the constructor and react when `id === "clock"` and `Math.floor(value) === 12`. Export `attachNoonNote(game)`.
3. Add one line to `attachFeatures` in `features.ts`.
4. Write `feature.test.ts` beside it: build a `Game`, create the feature, apply `{ var: "clock", set: 12 }` through `game.state.applyEffects`, expect the text, run `game.update` for four seconds of frames, expect it gone.

**Checks.** The test is green. The whole suite stays green (my golden frames were unchanged because it draws nothing until noon). Visible: `npm run dev` with `/?hour=11` and wait: the game clock runs 30 seconds an hour, or step the clock with `]`.

**Hints.** The state fires `stateChanged` for the clock once per game hour, with the exact value a frame past the hour ([`docs/state.md`](../state.md) "Events"). The test uses `set`, which fires at once.

**If you are stuck.** [`src/game/particles/feature.ts`](../../src/game/particles/feature.ts) is another small feature.

**Afterwards** you can add a feature in your own folder and be sure you did not need `game.ts`.

---

Previous: [Module 8. The side project file: one bad line skips only itself (issue 124)](08-side-project.md) | [Index](README.md) | Next: [Module 10. A new kind of activity](10-new-activity.md)
