---
id: 101
title: Asset cleanup: plant pots, the side-project picture, unused sprites
status: todo
owner: claude
depends_on: [100]
---

## Goal
Marc's decisions (2026-10-28, `docs/asset-review.md`): (1) the **plants on the bookshelf**: pots seen from above and an outline pass (`plant-0..3`, `plant-wilted`, `plant-dried`; low priority, keep every sprite name and size); (2) **`view-side-project`**: replace the small picture of the game with readable HUD words and an older room layout by plain shapes (no readable text, in the game's palette); (3) **delete the unused sprites**: window, floor-tile, rug, painting-robin, icon-phone, icon-plug, guitar-tall, guitar-nylon-tall (re-verify each is unused by grep first, including tests, docs and `sprite-names.ts`; fix every reference); keep view-bookshelf, gallery-wall, guitar-nylon and mic-stand-vintage as reserved and say so in `docs/art-style.md`. Toilet and vanity are left alone.

## Acceptance criteria
- The plants, the picture and the deletions are done; `npm run sprites` leaves the PNGs matching the sources and removes the deleted PNGs; no dangling references (a test lists sprite names against files); goldens re-recorded deliberately with a note; `npm test`, `npx tsc --noEmit`, `npm run build` pass. Marc looks at the plants and the picture; unverified items listed.

## Progress log
