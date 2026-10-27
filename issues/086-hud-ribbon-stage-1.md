---
id: 086
title: HUD ribbon, stage 1: icons and small bars in the empty top band
status: review
owner: claude
depends_on: [048]
---

## Goal
Build stage 1 of the HUD design Marc picked (layout B, `docs/hud-design.md`, issue 048): replace the two corner panels with a one-row ribbon in the empty top 32 px of the picture, so the status area stops covering the top-right painting. This stage keeps the small bars always visible so Marc can see it first; the show-on-change rule is stage 2.

## What to build (see the note's sections 4 to 7 and its stage plan)
- New small icons (the note's list: sun, dusk, moon, bolt, bolt-low, three faces, star; 7x7 each, off-grid as `art-style.md` allows; `icon-phone` and `icon-plug` are for the later battery issue, not this one), drawn as sprites in the usual pipeline.
- `HUD_BAND` (the top 32 px) and chips instead of the two panels: left chip for the score and combo, right chip for the clock with its sun, dusk or moon icon (`9:40`, no AM/PM, Marc's answer), energy and mood as an icon with a small bar. Everything else in the picture stays as it is.
- Popups, labels and toasts keep avoiding the HUD: the avoid boxes follow the chips (the right chip's grown extent is about 116 px, see the note), and the existing tests that use `HUD_BOX` and `STATUS_BOX` are updated, not weakened.
- The score chip is sized for five digits and widens to the right for more.
- A slot (empty for now) is left for the phone icon of the later battery issue.

## Acceptance criteria
- Nothing from the HUD is drawn below y 32 in any room, so no painting, door or prop is covered (a test that renders each room and checks the pixels below the band are the room's own, on the real map).
- The corner panels are gone; the ribbon shows score, combo, clock, energy and mood at rest and while values change; low energy and low mood are legible (colour and icon).
- Golden main-room frames are re-recorded deliberately with a note of what changed, and the sleep and dialog goldens are unaffected or explained.
- Popup and toast placement tests pass against the new boxes.
- `npm test`, `npx tsc --noEmit`, `npm run build` pass; sprites regenerate cleanly (`npm run sprites`).
- Marc looks at it in the browser (stage 1 is made to be looked at); unverified items are listed.

## Progress log

- 2026-10-27 (claude): started. Plan: nine 7x7 `icon-*` sprites, a `HUD` table in config.ts, chips in layout.ts (boxes follow the chips; the score chip widens past five digits), a rewritten `Hud.draw`, the stop hint moved clear of the ribbon.
- 2026-10-27 (claude): done, status review. What changed:
  - Icons: `icon-star, sun, dusk, moon, bolt, bolt-low, face-happy, face-flat, face-sad` (art/src, rendered by `npm run sprites`; loaded through `HUD_ICON_NAMES` in `sprite-names.ts`). Until a sprite loads a one-letter text stands in.
  - `src/game/config.ts`: `HUD` table (band 32, chip sizes, padding, bar size, five digit score field, mood face threshold, sun/dusk/moon hours, `phoneSlotWidth` 0 = the empty slot for issue 088).
  - `src/render/layout.ts`: `HUD_BOX` (score chip) and `STATUS_BOX` (clock chip) are now each chip plus a 2 px margin; the left one widens with the score's digits (`setScoreDigits`, called by the Hud), the right one hugs the current view's right edge (320 or 224). `hudChips`, `leftChipWidth`, `RIGHT_CHIP_WIDTH` are exported.
  - `src/render/hud.ts`: ribbon. Left chip: star, score, `X1.0` (butter with the 2 px drain bar under it while a chain is on, grey otherwise). Right chip: sun/dusk/moon and `9:40` (new `formatClockShort` in state.ts, no AM/PM), bolt and bar, face and bar (always on in stage 1; low energy: brick bolt and bar; low mood: sad tangerine face and brick bar). The old corner panels are gone. `Game` passes its sprite drawer.
  - The "ESC TO STOP" hint: in the gap between the chips when the words fit (desktop, y 3, as before); otherwise on its own line just under the chips (narrow view, y 17), so it never lands on a chip.
  - Tests: new `src/render/hud.test.ts` (icon choices; every box the HUD draws, for desktop and narrow view, many scores, combos, states, sprites loaded or not, ends at y 32 or above; chips do not touch; stop hint clear of both chips; every room is drawn at y 32 or lower on both views, so nothing of a room is under the band). Updated, not weakened: `ui-data.test.ts` (label sweep now keeps clear of both HUD_BOX and STATUS_BOX, as the game does), `narrow-view.test.ts` (status box ends at the right edge of each view).
  - Goldens: `main-room-frames.json` and `sleep-frames.json` re-recorded after looking at the rendered game; the only difference is the HUD's draw calls (fewer, smaller panels and icons). The sleep golden includes the HUD, so it changed for that reason alone.
  - Toasts now start at y 19 (under the chip) instead of y 52.
  - Checked: `npm test` (109 files), `npx tsc --noEmit`, `npm run build`, `npm run sprites`; screenshots of the desktop view and `/?touch=1&view=narrow` in headless Chrome looked right (ribbon in the band, no painting covered, prompt clear).
  - Not checked: how it feels on a real phone or in Marc's browser; the 224 px view with a score of 10+ digits and every low state on screen (the tests cover the geometry, not a screenshot).
