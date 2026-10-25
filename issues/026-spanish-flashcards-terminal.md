---
id: 026
title: Spanish flashcards on the in-game computer (stretch)
status: done
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

## Decisions (2026-10-25, Marc)
- Copying `es-1000.csv` is dropped: the flashcards app (#169) will serve its compiled core at `/core.js` and the game runs that instead of porting the scheduler, deck, grading or merge. Planned API (provisional): `session`, `card`, `grade`, `requeue`, `merge`, plus a version number the game checks.
- Points: small, capped (4 per delivered "got it", 20 per game day, no penalty for "again"). Mumblespeak means per-letter blips. Offline study is put off. Production origin is `*.mcord.dev`; dev is Vite's default `http://localhost:5173`.
- Text entry (023 has none): built into this activity (keydown plus paste).

## Stages
1. Game side against a stand-in backend: key screen, card screen, points, accented capitals in the font, the desk task. **Done, in review.**
2. The real backend: `core.js` adapter with a version check and shape check, the GET/grade/merge/PUT loop, "no connection" handling, `FLASHCARDS.backend = "real"`.
3. Mumblespeak.
4. Offline (later, optional).

## Acceptance criteria, stage 1
- "Study Spanish" is offered at the desk computer and starts a `flashcards` activity.
- A text-entry screen takes a pairing link (paste) or a typed bare key, parsed by the app's rule, remembered in localStorage only after the backend accepts it, forgotten if refused. Never in the code or bundle.
- The activity talks to the flashcards app only through a `StudyBackend` interface; tests use fakes with no network.
- A card screen shows front, flip, then Again or Got it; a miss is requeued; every answer is delivered as given; an undelivered answer is reported, pays nothing and is not kept.
- The font draws the Spanish accented capitals.
- Points per delivered got-it, capped per game day, none for again, none from the demo backend.
- Escape leaves from any state; the clock stands still while studying.
- Build, tests and types pass.

## Acceptance criteria (original draft, for stages 2 and 3)
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
- 2026-10-25: Marc unblocked it and chose stages (see Decisions). Starting stage 1 in worktree ../life-worktrees/026-spanish-flashcards, branch issue/026-spanish-flashcards: font accents, `src/game/flashcards/` (study interface, key parser and store with the points cap, demo backend), `activities/flashcards.ts`, the `study-spanish` task at the desk, docs, tests.
- 2026-10-25: **Stage 1 done, in review.** Files: `src/render/font.ts` (Á É Í Ó Ú Ñ as 9-row glyphs drawn 2px above the cap line), `src/game/flashcards/{study,key,demo,backend}.ts` and `key.test.ts`, `src/game/activities/flashcards.ts` and `.test.ts`, `config.ts` (`FLASHCARDS`), `tasks.ts` and `apartment.ts` (`study-spanish` at the desk), `docs/flashcards.md`, `docs/activities.md`, `docs/dialogs.md`, small updates to four existing tests (the desk's choice list, the allowed activity types, and two tests that used `é` as the example of a character the font cannot draw). `npm run build`, `tsc` and `npm test` (1605) pass. Golden frame unchanged (the room did not change).
  - **In demo mode** any well-formed key is accepted and kept in localStorage, so the key screen is real but nothing talks to a server and nothing pays.
  - **Not checked:** how it looks and feels in a browser. The accents touch the letter below them (two accent rows directly over a 7-row capital); legible on paper, unseen at game scale. No "forget key" button yet (a refused key is forgotten); say if wanted before stage 2.
  - **For the planner:** stage 2 needs the flashcards #169 API names and CORS for `http://localhost:5173` and `*.mcord.dev`. Likely conflict surface with main: `tasks.ts`, `apartment.ts`, `config.ts`, `font.ts` (all additive).
- 2026-10-25: **Review (stage 1, independent): changes needed.** Build, `tsc` and `npm test` (1605) pass. Scope is clean (issue file, new flashcards files, additive `config.ts`/`tasks.ts`/`apartment.ts`/`font.ts`, docs, and four small test edits that are justified). No network code in the new files, no key in the bundle (grep of `dist`). My own checks (outside the repo, scratchpad) ran 41 activity/store/parser/font tests and 6 real-`Game` tests.
  - Pass: "Study Spanish" at the desk starts a `flashcards` activity (real `Game`, real task). Key parser matches the app's `keyFromLink` on 22 hand cases and 20,000 random strings (`?`, `#`, `&` separators, first `pair=` part wins, uppercase and 31/33-char keys refused). `StudyBackend` interface only, no network. Flip, again/got-it, requeue on a miss; a grade that returns false or rejects shows "not saved", pays nothing, does not advance, does not requeue. Points 4 per delivered got-it, none for again, none from the demo, cap 20 cards per window, enforced across reloads and tampered or throwing storage. Accented capitals have 9-row glyphs whose bottom 7 rows equal the plain capital; `drawText` puts them 2px above the cap line at any scale. Escape in the real `Game` at the key screen, connecting, front, back, saving and done: always leaves, pays nothing, can restart; the game clock does not move over 600 frames of held keys and the player does not move. A late grade after Escape pays nothing and removes the paste listener. Enter on an empty buffer is quiet; shift gives capitals; a 1,000,000 char paste is cut to 300; 50 keys in one frame stop at 300; double Enter opens once.
  - **Fail: pasting with Ctrl+V or Cmd+V adds a stray "v".** `updateKey` (`activities/flashcards.ts`) does not skip keys while Control, Meta or Alt is held, unlike `make-track.ts` (which says "Ctrl+V pastes through its own event"). The paste event sets `typed` to the link, and the `KeyV` press that caused it is read on the next frame and appended. Reproduced: typed ends `...hij01v`, length 49, Enter gives "That is not a key." The same happens with a bare 32-char key (33 chars). The main way to enter the key, paste, therefore fails unless the player notices and presses Backspace. (Reproduced with the keydown-then-paste order a browser gives; the other order is fine. Not seen in a real browser.) Also Ctrl+A, Ctrl+C and the like type letters.
  - Minor, not blocking: (1) the cap window is only re-saved on a paid card, so play time after the last paid card is lost on reload and the window stretches beyond 24 game hours (never shortens it; reproduced). (2) If the game clock goes backwards in the same page (new game), the window stays closed until the clock passes the old anchor. (3) A pasted link is cut to 300 characters before parsing, so a very long URL with `pair=` after that fails. (4) Escape while "connecting" does not remember a key that was then accepted. (5) The font counts a decomposed accent (NFD) as an unsupported character and a wrong width; fine for NFC text, check the real deck's normalisation in stage 2. (6) `?`, `=`, `/` and `:` cannot be typed, so a link only works by paste (acceptable by the criterion, but it depends on the paste fix).
  - **Can't verify (record as unverified, not passed):** how the key screen and card screen look and feel in a real browser; how the accented capitals look at game scale (the accent rows touch the capital's top row with no gap: Á is `..#..` directly over `.###.`); real keyboard handling, including whether the paste order above happens in practice.
  - Checklist for the author:
    - [ ] Ignore text keys while Control, Meta or Alt is held in `updateKey` (as `make-track.ts` does), and add a test for paste followed by the `KeyV` press with Control or Meta held.
    - [ ] Optional: persist the remaining window on leave or tick, and cap the paste at the length check after parsing, not before.
- 2026-10-25: **Review round 1 changes worked.** Fixed: `updateKey` now ignores text keys while Control, Meta or Alt is held (Ctrl+V no longer leaves a stray "v"), with a test for a paste followed by the V press under each modifier; a pasted link longer than the limit is reduced to its key before the cut. Left as noted by the reviewer (minor): the cap window is re-saved only on a paid card (it can only stretch, never shorten), a clock that goes backwards keeps the window closed until it catches up, Escape while connecting forgets a key that was then accepted, and decomposed (NFD) accents are not handled by the font (check the real deck in stage 2). Still unverified: how it looks and feels in a browser.
- 2026-10-25: **Review (stage 1, round 2, independent): approve.** Diff since the round-1 review touches only `flashcards.ts`, its test and this file. `npm run build`, `tsc` and `npm test` (1607) pass. My own checks (outside the repo, 20 tests): for each of ControlLeft/Right, MetaLeft/Right, AltLeft/Right, a paste followed by the V press (paste-then-keydown, the order that failed) leaves `typed` as exactly the key; keydown-then-paste is fine too; plain V, Shift+V and digits still type; typing resumes once the modifier is let go; Ctrl+Backspace still deletes and Enter still submits; a second paste replaces the first; paste variants (whitespace, `?`/`#`/`&` separators, first `pair=` wins, invalid first `pair=` is not skipped, uppercase or 31-char keys left as typed text so Enter says not a key, a key after 5,000 characters of prefix is found); 5 MB pastes (`&`, `?`, `pair=` repeated, a long query then the key) run in under 1.5 s each and `typed` stays at or under 300; a pasted link then Enter opens the backend with the bare key; a paste after leaving the key phase is ignored; the key screen still shows only asterisks and a character count. Round-1 fail is fixed. Round-1 minor items were left as noted by the author and are not blocking.
  - Side effect to know: a paste that holds a key is now replaced by the bare key (32 characters, masked on screen), not the link. Harmless.
  - **Unverified, not passed:** real browser look and feel; real keyboard and paste event order (the modifier fix relies on Control/Meta still being in `keysDown` on the frame the V is read; if Ctrl is let go in the same 16 ms frame as the V press, a stray v could still appear, not reproducible here); how the accented capitals look at game scale.
