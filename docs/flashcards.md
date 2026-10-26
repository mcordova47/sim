# Studying Spanish at the computer (issue 026)

The desk offers "Study Spanish". It is a front end for Marc's real flashcards app (Mil Palabras, palabras.mcord.dev): the cards, the schedule and the progress belong to that app, and the game never keeps its own copy. Answering a card here counts as answering it there.

## Stages

1. **Stage 1: the game side with a stand-in.** The key screen, the card screen, the points rule and the `StudyBackend` interface, all tested without a network. `demo.ts` is a built-in ten-card deck that accepts any well-formed key, sends nothing and pays nothing; `FLASHCARDS.backend = "demo"` in `config.ts` selects it.
2. **Stage 2 (this): the real backend** (`FLASHCARDS.backend = "real"`, the default). See below.
3. **Stage 3: mumblespeak.** Per-letter blips when the Spanish side is "spoken" (below).
4. **Later, optional: offline study** (cache the core and the last blob, sync when back).

## How it plays

- **Key.** The first time, a screen asks for the sync key. Paste the app's pairing link (`.../?pair=<key>`) or a bare key (32 characters of a-z and 0-9; the parser is the app's own rule, `keyFromText` in `flashcards/key.ts`). Enter confirms, Backspace deletes, Escape leaves. The key is kept in this browser's localStorage (`life.flashcards.v1`) only after the backend accepts it, and a key the server refuses is forgotten. It is never in the code, the bundle or the log. There is no "forget key" button yet; refusing a key forgets it, and clearing the site's data does too.
- **Cards.** E flips. Then left or right (or 1 and 2) picks Again or Got it, E confirms. A missed card comes back a few places on, in the session only. Escape leaves from anywhere.
- **Delivery.** Each answer is sent as it is given. If it cannot be delivered the screen says so, nothing is paid, and the answer is not kept, so the real schedule is never silently wrong.
- **Points.** `FLASHCARDS.pointsPerCard` (4) for each delivered "got it", at most `dailyCardCap` (20) per `capResetHours` (24) game hours. "Again" pays nothing; there are no streaks or penalties. The apartment's clock stands still while studying.

## The real backend

The game imports the app's own compiled core, `https://palabras.mcord.dev/core.v1.js` (`FLASHCARDS.origin`, `coreVersion`), and does not reimplement the scheduler, deck, grading or merge. `flashcards/core.ts` checks what it got (the `version` must equal `coreVersion`, and `session`, `card`, `grade`, `merge` and `requeue` must be functions) and fails with a message saying what is wrong. `flashcards/real.ts` runs the app's study loop against `GET/PUT <origin>/api/progress/<key>/es`:

- open: GET the blob (404 means no progress yet), then `core.session` for the queue;
- each answer: `core.grade`, GET again, `core.merge`, PUT. The local copy moves on only after the PUT succeeded, so an answer that could not be delivered is not kept anywhere;
- open results: a 400 means the key was refused (forgotten); a network error, a server error or a core that fails to load or check means "no connection"; a core that refuses what the server holds (a newer format, damage) means "the saved cards could not be read" and nothing is written.

The card screen shows `prompt`, then `answers` joined with commas, and `example` as a hint when there is one. Accents from the core are normalised to NFC so the font sees one letter. A build can point at another origin with `VITE_FLASHCARDS_ORIGIN`; the app's CORS list allows `https://*.mcord.dev` and Vite's dev server on `localhost:5173` and `127.0.0.1:5173`, so other origins (a Netlify preview URL) will be refused by the browser.

Only the self-graded vocabulary cards (the `es` blob) are used. The drills are not.

## Mumblespeak

The game never uses the browser's text-to-speech. When the Spanish side of a card appears it is "spoken" as a run of short soft blips, one per letter (`flashcards/mumble.ts`, tuned in `FLASHCARDS.mumble`): thirteen letters a second, vowels at distinct pitches, consonants wobbling below them, a space or a mark as a rest, at most 40 characters. An accented letter sounds like its plain one, and a word always sounds the same. The activity asks the host for each letter (`host.voice(pitch)`, the `voice` event), and the sound feature plays the `mumble` effect for it, so mute (M) and the voice cap work as for any effect.

A recognition card (the Spanish word is the prompt) speaks when it is shown; a production card (the English is the prompt) speaks its answer when it is turned over. R says it again while the Spanish is showing. Answering or leaving stops it.

## Trying the screens and the voice without the app

In a dev build, open the game with `?flashcards=demo` (for example `http://localhost:5173/?flashcards=demo`). "Study Spanish" then uses the practice deck in `flashcards/demo.ts`: fifteen cards with both directions (Spanish first and English first), accents, a long word, a long phrase and hint sentences. There is no server and no key screen, no key is remembered and nothing is paid. It is ignored in a production build. `FLASHCARDS.backend = "demo"` in `config.ts` does the same for every page load. Tune the voice in `FLASHCARDS.mumble` and the `mumble` effect (both in `config.ts`) and the page reloads.

## The interface

`flashcards/study.ts` is all the activity knows: `StudyBackend.open(key)` gives a `StudySession` with `queue()`, `card(slug)`, `requeue(queue, position, slug)` and `grade(slug, grade)` (resolves false when it could not be delivered). `flashcards/demo.ts` is the stand-in used by stage 1 and the tests.

## Text

The pixel font is capitals only. It now draws `Á É Í Ó Ú Ñ` (two rows of accent above the cap line); lowercase Spanish is drawn as capitals. `¿ ¡ Ü` are not drawn; the vocabulary deck does not need them.
