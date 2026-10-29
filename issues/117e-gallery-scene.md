---
id: 117e
title: Photo gallery 5: the sofa scene replaces the slideshow
status: todo
owner: claude
depends_on: [117b]
---

## Goal
Stage E: the phone view (phone chrome, six random pictures, the fixed line) and the close-up (a pick of the six, the close-up caption, E leaves and pays the task's 5 points, Esc pays nothing) replace the 113d slideshow in one commit; no ad interruption yet. Caption candidates go to `docs/text-review.md` for Marc.

Design and Marc's answers (2026-10-29): `docs/photo-gallery-design.md` (shared 3 x 2 gallery; pause menu manage mode with delete from the close-up and a LOOK switch of presets Crisp 64 x 48 dither 10, Soft 48 x 36 dither 20 (default), Chunky 32 x 24 dither 30 for new uploads only; sofa scene with phone chrome, six random pictures, a close-up you pick, fixed phone-view line and a close-up caption, E pays and Esc does not, an ad may interrupt the close-up). Photos never leave the device; nothing about photo content in the repo, save or sync; synthetic pictures in tests only. Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- Task id, prompt, requirement and points unchanged; the slideshow code is removed in the same commit; a game with no photos behaves exactly as before; render both views at 1x and look; the checks above pass; an independent review.

## Progress log

