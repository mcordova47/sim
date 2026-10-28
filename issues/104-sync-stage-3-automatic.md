---
id: 104
title: Sync stage 3: automatic sync and the pause-screen control
status: todo
owner: claude
depends_on: [103, 093]
---

## Goal
Build stage 3 of `docs/sync.md` (sections 5, 11 and 12): sync happens by itself (on load, when the page is hidden, and every few minutes while playing; best effort), and the pause screen has the control: pair, show the link, sync now, status (plain, no pressure), turn off, and RESTORE BEFORE LAST SYNC. Works on the touch layer with the issue 093 tap targets and hints. A merge from another device is held and applied at load or when the pause screen opens (or before the first real action), never mid-play; no 'picked up where you left off' message (decided).

## Acceptance criteria
- Automatic sync never blocks play or shows an error as pressure; failures are quiet and retried; the pause screen shows the state in plain words (text in `docs/text-review.md`); tests with a fake clock, fake network and two simulated devices; `npm test`, `npx tsc --noEmit`, `npm run build` pass; Marc tries it on his phone and laptop; unverified items listed.

## Progress log
