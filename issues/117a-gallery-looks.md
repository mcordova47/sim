---
id: 117a
title: Photo gallery 1: looks and the store
status: todo
owner: claude
depends_on: [113c]
---

## Goal
Stage A of section 12: `looks.ts`, sizes derived from the presets as a whitelist, optional `look` on records (none reads as Soft, no IndexedDB version bump), `pixelate` `opts.size`, `addPhotos` look argument, `look-settings.ts` (its own localStorage key, outside the save, sync and reset).

Design and Marc's answers (2026-10-29): `docs/photo-gallery-design.md` (shared 3 x 2 gallery; pause menu manage mode with delete from the close-up and a LOOK switch of presets Crisp 64 x 48 dither 10, Soft 48 x 36 dither 20 (default), Chunky 32 x 24 dither 30 for new uploads only; sofa scene with phone chrome, six random pictures, a close-up you pick, fixed phone-view line and a close-up caption, E pays and Esc does not, an ad may interrupt the close-up). Photos never leave the device; nothing about photo content in the repo, save or sync; synthetic pictures in tests only. Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- Nothing in the UI changes and the default look equals today's exactly (a golden test pins it); old records stay valid; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; an independent review.

## Progress log

