# Tasks that vary (issue 035)

Where the original task list is in `src/game/tasks.ts`; this lists what issue 035 added or changed. An object offers the tasks that can start right now (see "Choosing a task" below). Tasks that exclude each other through `requires` therefore alternate by themselves, and State does the alternating.

## Alternating, by state
| State | Tasks | How it alternates |
|---|---|---|
| `blinds` (0 closed, 1 open) | Open the blinds, Close the blinds | each requires the other state; both east windows (issue 065) follow `blinds` and offer the task that applies, so either one changes both |
| `plate` (0 none, 1 on the table) | Reheat leftovers, Cook dinner (set it), Eat dinner (clears it) | not an alternation: Eat dinner is still allowed with no plate out (it just leaves it at 0). Sleeping does not clear it. The table draws `table-plate` at 1, `table` (bare wood) at 0 |
| `mug` (0 empty, 1 full) | Make pour-over coffee, Drink the coffee | making needs an empty mug, drinking a full one |
| `recordSort` (0 to 3, wraps) | Alphabetize, Arrange by year, Rank by favorites, Arrange by color | automatic: each ordering needs its turn, finishing moves it on; after color it is alphabetical again. No menu |

## What you type
| Task | Where | Lines |
|---|---|---|
| Answer emails (`work`) | desk | email lines |
| Code from the couch (`work-sofa`) | sofa | code lines |
| Work in bed (`work-bed`) | bed | a mix |

Lists: `src/game/typing-text.ts`.

## New
- **Clean the desk** (`tidy-desk`, desk): points and a flavor line only; changes nothing; cooldown 90 s.
- **Take a nap** (`nap`, sofa): needs energy under `NAP.below`; adds `NAP.energy` and an hour; leaves the bed alone.
- **Admire the art** (`admire-art`, sofa): a scene that shows a full-screen picture of the south gallery wall (`view-gallery-wall`), then pushes in on one of the ten pieces (2x, 4x, 8x, scaled from the same picture, so the last is big square pixels) with a serious line at each level, and takes it away. A different piece each time, in the order of `src/game/art-pieces.ts` (the `artPiece` state variable, which wraps); that file holds all the text. Nobody walks; the map is unchanged.

## Notes
- The blinds use `window-blinds-open` and `window-blinds-closed`, on both east windows. The plain `window` sprite is kept for later use.
- The coffee mug on the table (issue 065) is a prop (`mug-table`, 8x6 inside a 16x16 cell) drawn only while `mug` is 0: making coffee takes it off the table (the player carries the held-mug overlay) and drinking puts it back.
- The dinner plate (issue 065): the `plate` state variable, saved like the others; an old save without it starts at 0.
- `view-gallery-wall` is a labelled placeholder (320x192) until an art issue draws it from Marc's photos.

## Side projects (issue 051)
Side projects are data: `SIDE_PROJECTS` in `src/game/side-projects.ts`, each with its own points, cooldown, mood and energy change, good hours, picture and lines; `sideProjectTask` turns an entry into a task. To add one, add an entry and its id to the standing desk's tasks in `apartment.ts`. The desk offers every task that can start, so Work on the side project is a choice beside Answer emails (issue 039).

