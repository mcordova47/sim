---
id: 081
title: Menus ignore stray keys right after a typing game
status: todo
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
