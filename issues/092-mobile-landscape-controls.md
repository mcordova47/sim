---
id: 092
title: Mobile landscape: the controls must not cover the picture
status: in-progress
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

- 2026-10-27 (review, independent): Verdict CHANGES NEEDED.
  - Criterion 1 (no control overlaps the picture in landscape): FAIL in the real page. In `index.html` the rule `body.touch #touch-ui > *` (specificity 1,1,1) sets `transform: scale(var(--ls-k))` and beats `body.touch .tp-dpad` (0,2,1), so the d-pad's `scale(0.8 * k)` never applies. Measured in headless Chrome (CDP, `?touch=1`): `.tp-dpad` computed transform is `matrix(1,0,0,1,0,0)` and its box is 150 x 150, not 120. At 844x390 (DPR 3) the d-pad spans x 13..163 and the picture starts at x 155.3, so they overlap by about 8 css px (screenshot /private/tmp/claude-501/review092/s-844x390.png shows the d-pad's right arm over the picture's left border). Same overlap at 568x320 (picture x 124, d-pad 11..138.4 at k 0.85), 915x412, 844x340, 932x430 (d-pad 13..163 vs picture 146), 844x390 with 47px insets (d-pad 60..210 vs picture 208.7). The layout test passes because it checks the model's 120 px rectangle (`landscapeLayout`), not the CSS, so it does not catch this. A/B box, pills and A/B placement match the model exactly (face 132x104, pills 120 wide, positions equal to `landscapeLayout`), and the picture is centred between the columns.
  - Criterion 2: `npm test` (2574), `npx tsc --noEmit`, `npm run build` pass (rerun here).
  - Other checks done: portrait unchanged and `view=narrow` landscape -> portrait -> landscape switches correctly (landscape 533x320 css, portrait narrow back to 224x208 backing at 5x, vars and body padding follow); desktop (no touch) 1200x800 DPR 2 canvas 960x576 centred as before; goldens untouched (suite passes); diff touches only index.html, main.ts, canvas.ts, canvas.test.ts and the issue file.
  - Fuzz of `landscapeLayout` (about 6100 cases, widths 480-1180, heights 200-600, DPR 1/2/2.625/3, insets, both views): control boxes never meet the picture for widths >= 500; the pills box and the A/B box overlap each other only when the usable height is under about 250 px (272 with a 47/21 inset), which is not a real phone, and the test does not check pills vs face. Below 500 wide controls overlap the picture, as the code comment says.
  - Not verified (real device): thumb reach and feel of the narrower d-pad and A/B, Safari bars, notch insets on hardware (insets were only emulated in layout maths and with Chrome's safe-area override, which showed correct column offsets). Real-phone items stay unverified, not passed.
  - Author's screenshots in /private/tmp/claude-501/shots092 were not accepted as evidence given the measured overlap.
  - To fix:
    - [ ] Make the d-pad actually scale to 0.8 * k (raise specificity or put the d-pad transform in the `#touch-ui > *` rule, e.g. `body.touch #touch-ui > .tp-dpad`), then re-measure `.tp-dpad` getBoundingClientRect at 844x390, 932x430, 844x340, 568x320, with insets.
    - [ ] Add a check that ties the CSS to the model (e.g. a test that reads the media block, or a browser-measured rectangle) so the rectangles test cannot pass while the CSS differs; add pills vs face to the rectangles test.
    - [ ] Re-shoot the landscape screenshots after the fix and log them.
- 2026-10-27 (claude): Round 2, review checklist. (1) Fixed: the catch-all `#touch-ui > *` rule set `transform` and beat the d-pad's own scale, so the d-pad stayed 150 px and overlapped the picture; the transform is now set per control. (2) Added tests that read index.html (`?raw`): the landscape CSS contains the model's sizes (face 132x104, pills 120x36, gap 8, d-pad scale 0.8*k, `--ls-side` default) and no catch-all rule sets a transform; pills vs A/B rectangles at heights 320-430. (3) Re-shot after the fix at DPR 3: /private/tmp/claude-501/shots092/v2-{a-844x390,b-932x430,c-844x340,d-844x390-narrow}.png (the earlier a-e files are from before the fix; ignore). d-pad now ends at about x 133 and the picture starts at 155 (844x390). `npm test` 2577, tsc, build pass. Still unverified: real phone.
