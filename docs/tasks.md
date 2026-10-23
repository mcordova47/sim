# Tasks that vary (issue 035)

Where the original task list is in `src/game/tasks.ts`; this lists what issue 035 added or changed. Objects offer the **first task that can start**, so a spot with several tasks rotates through them as each goes on cooldown or its requirements stop holding. State does the alternating.

## Alternating, by state
| State | Tasks | How it alternates |
|---|---|---|
| `blinds` (0 closed, 1 open) | Open the blinds, Close the blinds | each requires the other state; the window's variant follows `blinds` |
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
- **Admire the art** (`admire-art`, sofa): a scene that shows a full-screen picture of the south gallery wall (`view-gallery-wall`), says two lines and takes it away. Nobody walks; the map is unchanged.

## Notes
- The blinds use `window-blinds-open` and `window-blinds-closed`.
- `view-gallery-wall` is a labelled placeholder (320x192) until an art issue draws it from Marc's photos.

## Side projects (issue 051)
Side projects are data: `SIDE_PROJECTS` in `src/game/side-projects.ts`, each with its own points, cooldown, mood and energy change, good hours, picture and lines; `sideProjectTask` turns an entry into a task. To add one, add an entry and its id to the standing desk's tasks in `apartment.ts`. The desk offers the first task that can start, and Work on the side project sits right after Answer emails, so it comes up while work is cooling down.

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
| Admire the art +8, Flip the record +5 | art and music |
| Write in the journal +6 (pays +0.2 per mood point), Take a shower +6 | small rituals |
| Water the plant +3, Make the bed +3, Brush teeth +2, Take out the trash +2, Take a moment +2 | |

| Lowers mood | |
|---|---|
| Doomscroll -8 | |
| Work (emails, couch, bed) -5 each | |
| Do the dishes -2 | |

Low mood: crossing below `MOOD.lowBelow` (25) shows a "SIGH..." popup over the player. A slumped walk or different idle line is left for later. Mood changes go through `stateChanged` like any variable.
