---
id: 063
title: Plants that grow in stages
status: review
owner: marc + claude
depends_on: []
---

## Goal
Marc's idea (2026-10-23): different growth stages for plants. The snake plant (and others later) can be watered and visibly change over days, and perhaps wilt if neglected. Natural pair with customizable decor (issue 062: buying new plants).

## Acceptance criteria
- A `plantStage` state variable per plant (start with the one real plant, the snake plant on the bookshelf) with stages such as sprout, small, full and flowering, driven by watering and time (the in-game clock; a day is 12 minutes): each watering moves progress, a long gap without water sets it back or wilts it (a `wilted` look), with tuning in `config.ts`. Quiet and plain: no punishing, the plant never dies (it just droops and recovers).
- Sprites per stage, same slot as today (`plant-0..3`, plus `plant-wilted`), drawn from the real plant photo (`reference-photos/dried-flowers-on-top-of-bookshelf`, and the plant on the bookshelf, absolute paths, never copied into the repo); variants chosen by the state each frame like the dishes and bed, with the top of the bookshelf sprite showing the plant (that sprite currently draws the plant inside `bookshelf`, so the plant becomes its own overlay piece or a bookshelf variant per stage; say which).
- Saved with progress (009c), tolerant of old saves (missing variable gets its default).
- A water-plant task that reflects the state (watering a full plant says it is fine; a wilted one revives), and a small particle effect hook (009b) when it grows.
- Tests for the stage rules and wilting (clock-driven, deterministic), a rendered frame of each stage, `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log

- 2026-10-23 (agent): plan. Plant becomes its own overlay piece (a `Prop`) on top of the bookshelf, not a bookshelf variant per stage: it is 5 small sprites instead of 5 copies of a 16x64 shelf, and it matches the swappable `plant-shelf` slot in the 062 design note (docs/decor.md on its branch). State: `plantStage` (0 sprout, 1 small, 2 full, 3 flowering), `plantGrowth` (waterings toward the next stage), `plantDry` (game hours since watered, advanced by the game clock). Tuning in `PLANT` in config.ts. Tone: quiet; the plant never dies or loses a stage, it only droops after a long dry gap and one watering perks it up.
- 2026-10-23 (agent): done, ready for review.
  - **Rules (src/game/plant.ts, config `PLANT`):** a watering counts only when the soil has dried 6 game hours (3 real minutes); otherwise the bookshelf offers "Check the plant" ("The soil is still damp. The plant is doing fine."). 2, 3 and 4 counted waterings grow it out of sprout, small and full; flowering is the end (watering it still resets the dry clock). Dry for 96 game hours (4 game days, 48 real minutes of play) and it droops (`plant-wilted`, whatever the stage); "Water the drooping plant" perks it up, keeps its stage. Sleep and nap add the hours they skip to `plantDry`. Starts at stage 1 (small) with 12 dry hours, so the first watering is available at once. All of it runs off `state.tick` (the game clock) and effects, nothing random, nothing real-time.
  - **Overlay:** `Level.props` / `Prop` (level.ts), `PropDef` in tilemap.ts (`props` map option), drawn in `Game.drawWorld` just after its piece. The plant is a 16x16 prop in slot `plant-shelf` at (0, 36) on the bookshelf; the `bookshelf` sprite now shows bare oak where the plant was. Variants are picked by state each frame (drooping, then stage 3, 2, 1, fallback 0). Compatible with 062: a decor system only has to change the prop's sprite family; `plant-0..3` and `plant-wilted` are the family names the note expects.
  - **Tasks (tasks.ts):** `water-plant-droop`, `water-plant`, `check-plant`, one `exclusive` group so exactly one is offered. `water-plant` keeps its id (Green Thumb counts it; a drooping-plant watering is a different id and does not count toward it, a minor wart left for the planner).
  - **Particles (009b):** `leafGlint` bits from the plant when `plantStage` rises and when it perks up after drooping (`PARTICLES.plantGrow`); an ordinary watering makes none beyond the task confetti.
  - **Art:** sprites drawn as impressions of the real plant (upright banded sword leaves, white pot with a scalloped rim; `east-facing-view-of-bookshelf` and `dried-flowers-on-top-of-bookshelf` in /Users/marccordova/Dev/repos/mcordova47/life/reference-photos/). Photos not copied. Only palette keys.
  - **Dev shortcut for Marc:** `npm run dev`, then open `http://localhost:5173/?set=plantStage:0` (or 1, 2, 3). Drooping: `?set=plantStage:2,plantDry:100`. Comma separated `variable:value`, applied quietly after any saved progress loads (src/main.ts). The shelf is east of the start.
  - **Tests:** src/game/plant.test.ts (22): defaults, old and new saves, dry clock and cap, growth thresholds, leftover, real watering tasks spaced by the game clock, determinism, "still damp" check, flowering watering, drooping and perking up, never dies, sleep and nap, look per state, the prop's slot and size, sprite files, particles. Updated the two older tests that listed time-driven variables (state.test.ts tick order, escape.test.ts snapshot ignore list) to include `plantDry`.
  - **Checked:** `npm run sprites`, `npm test` (1461 pass), `npm run build` pass. Rendered the real game in headless Chrome at 1x and 4x for stages 0 to 3 and drooping (plant at the south end of the bookshelf top, pot sits above the front slice), and a harness frame after growth showing the glints (harness removed).
  - **Not checked:** how the pace of watering and the droop time feel in a long session (tuning values are in `PLANT`); real keyboard play.
  - **Out of scope, noted:** the Green Thumb achievement wording and the water-plant flavor line (text review, 037); decor swapping (062).
