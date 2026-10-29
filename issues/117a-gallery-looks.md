---
id: 117a
title: Photo gallery 1: looks and the store
status: done
owner: claude
depends_on: [113c]
---

## Goal
Stage A of section 12: `looks.ts`, sizes derived from the presets as a whitelist, optional `look` on records (none reads as Soft, no IndexedDB version bump), `pixelate` `opts.size`, `addPhotos` look argument, `look-settings.ts` (its own localStorage key, outside the save, sync and reset).

Design and Marc's answers (2026-10-29): `docs/photo-gallery-design.md` (shared 3 x 2 gallery; pause menu manage mode with delete from the close-up and a LOOK switch of presets Crisp 64 x 48 dither 10, Soft 48 x 36 dither 20 (default), Chunky 32 x 24 dither 30 for new uploads only; sofa scene with phone chrome, six random pictures, a close-up you pick, fixed phone-view line and a close-up caption, E pays and Esc does not, an ad may interrupt the close-up). Photos never leave the device; nothing about photo content in the repo, save or sync; synthetic pictures in tests only. Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- Nothing in the UI changes and the default look equals today's exactly (a golden test pins it); old records stay valid; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; an independent review.

## Progress log


- 2026-10-29: Starting. Plan: looks.ts (presets, sizes derived), reel-store sizes derived + optional look, pixelate opts.size, addPhotos look arg, look-settings.ts (own localStorage key). Golden test pins default-look pixelate output (sha256 recorded from main's unchanged code on a synthetic picture) and the addPhotos default path.
- 2026-10-29: Built. New: `src/game/reel/looks.ts` (Crisp 64x48/10, Soft 48x36/20 default, Chunky 32x24/30; `lookSizes`, `lookById`, `isLookId`), `look-settings.ts` (key `life.reel.look.v1`, tolerant load, save returns false on failure), `looks.test.ts`. Changed: `reel-store.ts` (REEL_SIZES derived from presets = 6 sizes; optional `look` on input/record; unknown id dropped; the default look is stored as absent so a default picture is exactly a 113 record; no IndexedDB version bump), `pixelate.ts` (`opts.size`, default unchanged), `photo-add.ts` (`addPhotos(..., onProgress, lookId = default)`), `photos-page.test.ts` (look outside sync doc/save/reset test). Golden: pixelate default output on three synthetic pictures (landscape, portrait, square) pinned by hash recorded from main's unchanged code, same via the Soft preset, and via addPhotos default.
- Checks: `npm test` 3192 pass (one flashcards test failed once under load, passes alone and on rerun; unrelated), `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass. Nothing in the UI changed; no caller passes a look yet.
- Not done / unverified: the dither values and sizes were not eyeballed in `art/tools/pixel-looks.html` (design says to before closing; no previewable UI exists yet; they are data in looks.ts). No real photos used.
- 2026-10-29: Review (independent). Verdict: APPROVE.
  - Ran: `npm test` 3192 pass, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` all pass. Diff touches only src/game/reel/*, photos-page.test.ts and this issue file; no PLAN.md or other issue edits; no new files outside the issue scope; no photo content in the repo.
  - Criterion "nothing in the UI changes, default look equals today's exactly": PASS. My own check (scratch, not committed) bundled main's `pixelate.ts` and compared to the new one on 252 generated cases (14 sizes incl. 1x1, 1x50, 50x1, square, portrait, 2000x1500; random/flat/gradient content; dither undefined, 0, 20, 55, 100, -5, 250; random alpha): byte-identical both with no opts and with explicit `size 48x36`. `addPhotos` default path equals old `pixelate` output and stores no `look` key. No caller passes a look yet and nothing else imports looks/look-settings.
  - "Old records stay valid": PASS. With a hand-written fake IndexedDB (no real IDB in node), 113-format rows (no `look`) read back valid with no `look` key; rows with an unknown stored `look` read back with it dropped; crisp/chunky persist `look`; soft, unknown and absent are stored as absent; dedupe, remove and clear work; sizes whitelist is 6, mixed sizes (64x36, 36x64) rejected; no `onupgradeneeded` change and version stays 1.
  - look-settings: junk, `__proto__`/`toString` ids, throwing or null storage all give the default or false; own key `life.reel.look.v1`; the key is not referenced by save, sync or reset code (grep), and the existing test covers it.
  - pixelate: bad or fractional size throws; portrait with a custom size is the swapped size.
  - Notes (not blockers): the default look is stored as absent (design 4.3 says copy through; the issue text and design 4.2 make absent equal soft, so acceptable). The fake IDB is mine and only approximates real IDB.
  - CAN'T VERIFY: the dither and size values eyeballed in `art/tools/pixel-looks.html` (design asks for this before closing; author did not either), and any real-browser behaviour (real IndexedDB, localStorage blocked). Both are data in looks.ts and cheap to change before anything is stored; they should be confirmed in 117g's on-device pass.
