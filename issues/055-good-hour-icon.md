---
id: 055
title: Replace the GOOD HOUR text with an icon
status: todo
owner: claude
depends_on: []
---

## Goal
From Marc's playtest of 009d (2026-10-23): the green `GOOD HOUR` hint in the task prompt, and `GOOD HOUR X1.5` in the award popup, take up a lot of space; use a small icon instead.

## What a good hour is
Each task can list hours when it fits the time of day (coffee and the bed in the morning, dinner in the evening, a nap in the afternoon, and so on). Finishing it inside those hours multiplies its points by 1.5. The prompt shows the hint while a task is available at a good hour, and the popup says so when it paid.

## Acceptance criteria
- A small icon sprite (about 8x8 or 9x9; a sun for day tasks, a moon for night ones, or one shared star or clock glyph; Marc picks, default a single small clock-with-sparkle or star) drawn next to the task prompt in place of the words, and next to the multiplier in the award popup (`X1.5` stays as text or a short `+50%`).
- The prompt still fits one line at the 320x192 view with the longest task name, and the icon stays visible at night under the tint (the HUD is not tinted).
- The meaning is findable: a one-line legend where it helps (the achievements list or a help line), and the docs say what the icon means (`docs/tasks.md`).
- Icon sprite added to `art/src` and loaded like the others; missing sprite falls back to the current text. Tests for the layout and the fallback.
- `npm run sprites`, `npm test` and `npm run build` pass; render the prompt and popup and look at them at 1x.

## Progress log
