# Module 10. A new kind of activity

**Goal.** Write a small mini-game as an activity, register it and use it from a task.

**Effort.** One or two evenings. Practice (a stand-in task), though the pattern is how every mini-game here was made.

**Read.** [`src/game/activities/wait.ts`](../../src/game/activities/wait.ts) (34 lines), `notes.ts` lines 1 to 125 (a complete small mini-game with a validator), [`src/game/activities/index.ts`](../../src/game/activities/index.ts), [`docs/activities.md`](../activities.md) "Writing a new kind", [`src/game/activities/fake-host.ts`](../../src/game/activities/fake-host.ts), [`src/input/controls.ts`](../../src/input/controls.ts) lines 12 to 40.

**The idea.** An activity is a small state machine with `update(dt, controls)` and a `done`/`result`. `BaseActivity` supplies `finish`. The `quality` (0 to 1) scales the points between 0.5x and 1.5x. A validator runs at load so a typo in a task's settings fails then, not on the first press.

**Task: a "tap" activity.** The player presses E a set number of times before time runs out. Settings `presses` (default 8) and `seconds` (default 6). Quality is the share of time left.
1. Branch `learn/tap-activity`.
2. Write `src/game/activities/tap.ts` with a `TapActivity extends BaseActivity` (`cancellable = true`, and `readsKeys = true` because it reads E), then `registerActivity("tap", factory, validator)` with a validator that throws a message naming the task when `presses` or `seconds` is not a sane number.
3. Import it in `activities/index.ts`.
4. Use it: add a "Stretch" task at the sofa (`activity: { type: "tap", presses: 8, seconds: 6 }`, add the id to the sofa's `tasks` in the legend).
5. Test the class directly (`new TapActivity(3, 6)`, call `update(0.1, { ...NO_INPUT, interactPressed: true })`), and the failure paths.

**Checks.** Your unit tests are green. Three existing tests react, and each teaches something. (a) `game-activities.test.ts` ("builds an activity for every task in the real apartment") holds a hard-coded list of activity types: add yours (this is undocumented; log it). (b) The golden frame test goes red, because the sofa now has one more choice and the prompt says `1/N`: re-record with intent ([module 6](06-golden-frames.md)); the diff is two lines. (c) `escape.test.ts` runs Escape at seven moments on every real task; it passes for yours. Visible: `npm run dev`, sofa, Tab to Stretch, press E eight times.

**A side effect to know about (read from the code, `activity.ts` line 124 and `game.ts` line 660; not run).** `readsKeys = true` with `readsLetters` unset counts the mute key as a letter while the game runs, and blocks the pause list's hotkey too. If you want M to still mute during Stretch, set `readsLetters = false` (as the track editor does outside naming), and add a test that `hotkeyBlocked("KeyM", true)` is false while it runs.

**Hints.** `update` is not called on the frame of the opening press, so the first tap you see is the second press. Read `controls.interactPressed` once per frame; never count `keysDown`.

**If you are stuck.** `notes.ts` has the same shape; its tests are [`src/game/activities/notes.test.ts`](../../src/game/activities/notes.test.ts).

**Part 2, changing an existing activity** (optional, same evening). In `notes.ts` make three misses in a row end the game early and finish with the quality so far. Write the test first. Note which existing tests pin the behavior you are changing; that tells you what you are allowed to move.

**Afterwards** you can build a screen or mini-game and know every place it plugs in.

---

Previous: [Module 9. Features and events: write a listener](09-features.md) | [Index](README.md) | Next: [Module 11. The narrow phone layout: the pause legend (issue 120)](11-narrow-layout.md)
