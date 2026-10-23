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
- **Admire the art** (`admire-art`, sofa): a scene that walks to `GALLERY` (config.ts), looks, says two lines and walks back.

## Notes
- The blinds sprites for each state are drawn in issue 036 (`window-blinds-open`, `window-blinds-closed`). Until then both states use `window-blinds`.
- The gallery wall's place on the map is not set yet; `GALLERY` is a stand-in floor tile on the north wall.

## Mirror (issue 041)
On the bath vanity, ahead of Brush teeth. **Look in mirror** is four tasks with the same prompt, each a short two-line dialog (`dialog-data.ts`, `MIRROR_*`); the vanity offers the first that can start:

| Task | When | Thresholds (`MIRROR`, config.ts) |
|---|---|---|
| `mirror-tired` | energy is low, any hour | energy at or below `tiredBelow` |
| `mirror-morning` | clock from `morningFrom` to `dayFrom` | 5 to 12 |
| `mirror-day` | `dayFrom` to `nightFrom` | 12 to 21 |
| `mirror-night` | from `nightFrom` to `morningFrom`, past midnight | 21 to 5 |

15 points, no state change, 60 s cooldown each. After one, the vanity falls through to Brush teeth. No mood change: mood (038) is not merged. Wording is a draft for the text pass (037).
