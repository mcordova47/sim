---
id: 102
title: Sync stage 1: export and import a save, and the pure mergeSaves
status: review
owner: claude
depends_on: [095]
---

## Goal
Build stage 1 of `docs/sync.md` (issue 095; read sections 2, 4, 6, 12 and 13 and the decisions in section 15): a save can be exported to a code or file and imported on another device, importing **merges** (never replaces), through a pure `mergeSaves(a, b, now)` that stage 2 and 3 will reuse. Marc (2026-10-28): keep it small, use judgement, he reviews the working feature afterwards.

## What to build
- The synced document (progress group plus made tracks; preferences, reset and the flashcards stay per device), its build and normalise functions over the existing loaders, `activeAt` (set only by a finished task or a decor change, clamped to now plus a day when read, stored in `life.progress.v1`, set by reset and by restore; a delivery arrival or applying a merge must not set it), `device` id, `DemoStore.add` (validates like `save`; identity of a track is its body without the title line), the one-step local backup and RESTORE BEFORE LAST SYNC (sets `activeAt` to now and clears any held merge), and the apply path (held and applied at load, when the pause screen opens, or before the first real action, guarded like `openList`; re-merged with live state at apply; loader order stats, unlocks, world, decor, deliveries, encounters).
- Export and import in the pause screen (touch and keyboard; copy to clipboard and download a file, paste or choose a file to import), with plain deadpan wording for `docs/text-review.md`.
- Fold in the review's non-blocking nits: break an `activeAt` tie by `playSeconds` or `totalPoints` before the device id; pick a track's title deterministically (and compare by body ignoring `made`, so devices never PUT back and forth); trim the 36-track cap by a fixed key such as the body text so it is associative; tie-break an exact same-device tie on the canonical group text.
- Property tests for `mergeSaves` (commutative, associative, idempotent at a fixed `now`; no owned item, achievement, room or track body lost; no owned item left in pending or waiting) with fake storage; export and import round trip; hostile input (junk, huge, wrong version) never corrupts a store.

## Acceptance criteria
- Everything above works with no server; the game behaves exactly as before when no sync is used; goldens unchanged (pause screen frames may need a deliberate re-record: say so).
- `npm test`, `npx tsc --noEmit`, `npm run build` pass; Marc tries export on one browser and import on another (steps in the log); unverified items listed.

## Progress log

- 2026-10-28 (start): Building stage 1 of docs/sync.md in worktree `../sim-worktrees/102-sync-stage-1`. Plan: `src/game/sync/` (merge.ts pure, code.ts, local.ts, io.ts), `DemoStore.add`, `activeAt` in `life.progress.v1`, the apply/hold/restore path in the achievements feature, a transfer page on the pause screen, property tests with a seeded generator (no new dependency). Not touching art/src, public/sprites or docs/art-style.md.

