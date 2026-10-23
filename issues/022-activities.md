---
id: 022
title: Activities, mini-games and cutscenes
status: todo
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
