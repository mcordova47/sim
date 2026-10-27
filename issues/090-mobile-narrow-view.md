---
id: 090
title: Mobile: a taller, squarer picture that scrolls (assess, then prototype)
status: review
owner: claude
depends_on: [087]
---

## Goal
Marc (2026-10-27), after trying the flat portrait shell from issue 087 in a desktop preview: the picture looks small with unused space around it, and some dark edges. He would like a **taller, squarer window, only on mobile**, which shows a narrower slice of the room at a time (at least for the main room) and scrolls. Desktop and landscape keep the 320x192 view unchanged.

## Background
- Today the view is 320x192 (VIEW in `src/render/layout.ts`); the main room is 304x160, bottom-aligned (the top 32 px is empty and is where the HUD sits, see issue 086), so the dark edges are the view's own empty margin, not the shell. The kitchen (13x10 tiles) and bathroom (9x6) are narrower than the main room.
- On an iPhone about 390 CSS px wide the picture is 1.0x (320 CSS px); a narrower view could be scaled up (for example a view about 224 to 256 px wide at 1.5x) and be taller (for example 240 to 288 px), which is closer to a Game Boy proportion and fills the width.
- Much assumes the 320x192 view: popups, dialog text width (`DIALOG.textWidth`), `HUD_BOX` and `STATUS_BOX`, the ad cards (full-screen 320x192 art), cutscene `view` steps with zoom, sleep and other full-screen views, the camera and its bottom alignment, and the golden frames.

## What to do, in two steps (stop after step 1 and report if the change is not contained)
1. **Assess** in `docs/mobile.md` (a new short section, or `docs/mobile-view.md`): list every place that assumes the view size (with file and why), what each needs for a view of a different size, and one or two recommended view sizes for the phone widths in the note (360, 390, 430 CSS px, DPR 2 to 3) with the crisp scale each gets and how much of the main room is visible (the camera scrolls horizontally; does it follow the player with a dead zone). Say how full-screen 320x192 pieces (ad cards, sleep and cutscene views) show inside a bigger view (centred with a border, or the whole view scaled). Recommend, and say how large the change is (files, risk, test impact) before building anything.
2. **Prototype** only if the assessment says it is contained: a `?view=narrow` (touch layer only) switch that gives the mobile shell the narrower, taller view, with the existing HUD drawn inside it as it is (issue 086 will redo the HUD later), the camera following the player, everything else unchanged. Desktop and landscape unchanged and covered by the existing goldens.

## Acceptance criteria
- The assessment exists and recommends a size and an approach, with the cost.
- If the prototype is built: it works in Chrome device mode with `?touch=1&view=narrow` for the main room, kitchen and bathroom (walking to the edges, doors, dialogs and popups readable, an ad encounter card and a sleep view both look right), the desktop view and goldens are unchanged, tests cover the view arithmetic and the camera, `npm test`, `npx tsc --noEmit` and `npm run build` pass.
- Anything that needs a real phone is listed as unverified.

## Progress log

### 2026-10-27 (claude)
- Branch issue/090-mobile-narrow-view, from issue/087-mobile-stage-1 (087 is approved but not merged; this builds on its touch layer and `fitScale`).
- Step 1, the assessment: docs/mobile.md section 13. Result: contained (10 files, about 110 lines, one new test file). Recommended view 224 x 208 (14 x 13 tiles): 1.67x on 390 and 430 phones, 1.33x on a 360. Every room is at most 160 px tall, so a taller view only adds dark space; 208 is the room plus a 48 px HUD band. The real problem is the full-screen 320 x 192 pieces (five `view-*` pictures, ad cards, the L list): they cannot be cropped or scaled crisply, so while one is up the view switches to 320 x 192 (1.0x) and back.
- Step 2, the prototype: `?view=narrow` (with `?touch=1` or a touch screen). Files: config.ts (DESKTOP_VIEW, NARROW_VIEW, setView, narrowViewWanted, NARROW), main.ts, render/canvas.ts (live view, `Screen.sync`, reserved height so the controls do not jump), render/layout.ts (STATUS_BOX hugs the right edge), game.ts (`showsFullPicture`, `fullPictureWhen`, camera gets a copy of the size), activities/cutscene.ts (`showsPicture`), achievements/feature.ts and draw.ts, view-zoom.ts and art-pieces.ts (zoom windows in picture pixels). Tests: src/render/narrow-view.test.ts (switch rule, scale on the note's phones, camera on the real rooms, status box, zoom windows, Screen.sync, showsFullPicture).
- Checked: `npx tsc --noEmit`, `npm test` (2548 pass, goldens unchanged, no re-record), `npm run build`. Looked at Chrome screenshots (390 x 844, DPR 3, `?touch=1&view=narrow`): the main room (HUD fits, 1.67x), the camera scrolling to the east side, an ad encounter card (switches to 1.0x, controls stay put) and the L list (was broken at 224, fixed by the full-picture switch).
- Not checked: kitchen and bathroom in the browser (covered by the camera test only), a cutscene `view` (gallery wall, side project) in the browser, a sleep view in the browser, dialogs and popups at the room edges, anything on a real phone (feel, Safari bars, safe areas, audio). Known cosmetic: "ESC TO STOP" overlaps the HUD panels at 224 px; landscape keeps the narrow view in this prototype.
