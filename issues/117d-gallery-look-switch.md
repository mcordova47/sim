---
id: 117d
title: Photo gallery 4: the LOOK switch
status: todo
owner: claude
depends_on: [117a, 117c]
---

## Goal
Stage D: the LOOK switch on the PHOTOS page cycling the presets, with a line saying it applies to new pictures only.

Design and Marc's answers (2026-10-29): `docs/photo-gallery-design.md` (shared 3 x 2 gallery; pause menu manage mode with delete from the close-up and a LOOK switch of presets Crisp 64 x 48 dither 10, Soft 48 x 36 dither 20 (default), Chunky 32 x 24 dither 30 for new uploads only; sofa scene with phone chrome, six random pictures, a close-up you pick, fixed phone-view line and a close-up caption, E pays and Esc does not, an ad may interrupt the close-up). Photos never leave the device; nothing about photo content in the repo, save or sync; synthetic pictures in tests only. Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- Defaults to Soft (today's look); chosen look kept across reloads and untouched by reset; new uploads use it, old ones keep theirs; the checks above pass; an independent review.

## Progress log

