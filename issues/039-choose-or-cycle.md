---
id: 039
title: Choosing a task at an object (options, not only first-available)
status: todo
owner: claude
depends_on: []
---

## Goal
An object with several tasks currently offers the first one that can start, so the sofa and the bookshelf rotate by cooldown and requirements. Marc wants some things to be options the player picks, without taking up much screen: show one task at a time and press a key to cycle (to save space). From his playtest, 2026-10-23.

## Design (planner's defaults, 2026-10-23; Marc adjusts after playing)
- **No per-object configuration.** An object offers the tasks that can start right now, in the order they are listed. If exactly one can start, nothing changes from today. If two or more can start at the same time, the prompt shows the first and the player cycles through the others with a key. Tasks that exclude each other through `requires` (open and close the blinds, make and drink the coffee, the record sorts, make the bed and sleep) therefore stay automatic, and desk (work, side project, journal, tidy desk), sofa (doomscroll, work, nap, contemplate, admire the art), bed (work, doomscroll, sleep, make bed when both allowed) and bookshelf become choices without a flag.
- **Key:** `Tab` cycles forward, `Shift+Tab` backward (prevent the browser's focus move while the game has focus); also accept `Q` as an alias. Pick one in the log if a conflict shows up.
- **Prompt:** one line at the 320x192 view: the task's verb as today, and when more than one is available a small `<` and `>` (or a `1/3` count) beside it in the HUD, drawn from sprites or the pixel font. It stays one line with the longest name.
- **Selection memory:** the chosen task stays selected while the player stays facing that object, and resets to the first available when they walk away or face another object. After finishing a task, keep the same selection if still available, otherwise the first.
- **Unavailable tasks** (a requirement not met, or cooling down) are not in the cycle; if the first available task is the only one, the existing "why not" messages still show for the object's first task when nothing can start.
- Works with the saved game (nothing saved), the input lock, dialogs and activities (`Controls` needs the new key, from the pressed-key list added in 022; it must not trigger while a task runs or a dialog is open), and the good-hour icon (the icon follows the selected task).

## Acceptance criteria
- The design above is implemented and written into `docs/tasks.md`; the choice behaviour lives in the interaction system (`InteractionSystem`), not in per-object data.
- `unavailableReason` and `nearby` keep their current behaviour for the single-task case (the existing tests pass unchanged); new tests cover cycling forward and back, wrap-around, reset on leaving, selection kept after a task, cooldown and requirement changes while selected (an item becoming unavailable moves the selection), and the key not firing during tasks or dialogs.
- The desk offers Answer emails and the side project together when both can start (no more waiting for a cooldown), and the sofa and bed offer their choices.
- A rendered frame of the prompt with and without a choice at 1x; the longest prompt with the indicator fits one line. `npm test` and `npm run build` pass. Marc plays it.

## Progress log
