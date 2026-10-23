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

## Research findings (2026-10-22, from the sibling repo `../flashcards`)
The app is "Mil Palabras" (palabras.mcord.dev): PureScript, Netlify, spaced repetition over the 1000 most common Spanish words. Its README says "no backend", but it does have a small one for sync, documented in its `README.md` (Sync section) and `SYNC.md`.

**The server is a dumb blob store.** Two Netlify Functions over Netlify Blobs:
- `GET/PUT /api/progress/<key>/<lang>` (`netlify/functions/progress.mjs`): one JSON blob per language (`es`, `de`) plus `verbs` for the drills. 500 KB cap, no merge on the server.
- `PUT /api/notes/<key>`: write-only note delivery. Not relevant here.
- **Auth is the key only**: 32 chars of `[a-z0-9]` (about 165 bits), "unlisted link" model. Marc's key is whatever his devices were paired with (`?pair=<key>`, QR or pasted link). The game must treat it as a secret: never committed, never in the bundle.

**The blob** (`Flashcards.Types.Progress`): `{ version: 5, language, deck, cards: [{ slug, box, due (ms epoch), seen, lapses, missed, direction }] }`. Only cards ever seen are in it. Slugs are frozen ids (`yo`, `querer`), not ranks. `direction` is `recognition` or `production`.

**All the learning logic lives in the client, in PureScript** (`src/Flashcards/Scheduler.purs`, `Types/Progress.purs`). The server knows nothing about cards. So the game cannot just "ask the server for due cards". It has to do what the app does: GET, merge, build a session, grade, merge again, PUT. The pieces:
- `merge`: per card, higher `seen` wins, ties keep the left side. Order-insensitive on purpose, so a lost write race self-heals (documented in SYNC.md).
- `buildSession`: due cards first (most overdue first), then new cards in deck order, session of 20. Variant `buildSessionBy` round-robins across kinds (only matters for the drills, not vocabulary).
- `applyGrade` with two grades only (`Again`, `GotIt`): Leitner boxes 0 to 5, intervals 1, 3, 7, 21 and 60 days, first-sighting right answer jumps to box 3, graduation from recognition to production at box 4 (restarts at box 1) unless the card shares its English gloss with others. Due dates for intervals of 7 days or more are fuzzed by up to 15 percent using a deterministic hash of slug and `seen` (Park-Miller scramble), so two devices compute the same date. **A port must match this bit for bit**, or the game and the phone will disagree about due dates.
- Missed cards are requeued 5 places later in the same session.
- The deck is `data/es-1000.csv` (`Order,English,Español,Slug`), compiled into the app, not served. Longest Spanish text is 15 chars and longest English 31. Accented and special characters in use: `ó í ñ é á ú`, plus `, ( ) / - . ? ;`. No `¿ ¡` in the vocabulary deck (those would only appear in sentence prompts for the drills).

**CORS is not set anywhere** in the functions. A browser game on another origin cannot call them (and a JSON `PUT` triggers a preflight). Either a dev proxy (Vite `server.proxy`, fine if the game only runs locally) or a small change to the functions (CORS headers and an `OPTIONS` handler) if the game is ever hosted.

**Other kinds of question exist** (`Flashcards.Exercise`): typed answers (`Checked`), self-graded (`SelfGraded`) and tap-one-of-few (`Choice`) for verb conjugation, tense shifts, paraphrase and por/para drills, stored under the `verbs` blob. Vocabulary cards are self-graded (flip, then Got it or Again).

### Decisions I can make without Marc
- **v1 is vocabulary cards only** (the `es` blob), flip and self-grade, two buttons. The drills are a later extension; they need typed input and accents.
- **Port, do not embed.** Port `merge`, `intervalFor`, `fuzzed`, `applyGrade`, `buildSession` and the codec to TypeScript in the game (about 150 lines), and prove parity with a shared test-vector file generated from the PureScript side (slug and `seen` to due date, grade sequences to resulting cards). That keeps the game dependency-free and fast to test. Compiling the PureScript scheduler into the game is possible but drags in a second toolchain for 150 lines.
- **Sync like the app does:** GET and merge at the start of the activity, grade locally as you go, then GET again, merge and PUT at the end (and on leaving mid-session). If the server is unreachable the activity says the computer has no connection and awards no points. It never keeps answers it cannot deliver, so the real schedule is never silently wrong.
- **Never overwrite what cannot be read:** an unparseable or newer-version blob is left alone, exactly as the app does.
- **Key handling:** read from `.env.local` or a localStorage field entered once, accepting the app's pairing link or a bare key (the app's parser accepts both). Not committed.
- **Card text in the pixel font:** the vocabulary deck needs only `áéíóúñ` plus basic punctuation, so the font requirement is much smaller than I first wrote. `¿` and `¡` are not needed for v1.

### Decided by Marc (2026-10-22)
- **Hosting:** the game might be hosted, so plan for it. CORS headers and an `OPTIONS` handler go on the flashcards functions (`progress.mjs`, and `notes.mjs` only if ever needed). Locally a Vite dev proxy is an alternative, but the hosted case needs the headers anyway.
- **Changes to the flashcards app are welcome.** Candidates: the CORS change, publishing the deck as a static JSON file, and exporting scheduler test vectors for the parity tests. Each is its own small change in that repo, made on its own branch there.
- **Key: never in the codebase.** The game asks for it and Marc types it. It accepts a bare key or the app's `?pair=` link (same parser rules as the app). It must be a text-entry screen in the game (needs a text input mode in the dialog work, 023).
- **UI:** a very loose pixel homage to the app, not a replica. Text must be legible first.
- **Spoken answers:** "mumblespeak" instead of real speech. Read as: when the card's Spanish is "spoken", the game plays Animal Crossing / Sims style per-letter blips or mumble sounds, not the browser's text-to-speech that the real app uses. Confirm this reading when picked up.

- **Remembering state:** yes. The key is remembered in this browser's localStorage (never in the codebase), with a "forget key" option. Game state in general is persisted too (see PLAN.md decisions).

### Still open (deliberately)
- **Deck source:** copy `es-1000.csv` into the game (simplest) or fetch a static JSON the flashcards app publishes (needs that app hosted and CORS on it). Decide when picked up.
- **Points:** whether real answers earn game points, how much, and whether there is a daily cap. Left open.

## Acceptance criteria (draft, to refine later)
- A "study Spanish" interaction on the computer starts a `flashcards` activity.
- The activity loads due cards from the real server through a thin client module with the network layer injected, so it is tested without a network.
- Answers are posted back to the server; failures are handled on purpose and tested.
- The card screen renders in the pixel font with Spanish characters.
- The key is typed in by Marc in the game and never committed or bundled; the server URL comes from config.
- A "mumblespeak" sound plays when a Spanish answer is spoken.
- CORS support exists on the flashcards functions (changed in that repo) before this ships hosted.

## Progress log
- 2026-10-22: Researched the flashcards repo; findings above. Marc answered the questions: hosting possible, flashcards changes welcome, loose homage UI, mumblespeak audio, key typed in by Marc and never in the code. Deck source and points left open on purpose.
- 2026-10-22: Recorded as an idea by Marc. Status is blocked until 021 to 023 exist and the core game has passed its decision gate.
