---
id: 076
title: More paintings from Marc's unhung pieces; a different concert poster
status: todo
owner: agent
depends_on: []
---

## Goal
From Marc (2026-10-27): the first gift art looks good, but `art-concert-poster` (an unframed paper version of the gold and orange print) should be a different poster. Marc will provide examples of posters from online, and reference photos of other paintings he owns that are not hung up. Those become more real gifts and inventory items (issues 043 and 062: real things first).

## What Marc provides (to put in `reference-photos/`, which stays gitignored)
- Poster examples (an image or link per example, saved as `poster-example-*.jpg|png`; these are only style references).
- Photos of the unhung paintings (saved as `unhung-*.jpg`, one per piece, straight on if possible, with a note in the filename or a sidecar text if there is a size).

## Acceptance criteria
- Wait for the photos; do not guess. Then draw `art-concert-poster` again from the poster examples (an abstract impression of a gig poster: big shapes, a limited palette, no readable text, no band or venue names, no real artwork copied pixel for pixel: a new composition in the same spirit), 32x16, replacing the placeholder; and one sprite per unhung painting, named `art-<short-slug>` at the size that fits the wall slot it would go on (32x16 for the table and desk walls, 48x16 for the bed wall; say which in the log), abstract impressions like the other paintings, no readable text or signatures.
- Register nothing in game data (stage A of 043 does that); add them to the 'later' list in `docs/random-encounters.md` (item ids and which slot they fit) and to the sprite list in `docs/art-style.md`.
- Contact sheet and mockup for Marc (as in issue 074: `scripts/gifts-mockup.mjs`), looked at at 1x and 4x. `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log
