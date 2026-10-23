---
id: 022
title: Activities, mini-games and cutscenes
status: review
owner: claude
depends_on: [019]
---

## Goal
Today every task is "wait N seconds". Let a task be an activity instead: the plain wait, a short cutscene (the guitar snippet), or a mini-game (press the right keys for notes, mash keys to type at work). Each reports how well it went, and that feeds the score.

## Acceptance criteria
- An `Activity` interface: start, update with the controls, draw, and a result (`completed` and `quality` from 0 to 1). While one runs, the interaction system hands it the controls and the player is locked. The existing timed task becomes the `wait` activity with the same progress bar and the same behaviour.
- Task data names its activity and parameters (for example `activity: { type: "typing", lines: 3 }`), so adding a task never needs engine changes.
- Quality scales points between a configured minimum and maximum, and shows in the award popup (with text the font can draw). A cancelled or failed activity is handled on purpose: what it scores and whether it starts the cooldown are decided and tested.
- Cutscene support: a scripted sequence of steps (show a text page, wait, play a named animation or sound, set a flag) that runs as an activity. Text pages use the dialog box from 023 when that exists; until then they use a simple stand-in with the same interface.
- Two example mini-games to prove the framework, kept simple: typing (mash keys to type out a line, quality by speed and mistakes) and notes (a few notes appear one at a time and you press the matching keys, quality by accuracy). Placeholder art only.
- Logic is deterministic with an injected random function and tested without a browser, including the interaction with scoring and combos and a test that a new activity type needs no change to the interaction system.
- Activities run in game time and respect the clock (021) when it exists.

## Things the 019 review found that this issue must handle
- **A general input lock and scripted movement.** The busy lock exists only through `InteractionSystem.active`. Activities, cutscenes and (in 023) dialogs all need to freeze player input, and cutscenes need to move the player by script (walk to a spot, face a direction). Add one place for both (for example `Game.lock(owner)` and a way to queue steps for the player), instead of each feature inventing its own.
- **Events can be missed in a long update.** `arrivedThisUpdate` and `bumpedThisUpdate` keep only the last event of an update; with the fixed 1/60 step this can't happen, but scripted movement or a catch-up update could. If an activity needs every step, make the player record a list.

## Progress log
- 2026-10-23: Done, ready for review. Branch `issue/022-activities`, worktree `../life-worktrees/022-activities`.
  - **Added:** `src/game/activity.ts` (the `Activity` interface, `BaseActivity`, `ActivityResult`, `ActivityHost`, the registry with `registerActivity` and `createActivity`, `specFor`), `src/game/activities/` with `wait.ts`, `dialog.ts`, `cutscene.ts`, `typing.ts`, `notes.ts`, `index.ts` and `fake-host.ts` (a stand-in game for tests), `docs/activities.md`. `Controls` gained `keys` (the code of every key that went down this frame; `Keyboard.pressedKeys()` supplies it). `Interactable` gained `activity` (and `dialog` is now shorthand for a dialog activity). `config.ts` gained `ACTIVITY`, `TYPING` and `NOTES`. `Scoreboard.complete` takes a quality factor and `Award` reports it. `GameEvents` gained `taskCancelled` and `cue`. `Game` gained a `random` option, acts as the host, lets an activity walk the player by script (`playerControls`), draws an activity's picture over the HUD, and shows a `NICE`/`SLOPPY` line in the award popup.
  - **Changed:** `InteractionSystem` now holds an `Activity` for the running task instead of a timer. The plain timed task is the `wait` activity and behaves exactly as before. 023's "open the dialog when a task starts, and score at once" stand-in is gone: a task with a dialog is a dialog activity, so it scores when the dialog closes and not at all if the player backs out.
  - **Real tasks:** `work` is the typing game, `guitar` the notes game, `record-play` a short cutscene (text, a cue, a pause, text). `contemplate` is a dialog activity.
  - **Criteria:**
    - Activity interface (start, update with the controls, draw, a result with `completed` and `quality`), the interaction system hands it the controls and the player is locked, and the timed task is the `wait` activity: yes. The interaction system knows only the interface; `activity.test.ts` registers a made-up "two presses" activity and runs it through the same system with no change to it.
    - Task data names its activity and settings (`activity: { type: "typing", lines: 3 }`): yes; an unknown type is reported with the task's name; settings are validated with the task named (`lines`, `count`, `steps`).
    - Quality scales points between a configured minimum and maximum and shows in the popup: yes (0.5 to 1.5), tested at 0, mid, 1, out-of-range values, with the points bonus, and in the popup text. A backed-out task: decided and tested: no points, no effects, no cooldown, `taskCancelled` fires, the combo is untouched, and it can be started again at once.
    - Cutscene support: steps `say`, `ask`, `wait`, `cue`, `face`, `walk`; text uses the dialog box from 023 and waits for it to close; the clock stands still while it is open; Escape skips the rest and still counts. Scripted walking is tested at runner level and in the game (the player's own keys are ignored during it, and theirs again afterwards).
    - Two example mini-games: typing (key mashing; speed gives quality, a time limit ends it with quality 0) and notes (arrows one at a time; quality is the share hit).
    - Deterministic and tested without a browser: yes. The mini-games take their random numbers from `host.random()` (a seeded one in tests; the same seed gives the same lines and notes, and different seeds differ).
    - Activities run in game time and respect the clock (021): they only advance while the interaction system is updated, so a dialog inside a cutscene pauses them with the rest of the clock.
  - **Checks:** `npm run build` passes; `npm test` 446 pass (367 on `main`; 79 new: framework 21, typing 17, notes 21, cutscene 17, game level 14, plus keys and event changes). The old tests that assumed a dialog task scores when it opens were updated to the new, correct behaviour. I rendered both mini-games in a small room and looked at them: the typing box (typed characters bright yellow, the rest dim, a progress bar) and the notes box (a green hit, the current note yellow, the rest dim, a shrinking bar).
  - **Decisions to know about:**
    - **Activities have a `start()`** that the interaction system calls after `taskStart`. I first opened the dialog in the constructor and got `dialogOpen` before `taskStart`; side effects belong in `start()`.
    - **Escape cancels, X does not** (X is a letter in the typing game). Menus still use both. Waits and notes cannot be cancelled; typing and cutscenes can.
    - **Mashing:** one character per key press, any typing key; holding a key does not repeat (the keyboard ignores repeats). The speed limits (`fastCps` 9, `slowCps` 3, 30 s cap) and the note window (1.2 s) are first guesses to tune by playing.
    - **Notes are one at a time, not falling lanes.** The task list describes lanes and a beat; the framework supports that (it is another `Activity`), this is the first proof.
  - **Not done:** the other mini-games in the task list (record, lyrics word choices, mixing), the open mic, falling-lane notes: they are new activity types for the content issue. The `ask` step ignores the menu's answer (a result a later step can use is future work).
  - **Not checked in a browser:** how mashing and the note timing feel; real keyboard handling of Escape, and that key repeat is ignored.
