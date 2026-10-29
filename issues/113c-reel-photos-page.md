---
id: 113c
title: Photo reel 3: the PHOTOS page
status: todo
owner: claude
depends_on: [113a, 113b]
---

## Goal
Stage C: PHOTOS page on the pause screen: `PhotoIO`, one-at-a-time decode, add flow, REMOVE ALL, texts (section 7, lines go to docs/text-review.md for Marc), tests.

Design and Marc's answers (2026-10-28): `docs/photo-reel-design.md` (sofa task; full 22 colours, Bayer dither strength 20, stored 48 x 36 or 36 x 48 shown at 3x; cap 60 pictures; a reset keeps the photos, REMOVE ALL is separate; one fixed caption line per session, never about resolution or size). Look tool: `art/tools/pixel-looks.html`. Privacy: no photo, name or caption of a photo ever enters the repo or bundle; `check:dist` unchanged.

## Acceptance criteria
- Works on desktop; add and remove all work; reset keeps the photos; game otherwise unchanged; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log

