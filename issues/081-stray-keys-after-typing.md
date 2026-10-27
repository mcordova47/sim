---
id: 081
title: Menus ignore stray keys right after a typing game
status: in-progress
owner: claude
depends_on: []
---

## Goal
Marc (2026-10-27): a menu that opens the moment a typing game ends can take a key the player was still typing, and pick an entry by accident. The reviewer of 043 stage B saw it after Answer emails (the encounter menu opens as soon as the text is done); Marc says it happens in a few places.

## Design
- Find every place a dialog or menu opens right after a typing or notes mini-game ends (Answer emails and the encounter menu, the side-project and track games, flashcards, any other).
- Give menus opened that way a short input delay (about 0.4 to 0.6 s, one config number) during which keys do nothing, and show it plainly if it needs to (for example the cursor appears after). Prefer one general mechanism in the dialog runner over per-activity fixes.

## Acceptance criteria
- A list of the places found, in the log.
- Keys pressed during the delay never choose anything; the first press after it does. Normal menus opened by a deliberate press are not delayed.
- Tests prove it for the encounter menu and one other place, and fail on the old code. `npm test`, `npx tsc --noEmit`, `npm run build` pass.

## Progress log

- 2026-10-27 (claude): Started. Plan: one mechanism in the dialog runner (an input delay on start), chosen by the game when a key-reading activity is running or ended a moment ago.
- 2026-10-27 (claude): Done, in review.
  - Places found where a dialog or menu can open during or right after a key-reading game:
    1. Answer emails (typing) then the ad encounter menu (`maybeEncounter` at task finish, same frame). The real bug.
    2. Notes game (arrows; flagged `strayKeys`): no dialog follows it today, but any dialog opened then is covered.
    3. Track editor (`make-track`, reads keys): its "Make a track" menu and the "Delete X?" confirm open from inside it. Also delayed now, so these menus wait 0.5 s every time they open (a small cost; say if it feels slow).
    4. Flashcards (reads keys) and swap-decor (reads keys) open no dialogs; covered by the same rule if they ever do.
    5. Cutscene/dialog/record-player/collect-delivery menus open on a deliberate press with no key game running: not delayed. The package-arrived line is a popup, not a dialog.
  - Mechanism: `DialogRunner.start(node, onDone, inputDelay)` ignores all keys (choose, cursor, say-advance) for that long; menu view has `ready` (cursor hidden until then), say's `waiting` arrow too. `Game.openDialog` passes `DIALOG.inputDelay` (0.5 s, config) when a `readsKeys`/`strayKeys` activity is running or ended within `DIALOG.strayWindow` (0.3 s). Escape still backs out during the delay (not a choice).
  - Files: src/game/dialog.ts, game.ts, config.ts, activity.ts, activities/notes.ts, render/dialog-box.ts, new src/game/stray-keys.test.ts. Did not touch activities/encounter.ts (issue 080).
  - Checks: new tests (runner; encounter menu after typing with mashed E and arrows; menu during notes; deliberate menu not delayed) fail on the old game.ts/dialog.ts (4 of 6 fail) and pass now. `npm test` 2443 pass, `npx tsc --noEmit` and `npm run build` clean.
  - Not checked: how the delay and hidden cursor feel in a browser.

