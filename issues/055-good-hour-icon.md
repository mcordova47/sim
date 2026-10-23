---
id: 055
title: Replace the GOOD HOUR text with an icon
status: done
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

### 2026-10-23: review (approve)
Independent review in a fresh agent. Own checks were run with a temporary vite harness and headless Chrome (both deleted; repo clean).
- Icon sprite 9x9 in `art/src`, loaded with the others: **pass**. `npm run sprites` leaves no diff; the png is 9x9; `sprite-names` lists it.
- Prompt shows the icon in place of the words, `X1.5` with the icon in the popup: **pass**. Rendered the real game at ?hour=8 (Make coffee, Water the plant) and ?hour=22 (Play guitar, night tint): the butter clock reads clearly after the verb and is not tinted. At ?hour=23 Play guitar (window ends at 23) correctly shows no hint. Popup rendered with a component harness: clock plus `X1.5` under `+105`.
- One line with the longest name: **pass**. Longest real prompt (Refill the humidifier) is 156px with the icon (200px with words), under the 312px limit; fits at the screen's top-right, bottom-left and centre; popups stay on screen at all four corners, with icon and with the words fallback.
- Legend and docs: **pass**. Achievements list shows the clock with `GOOD HOUR: 1.5X POINTS` fitted in the header row; `docs/tasks.md` has a Good hours section; `docs/art-style.md` notes the `icon-*` size exception.
- Missing sprite falls back to text, with tests: **pass**. Rendered with the sprite withheld: prompt says GOOD HOUR, popup says GOOD HOUR X1.5, and the legend is hidden. Hint is not shown for cooldown or unavailable prompts (gated in `game.ts` and again in `drawPrompt`).
- `npm run sprites`, `npm test` (1033 pass), `npm run build`: **pass**.
- Beyond criteria: scope is limited to the icon, the pipeline's `icon-*` size exception, prompt, popup, legend, docs and tests; PLAN.md and other issues untouched; no reference-photos or personal details.
- Nits, not blocking: `promptSize` still reserves hint width if called with `goodTime` while cooling, but the game never does that. The ink outline of the clock disappears against the ink prompt box, which is fine as the butter face carries it.
- Unverified: feel in a live browser; the icon at 1x on a real monitor (rendered only at 3x in headless Chrome).

Verdict: approve. PLAN.md row for 055 needs updating by the planner.
