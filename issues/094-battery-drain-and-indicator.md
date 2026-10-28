---
id: 094
title: Phone battery: drains a little, and looks like a phone battery indicator
status: todo
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
