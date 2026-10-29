---
id: 113b
title: Photo reel 2: the ReelStore
status: review
owner: claude
depends_on: [113]
---

## Goal
Stage B: `ReelStore` interface with in-memory and IndexedDB versions, cap of 60, dedupe, tests; nothing wired into the game.

Design and Marc's answers (2026-10-28): `docs/photo-reel-design.md` (sofa task; full 22 colours, Bayer dither strength 20, stored 48 x 36 or 36 x 48 shown at 3x; cap 60 pictures; a reset keeps the photos, REMOVE ALL is separate; one fixed caption line per session, never about resolution or size). Look tool: `art/tools/pixel-looks.html`. Privacy: no photo, name or caption of a photo ever enters the repo or bundle; `check:dist` unchanged.

## Acceptance criteria
- Store tests pass; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log


- 2026-10-28 (claude): Started: build `src/game/reel/reel-store.ts` (+ tests), no game wiring.
- 2026-10-28 (claude): Built. `ReelStore` (async `list`, `add`, `remove`, `clear`) over a thin `PicBackend`; rules (cap 60, first that fit, dedupe by pixels, validation of 48x36 / 36x48, one byte per pixel, index 0..21, serialised adds) live in `createReelStore`. Backends: memory (`createMemoryReelStore`) and IndexedDB (`createIndexedDbBackend`, db `life.reel.v1`, store `pics`, record `{id,w,h,px,palette:1}`). `openReelStore()` falls back to memory with `persistent:false` when IndexedDB is missing. Takes plain `{w,h,px}` (no dependency on 113a). Same 11 test cases run against memory and a hand-written fake IDBFactory (no new dependency); plus open/upgrade-once and fallback tests. Synthetic data only. Files: `src/game/reel/reel-store.ts`, `src/game/reel/reel-store.test.ts`, this file. Nothing imports it; save/sync untouched.
- Checks: `npm test` (all pass; `flashcards.test.ts` "does not remember a key" failed once under full-suite load, passes alone, unrelated), `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass.
- Not checked: real IndexedDB in a browser/Safari (only a fake); `navigator.storage.persist()` is not called here (belongs to the add flow, 113c); the "sync document has no reel field" test belongs with wiring.
