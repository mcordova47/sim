---
id: 092
title: Mobile landscape: the controls must not cover the picture
status: todo
owner: claude
depends_on: [087, 090]
---

## Goal
Marc (2026-10-27), trying the touch layer in landscape (two screenshots: a cutscene picture with its dialog, and the L list): the d-pad, A, B and the three pills float over the picture and cover text (the dialog's end, the L screen's "1.5X POINTS" and "DIALOG VOICE: LETTERS" and its footer line). In landscape the controls should not hide anything.

## What to do
- Lay the landscape view out so the picture and the controls do not overlap: the picture is sized (a whole-number or quarter-pixel fit, as the portrait fit does) to leave a side margin or a bottom strip for the controls, d-pad on the left and A and B on the right as in the handheld idea (`docs/mobile.md` section 2.5 and the landscape arithmetic in 2.1 and 13). If the screen is too short for the controls beside a readable picture, say so and pick the least bad: a smaller picture, controls that become translucent and shrink, or pills moved out of the picture's corners; never a control over text that matters (dialogs, menus, the L list, ad cards).
- Check the common iPhone landscape sizes (844x390, 932x430 and the Safari-with-bars variants) in Chrome device mode with `?touch=1`, plus `view=narrow` in landscape (today it keeps the narrow view; decide whether landscape should use the 320x192 view instead, since there is room across).
- Keep portrait, desktop and the golden frames unchanged.

## Acceptance criteria
- In landscape no control overlaps the picture at the listed sizes (a test of the layout rectangles: control boxes and picture box do not intersect), with screenshots from device mode in the log; portrait unchanged.
- `npm test`, `npx tsc --noEmit`, `npm run build` pass; real-phone items listed as unverified.

## Progress log
