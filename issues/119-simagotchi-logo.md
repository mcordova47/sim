---
id: 119
title: A Simagotchi logo and favicon (the egg with the main character inside)
status: done
owner: claude
depends_on: [116]
---

## Goal
Marc (2026-10-29): the logo and favicon could use the idea of a Tamagotchi-style egg with the main character's face on its screen. He pasted a reference icon (an egg, a small rectangular screen with a calm face, three round buttons below, a loop on top). Draw our own: do not copy that image or any icon set; use the game's palette and the player sprite's face and hair, in pixel art. Replace the favicon, apple touch icon and the link preview picture (`public/favicon.png`, `public/apple-touch-icon.png`, `public/social.png` via `npm run brand`, which builds them from the game's own sprites). Sprites carry no readable text, so the logo is a picture, not lettering; the name stays in the page text. The pause screen may use a small version beside the name if it fits.

## What to do
Show Marc two or three variants first (egg shapes, face expressions, colours) at 1x and 8x, let him pick, then wire it into `scripts/brand.mjs` and check the generated files.

## Acceptance criteria
- Marc picks a variant; the three generated images update; `npm run brand -- --check` passes; a new sprite source (if any) follows `docs/art-style.md`; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; an independent review.

## Progress log

- 2026-10-29: Marc picked the sleepy variant (closed eyes, flat mouth), tangerine egg. Kept as `art/src/logo-egg.sprite` (32x32); other two deleted. `scripts/brand.mjs` now builds the favicon (1:1), touch icon (5x centred on night) and link preview (egg at 14x over a floor strip, bookshelf, desk, plant) from it; public images regenerated. Not added to the pause screen. tsc, build, npm test (3443), check:dist, brand --check pass. Independent review: one overlap (egg over desk in the link preview) fixed; approved otherwise.

- 2026-10-29 (independent reviewer): APPROVE. Evidence per criterion:
  - Marc picked a variant; images update: log records the sleepy/tangerine pick; favicon 32x32, touch icon 180x180, social 1200x630 all regenerated from `logo-egg`; viewed each at 1x and 4x (4x copies in scratch only).
  - `npm run brand -- --check` passes (exit 0).
  - Sprite follows `docs/art-style.md`: `size: 32x32`, 32 rows of 32 chars, only palette keys and `.`; `public/sprites/logo-egg.png` is one-to-one with `art/src/logo-egg.sprite` (sprite-names test passes within `npm test`); a section was added to the style doc.
  - `npx tsc --noEmit` clean; `npm run build` ok (JS 376.33 kB, no src changes so bundle JS is unaffected); `npm test` 155 files, 3443 passed, 1 skipped; `npm run check:dist` ready.
  - Link preview: egg centred, clear of bookshelf (left), desk and plant (right); egg base meets the floor strip as intended; no clipping at any edge. No lettering anywhere (screen shows a face only). Nothing from reference-photos/ (diff touches only the own-drawn sprite and brand script). Favicon is an opaque night tile, so it reads the same on light and dark tab backgrounds.
  - Scope: `git diff --stat main...HEAD` lists only art/src/logo-egg.sprite, docs/art-style.md, the issue file, the three public images, public/sprites/logo-egg.png, scripts/brand.mjs. No src, pause screen, page text or PLAN.md changes; no leftover variant sprites.
