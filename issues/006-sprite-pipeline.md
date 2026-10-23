---
id: 006
title: Sprite pipeline and style guide
status: done
owner: agent
depends_on: [001]
---

## Goal
Define the art rules and build the tooling that turns sprite source data into PNGs the game loads.

## Acceptance criteria
- `docs/art-style.md`: tile size (proposed 16px), shared palette (16 to 24 colors with names), outline rules, lighting direction, naming convention.
- Sprite source format: palette-indexed text grids or small scripts, one file per sprite, under `art/src/`.
- A script (`npm run sprites`) that renders all sources to PNG in `public/sprites/`, with an upscaled contact sheet for review.
- Validation: the script fails if a sprite uses a color outside the palette or has the wrong dimensions.
- Game-side loader that fetches sprites by filename and falls back to a labeled rectangle if one is missing.
- Two example sprites to prove the pipeline end to end.

## Progress log

- 2026-10-22: Starting. Plan: palette in `art/palette.json` (single source of truth), text-grid sprites `art/src/*.sprite`, dependency-free Node script `scripts/sprites.mjs` (own PNG encoder via zlib) for render + validation + contact sheet, loader in `src/render/sprites.ts`, style guide in `docs/art-style.md`, two example sprites.
- 2026-10-22: Done, ready for review.
  - Added `art/palette.json` (20 named colors, tile 16), `docs/art-style.md`, `scripts/sprites.mjs` (`npm run sprites`: parse, validate, render PNGs to `public/sprites/`, contact sheet at `art/contact-sheet.png`), `src/render/sprites.ts` (`Sprites` loader with labeled-rectangle fallback), examples `art/src/coffee-mug.sprite` and `couch.sprite`, and a throwaway demo in `src/main.ts` drawing both plus a deliberately missing sprite.
  - Checked: `npm run sprites` renders both; contact sheet viewed; bad sprites (unknown color, wrong row width, non-tile size, wrong row count) make it exit 1 and write nothing; `npm run build` passes and copies sprites into `dist/`.
  - Not checked: the loader's fallback rectangle in a real browser (no browser available here); it is type-checked only.
  - Notes: the script only overwrites PNGs that have a source, so hand-made PNGs can coexist. `public/sprites/` and the contact sheet are committed so the game works without running the script first. The demo in `src/main.ts` should be removed when issue 002/003 replace the placeholder scene.
- 2026-10-22: Review (approve).
  - Style guide: pass (16px tile, 20 named colors, outline, top-left light, naming all in docs/art-style.md).
  - Source format: pass (text grids, one file per sprite in art/src/).
  - `npm run sprites`: pass (renders both PNGs, contact sheet viewed, rerun is idempotent, no git diff).
  - Validation: pass (unknown color, short rows, non-tile size each exit 1 and write nothing; tested with a temporary bad sprite, removed).
  - Loader: can't fully verify in a browser; code reviewed, falls back to labeled red rectangle on error, type-checks. `npm run build` passes.
  - Two examples: pass (coffee-mug, couch).
  - Scope/privacy: only own issue plus assigned code; demo in main.ts is flagged for removal. No reference-photos content.
