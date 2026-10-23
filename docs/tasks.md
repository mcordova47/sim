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
- The blinds sprites for each state are drawn in issue 036 (`window-blinds-open`, `window-blinds-closed`). Until then both states use `window-blinds`.
- `view-gallery-wall` is a labelled placeholder (320x192) until an art issue draws it from Marc's photos.
