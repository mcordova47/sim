---
id: 081
title: Menus ignore stray keys right after a typing game
status: review
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
