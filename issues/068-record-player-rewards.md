---
id: 068
title: Record player: no cooldown, pay only for a real change
status: todo
owner: claude
depends_on: []
---

## Goal
Marc's decision (2026-10-26): changing the record should have no cooldown. Today `record-play` ("Choose a record") uses the default 10 second task cooldown, which blocks the menu itself, and it pays 25 points and +5 mood for every choice (stopping the music pays too), which can be farmed by flipping records.

## Acceptance criteria
- `record-play` has `cooldown: 0` (the menu is always open to you, like the track editor).
- It pays (the task's points and the +5 mood) only when you start a record or demo that is **different from the one now playing** (or when nothing was playing). Choosing the one already playing, backing out, and "Stop the music" end quietly with no payout, no mood change and no cooldown (use the quiet exit from issue 059 for those paths; they are not cancels).
- A payout-only limit so flipping back and forth cannot be farmed: the payout happens at most once per 10 game minutes (a config value, `MUSIC.payoutEveryMinutes`, with the time kept in the sound/music state and saved with progress or reset per load, say which); a change inside the window still switches the record, silently, with no payout.
- While a record plays the existing slow mood lift stays as is.
- Works with demos (issue 059): a demo counts as a record for all of this.
- The good-hour and combo logic is untouched; the achievements 'cancelled' stat is not affected by the quiet paths (test it); Escape still behaves as in issue 046 for the menu.
- Tests: no cooldown (two choices in a row work), payout on a change, none on the same record, none on stop, none inside the window, payout again after the window (game-time driven), demos, saves, Escape paths. Update `docs/music.md` and `docs/tasks.md`. `npm test` and `npm run build` pass.

## Progress log
