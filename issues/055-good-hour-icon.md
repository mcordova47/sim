---
id: 055
title: Replace the GOOD HOUR text with an icon
status: review
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

### 2026-10-23: plan
Default icon: a small clock (butter face, ink hands, paper glint), 9x9. I kept the default; a star or sun/moon would say "bonus" or "time of day" less clearly than a clock says "the right hour", and the clock reads at 1x in the yellow-on-ink prompt and on the tinted night world.

### 2026-10-23: done, ready for review
- New `art/src/icon-good-hour.sprite` (9x9) and `public/sprites/icon-good-hour.png`. The pipeline required tile multiples, so `scripts/sprite-lib.mjs` now lets sprites named `icon-*` be any size (documented in `docs/art-style.md`, tested).
- Prompt (`render/world-ui.ts`): the icon replaces `GOOD HOUR` after the verb; `promptSize` takes `iconReady` so layout matches what is drawn. `drawPrompt` takes the sprite source.
- Popup (`render/popups.ts`, `game.ts`): a line can carry an `icon`; the award line is `[icon] X1.5`. `Popups` takes the sprite source.
- Fallback: with no sprite source or the sprite missing, the prompt says `GOOD HOUR` and the popup says `GOOD HOUR X1.5`, as before.
- Legend: the achievements list (L) shows the icon with `GOOD HOUR: 1.5X POINTS` in the header row (only when the icon can be drawn). `Game.sprites` getter added so the feature can reach the sprite source. `docs/tasks.md` has a Good hours section.
- Loaded with the other sprites (`sprite-names.ts`).
- Tests: `src/render/good-hour-icon.test.ts` (layout width with icon and words, fit for every real task, icon drawn vs fallback in the prompt, popup width and icon, game popup text with and without sprites, legend, sprite listed) and a pipeline test in `scripts/sprite-lib.test.mjs`.
- Checked: `npm run sprites`, `npm test` (1033 pass), `npm run build` pass. Rendered with a temporary headless Chrome harness (deleted) with the real game and sprites at 1x and 3x: prompt at 8:00 (Make coffee), popup (+105 with clock X1.5), prompt and popup at ?hour=23 (Close the blinds, with the night tint and lamp glow; icon and text stay clear of the tint), the words fallback (sprite withheld), and the achievements legend. The longest real prompt with the icon fits one line.
- Not checked: how it feels in a live browser; the icon at 1x on a real monitor.
- Notes: the prompt's old text hint was green; the icon is butter, so it reads on the ink box. The popup sits under the top-left HUD for tasks near the top wall; that is existing behavior.
