---
id: 119
title: A Simagotchi logo and favicon (the egg with the main character inside)
status: review
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
