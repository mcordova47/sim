# Studying Spanish at the computer (issue 026)

The desk offers "Study Spanish". It is a front end for Marc's real flashcards app (Mil Palabras, palabras.mcord.dev): the cards, the schedule and the progress belong to that app, and the game never keeps its own copy. Answering a card here counts as answering it there.

## Stages

1. **Stage 1 (this): the game side with a stand-in.** The key screen, the card screen, the points rule and the `StudyBackend` interface, all tested without a network. `FLASHCARDS.backend` in `config.ts` is `"demo"`: a built-in ten-card deck, any well-formed key is accepted, nothing is sent anywhere and nothing is paid.
2. **Stage 2: the real backend.** Loads the app's compiled core (`/core.js`) at runtime and syncs through `GET/PUT /api/progress/<key>/es`. Needs the flashcards repo's #169 to settle its API names and CORS.
3. **Stage 3: mumblespeak.** Per-letter blips when the Spanish side is "spoken".
4. **Later, optional: offline study** (cache the core and the last blob, sync when back).

## How it plays

- **Key.** The first time, a screen asks for the sync key. Paste the app's pairing link (`.../?pair=<key>`) or a bare key (32 characters of a-z and 0-9; the parser is the app's own rule, `keyFromText` in `flashcards/key.ts`). Enter confirms, Backspace deletes, Escape leaves. The key is kept in this browser's localStorage (`life.flashcards.v1`) only after the backend accepts it, and a key the server refuses is forgotten. It is never in the code, the bundle or the log. There is no "forget key" button yet; refusing a key forgets it, and clearing the site's data does too.
- **Cards.** E flips. Then left or right (or 1 and 2) picks Again or Got it, E confirms. A missed card comes back a few places on, in the session only. Escape leaves from anywhere.
- **Delivery.** Each answer is sent as it is given. If it cannot be delivered the screen says so, nothing is paid, and the answer is not kept, so the real schedule is never silently wrong.
- **Points.** `FLASHCARDS.pointsPerCard` (4) for each delivered "got it", at most `dailyCardCap` (20) per `capResetHours` (24) game hours. "Again" pays nothing; there are no streaks or penalties. The apartment's clock stands still while studying.

## The interface

`flashcards/study.ts` is all the activity knows: `StudyBackend.open(key)` gives a `StudySession` with `queue()`, `card(slug)`, `requeue(queue, position, slug)` and `grade(slug, grade)` (resolves false when it could not be delivered). The names follow the core's planned API and are provisional. `flashcards/demo.ts` is the stand-in used by stage 1 and the tests.

## Text

The pixel font is capitals only. It now draws `Á É Í Ó Ú Ñ` (two rows of accent above the cap line); lowercase Spanish is drawn as capitals. `¿ ¡ Ü` are not drawn; the vocabulary deck does not need them.
