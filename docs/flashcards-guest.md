# Studying Spanish without a sync key: a guest mode (design note, issue 083)

Status: design only, nothing is built. Marc's answers of 2026-10-27 are the starting point and this note does not reopen them: **the real Spanish deck is the right deck for a guest**, and **a guest's local progress is never merged into a real key later** (a guest stays a guest; pasting a key starts from that account's own progress). The language argument and everything else is left to this note.

Facts about the app below were read from Marc's flashcards repo (`core.js`, `netlify/functions/progress.mjs`, `netlify.toml`, `README.md`, `SYNC.md`) and from the deployed `https://palabras.mcord.dev/core.v1.js`, which was downloaded and run in Node against made-up progress. Nothing in the app repo was changed.

## 1. The recommendation in one paragraph
**Option (a): a guest's progress lives only in the browser, using the same core.** The key screen gets a second choice, "Study without a key". The game keeps the guest's progress as the string the core returns from `grade` in its own localStorage entry, never calls the progress endpoint, and fetches only the static core file. Points follow the existing rule (same amount, same cap, already per browser). **Nothing is needed from the app**: the core's `empty`, its `null` progress, its `language` argument and its `*` CORS header on the core file already do everything this needs. It is a new `StudyBackend` of about 100 lines plus a choice on the key screen, built in three small stages (section 10).

## 2. Where this touches the code today
- `flashcards/study.ts` defines `StudyBackend.open(key)` and `StudySession` (`queue`, `card`, `requeue`, `grade`). The activity knows nothing else, so a guest is a second implementation of this interface.
- `flashcards/real.ts` is the loop GET, `core.session`, then per answer `core.grade`, GET, `core.merge`, PUT. A guest session is the same minus the GET, the merge and the PUT: `local = core.grade(local, slug, gotIt, now, "es")`, then write `local` to localStorage.
- `flashcards/core.ts` checks that the core has `session`, `card`, `grade`, `merge`, `requeue` and the right `version`. It does not check `empty` (the deployed core has it; section 5).
- `flashcards/key.ts` (`StudyStore`) holds, under `life.flashcards.v1`, the key and the points window (`paid`, `left`). The window is **not tied to the key**: it is already per browser.
- `activities/flashcards.ts` skips the key screen when `backend.usesKey === false`, but that flag also means "this is the practice deck" (IPA line, V voices, taller card layout), so a guest cannot reuse it (section 7, stage 1).

## 3. Point 1: what a guest is and wants
A guest is someone playing the published game who walks to the computer and chooses Study Spanish. They have never heard of Mil Palabras, have no pairing link, and may never come back. Marc's other visitors, friends who try the game, are the likely case.

What they want, in order: a card on the screen in the first few seconds with no setup and no account; the cards to be real (the actual deck, the actual scheduling, so the second visit remembers the first); and nothing that looks like a demo or a lesser mode. The "minimum that feels real" is exactly: real deck, real scheduling, progress remembered next visit in the same browser.

**The key screen.** Today the first thing a visitor sees is "Sync key: paste your pairing link". That is a dead end for them. The screen becomes a two-item choice, in the same pixel style:

```
Study Spanish

  > Study without a key
    Enter a sync key
```

Up and down pick, E confirms, Escape leaves (as everywhere). "Enter a sync key" opens the screen that exists today unchanged. Wording is a draft for the text pass (issue 037) and the screen is never shown to Marc himself once a key is saved (the saved key goes straight to the cards, as now).

**Which mode opens next time.** The browser remembers the last choice (a `mode` of `"key"` or `"guest"`, beside the key in `life.flashcards.v1`): a saved key goes straight to its cards. *Changed in issue 093:* a returning guest with no key sees the choice screen every visit (cursor on "Study without a key", so continuing is one press), because otherwise there was no quick way to reach the key entry. Leaving a mode is a second small control (open question 3).

## 4. Point 2: where a guest's progress lives (the three options)
### (a) In this browser only, with the same core (recommended)
The guest's progress blob is the string `core.grade(...)` returns. The game stores it under its own key (`life.flashcards.guest.v1`, not inside `life.flashcards.v1`, so a damaged guest blob can never take the key or the points window with it) and never calls `/api/progress`.

- **What it costs.** A new backend (`flashcards/guest.ts`), a small store for the blob, a choice on the key screen, tests. No server, no new data kept by anyone but the guest's own browser.
- **Size.** About 62 bytes empty (`{"version":5,"language":"es","deck":"...","cards":[]}`); about 120 to 160 bytes per card seen (about 100 bytes a card in the test run (300 answers over about 200 cards gave 20 KB), the app's README says about 120 KB for the whole 1000-word deck). localStorage allows about 5 MB per origin, and the game's other entries are small, so size is not a problem. The app's own endpoint caps a blob at 500 KB, which the guest never meets either.
- **What it needs from the app: nothing.** `empty(language)`, `null` progress and `language` are already in `core.v1.js` (section 5).
- **What can go wrong.**
  - *Cleared site data, another browser, a private window, or "block site data"* all mean the progress is gone or never saved. For a guest this is acceptable and should be said once, plainly and without alarm ("Saved in this browser only"). The game already treats a blocked or empty store as normal (PLAN.md decision on persistence): with no storage an answer cannot be saved, so it is not paid and the screen says so (default; open question 6 asks whether to allow an unsaved session instead).
  - *The core refuses the stored blob* (a newer format, or damage): the real backend answers "unreadable" and writes nothing, leaving the app to cope. A guest has no app to cope, so the blob is the only copy. The guest backend must not silently overwrite it: it shows "The saved cards could not be read" and offers an explicit "Start again" that clears the guest blob (one confirm). Open question 5.
  - *The deck changes in the app.* The blob carries a deck fingerprint and the app's own loader places saved cards on a newer deck (`SYNC.md`; `Payload.parse`, `demoteIneligible`), so a deck change does not lose a guest's progress, the same as for Marc. A **format** change would bump the core's `version` and the file name, which the game already refuses until `coreVersion` is bumped on purpose.
  - *Cheating or editing the blob.* It is a single-player game and the only reward is points under a daily cap; nothing to defend.
  - *Two tabs.* Each answer reads the blob fresh before grading, writes straight after, and the last write wins. At worst one answer is lost. The real app accepts the same race (`progress.mjs` header).

### (b) The app mints anonymous keys for visitors
The game would generate or request a key for each visitor and use the real endpoint.
- **Needs from the app:** a way to create keys for visitors, which the app does not offer today.
- **Cost and risk.** Every visitor's data would land in Marc's store, and the game would become public storage on his account, with no deletion path and every answer a network call that fails offline. It also puts visitors' data on Marc's server, which this note's privacy rule (section 9) wants to avoid. It buys cross-device sync for a visitor, which nobody asked for.
- **Verdict.** Not recommended. If cross-device guests are ever wanted, that is a feature of the app (accounts, limits), not of this game.

### (c) Only the fixed practice deck, nothing remembered
Reuse `demo.ts` (ten hand-made cards) for everyone with no key.
- **Cost.** Nearly nothing; no storage, no core fetch, works offline.
- **Why not.** It breaks Marc's answer (the real deck), the ten cards run out and repeat, nothing is remembered, and it is exactly the "demo" feel point 1 says to avoid. The practice deck stays what it is: the dev tool for tuning the voice, invisible in production (`?flashcards=demo` is ignored in a production build).

### Comparison
| | (a) browser only | (b) minted keys | (c) practice deck |
|---|---|---|---|
| Real deck and schedule | yes | yes | no (10 cards) |
| Remembered next visit | same browser only | any browser, if the key is kept | no |
| Needs from the app | nothing | nothing to work, a lot to be safe | nothing |
| Visitor data on Marc's server | none | all of it | none |
| Works offline | no (needs the core file) | no | yes |
| Cost | one backend, small | one backend, plus app limits | tiny |
| Verdict | **recommended** | not recommended | not recommended |

## 5. What the core already gives (checked against the deployed `core.v1.js`)
| Need | Core function | Checked |
|---|---|---|
| Start from empty progress | `empty(language = "es")` returns `{"version":5,"language":"es","deck":"<fingerprint>","cards":[]}`; or pass `null` to any function (it is read as empty) | run in Node: `empty("es")` is 62 bytes; `session(null)` gave 20 slugs; `card(null, slug)` gave `yo / I / recognition` |
| Build a session | `session(progress, now, language)` | works on `null` and on a graded blob |
| Grade one answer | `grade(progress, slug, gotIt, now, language)` returns the new progress string | 300 graded answers in a row ran, size grew linearly |
| Language | every function takes `language`, default `"es"`; the game already passes `F.language` | `empty("de")` returns a German blob; an unknown code (`fr`) returns an empty string from `empty`, and the others throw "No such language" |
| IPA | `ipa(slug, dialect, language)`; German has none | unchanged from the real backend |

So the "language argument" and "a way to start from empty progress" you asked about are not needed from the app. The game already calls every function with `F.language`. The one small game-side gap: `checkCore` does not list `empty` (the guest does not need it, because `null` works), so a core without it is still accepted. The guest backend should pass `null` rather than rely on `empty`, which keeps it working with an older core and needs no new check.

**One load-bearing fact for hosting (issue 084).** `netlify.toml` serves `/core*.js` with `Access-Control-Allow-Origin: *`, while the progress endpoint answers only `*.mcord.dev` and Vite's dev origin. So a guest (who only loads the core) works from **any** origin, including a Netlify preview address, where a key holder would see "no connection". `docs/flashcards.md` says other origins are refused; that is true of the progress endpoint only. Nothing to change; worth knowing for issue 084.

## 6. Point 3: moving a guest to a real key later
**Decided by Marc: no merging.** The core has `merge(mine, theirs)` and could do it (per card, the higher `seen` wins, order-insensitive), and that is the reason it is easy to be tempted. It is not built and not offered. Consequences, spelled out so the build does not drift:

- Pasting a key from the guest's menu opens the key screen as today and starts from **that account's own progress** (GET, `session`, and so on). The guest blob is not read, not sent and not merged. No prompt about it.
- **The guest blob is kept, untouched,** under its own storage key. Leaving the key later (see the next point) returns to the same guest progress. It costs nothing and avoids a destructive act. If Marc would rather the guest blob be deleted on entering a key, that is open question 4; the default here is to keep it.
- The guest and key paths never write to each other's storage. The key path never reads the guest blob; the guest path never reads the key.
- Marc himself is unaffected: he has a saved key, and the choice screen shows whenever no key is saved (issue 093; it first showed only when no mode was saved either).

Switching back and forth, and forgetting a key, are interface questions (open question 3). The current game has no "forget key" button; a guest's choice screen makes one more worth having.

## 7. Point 4: points and the rest of the game
**Points.** Do guest answers pay? **Yes, the same rule**: 4 points for each "got it" that is stored, at most 20 per 24 game hours (`pointsPerCard`, `dailyCardCap`, `capResetHours`). Reasons: it is one rule, the game has no secret about whether someone "is Marc", and tying pay to a key would make the visitor's first minutes worth less than Marc's for no reason. "Delivered" means what it always meant, the answer reached the place the progress lives: for a guest, `localStorage.setItem` did not throw. If storage is blocked the answer is **not paid** and the screen says "Could not save. That answer was not saved." exactly as an undelivered real answer does, so points never run ahead of what is remembered. (Open question 6 asks whether a guest with blocked storage should instead be allowed to study unsaved, which is friendlier and slightly more code.)

**The cap is per browser, not per key.** `paid` and `left` already live in `life.flashcards.v1` beside the key and do not depend on it, and Marc can swap keys without resetting the window today. So the cap needs no change, and a guest cannot farm points by switching modes (the one window covers both). It is, as before, trivial to reset by clearing site data; that is fine in a single-player game with no goal.

**What else assumes the key.** Searched the source for every use:
- `life.flashcards.v1`: only `StudyStore` (the key, `paid`, `left`). Add `mode` (the reader must be extended to keep it; see stage 1).
- The game's own progress (`life.progress.v1`, achievements, score, apartment state): none reads the flashcards store. A progress reset removes only its own key, so it does not touch the key, the cap or a guest's cards. (Whether a reset should also clear the guest blob is open question 7; the default is no, as it does not clear the key.)
- The activity: `usesKey === false` is currently the practice-deck switch for the IPA line, the V voice stepping and the taller layout. A guest backend must **not** set it. Stage 1 replaces the single flag by two (or by `kind: "account" | "guest" | "practice"`), so `usesKey` means "ask for a key" and a new `practice` means "the dev deck". This is a game-side change only.
- `paysPoints` is a backend field, so a guest backend sets `true` and the practice deck keeps `false`.
- Achievements: none depends on flashcards (searched `src/game/achievements`).
- The task `study-spanish` has `points: 0` in `tasks.ts` and pays only through `host.reward`, so nothing else assumes a key or a payment.

## 8. Point 5: the deck and the language
**The deck.** Marc's decision stands: the real Spanish deck, the 1000 most common words, is the guest's deck. It comes from the same compiled core, so a guest sees exactly what he sees (recognition cards, then production cards as words graduate, example sentences, IPA voicing). Two small things to check in the text pass rather than build: the cards have English glosses only, so the deck assumes an English speaker; and the activity's text ("Study Spanish") is the one language the game offers a guest.

**Language.** The core takes `language` on every function and the game passes `F.language` (`"es"`) everywhere. German exists in the app (Mil Palabras is Spanish and German; German has no IPA, so the voice would fall back to spelling). Options:
1. **Spanish only** (recommended). Matches Marc's answer and the task name. Nothing to build.
2. **Configurable, later.** The only changes are a language choice on the choice screen and one guest blob per language (`life.flashcards.guest.<code>.v1`), mirroring the app's `<key>/<lang>` layout. The game's text (task name, "Study Spanish", the Spanish mumble and IPA) is Spanish-shaped, so this is real work, not a switch. Not recommended now; the guest storage key should still carry the language so it can be added without a migration (section 10, stage 2).

## 9. Point 6: privacy and safety
- **Nothing about Marc in what a guest sees or sends.** The guest screens show no key, no domain and no name; the one network request is the static core file (`GET https://palabras.mcord.dev/core.v1.js`). That request does reach Marc's host and tells it a visitor's IP and referrer, as any web request to it would; no cookie or key is sent and nothing is stored. That is the one thing a guest cannot avoid while the game imports the core at runtime. If that is not acceptable, the alternative is bundling a copy of the core into the game, which the app's design deliberately avoids (it would freeze the scheduler and deck; and "the game never keeps its own copy"). Open question 8.
- **A guest's data never leaves the browser in option (a).** No call to `/api/progress` or `/api/notes`, no analytics, no log. The guest blob is stored locally only.
- **Marc's key never reaches a guest.** The key is only in the saved `life.flashcards.v1` of Marc's own browser, never in the code, the bundle or the log (already so). A guest cannot see it because it is a different browser's storage.
- **What the production build must not expose** (for issue 084's pass):
  - The dev switch `?flashcards=demo` is already ignored in a production build (`import.meta.env.DEV`); keep that and add the same for any guest debug option.
  - `FLASHCARDS.origin` (`https://palabras.mcord.dev`) is in the bundle, so it is public. It names Marc's app, which is not secret, but whether it should be visible in a public repo is the decision in issue 085. A guest-only build does not need the origin for the endpoint but still needs it for the core URL.
  - No default or test key may be in the source; the existing tests use made-up keys. Keep it so.
  - The `VITE_FLASHCARDS_ORIGIN` override is a build-time variable and stays out of the repo.

## 10. Staged build plan
**Stage 1: the backend and the choice, no new storage code yet (small).**
- `flashcards/study.ts`: split the practice-deck meaning out of `usesKey` (for example `kind: "account" | "guest" | "practice"`), keeping the existing deck behaviour unchanged.
- `flashcards/guest.ts`: `guestBackend({ core, storage, now })`, `paysPoints: true`, no key; `open()` loads the blob (or `null`), builds the session with `core.session(blob, now, F.language)`, `grade` runs `core.grade(local, slug, gotIt, now, F.language)`, writes the result to localStorage, and resolves `false` if that write throws.
- `flashcards/key.ts`: a `mode` field in the saved record (the reader copies only `key`, `paid` and `left` today, so it must be extended to read `mode`). A saved key with no `mode` means key mode, which is Marc's existing record; if `mode` is `"guest"` and a key is also saved, the mode wins and the key is kept for later.
- The key screen's choice; the activity opens the guest backend when the choice is "Study without a key".
- Tests: a guest session studies a card and the stored string changes; an answer is not paid when the write throws; a damaged blob is "unreadable" and not overwritten; the key and cap record are untouched; Marc's saved-key path is unchanged.

**Stage 2: storage and the second visit (small).**
- The guest blob store (`life.flashcards.guest.<language>.v1`, wrapped in try/catch like the others), read fresh before every grade.
- A returning guest sees the choice screen first, with the cursor on "Study without a key" (issue 093; it first opened straight to the cards); a one-line "saved in this browser only" note on the opening or done screen.
- The unreadable path with an explicit "Start again" (one confirm).
- Tests for reload, two sessions in a row, cleared storage and blocked storage.

**Stage 3: leaving and switching (small, optional).**
- A control to leave guest mode and enter a key, and to forget a key (see open question 3), with the no-merge rule and "guest blob kept" tested.
- Doc update: `docs/flashcards.md` gets a short "Studying as a guest" section; the "no 'forget key' button" sentence is revisited.

Each stage ends with `npm test`, `npx tsc --noEmit` and `npm run build`. None needs the app repo to change.

## 11. How this interacts with issue 082 (the progress page), built in parallel
Issue 082 adds a progress page (counts of words known, due, next due) for when no cards are left. Both issues touch `flashcards/study.ts` and the activity, so the order and the seam matter. This note does not edit any of 082's files.

- **The seam is the interface.** Whatever 082 adds for statistics (a method on `StudySession`, for example `summary()`) is something a guest session must also answer. The guest session holds the same blob string, so it can answer exactly as the real session does, with the same core function. So 082 should put the stats behind `StudySession` (not in the activity or in `real.ts` alone), and a guest backend then implements it for free.
- **The core has no stats function today** (`session`, `card`, `grade`, `merge`, `requeue`, `ipa`, `empty`; none reports counts). 082's note on what the app would need to add applies to a guest in exactly the same way, and a guest does not change what it needs. The app repo has a `Stats` module (`Flashcards.Stats`) in the page, but `core.js` does not export it; that is for 082 to list under its own "needed from the app", not here.
- **A guest's page can be the same page.** A guest who has finished everything has a real blob, so the same counts are meaningful. "Nothing is due" for a guest on a first visit cannot happen (20 new cards are offered), so the page matters most for a returning guest.
- **Merge order.** Whichever lands second handles the conflict: if 082 is first, stage 1 above adds the `StudySession` implementation to `guest.ts`; if this is first, 082 adds its method to both backends. Either is a few lines; the one thing to avoid is both changing the `usesKey` flag differently. 082 should treat the practice deck as `practice` once stage 1 lands, or leave `usesKey` alone until then.

## 12. Needed from the app
**None.** Each item that might have been needed, and why it is not:

| Possible change in the app | Needed? | Exact reason |
|---|---|---|
| A way to start from empty progress | No | `core.v1.js` exports `empty(language)` and every function accepts `null` as empty progress. Checked against the deployed file. |
| A `language` argument | No | Every core function takes `language` (default `"es"`); the game already passes it. |
| Anonymous keys, a mint endpoint, or per-key limits | No | The recommended option never calls the progress endpoint. Only option (b) would need limits, and it is not recommended. |
| CORS for the core file | No | `/core*.js` already answers `*` (netlify.toml), so a guest works from any origin. |
| A statistics function in the core | Not for this issue | It is what 082 may need, and applies to a guest the same way; see section 11. |

**What the game does without any change:** everything in this note. If the app later changes the core, the game's existing version check (`coreVersion`) already refuses a core it does not know, and a guest then sees "no connection" until the game is updated, the same as a key holder.

## 13. Open questions for Marc (with my recommendation for each)
1. **Option (a), browser only?** *Recommend: yes.* It is the smallest thing, keeps all visitor data on the visitor's own machine, and needs nothing from the app.
2. **Wording of the choice screen** ("Study without a key" and "Enter a sync key"). *Recommend: as drafted, then the text pass (issue 037).* Alternative: "Just study" and "I have a key".
3. **How does someone leave a mode?** The game has no "forget key" button today. *Recommend: one small control in the done/problem screens and the choice screen, such as K for "use a key" and G for "study without a key", never shown mid-card.* Alternative: nothing, clearing site data is the way out.
4. **When a guest enters a key, is the guest blob kept?** *Recommend: kept, untouched, so leaving the key returns to it.* Alternative: delete it on entering a key (one less thing stored, but a destructive surprise). Either way: no merge, as you decided.
5. **A guest's saved cards that the core refuses (a newer format or damage):** *Recommend: say so and offer an explicit "Start again" with one confirm.* Alternative: silently start again (loses a visitor's progress without asking).
6. **Blocked or unavailable storage:** *Recommend: refuse ("could not save", nothing paid), as the key path does when delivery fails; it is simpler and keeps "paid means saved" strictly true.* Alternative: study the session unsaved, paying nothing, with one line saying so (friendlier, slightly more code).
7. **Should the game's progress reset also clear a guest's cards?** *Recommend: no*, the same as it does not touch the key today. Flashcards are their own thing.
8. **Is the guest loading the core from `palabras.mcord.dev` acceptable?** It is one static file request to your host (no key, no cookie) and the only network call a guest makes. *Recommend: yes, it is the app's own design.* Alternative: bundle the core into the game, which freezes the scheduler and deck and breaks "the game keeps no copy".
9. **Language:** Spanish only, as the task is named. *Recommend: Spanish only; the guest storage key carries the language so German can come later.*
10. **Where to say it is saved in this browser only:** *Recommend: one plain line on the first screen of guest mode and on the done screen, no alarm.* Alternative: nowhere.
