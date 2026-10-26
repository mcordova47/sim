---
id: 068
title: Record player: no cooldown, pay only for a real change
status: done
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

- 2026-10-26: Started (work-issue). Plan: a `record-player` activity replaces the plain dialog for `record-play` (quiet exits via 059's `quiet`), the sound feature owns what is on and the payout window, `cooldown: 0`.
- 2026-10-26: Built. Branch `issue/068-record-player`.
  - **Rules:** `record-play` has `cooldown: 0`. New activity `src/game/activities/record-player.ts` opens the same menu (the task keeps its `dialog` function) and decides at the end: a pick that is a different record or demo than the one on, with the payout window over, ends as a completion (the task's 25 points and +5 mood through the normal award, so combo and good hour are untouched). Everything else ends with `{ completed: false, quiet: true }`: the same record, Stop the music, backing out with Escape or the cancel key, Escape on the reply line, and a change inside the window (which still switches the record). No `taskCancelled` fires, so the cancelled stat is not touched.
  - **How the activity learns what is playing:** the sound feature sets `game.jukebox` (new, optional; `() => RecordState`), and the host gives it to activities as `records()`. The activity tells the feature its choice with the new `record` event (`{ id, paid }`, sent just before the task ends), via `host.recordChosen`. The feature's old "apply the pick when the task completes" logic is gone (it applied only on completion). With no sound feature, nothing is playing and any record pays.
  - **The window:** `MUSIC.payoutEveryMinutes` (10) in `config.ts`. Kept in the sound feature (`payoutLeft`, game minutes) and **saved with the sound settings** (`life.sound.v1`, new `payoutLeft`; clamped to 0..10, a missing, negative, huge, NaN or non-number value gives 0). It counts down in game time while the game runs, not while a dialog or the track editor holds the clock (same guard as the mood lift), so a reload can only lengthen the wait a little, never skip it. It starts only on a paid choice, not on Stop. The sleep task moves the clock variable but the window counts play time, so sleeping itself counts only for its 6 seconds of waiting (a call for Marc if sleeping should end the window).
  - **Unchanged:** the slow mood lift, good-hour and combo logic, Escape rows of issue 046, demos listing and deletion (a deleted demo stops, so the next record pays as from silence).
  - **Behavior changes worth knowing:** Escape on the "Now playing..." reply line used to count as a cancel and drops the pick; it still drops the pick but is now quiet (no cancel count). With no cooldown, a press too many on the closing line reopens the menu (the old tests pressed twice; the test helpers now stop when the dialog closes).
  - **Files:** `src/game/activities/record-player.ts` (new), `activities/index.ts`, `activity.ts` (host `records`, `recordChosen`, `RecordState`), `events.ts` (`record`), `game.ts` (`jukebox`, host), `config.ts`, `tasks.ts` (cooldown, spec; small, may conflict with 065), `music/records.ts` (`pickedFrom`), `sound/feature.ts`, `sound/settings.ts`, tests, `docs/music.md`, `docs/tasks.md`.
  - **Tests:** new `src/game/record-player.test.ts` (real Game, task and sound feature): no cooldown, payout on a change from silence, none for the same record, none for stop, none inside the window, payout after it (game time), demos (switch, same, after the window, deleted demo), Escape paths (menu, cancel key, reply line) with the cancelled stat held at 0, save round trip, damaged saves, a huge saved wait, the window not running while a dialog is open, no sound feature, and a seeded fuzz of 40 seeds x 4000 frames (menu keys, Escape, cancel, mute, demo add and delete, sleeps) checking: no payout without a real change and not inside the window, cooldown always 0, cancelled stat 0, mood and points finite. I also ran it once at 500 seeds x 6000 frames (a temporary copy, deleted): all pass. `npm test` (1782) and `npm run build` pass.
  - **Not checked:** how it feels and sounds in a browser (needle sound, the line), real play with a clock.

- 2026-10-26: **Review** (independent). Verdict: **approve**.
  - `npm test` 1782 pass (incl. escape.test.ts 277, golden frame); `npm run build` ok.
  - cooldown 0, `record-player` activity, `MUSIC.payoutEveryMinutes`: pass (code read, author tests plus mine).
  - Pays only for a different record/demo from the one on: pass. Same record, Stop, Escape/cancel on menu and reply line, change inside window: quiet (`quiet: true`, so no `taskCancelled`, cancelled stat untouched): pass (code in interaction.ts finish; tests).
  - Payout window in game time, saved with `life.sound.v1`, damaged/NaN/huge values clamped: pass.
  - Demos count as records: pass. My extra test (deleted): a demo re-saved under a new name while playing keeps its id and is "the same record", no payout after the window.
  - Own extra checks (scratch tests, deleted): sound feature attached late (no jukebox: any record pays, then attaching works), muted still pays and switches, cancel key then Escape on the open menu fires no events and plays nothing, NaN mood effect does not make points non-finite. All pass.
  - Good hour/combo untouched (a paid pick is a normal award). Docs updated. Scope: only the listed files; tasks.ts touch is small and may conflict with 065 (noted by author).
  - Can't verify: feel and sound in a real browser (needle sound, the line, real clock). Sleeping counts only its waiting seconds toward the window (author flagged for Marc).
