---
id: 117b
title: Photo gallery 2: the gallery core (not wired)
status: todo
owner: claude
depends_on: [113c]
---

## Goal
Stage B: pure `gallery.ts` (state, paging, cells, `closeupScale`, thumbnail rule) and `gallery-draw.ts` (grid, close-up, phone chrome), with tests, not called by the game.

Design and Marc's answers (2026-10-29): `docs/photo-gallery-design.md` (shared 3 x 2 gallery; pause menu manage mode with delete from the close-up and a LOOK switch of presets Crisp 64 x 48 dither 10, Soft 48 x 36 dither 20 (default), Chunky 32 x 24 dither 30 for new uploads only; sofa scene with phone chrome, six random pictures, a close-up you pick, fixed phone-view line and a close-up caption, E pays and Esc does not, an ad may interrupt the close-up). Photos never leave the device; nothing about photo content in the repo, save or sync; synthetic pictures in tests only. Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- Layout tests at 320 x 192 and 224 x 208; the close-up scale is the largest whole number that fits (5x wide, 4x narrow, 3x for portrait in scene mode); only new files and tests; the checks above pass; an independent review.

## Progress log

