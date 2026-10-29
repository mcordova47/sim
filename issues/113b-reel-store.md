---
id: 113b
title: Photo reel 2: the ReelStore
status: done
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
- 2026-10-28 (independent review, claude): **Verdict: approve.**
  - Criterion "store tests pass; `npm test`, `npx tsc --noEmit`, `npm run build` pass": pass. Full `npm test` 133 files / 2969 passed (1 skipped), tsc clean, build and `check:dist` pass; worktree clean afterwards.
  - Own edge-case checks (scratch file, not committed; kept outside the repo), all pass: 70 in one batch gives 60 added / 10 full; duplicate beats full in precedence; remove then add refills to exactly 60 with ids ascending; 10 concurrent adds never exceed 60; two concurrent adds of the same pixels give 1 added; validation rejects null/undefined/missing px/plain array/Uint8ClampedArray/wrong length/36x36/index 22/255, accepts 36x48 and a subarray view with offset; caller's array and returned lists do not alias the store; a backend failure mid-batch rejects, keeps earlier adds and leaves the queue usable; cap 0; ids not reused after clear; remove of missing id and double clear are fine; no IndexedDB (null or undefined) falls back to memory with `persistent:false`; a failing open rejects and the next call retries; a synchronously throwing `open` rejects the call.
  - Scope: only the store, its test and this issue file changed. Nothing imports the store (grep of src, index.html, scripts); save/sync code untouched. No reference-photos content or personal data; synthetic data only.
  - Can't verify: real IndexedDB in Safari or any browser (only the author's hand-written fake and mine); `navigator.storage.persist()` (not part of this issue); the "sync document has no reel field" test (belongs with wiring).
  - Minor notes, not blockers: (1) `put` in the IndexedDB backend creates the `key` request promise before `await done(tx)`; if the request errors, `key` rejects unobserved and could raise an unhandledrejection in a browser (the add still rejects correctly through `done`). (2) No `onversionchange` handler to close the db, so a future version bump in another tab would be blocked. (3) Design section 8 says the database is dropped "if possible" on clear; `clear()` only empties the store, which satisfies the empty-store test. (4) A storage failure mid-add rejects the whole call and loses the counts for already-stored pictures; 113c should catch it and re-list.
