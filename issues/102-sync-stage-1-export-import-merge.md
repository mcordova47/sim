---
id: 102
title: Sync stage 1: export and import a save, and the pure mergeSaves
status: todo
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