- 2026-10-28 (done, to review): **What was built.**
  - `src/game/sync/merge.ts`: `SyncDoc`, `normaliseDoc` / `normaliseProgress` (an untrusted document goes through `Stats`, `parseWorld`, `parseDecor`, `parseDeliveries`, `parseEncounters`, `parseTrack`; sets are sorted; unknown ids, huge lists and bad tracks are dropped), `clampActive`, `mergeTracks`, pure `mergeSaves(a, b, now)`. `code.ts`: `LIFE1.` (deflate, base64url) and `LIFE1p.` (plain), the file is the JSON; 256 KB limit before and after inflating. `local.ts`: `life.sync.v1` (device id, held merge) and `life.sync.backup.v1`; nothing is written until first used. `io.ts`: file save and file chooser (the clipboard is the existing `src/input/clipboard.ts`). `music/track-body.ts`: a track's identity is its text without the title line. `DemoStore.add(text, made)`.
  - `ProgressStore` reads and writes `activeAt` (only written when above 0). The feature sets it on a finished task, on a decor change that is not a load or a reset, and on reset and restore; never on a step, a delivery arrival (that is `deliveries.onChange`), an apply or a load. `holdMerge` / `applyHeld` (held in `life.sync.v1`, applied at load, when the pause screen opens, or at once before the first real action when the `openList` guard holds, re-merged with live state first), `restoreBackup`. Loader order stats, unlocks, world, decor, deliveries, encounters, with the `resetting` guard and one save.
  - The transfer page (touch buttons and keys): key T on the pause list or the touch button TRANSFER SAVE. COPY CODE C, PASTE CODE V (and Ctrl+V), SAVE FILE F, OPEN FILE O, RESTORE BEFORE IMPORT Shift+R then Y, BACK Esc. Wording is in `docs/text-review.md`.
  - **Review nits folded in:** an `activeAt` tie is broken by game hours (see below), then the device id, then the apartment's canonical text; the track title is chosen deterministically (earlier `made`, then smaller text) and tracks are compared by body ignoring `made`; the 36-track cap trims by body text; an exact same-device tie is decided on canonical text. Immediate apply re-merges with live state on every path (nit 5), RESTORE clears `held` (nit 6), a delivery arrival and an apply do not set `activeAt` (nit 6). Nit 7 (the dead "drop an unowned placed slot" repair) is not built.
  - **Keep-it-small choices (each: the simpler behaviour, at the cost of a lost low-value detail).**
    1. The tie-break "by `playSeconds` or `totalPoints`" uses the **game hours** (`deliveries.hours`) instead. Reason: stats are merged as maxima, so a merged document's `playSeconds` is not the winner's and the order stops being associative (shown with a counterexample while designing); `hours` is part of the apartment the winner keeps whole, so it travels with it. Cost: none that matters (hours move with play).
    2. The one-step backup is written whenever an import changes the progress group at all (also a plain union), not only when the remote side won. Simpler; the cost is that a harmless union also overwrites the older backup.
    3. RESTORE keeps the backup (pressing it twice does the same thing), it does not swap. The state before a restore is not kept.
    4. A reset does not save at once (an existing test says a reset writes nothing); its `activeAt` is saved with the next save (10 s timer or page hidden). Closing the tab inside that window loses the stamp: the old apartment may then win once; owned things are kept either way.
    5. A document's `device` is always this device's id when built; after an apply the local `activeAt` can come from the other device (accepted, harmless: the groups are equal then).
    6. No `fast-check`: a seeded generator in `sync/gen.ts` (the design note allows either).
    7. The pause screen's touch layout changed to fit a fifth button: buttons are 18 px tall with 3 px gaps (were 22 and 4) and the achievement rows start lower (a touch page holds 12 achievements, was 16). The desktop hint line is unchanged (a test pins it), so the T key is shown by a separate line `T: TRANSFER SAVE` above it, drawn only when the list leaves the line free (26 achievements now; up to 27 or 28 it would be skipped).
    8. If a code is pasted after the pause screen closed or while something runs, it is held, not applied (it applies when the pause screen opens).
    9. A restore does not bring back tracks (they are only ever added).
  - **Goldens:** none changed. There are no pause-screen frames in `src/game/golden/` (only `main-room-frames.json` and `sleep-frames.json`), and both pass unchanged. The pause screen's drawing changed on purpose (layout above, a new page); `pause.test.ts` still passes unchanged, including its "desktop hint line is as it was" test.
  - **Checked:** `npm test` (2764 pass), `npx tsc --noEmit`, `npm run build` pass. The property tests were mutation-checked (removing the device/text tie-break makes three of them fail). Desktop Chrome (headless, the dev server): opened the pause screen, T showed the page, F wrote `life.sync.v1` only, V with an empty clipboard showed the Ctrl+V line; screenshots looked right (page layout, no clipped text).
  - **Added to docs:** `docs/text-review.md` (the page's wording) and a pointer in `docs/mobile.md` question 10.

- **How Marc tries it (two browsers, no server).** `cd ../sim-worktrees/102-sync-stage-1 && npm run dev`, open the printed address in browser A (say Chrome) and again in browser B (say Firefox or a private window), so they have separate saves.
  1. In A: play a little (finish two or three tasks, put a different painting up if you own one), press L for the pause screen, then T. Press C (COPY CODE). The line says CODE COPIED. (Or press F: a file `life-save.json` downloads.)
  2. In B: finish one different task first (so it has its own progress), press L, T, then V (PASTE CODE; the browser may ask to allow reading the clipboard) or Ctrl+V. The line says SAVE MERGED. Achievements and task counts from A appear; the apartment (dishes, clock, where you stand) is A's because A was played last; anything B had earned is still there. For the file: press O in B and choose the file.
  3. Press V again in B: NOTHING NEW IN THAT SAVE.
  4. To undo: Shift+R then Y on the transfer page (BACK TO BEFORE THE LAST IMPORT). The apartment returns to B's own; counts that came from A come back on the next import.
  5. Junk: paste any other text. It says NOT A SAVE FROM THIS GAME and nothing changes.
  6. On the transfer page Esc goes back to the list, Esc again closes the pause screen.
  **Unverified (needs a real phone or a real second browser by hand):** the touch buttons' look and size on a phone and the PAUSE button route to them; the iOS clipboard "Paste" bubble for PASTE CODE; the iOS file chooser and download for SAVE FILE and OPEN FILE (the chooser opens from the tap; it has not been run on iOS); installed home-screen app behaviour; feel of the touch layout change (fifth button, smaller page). Not run at all: any real two-browser round trip by me (only a fake clipboard and storages in tests, and one headless Chrome session for the desktop pages).
