---
id: 113
title: Photo reel: pixelated pictures from your own device (experiment)
status: done
owner: marc + claude
depends_on: [112]
---

## Goal
Marc (2026-10-28): try the photo reel first, as an experiment, to see how it feels. Worry: leaving the pixel world to use the system file picker may feel clunky. See `docs/real-world.md` (section on photos): file input, a pure pixelate function, results in IndexedDB, nothing leaves the device (no server, login or network).

## Design notes (planner's recommendation, to confirm)
- Keep the picker out of normal play: a **one-time "add photos" page on the pause screen**, in the same family as the sync and transfer pages (hidden file input, like the touch key entry), so the clunk happens once, in a "device stuff" corner, not in the middle of a task. Choose many pictures at once; each is pixelated straight away (small palette-friendly size, the game's 22 colours or a dithered look) and the originals are never stored.
- The reel then plays fully in-world (browsing on the laptop or phone in the room, a slow slideshow, a deadpan line per picture or none). Nothing is shown until Marc adds some; with none it is just absent.
- Faces and people are allowed: the pictures are Marc's own, pixelated, and never leave the device. Photos are not synced (too big, and personal); a "remove all" control wipes them.
- Quiet-extra rule: no pressure, no count, nothing to collect.

## What to do
- Design first with Marc (one question at a time): where it appears in the room, how it looks, the pixelate style, how many pictures, the iPhone flow, then build as small stages.
- Privacy: nothing about the photos is ever in the repo or the bundle; `check:dist` unchanged.

## Acceptance criteria
- Agreed design; the experiment works on desktop and iPhone; photos stay on the device; the game is unchanged with no photos; Marc tries it and says whether the picker feels clunky.

## Progress log
- 2026-10-28: Design written: `docs/photo-reel-design.md` (summary, pixelate and look, storage, iPhone flow, pause page, in-world viewer, text, remove all, tests, stages 113a to 113e, 5 open questions). Status unchanged.
- 2026-10-28 (planner): Marc answered all five questions; build issues 113a to 113e filed.
