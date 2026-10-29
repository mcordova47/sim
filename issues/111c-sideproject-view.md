---
id: 111c
title: Side project config 3: the view and the painter
status: review
owner: claude
depends_on: [111]
---

## Goal
Stage C: frame sprite, `drawScaled`, `SideProjectView` with a cache, the dim and light noise, the composed-view registry, and a fallback to the existing 101 picture. Touches `sprites.ts` and `cutscene.ts` only besides new files.

Design and Marc's answers (2026-10-29): `docs/side-project-config-design.md` (the little room is a faithful copy of the real room plus overrides from a config text file; drawn as a smoothed half-scale copy with a dim and light noise; `when` conditions come later in stage E; the tiny figure is a fixed glitch standing on the desk; no real effect at first, the picture only). Marc's idea (2026-10-29): the side project could have its own title, something like "Siminal Crossing" (text for the text review when picked). Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- The desk task shows the composed room; Marc looks at it beside the old one on both views; the fallback PNG still works; golden frames unchanged unless this screen is in them; the checks above pass; an independent review.

## Progress log


- 2026-10-29 (claude): started. Plan: frame sprite cut from the old picture (room window transparent), `drawScaled` on the sprite drawer, a composed-view registry (`src/render/composed-views.ts`), `SideProjectView` (`src/render/side-project-view.ts`) drawing a small hard-coded piece list at half scale, smoothed, with dim and light noise, cached; the cutscene tries the registry before the sprite and falls back to the old PNG. 111a/111b are not on this branch, so the piece list is hard-coded behind a `source` function.
- 2026-10-29 (claude): built. Files: `art/src/view-side-project-frame.sprite` (+ `public/sprites/view-side-project-frame.png`; the old picture with the 162 x 87 room window cleared, HUD bars and monitor kept), `src/render/composed-views.ts` (registry: name to painter, checked by the cutscene before the sprite; a painter returns false to fall back), `src/render/side-project-view.ts` (`SideProjectView`: draws the piece list at 1x into a 304 x 160 canvas the normal way, downscales it once to 152 x 80 with smoothing, centred in the window; dim 0.3 ink, scanlines and 140 seeded speckles inside the window; frame on top; cached by a `key()`; missing sprite or throw returns false once-warned so the old PNG shows), `sprites.ts` (`drawScaled`, optional on `SpriteDrawer`; the view downscales a canvas instead because per-sprite half scale at odd coordinates leaves seams, so nothing calls it yet), `cutscene.ts` (asks the registry first, also for zoom windows, which draw from the cache with smoothing off), `sprite-names.ts` (loads the registered painters' sprites), `main.ts` (one import that registers the view; it cannot be imported from `cutscene.ts` because that makes an import cycle with `apartment.ts` and breaks activity registration), tests in `side-project-view.test.ts` and `cutscene.test.ts`.
- Checks: `npm run build` ok, `npm test` 152 files pass, golden frames unchanged (the screen is not in them), `npm run check:dist` run. Rendered the old and composed pictures side by side at 1x in headless Chrome on 320 x 192 and 224 x 208 canvases and at 2x, and looked at them: the composed room reads as the real room, dimmer and softer, with its walls and the bed; on 224 x 208 both are cropped alike, but the game switches to 320 x 192 for any full picture (`showsFullPicture`), so that size is not seen in play. Zoom: unit-tested only. A bug found by a test: the vertical centring was 27.5, fixed to a whole pixel.
- How 111d wires the composed list in: `side-project-view.ts` registers `new SideProjectView({ source: defaultRoomOps })`. 111b's `composeSideProject(APARTMENT.rooms.main, parseConfig(text).ops)` returns `DrawOp[]` (same `{ sprite, x, y }`, real-room pixels, in order) so 111d replaces `source` with `() => composeSideProject(...)` (floor and walls included, so `defaultRoomOps` and the hard-coded `PIECES` list go), and passes `key` for state changes (111e). The tiny figure is not drawn yet (111d). If 111b's room size differs from 304 x 160 the `ROOM` constant changes.
- Not checked: how it feels in the real browser game (the desk task end to end with the phone shell), and whether Marc likes the dim (`LOOK.dim`, 0.3; it is on the dark side) and the grey bed (the real bed sprite, not the old blue one). Old PNG kept as fallback.
