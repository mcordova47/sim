---
id: 092
title: Mobile landscape: the controls must not cover the picture
status: review
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

- 2026-10-27 (claude): Plan: put the controls in a column at each side of the picture in landscape (d-pad left; pills over A/B right), sized by one layout function with a rectangles test; landscape uses the full 320 x 192 view even with `view=narrow`.
- 2026-10-27 (claude): Done. `render/canvas.ts`: `LANDSCAPE` constants, `landscapeLayout` (columns 146 css px each, picture fitted and centred between them, controls shrink to 0.7x if the screen is under about 566 wide), `rectsOverlap`; `pictureArea` landscape now excludes the columns; `fit` sets `--ls-side`/`--ls-k` and exposes `screen.landscape`. `main.ts`: landscape uses `DESKTOP_VIEW` on `view=narrow` (there is room across, so the narrow view is not used sideways). `index.html`: only the landscape media block changed (columns, no opacity, pills stacked top-right, A/B bottom-right, d-pad scaled to 120). Tests in `canvas.test.ts`: control boxes vs picture box at 10 sizes (844x390, 844x340, with insets, 932x430, 932x380, 667x375, 800x360, 915x412, 568x320) for both views, and the scales (844x390 1.67x, 932x430 2.0x, 844x340 1.67x, standalone 750 wide 1.33x). `npm test` (2574), `npx tsc --noEmit`, `npm run build` pass; goldens unchanged; portrait CSS and desktop untouched.
- Screenshots (headless Chrome, DPR 2, `?touch=1`): /private/tmp/claude-501/shots092/{a-844x390,b-932x430,c-844x340,d-844x390-narrow}.png: no control touches the picture. Portrait could not be re-shot at 390 wide (headless Chrome's minimum window width); its CSS is unchanged.
- Not checked: a real phone (thumb reach of the narrower d-pad and A/B, notch insets, Safari bars), L list and dialogs on a real landscape phone (they are inside the picture, which no control now overlaps). Smaller picture is the cost: 750 wide standalone gets 1.33x instead of 1.67x.
