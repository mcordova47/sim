---
id: 063
title: Plants that grow in stages
status: todo
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
