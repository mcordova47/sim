---
id: 117c
title: Photo gallery 3: manage mode with delete one
status: todo
owner: claude
depends_on: [117b]
---

## Goal
Stage C: the PHOTOS page shows the grid (newest first, paged), opens a close-up with E or a tap, deletes one picture from the close-up (DELETE then SURE? DELETE, any other key cancels, no delete in the grid), keeps ADD and REMOVE ALL; both views; touch.

Design and Marc's answers (2026-10-29): `docs/photo-gallery-design.md` (shared 3 x 2 gallery; pause menu manage mode with delete from the close-up and a LOOK switch of presets Crisp 64 x 48 dither 10, Soft 48 x 36 dither 20 (default), Chunky 32 x 24 dither 30 for new uploads only; sofa scene with phone chrome, six random pictures, a close-up you pick, fixed phone-view line and a close-up caption, E pays and Esc does not, an ad may interrupt the close-up). Photos never leave the device; nothing about photo content in the repo, save or sync; synthetic pictures in tests only. Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- Existing PHOTOS tests stay green; tests drive keys and taps; the sofa task is untouched; render both views at 1x and look; the checks above pass; an independent review.

## Progress log

