---
id: 125
title: The side project picture on the phone: use the whole screen area, change the aspect ratio
status: todo
owner: claude
depends_on: [111d]
---

## Goal
Marc (2026-10-29): on the phone's narrow view, full-screen pictures such as the side project are drawn at 320 x 192 and scaled to the width (about 2.75x on a tall phone), so they cover only the top third of the area the regular view fills (224 x 208 at about 3.9x), and the rest is empty above the controls. The side project's little room is hard to read there. Use the whole area for the side project: give it a taller view on a portrait phone (the same 320 width with more height, roughly 320 x 288, whatever fits the area: the free height at that scale is about 298 game pixels) and lay the picture out for it, so the monitor and the little room are drawn bigger and more legible, with the dialogue box at the bottom as now. This involves changing the aspect ratio of the screen for this picture.

## How it works today (from Marc's walkthrough of the code, 2026-10-29)
- `src/game/config.ts`: `VIEW` is one shared live size object, `setView()` changes it; `DESKTOP_VIEW` is 320 x 192, `NARROW_VIEW` is 224 x 208; `NARROW` is true on the touch layer for the whole session.
- `src/main.ts` (about line 139) chooses the size every frame on a phone: `setView(game.showsFullPicture || screen.landscape ? DESKTOP_VIEW : NARROW_VIEW)`.
- `src/game/game.ts` `showsFullPicture` is a yes or no (encounters, cutscene `view` steps, the L list through `fullPictureWhen`).
- `src/render/canvas.ts` scales the canvas (`fitFill` fills the width for a full picture) and keeps a bottom reserve so the controls do not jump; the picture area is the same height gameplay uses.
- `src/game/activities/cutscene.ts` `draw(ctx, screen)` passes `screen` (the live VIEW) to the sprite path; the composed-view painter interface (`render/composed-views.ts`, `draw(ctx, sprites, from)`) has no size argument, and `render/side-project-view.ts` assumes 320 x 192 (`WINDOW`, `ROOM`, `HALF`, `AT`; frame sprite `view-side-project-frame`, 320 x 192).
- docs: `docs/mobile.md` section 13 (the phone view, why full pictures switch to 320 x 192, risk (d): a full-screen piece must register or it draws for 224 x 208).

## Constraints and judgement calls for the agent
- Only the side project picture changes. Ad cards, the gallery wall, the L list and everything else stay as they are on every platform; desktop and landscape unchanged; golden frames unchanged.
- `showsFullPicture` is a yes or no today: add a way for a picture to ask for a taller view (for example a preferred view size from the cutscene or the composed view) rather than changing all full pictures. Say in the issue log how you chose.
- The dialogue box is drawn at the bottom of `VIEW`; with a taller view it moves down with it. Either grow the picture (the monitor and the little room) to fill the height, or lay it out so there is no dead gap between the picture and the box. Draw against the live size, not constants. The frame is a 320 x 192 sprite: a taller variant of the frame (a second frame sprite chosen by the live size) is acceptable; keep the art style and the sprite rules (docs/art-style.md).
- Marc's separate idea (not this issue): all cutscenes on the narrow view with a common aspect and "screen" chrome above the controls (centred pictures with bars). Do not do it here; note anything you learn that bears on it.
- Zoom windows (`view-zoom.ts`, `art-pieces.ts`) are in picture pixels of 320 x 192; check the side project's zoom steps still land right.

## Acceptance criteria
- On a portrait phone view the side project picture uses the full picture area (no empty band above the controls), the little room is clearly larger and legible, the dialogue box sits at the bottom; render it at 1x for a tall phone size and a short one and look; landscape phone and desktop are unchanged (tests); other full pictures unchanged (tests); `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; an independent review with a written entry on the branch; unverified items listed (a real phone).

## Progress log

