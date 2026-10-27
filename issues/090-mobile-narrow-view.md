---
id: 090
title: Mobile: a taller, squarer picture that scrolls (assess, then prototype)
status: todo
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
