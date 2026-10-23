---
id: 057
title: Bookshelf top order; guitar pose shows the neck
status: todo
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
