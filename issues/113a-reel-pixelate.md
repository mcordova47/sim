---
id: 113a
title: Photo reel 1: the pixelate function
status: review
owner: claude
depends_on: [113]
---

## Goal
Stage A of section 10: pure `pixelate` in `src/game/reel/pixelate.ts` plus the palette accessor, per section 2 and the tests list in section 9.

Design and Marc's answers (2026-10-28): `docs/photo-reel-design.md` (sofa task; full 22 colours, Bayer dither strength 20, stored 48 x 36 or 36 x 48 shown at 3x; cap 60 pictures; a reset keeps the photos, REMOVE ALL is separate; one fixed caption line per session, never about resolution or size). Look tool: `art/tools/pixel-looks.html`. Privacy: no photo, name or caption of a photo ever enters the repo or bundle; `check:dist` unchanged.

## Acceptance criteria
- Pure function tests pass with synthetic images only; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log


- 2026-10-28 (claude): Started. Plan: port the pipeline of art/tools/pixel-looks.html (crop, box average, auto-levels, Bayer 4x4, redmean) to a pure function; 48 x 36 / 36 x 48, dither 20, full 22 colours.
- 2026-10-28 (claude): Built. Files: `src/game/reel/palette.ts` (REEL_PALETTE as RGB triples in file order, REEL_PALETTE_VERSION = 1), `src/game/reel/pixelate.ts` (`pixelate(rgba, w, h, {dither?, palette?}) -> {w, h, px}`, px a Uint8Array of palette indices), `src/game/reel/pixelate.test.ts` (21 tests, synthetic images only). Portrait = taller than wide; square is landscape. Alpha ignored. Extra beyond the tool: input validation, index clamping for tiny sources, dither clamped to 0..100. No colour literals (palette read from art/palette.json). Nothing wired into the game; no image files added.
- Checked: `npm test` 133 files / 2965 passed; `npx tsc --noEmit` clean; `npm run build` ok; `npm run check:dist` ok. Not checked: pixel-for-pixel match against the browser tool on a real image (no photos allowed in tests; the algorithm was ported line by line), and the look on skin tones (stage E).
