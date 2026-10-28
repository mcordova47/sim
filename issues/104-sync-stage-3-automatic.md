---
id: 104
title: Sync stage 3: automatic sync and the pause-screen control
status: done
owner: claude
depends_on: [103, 093]
---

## Goal
Build stage 3 of `docs/sync.md` (sections 5, 11 and 12): sync happens by itself (on load, when the page is hidden, and every few minutes while playing; best effort), and the pause screen has the control: pair, show the link, sync now, status (plain, no pressure), turn off, and RESTORE BEFORE LAST SYNC. Works on the touch layer with the issue 093 tap targets and hints. A merge from another device is held and applied at load or when the pause screen opens (or before the first real action), never mid-play; no 'picked up where you left off' message (decided).

## Acceptance criteria
- Automatic sync never blocks play or shows an error as pressure; failures are quiet and retried; the pause screen shows the state in plain words (text in `docs/text-review.md`); tests with a fake clock, fake network and two simulated devices; `npm test`, `npx tsc --noEmit`, `npm run build` pass; Marc tries it on his phone and laptop; unverified items listed.

## Progress log

- 2026-10-28 (claude): Started. Plan: a small scheduler (`src/game/sync/auto.ts`) driven from the feature's update, a quiet `SyncService.auto()`, an AUTO SYNC on/off button, plain status text.
- 2026-10-28 (claude): Built, in review.

  **What changed.**
  - `src/game/sync/auto.ts` (new, about 90 lines): `AutoSync`. `tick()` is called every frame by the feature (`update`); it compares the clock to a next-try time, so it needs no timers and a fake clock drives it in tests.
  - `service.ts`: `auto()` (the same sync as SYNC NOW with no message, never "ONE MOMENT"; a key the server does not know returns "stop", anything else "retry"), `changed()`, `lastOkAt`.
  - `local.ts`: `auto()` / `setAuto()`, stored in `life.sync.v1` as `auto:false` only when off.
  - `client.ts`: PUT bodies up to 60000 chars go with `keepalive: true` (the 64 KB fetch limit), so a hide-sync can finish after the page goes.
  - `feature.ts`: wires the above; `visibilitychange` hidden syncs, visible looks again; the AUTO SYNC button (key A); the status line in plain words with "last synced N min ago"; `mergeIncoming` now applies at once only with the pause screen open, otherwise it is held (`holdMerge`: applied at once only if nothing has been played yet this visit).
  - `draw.ts`: the AUTO SYNC: ON/OFF button (six buttons, still three rows). `config.ts`: `SYNC.auto`. `docs/text-review.md`: the text.
  - Tests: `src/game/sync/auto.test.ts` (12: two devices, fake clock, fake network), plus small updates to `pairing.test.ts` and `sync-draw.test.ts` (a merge now needs the pause screen open, as in play).

  **Timing chosen (all in `SYNC.auto`) and why.** First try 5 s after load (lets the game start drawing first; the merge applies at once if nothing has been played). Every 5 minutes while visible, only if the player's real actions changed (a task, an unlock, decor, a track; not steps or seconds played, which move constantly and would mean a request every 5 minutes for an idle tab), and never while the pause screen, a task or a dialog is open (docs 5 and 11). Hidden: at once. Visible again: look once, if the last try was over a minute ago (so a device left open picks up the other's play). Failure: waits 30 s, 1, 2, 4 minutes, then 5 minutes, back to normal after one success. A key the server does not know stops automatic sync until the player acts (docs 5). Reasons: few requests (the server rate limit is 60 a minute), nothing running that the player can feel, small code.

  **A merge from another device** is applied at load or when the pause screen opens (existing `openList` does it), or at once if it arrives before the player has done anything this visit; otherwise it is kept in `life.sync.v1` and survives a reload. Never while walking or in a task. No message.

  **Turning it off.** AUTO SYNC: ON/OFF on the sync page (key A): off means nothing runs by itself; SYNC NOW and STOP SYNCING still work; it stays off after a reload. STOP SYNCING (stage 2) removes the key altogether.

  **Verification.** `npm test` 127 files, 2831 passed; `npx tsc --noEmit` clean; `npm run build` and `npm run check:dist` pass. Criteria: automatic sync never blocks (the call is not awaited by any frame or input; failures set a plain status line only): tested with offline, server error and garbage blobs; quiet retries with backoff: tested at 5, 35, 95, 215, 455, 755 seconds; two simulated devices with a fake clock and network: tested; status words: text list in `docs/text-review.md`.

  **For Marc to check (`netlify dev`, two browsers; as stage 2's steps, then):**
  1. Device A: L, P, N (turn on), C (copy link). Device B (a private window): open the link, Y.
  2. On A do a task (water the plant), then wait 5 minutes with the pause screen closed (or switch to another tab: that syncs at once). B: reload the page, wait 5 seconds: B has A's task without opening anything (it applies at once, nothing played yet).
  3. On B, do a task first, then have A sync again (hide its tab). B's tab: nothing changes under you; open the pause screen (L): the merge appears then.
  4. Stop `netlify dev`: the game plays on; L, P shows SYNC: NO CONNECTION. TRYING AGAIN LATER; start it again and within a few minutes (30 s, 1, 2, 4, then 5) it says SYNC: ON. LAST SYNCED ...
  5. L, P, A: AUTO SYNC: OFF; the status says so; nothing syncs by itself; S still works.

  **Not verified:** real Netlify; a phone; `visibilitychange` and `keepalive` timing on iOS (a suspended tab may not finish a hide-sync; the next load or return does); how the pause screen looks by eye with six buttons (checked by test for fit); the real clock over a 5 minute wait.

- 2026-10-28 (review agent): Review. Verdict: **approve**.

  Criteria. (1) Automatic sync never blocks play, no error as pressure, quiet retries: pass (AutoSync.run is never awaited by a frame or input and catches everything; idle() keeps it off the pause screen, tasks and dialogs; the status line has no "ERROR" and no key; a backend that throws in get or put was exercised for 10 minutes with no throw). (2) Pause screen shows state in plain words, text in docs/text-review.md: pass (14 lines added, matches statusLine and button labels). (3) Tests with fake clock, fake network, two devices: pass (auto.test.ts, 12 tests, backoff 5/35/95/215/455/755 s confirmed). (4) npm test (127 files, 2831 passed), npx tsc --noEmit (clean), npm run build, npm run check:dist: pass, run by me. (5) Marc tries it on phone and laptop: can't verify (his step).
  Scope: only sync, achievements feature/draw, config, docs/text-review.md and this file changed; nothing under art/src or public/sprites; PLAN.md untouched.

  My own checks (outside the repo, same two-device harness): merge arriving during a hide-sync with input locked is held, survives reload, applies on opening the pause screen; two held merges combine; manual SYNC NOW during an auto run says ONE MOMENT; key-not-found stops auto, pasting a new key resumes it (GET, PUT after 5 min); STOP SYNCING then TURN ON resumes; AUTO SYNC off persists in life.sync.v1 and survives stop; keepalive is true only for PUT bodies up to 60000 chars (false above and for GET). All passed.

  Notes, not blocking:
  - A merge arriving while the player has only walked (no real action yet this visit) applies at once, even mid-walk, so the player can jump. This is what docs/sync.md 4.3 decided ("before the first real action"), but it is wider than the issue's "never mid-play".
  - hidden() ignores backoff and "changed", so 30 quick hide/show flaps made 30 GETs (no PUTs). Within the 60 a minute server limit.
  - The keepalive guard counts characters, not bytes; a save with multibyte text near 60000 characters could exceed the 64 KB keepalive limit and the fetch would fail (quietly, as NO CONNECTION). Tracks are restricted to a mostly ASCII character set, so this is unlikely.
  - The hide-sync does a GET before its PUT, and only the PUT carries keepalive, so on iOS the PUT may never go out after the page is suspended. Best effort, as docs 5 says.
  - RESTORE BEFORE LAST SYNC is not a button on the sync page; the restore lives on the transfer page as RESTORE BEFORE IMPORT (stage 1/2 work, unchanged here).

  Unverified (not checkable by an agent): real Netlify; a phone; visibilitychange and keepalive behaviour on iOS; how six buttons look by eye on the touch pause screen; the real clock over a 5 minute wait.