Only one is written: **Work on the side project** (`side-project-game`, desk). A cutscene that shows `view-side-project` (a lower-res picture of this game's own main room, with the small player at the desk, inside a monitor frame), three quiet lines, and puts the picture away. 45 points, 90 s cooldown, mood +4, energy -5, needs energy 10, best 20:00 to midnight. The wording is a draft for the text pass (037).

`view-side-project` is the real game rendered once at 320x192 in a browser, shrunk 2x by averaging 2x2 blocks and snapped to the palette (160x96), then set in the frame. To refresh it after the art changes, render a frame of the game with the player at the desk, redo the shrink and compose into `art/src/view-side-project.sprite`.

## Mirror (issue 041)
On the bath vanity, ahead of Brush teeth. **Look in mirror** is four tasks with the same prompt, each a short two-line dialog (`dialog-data.ts`, `MIRROR_*`); the vanity offers the first that can start:

| Task | When | Thresholds (`MIRROR`, config.ts) |
|---|---|---|
| `mirror-tired` | energy is low, any hour | energy at or below `tiredBelow` |
| `mirror-morning` | clock from `morningFrom` to `dayFrom` | 5 to 12 |
| `mirror-day` | `dayFrom` to `nightFrom` | 12 to 21 |
| `mirror-night` | from `nightFrom` to `morningFrom`, past midnight | 21 to 5 |

15 points, no state change, 60 s cooldown each. After one, the vanity falls through to Brush teeth. No mood change yet; mirror lines can use mood now that 038 has landed. Wording is a draft for the text pass (037).

## Good hours (issues 009d, 055)
A task can list `goodHours` (in `GOOD_HOURS` in `tasks.ts`): the times of day that suit it, such as coffee in the morning or dinner in the evening. Finishing it inside one multiplies its points by `TIME_OF_DAY.bonusMultiplier` (1.5).

The small yellow clock icon (`icon-good-hour`, 9x9) means "this pays extra now". It shows after the verb in the task prompt while the task can start at a good hour, and beside `X1.5` in the award popup when the bonus paid. The achievements list (L) has a one-line legend for it. If the sprite is missing, the prompt says `GOOD HOUR` and the popup says `GOOD HOUR X1.5` in words, as before.

## Mood (issue 038)
`mood` runs 0 to 100 and starts at 60. It is a nudge, never a lock: no task requires it. Every 1 game hour it moves `MOOD.driftPerHour` (3) toward `MOOD.rest` (50) and never past it, so it cannot stay at either end. Tuning is in `config.ts` (`MOOD`); the changes are in `tasks.ts`.

| Raises mood | |
|---|---|
| Take a nap +3, Go to sleep +10 | rest |
| Play three chords +10 | music (also pays +0.3 points per mood point) |
| Eat dinner +6, Cook dinner +4, Drink the coffee +4, Make coffee +2, Reheat +2 | food |
| Open the blinds +5 | light |
| Admire the art +8, Flip the record +5 (only for a different record, at most once per 10 game minutes; no cooldown) | art and music |
| Write in the journal +6 (pays +0.2 per mood point), Take a shower +6 | small rituals |
| Water the plant +3, Make the bed +3, Brush teeth +2, Take out the trash +2, Take a moment +2 | |

| Lowers mood | |
|---|---|
| Doomscroll -8 | |
| Work (emails, couch, bed) -5 each | |
| Do the dishes -2 | |

Low mood: crossing below `MOOD.lowBelow` (25) shows a "SIGH..." popup over the player. A slumped walk or different idle line is left for later. Mood changes go through `stateChanged` like any variable.

## Choosing a task (issue 039)
No per-object setting. An object offers the tasks that **can start right now** (off cooldown, requirements met), in the order they are listed on the object.
- Exactly one can start: nothing changes. `[E]` starts it.
- Two or more: the prompt shows the first, with `<1/3>` after the verb, and the player cycles. **Tab** (or **Q**) goes forward, **Shift+Tab** (or **Shift+Q**) backward, wrapping. `E` starts the shown task. Tab's browser focus move is prevented.
- Tasks that exclude each other through `requires` (blinds, make and drink coffee, the record sorts, make the bed and sleep) are never available together, so they stay automatic. The desk, the sofa, the bed, the dining table, the fridge, the bath vanity and the bookshelf become choices when several apply.
- None can start: the first task on the object is shown, greyed, with its reason or cooldown, as before. Unavailable tasks are not in the cycle.
- **Selection memory:** only a pick the player made is remembered, and only while they keep facing that object. It resets to the first available when they walk away, face another object, or change rooms. Finishing a task keeps the pick if it is still available; if it went on cooldown, or lost a requirement, the first available is shown. With one task left there is nothing to pick.
- The good-hour icon and the "why not" messages follow the shown task. The sound feature's record-stand check follows it too.
- The key is read from the pressed-key list (`Controls.keys`, with Shift from `keysDown`) inside `InteractionSystem.update`. It does nothing while a task runs (and not the frame one ends, so a Tab typed in the typing game cannot cycle), while a dialog is open, or while input is locked: all of those hand the system `NO_INPUT` or return before the check.
- Code: `InteractionSystem.choices` (the offered tasks when two or more), `nearby` (the shown one), `choiceIndex`; the prompt count is drawn by `drawPrompt` in `src/render/world-ui.ts`. Tests: `src/game/task-choice.test.ts`, `src/render/choice-prompt.test.ts`.

## Flatten the boxes and opening packages (issue 066)
The boxes in the kitchen are the state variable `boxes`: 1 is the stack, 0 is flat, 2 is gone (issue 070; the 066 numbers keep their meaning, 2 is new). Flatten the boxes (45 points, its usual cooldown) is only offered with a stack, says `NO BOXES TO FLATTEN` otherwise, and sets it to 0. Opening a package at the front door (`collect-delivery`) sets it back to 1, so there is always something to flatten after a delivery. It does this even while flattening is still cooling down: the cooldown only holds back the task, not the stack. Several waiting packages give the same single stack. Take out the recycling (`recycle-boxes`, 55 points, at the recycling and the bin) takes flat boxes out and sets 2. It shares the `exclusive` name `trash` with Take out the trash and comes first, so with flat boxes it is the one offered; with a stack or no boxes Take out the trash is offered as before and the boxes stay. It is hidden unless the boxes are flat, so with a stack or no boxes the bin shows Take out the trash (and its cooldown message). The reasons `FLATTEN THE BOXES FIRST` and `NO BOXES TO TAKE OUT` stay on the task as a safety net. Sprites: `boxes` (the stack), `boxes-flat` and `boxes-gone` (the pantry tub alone), all 32x16. A recycling bin item (issue 062 stage 4) would change how the flat boxes look.

## Variants of one task (`exclusive`)
Tasks that are variants of one thing share an `exclusive` name on the task (the four mirror tasks use `"mirror"`). When more than one could start, only the first is offered, so the choice cycle never lists the same thing twice. Order in the task list decides which wins (worn out beats the hour).
