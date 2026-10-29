---
id: 113a
title: Photo reel 1: the pixelate function
status: done
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

- 2026-10-28 (reviewer, independent): Review. Verdict: APPROVE.
  - Criterion "pure function tests pass, synthetic only": pass. Author's 21 tests are synthetic, no image files, no colour literals. My own checks (outside repo): the tool's JS (pixelate/autoLevels/toPalette, extracted verbatim from art/tools/pixel-looks.html) run in node against `pixelate()` on 5 synthetic kinds (noise, gradient, skin-ish, low contrast, blocks) x 12 sizes (landscape, portrait, square, tiny, 300x3, 48x36, odd sizes) x dither 0/20/60 = 180 cases, plus palette equality: all 181 index-for-index identical at 48x36 / 36x48. Edge checks pass: 1x1, 1xN, Nx1, 2000x1500 (146 ms), alpha ignored, bad width/height/short buffer throw, input not mutated, custom palette, square is landscape.
  - `npm test` 133 files / 2965 passed; `npx tsc --noEmit` clean; `npm run build` ok; `npm run check:dist` ok.
  - Scope: only palette.ts, pixelate.ts, pixelate.test.ts and this issue file changed; no PLAN.md edit; no photos, names or personal info; no colour literals (palette parsed from art/palette.json). Not wired into the game, so no regressions.
  - Nit (not blocking): `dither: NaN` is not caught by the clamp and maps every pixel to index 0 (ink). Callers pass the default 20, so harmless now.
  - Deviation noted, harmless: TS clamps x0/y0 to sh-1/sw-1 (tool does not); no effect on in-range output (equivalence held on tiny sources).
  - UNVERIFIED: pixel-exact match on real photos (photos not read; the tool also pre-shrinks to a 256 canvas via browser smoothing, which is outside this function), and the look on skin tones (stage E).
  - PLAN.md table needs updating by the planner (113a -> done).
