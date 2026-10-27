---
id: 086
title: HUD ribbon, stage 1: icons and small bars in the empty top band
status: done
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

- 2026-10-27 (independent review): verdict CHANGES NEEDED (one small, real defect on the narrow view; the rest passes).
  - Run: `npm test` (109 files, 2578 tests), `npx tsc --noEmit`, `npm run build`, `npm run sprites` (no diff left in the tree): all pass.
  - Criterion results:
    - Nothing drawn below y 32: pass for the HUD (hud.test.ts checks every rect, text and icon box for many scores, combos and states on both views; I also read the code: all HUD drawing is inside chips at y 2..15 and the stop hint at y 3 or 17..25). Rooms: pass in effect (camera puts every room's top at y >= 32 on both views, rooms are at most 160 tall), but note the test checks the camera offset, not rendered pixels as the criterion words it, and I did not look at every room's props for sprites that stick up above a room's top edge (can't verify).
    - Panels gone, ribbon shows score, combo, clock, energy, mood: pass. Looked at headless-Chrome screenshots (desktop at 9:40 energy 80 mood 90; desktop at 11:00 night, energy 5 mood 10; narrow view at dusk 6:30, energy 5 mood 10; also dusk 6:00). Sun, dusk and moon icons read correctly; `9:40` has no AM/PM; low energy is a brick bolt with a near-empty red bar, low mood a sad tangerine face with a red bar; both are legible. No painting is covered. Phone slot is width 0 as asked.
    - Goldens: pass. I rebuilt both branch and main in scratch copies with the HUD draw and stop hint stubbed out: the main-room frame dumps (48 full logs) are byte-identical, and the sleep golden re-recorded from both is identical, so the golden changes are the HUD and nothing else.
    - Popup and toast placement tests: pass. HUD_BOX and STATUS_BOX uses in render.test.ts, dialog-box.test.ts and toasts tests are untouched and still pass (HUD_BOX is the 5-digit width by default, so they are not weakened); ui-data.test.ts is strengthened (now also STATUS_BOX); narrow-view.test.ts now asserts the right edge, equivalent.
    - Build, tests, tsc, sprites: pass.
    - Marc looks in the browser: not done by me; see unverified.
  - Scope: only issue 086 files (icons, config, layout, hud, state, game.ts one line, tests, goldens, sprite-names). PLAN.md and other issues untouched. No privacy problem.
  - Defects found:
    1. Narrow view (224 px): a toast and the ESC TO STOP hint overlap. The hint sits at y 17..25 (x about 80..146) and the first toast slot starts at y 19 (x 48..198), so a toast arriving during a cancellable activity lands on the hint (measured with ToastQueue and stopHintAt). On the desktop the hint is at y 3 and is clear. The sound feature's comment promises its tags stay clear of "the toasts and the ESC TO STOP hint"; this breaks that on the narrow view. No test covers hint against toasts.
    2. Minor, probably not worth a fix: on the narrow view the two chips touch and cross at 13 or more score digits (gap is 15 px at 10 digits, 3 at 12, -3 at 13); the author's test stops at 10 digits. Either cap the displayed width or say it is out of range.
    3. Minor: the stop hint on the desktop view moves right as the score gains digits (centre 148 at 5 digits, 163 at 10), because it is centred in the gap.
  - Checklist for the author:
    - [ ] Keep toasts clear of the stop hint on the narrow view (for example start the toast stack under the hint line there, or add the hint's box to TOAST_AVOID), and add a test that a toast never overlaps the hint box on either view.
    - [ ] Decide on 13+ digit scores on the narrow view (clamp the digits used for layout, or note it as out of range in the issue) and extend the test to what you decide.
    - [ ] Optional: make the render-each-room test look at real pixels (or say in the issue that the camera offset check stands in for it).
  - Unverified (not checked by me, record as open): how it feels in a real browser or on a phone; a screenshot with a 10-digit score (the score cannot be set from the URL, only the geometry was checked); every low state at once on the narrow view at 10 digits; every room's props against the band.

- 2026-10-27 (independent review, round 2): verdict APPROVE.
  - Run: `npm test` (109 files, 2580 tests), `npx tsc --noEmit`, `npm run build`, `npm run sprites` (tree clean afterwards): all pass.
  - The round-1 defect is fixed. Commit 43be1ad changes only `toasts.ts` (toast stack starts under `max(STATUS_BOX bottom, ribbonBottom(VIEW))`), a new `ribbonBottom` in `hud.ts`, and a test. I measured with ToastQueue: desktop hint y 3 (clear), first toast y 19; narrow hint y 17..25, first toast y 27, second y 64..107 (well inside the 208 px view). Stable for 1 to 13 digits. The new test ("toasts and the stop hint") fails against the old start of y 19 on the narrow view and passes now. Toasts no longer move with the score on either view. Draw code, goldens and the other tests are untouched by the fix, so the round-1 results (goldens explained only by the HUD, nothing HUD below y 32, panels gone, popup/toast/label tests not weakened, scope, privacy) still stand.
  - Not fixed, accepted as minor: (2) on the narrow view the chips touch at 13+ score digits (a score that large is far out of range); (3) the desktop hint drifts right a few px as the score gains digits; (4) the room test checks the camera offset, not rendered pixels. None blocks stage 1.
  - Unverified (open): how it feels in a real browser or on a phone (Marc's look, the last acceptance item); a screenshot with a 10-digit score; every low state at once on the narrow view at 10 digits; every room's props against the band.
  - Merge branch: issue/086-hud-ribbon. PLAN.md table needs updating by the planner.
