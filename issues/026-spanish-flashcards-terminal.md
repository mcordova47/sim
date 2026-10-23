---
id: 026
title: Spanish flashcards on the in-game computer (stretch)
status: blocked
owner: marc + claude
depends_on: [021, 022, 023]
---

## Goal
A deliberately silly, pointlessly convoluted stretch goal. Marc has a real flashcard app, built to learn Spanish, with its own server. Walk to the computer in the game, pick "study Spanish", and the game loads the real state from the flashcard server, renders a pixel-art version of that app's UI from it, lets you answer the cards, and sends the results back to the real server. The game is a front end for the real thing, not a copy of it.

The joke is the indirection: a game about doing mundane tasks where one of the tasks is a real task. Studying here also counts as actually studying.

Not a commitment. Do this only after the core game is playable and fun. It may never happen.

## Idea, as Marc described it
1. Go to the computer, choose "study Spanish".
2. The game fetches state from the flashcard app's server (due cards, current deck, progress).
3. A pixel version of the flashcard UI is drawn from that state.
4. Answer cards in-game.
5. Each answer goes back to the real server, so the real app's review schedule stays correct.

## Fits with
- 022 (activities): this is an activity type, like the typing and notes mini-games. It would also be the first activity with network I/O and a result that is not just `quality`.
- 023 (dialog and menus): the "study Spanish" choice on the computer, and the card UI is a custom screen.
- 021 (apartment state): the score and the clock; maybe points scale with real cards answered correctly.

## Open questions (answer when this is picked up)
- What does the flashcard app expose today? Is there an API to read due cards and post reviews, or does one need adding? What is the auth model (the game is a static Vite app, so a token in the browser is the obvious but awkward answer)?
- CORS: the server would need to allow the game's origin, or the game would go through a small proxy.
- Offline and failure: what happens when the server is down or the answer fails to post? Probably fall back to a "the computer is broken" message and no points. Never lose a real review silently.
- Card content in the pixel font: needs accents and punctuation (`á é í ó ú ñ ¿ ¡`), which ties into the open question about the font's character set in 023. Spanish makes this a hard requirement, not a nicety.
- Input: typing answers needs a text input mode, or multiple choice instead.
- How faithful should the pixel UI be to the real app's UI? Probably a loose homage, not a replica.
- Points: does a real correct answer pay more than a mini-game? Guard against farming if the points matter.

## Acceptance criteria (draft, to refine later)
- A "study Spanish" interaction on the computer starts a `flashcards` activity.
- The activity loads due cards from the real server through a thin client module with the network layer injected, so it is tested without a network.
- Answers are posted back to the server; failures are handled on purpose and tested.
- The card screen renders in the pixel font with Spanish characters.
- No secrets committed; the server URL and token come from local config.

## Progress log
- 2026-10-22: Recorded as an idea by Marc. Status is blocked until 021 to 023 exist and the core game has passed its decision gate.
