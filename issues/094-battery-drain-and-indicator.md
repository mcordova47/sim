---
id: 094
title: Phone battery: drains a little, and looks like a phone battery indicator
status: review
owner: claude
depends_on: [088]
---

## Goal
Marc's answers to the open questions of issue 088 (2026-10-27): the battery drains a little with each Doomscroll and slowly with the clock; it is drawn like a phone battery indicator (horizontal, a few segments, green then orange then red); a dead phone refusing phone tasks or ads is postponed as a future idea.

## What to build
- **Drain** (all numbers in the `BATTERY` table in `config.ts`, easy to tune): each completed Doomscroll takes a few points (suggest about 6) and the level falls slowly with game time (suggest about 1 point per game hour, so a full phone lasts several game days; pick numbers so it falls under 20 now and then in normal play but is never urgent). Sleeping drains at the same rate per game hour, or less (a phone on a nightstand): say which. The level never goes below 0. Charging is the same task as now (fills to 100, 60 second cooldown). Nothing else reads or changes the level: **no task is refused, no ad is blocked, no mood or energy change** (the postponed idea). Old saves load as before.
- **The indicator:** replace the phone icon plus bar in the ribbon's phone slot with a horizontal battery: an outline with a small nub at the right and four segments (like the four-segment picture Marc shared, but our own pixel art in the palette), filling from the left as the level rises; green while it is high, orange in the middle, brick under 20. The plug (or a small bolt) shows for a few seconds after a charge as now. It must fit the slot at the same widths as today (the narrow view's 8-digit score limit and the desktop view), so about 12 x 7 px; draw it as a sprite set or in code from rectangles, whichever matches how the other HUD icons are made. A percentage readout is optional and only if it fits (the pause screen or the future peek key is a better home; say so in the log rather than cramming it in).
- **Charger prop and other art:** unchanged unless the new look needs it.
- Text for `docs/text-review.md` only if a line changes; update `docs/state.md`, `docs/tasks.md` and `docs/hud-design.md` section 8 to match.

## Acceptance criteria
- Tests: Doomscroll drains by the configured amount; the clock drains with game time (and through sleep as decided); the level clamps at 0; charging fills it; no other task or ad is affected; the indicator draws the right number of segments and colour at the boundaries (0, 19, 20, 50, 51, 99, 100) and the chips still fit at the existing digit limits on both views.
- Golden frames re-recorded deliberately with a note that only the HUD slot changed (and the drain does not alter the existing goldens' states).
- `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run sprites` pass. Marc looks at it in the browser; unverified items listed.

## Progress log

- 2026-10-27: Plan: a `BATTERY` table in config (fall per hour, sleep factor, Doomscroll cost), drain in `ApartmentState.tick` and in skipped clock time, a four-segment battery drawn from rectangles in the ribbon's phone slot, tests, docs, goldens.
- 2026-10-27: Built.
  - Numbers (`BATTERY` in `config.ts`): clock 1 point per game hour; Doomscroll 6; sleep and naps at 0.5 per skipped game hour (a phone on a nightstand). A game hour is 30 real seconds, so a full phone lasts about 4 game days (roughly 48 minutes of play) with no scrolling; each Doomscroll is about 6 game hours of drain. The starting 40 reaches the brick zone after about 20 game hours, so low shows up now and then but never urgently. Chosen to be gentle, easy to tune in one table. Clamped at 0.
  - Drain code: `state.ts` tick (written after plantDry, so event order for existing vars is unchanged) and `applyEffects` (positive clock adds, i.e. sleep and naps, at the sleep rate; skipped when the same effect list sets the battery, as charging does). Doomscroll's effect list gained `battery -6`. Nothing reads the level: no task, ad, mood or energy depends on it.
  - Indicator (`hud.ts`, `HUD` in config): drawn from rectangles, no new sprite. Outline 13 x 7 plus a 1 x 3 nub, interior ink, four segments 2 px wide with 1 px gaps filling from the left, one per quarter rounded up (0 lit at 0 only; 1 to 25 lights one, 26 to 50 two, 51 to 75 three, 76 to 100 four). Leaf above 50, tangerine 20 to 50, brick under 20. A 3 x 5 butter bolt over the segments for 4 s after the level rises (replaces the plug icon swap). The slot is 20 px, down from 23, so there is more room than before. `icon-phone` and `icon-plug` sprites are no longer drawn by the HUD; left in the art folder, removed from the HUD icon list (loaded icons 11 to 9). No percentage readout: the pause screen or the future peek key is the better home.
  - Tests: `battery.test.ts` (clock drain, clamp, skipped time and the set-wins rule, Doomscroll cost and clamp, only Doomscroll and charge touch it), `hud.test.ts` (segments at 0, 1, 19, 20, 25, 26, 50, 51, 75, 76, 99, 100, out-of-range; colours at 19, 20, 50, 51; fill order; bolt; slot width; existing in-band and digit-limit tests unchanged and pass). Edited existing tests: `state.test.ts` (two event-order lists now end with battery, which changes hourly), `escape.test.ts` (battery joins the time-driven vars excluded from the cancel snapshot).
  - Goldens: `main-room-frames.json` (48 frames) and `sleep-frames.json` (14) re-recorded; every frame is exactly +3 draw calls, so only the HUD slot changed. I looked at the room in headless Chrome at `?set=battery:60` (battery with 3 green segments, fits the chip).
  - Checks: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run sprites` pass.
  - Not checked: how it feels in a real browser over time (drain pace), and the touch layer on a phone. Dev shortcut to look: `npm run dev`, `/?set=battery:15` (brick, one segment), `battery:45`, `battery:0`, add `&touch=1` for the narrow view.
