---
id: 057
title: Bookshelf top order; guitar pose shows the neck
status: review
owner: agent
depends_on: []
---

## Goal
From Marc's playtest (2026-10-23):
1. **Bookshelf top:** the order of the things on top of the bookshelf should be flipped: the plant on the bottom (south end), the dried flowers on top (north end), and so on (reverse the current order of items along the shelf's top).
2. **Guitar pose:** the playing-guitar view (`player-guitar`) does not really show the neck. Draw it so the neck shows, even if that means drawing it outside the character's own tile: a pose sprite is a separate image placed by `src/game/poses.ts`, so it can be wider or taller than 16x16 and overlap the neighbouring tiles (it is drawn in the same y-sort as other pieces; check it draws over the sofa and wall correctly, and that the held-guitar overlays do not double up).

## Acceptance criteria
- Bookshelf (`art/src/bookshelf.sprite`, 16x64, top-down): reverse the order of the items on its top, keeping each item intact; check photos (`dried-flowers-on-top-of-bookshelf`, `east-facing-view-of-bookshelf` in `/Users/marccordova/Dev/repos/mcordova47/life/reference-photos/`; absolute paths, never copied) so the reversed order still matches the real arrangement as Marc describes it (plant at the south end, dried flowers at the north end).
- Guitar pose: the player sits and plays with the guitar's neck extending clearly outward (toward the west, per the room's layout), body in the lap; place and size it so it works from the standing tile used for the `guitar` task at col 1 row 4; if the neck needs the neighbouring tile, say which one and make sure nothing hides it. While the pose plays, the wall guitar is hidden (already done in 045); keep that. Update `poses.ts` and its tests.
- Render both in the real game at 1x and 4x and look at them; `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log

- 2026-10-23 (agent): Plan: reverse the item order on the bookshelf top; widen `player-guitar` to 32x48 so the neck runs out west over col 0.
- 2026-10-23 (agent): Done.
  - **Bookshelf:** the top had, north to south: plant (13 rows), books on tray (8), bowl (6), vase with dried flowers (13), each with a few blank rows between. Reordered the blocks (each copied intact) to vase, bowl, books, plant, with the gaps kept (4, 3, 2, 3 trailing); the front slice (rows 53-63) is unchanged. Photos (`east-facing-view-of-bookshelf`, `dried-flowers-on-top-of-bookshelf`) show all four items, so the order is from Marc's description, not the photo.
  - **Guitar pose:** `player-guitar` is now 32x48. The player is on the right 16 px (the standing tile, col 1 row 4); the left 16 px is col 0, where the neck runs up and to the west with a headstock and tuners, in front of the wall and the kitchen passage tile (it is y-sorted by its bottom edge, which is below them). The guitar body is redrawn as a cream, shaded hourglass in the lap with a sound hole, the old box is gone. `poses.ts`: size 32x48, `at` x -16, y -16 (still on the `guitar` piece, `replacesPiece` kept, so the wall guitar stays hidden). The neck needs col 0, rows 4 only (the sprite is 16 px tall there); nothing in the y-sort hides it (checked in the render). The held-guitar overlay is not drawn while the pose is (the pose replaces the plain player), so it does not double.
  - **Tests/docs:** `poses.test.ts` (pose now at x 0, y 64) and `scripts/sprite-lib.test.mjs` (documented size 32x48); `docs/art-style.md` pose line updated.
  - **Checked:** `npm run sprites`, `npm test` (1033 pass), `npm run build` all pass. Rendered the real `Game` (throwaway harness page with headless Chrome, kept outside the repo) at 1x, 4x and a 12x crop with the guitar task running: neck, headstock and body show and sit over the doorway tile and the sofa arm correctly; bookshelf top viewed at 6x and in the 4x room (flowers north, plant south).
  - **Not checked:** feel in a live browser; the doing-guitar view at 1x is small (the neck is 2 px thick); Marc to judge. Marc plays right-handed or left-handed is unknown: the neck goes west per the issue, which on a front-facing figure puts the neck on the viewer's left.
  - Files: `art/src/bookshelf.sprite`, `art/src/player-guitar.sprite`, `public/sprites/bookshelf.png`, `public/sprites/player-guitar.png`, `src/game/poses.ts`, `src/game/poses.test.ts`, `scripts/sprite-lib.test.mjs`, `docs/art-style.md`.