- 2026-10-27 (review, independent): APPROVE.
  - Criterion 1 (places listed): pass. Log lists encounter menu after Answer emails, notes, track editor menus, flashcards/swap-decor, deliberate-press menus; I grepped all `openDialog` callers (cutscene, dialog, record-player, make-track, fake-host, encounter, collectDeliveries) and found no other key-game path. The single funnel is `Game.openDialog`; nothing calls `dialog.start` directly.
  - Criterion 2 (no choice in delay, first press after picks, deliberate menus not delayed): pass. My own scratch tests (outside the repo): encounter menu opens after typing; X during the delay does nothing; Escape (key) during the delay backs out (via the game's Escape path); a say-then-menu chain opened long after typing has no delay; a menu opened 0.25 s after the game ended is delayed, one 0.4 s after is not; the delay lasts 31 frames at 60 fps (0.5 s) as configured.
  - Criterion 3 (tests, fail on old code, checks): pass. Ran the author's stray-keys.test.ts against main's dialog.ts/game.ts in a scratch copy: 4 of 6 fail, as claimed (the 2 that pass on old code are the trivial no-delay-by-default and say-does-not-advance checks). `npm test` 2443 pass, `npx tsc --noEmit` clean, `npm run build` clean.
  - Scope: only the files named in the log plus the issue file; no PLAN.md or other issues touched. Config values are in DIALOG (inputDelay, strayWindow).
  - Notes (not blocking): (a) Escape in a menu opened right after typing with no activity running is also ignored during the 0.5 s (the log says Escape still backs out; true only while a cancellable activity is running, e.g. the encounter). Harmless. (b) The last assertions of the encounter test are loose (an OR of three conditions plus "not a menu"); the cursor-stays-0 check earlier is what makes it fail on old code. (c) Track editor menus now always wait 0.5 s; the author flagged this.
  - Unverified: how the 0.5 s delay and the hidden cursor feel in a browser (not run in a browser by author or reviewer).
  - PLAN.md table needs updating by the planner.

- 2026-10-27 (claude): Two more fixes from Marc's playtest, back in review.
  - Global key handlers found: (1) achievements feature (L opens the list; B, D etc. inside it), (2) sound feature (mute key M; also key sounds in typing/notes, which are not hotkeys), (3) time-of-day dev keys (brackets), (4) the Keyboard class itself only records keys (no action). All three actions now ask one rule, `Game.hotkeyBlocked(code, softLetters?)`: blocked while a key-reading activity runs, and after it ends until every key has been let go; Escape is always free. The mute key keeps working in the track editor outside naming (`softLetters`), as before. The real cause of L opening: the openList guard looked at `busy`, but a keydown arrives between frames, after the typing game finished and before the next frame, so busy was already false.
  - Leak into movement: `Game.keysGate` is set while a key-reading activity runs and, after it ends, movement and task starts get no input until a frame with no key held or pressed. Escape out of a game is not gated (restarting at once still works, existing tests). Same gate covers typing, notes, track editor, flashcards and swap-decor (all `readsKeys`/`strayKeys`).
  - Tests added to stray-keys.test.ts (L during and right after typing; held arrow after notes; held A after typing; Escape not gated). 3 of the new ones fail on the old game.ts, all pass now. `npm test` 2447 pass, tsc and build clean. The 0.5 s menu delay is unchanged. activities/encounter.ts not touched.
  - Not checked: feel in a browser.

- 2026-10-27 (review 2, independent, of HEAD 122ac83 hotkeys + keys gate): CHANGES NEEDED (one real risk, plus small notes).
  - Checks run: `npm test` 2447 pass, `npx tsc --noEmit` and `npm run build` clean. New tests run against the previous commit's game.ts and the three feature files in a scratch copy: 3 of the 4 new tests fail there (L list, held arrow after notes, held A after typing); the Escape-not-gated test passes on old code (it only guards against over-gating). Own edge tests in scratchpad rv2 (outside the repo).
  - Listener sweep: grep of src for addEventListener/keydown/keyup finds Keyboard (records only), achievements (L), sound (M), time-of-day (brackets), clipboard `paste` (not a hotkey; used by the flashcards key phase) and canvas `resize`. No hotkey was missed. All three hotkeys use `hotkeyBlocked`.
  - Pass: L/M/brackets blocked while typing, notes, track editor, flashcards, swap-decor run, and after the game ends until a no-key frame (the between-frames keydown case is covered because the gate is set in the frame the game finishes). Escape is free (also with a dialog open on top: backs out, gate clear, E starts a task next frame; Escape still held does not matter). Mute in the track editor outside naming and in flashcards outside the key phase still works. A non-key task never sets the gate: walking and hotkeys are normal after it. Gate clears after one released frame and walking then works. Window blur empties Keyboard's held set, so the gate clears after a blur. A menu opened after typing keeps the gate through the dialog and clears it afterwards.
  - RISK (should fix): the gate clears only on a frame where `controls.keysDown` is empty, and `keysDown` is every key in Keyboard.held, modifiers included. A key whose keyup never arrives keeps the gate shut forever: movement and E (task start) both get NO_INPUT, and the hotkeys stay blocked, until the player taps that key again or the window blurs. Before this commit a stuck non-arrow key did nothing. Two realistic ways to get one: (1) macOS drops the keyup of a letter pressed with Cmd held, e.g. Cmd+V in the flashcards key phase (the paste step), then finishing the session leaves V "held"; (2) Caps Lock on macOS reports keydown when switched on and keyup when switched off, so with Caps Lock on, after any key game the player cannot move. Confirmed in a scratch test at the Game level (CapsLock in keysDown for 300 frames: player never moves, `hotkeyBlocked` stays true); the browser behavior itself is from knowledge, not run in a browser. Suggested fix: ignore modifier keys and CapsLock (and keys that were held before the game ended and never re-pressed) when deciding "released", and/or add a timeout (for example the gate also clears after a second or two with no new keydown).
  - Smaller notes (not blocking): (a) the notes game now blocks M (before: only readsKeys games did); fits the goal, just a change. (b) The gate stays set while any dialog is open (clearing is skipped when `dialog.open`), so the mute key is blocked for the whole time an encounter menu stays up after typing, even with no key held. (c) No test covers the M key or the bracket keys, or flashcards/track editor leaks; the rule is shared, so this is a coverage gap only. (d) Shift held for capitals also holds the gate until released; intended.
  - Checklist for the author:
    - [ ] Make the gate unable to stay shut on a stale held key (ignore modifiers and CapsLock, and/or a timeout), with a test (a key in keysDown that never goes away must not block walking forever).
    - [ ] Optional: let the mute key work while a dialog is open after the game, and add a small test for M.
  - Unverified: feel in a browser; the Cmd/Caps Lock keyup behavior.
