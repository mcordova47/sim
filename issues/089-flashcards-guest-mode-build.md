---
id: 089
title: Flashcards guest mode: study without a sync key (build)
status: done
owner: claude
depends_on: [083, 082]
---

## Goal
Build the guest mode designed in `docs/flashcards-guest.md` (issue 083), with Marc's answers recorded in `issues/083-flashcards-guest-mode.md`: someone with no sync key can study the real Spanish deck, with progress kept only in their own browser.

## Keep it small
Marc (2026-10-27): guest mode exists so the flashcards feature is not broken for people who are not him; it is not primarily a study tool. When a choice is between more machinery and a simpler behaviour that loses a guest's progress now and then, take the simpler one, and say so in the log. The decisions below still stand.

## Decisions (Marc, 2026-10-27; do not re-open)
- Option (a): progress is the string `core.grade` returns, stored in localStorage under its own key that carries the language (`es` only for now). Only the static core file is fetched; no call to the progress endpoint, no minted keys.
- The key screen gets a second choice, "Study without a key" (wording as drafted in the note, to be reviewed in the issue 037 text pass). Pasting a key later starts from that account's own progress; the guest's saved cards are **kept untouched and never merged**.
- One small control to leave a mode (use a different key, or study without a key), on the done and choice screens, never mid-card.
- If the core refuses a guest's saved cards (newer format, damage): say so, offer an explicit Start again with one confirm.
- If storage is blocked or unavailable: study unsaved, with a plain warning that progress will not be kept; no points are paid in that state (the daily cap cannot be tracked either).
- The game's own reset (L, then SHIFT+R) also clears the guest's flashcard progress. Marc: guest mode is not meant as a serious study tool, it only keeps the feature from being broken for people who are not him, so losing a guest's progress is no big deal: no extra confirmation is required beyond whatever the reset already has (if its text lists what it clears, add the cards to it).
- Points: the same rule and cap as a key holder (cap per browser). One plain line "saved in this browser only" on the first guest screen and the done screen.
- Needed from the app: nothing. The core already has `empty(language)`, accepts null progress and a `language` argument.

## Build (the note's section 10, three stages; do them in order, each tested)
1. Split the `usesKey === false` flag (today it means both "skip the key screen" and "practice deck": the IPA line, V voices, layout) so a guest backend can skip the key without being the practice deck; add the guest backend and store (`StudyStore` reads more than key, paid and left, so add the mode).
2. The key-screen choice, the leave-a-mode control, the saved-in-this-browser line, the bad-save and no-storage paths.
3. The reset integration and the text for `docs/text-review.md`.
- The progress page (issue 082) must work for a guest through `StudySession` with no extra code.

## Acceptance criteria
- Tests for: guest study end to end with a fake storage; a guest's blob never goes to the progress endpoint (a fake fetch asserts no request except the core file); entering a key leaves the guest blob unchanged and the key path never reads it; refused saved cards offer Start again; blocked storage studies unsaved and pays nothing; reset clears the guest cards and its confirmation says so; the practice deck and the key path are unchanged.
- `npm test`, `npx tsc --noEmit`, `npm run build` pass; goldens unchanged.
- The production bundle contains no dev shortcut and no personal data; the core request is the only new network call (checked).
- Marc tries it with no key (a private window shows the blocked-storage path) and says what is off; unverified items listed.

## Progress log

### 2026-10-27 (claude): built, in review
Plan: three stages in order, tested as I went.

**What was built.**
- Stage 1: `StudyBackend.practice` now means the dev practice deck (IPA line, V voices, taller layout); `usesKey === false` only means "skip the key screen". `flashcards/guest.ts` is the guest backend (`RealSession` with `grade` replaced: grade with the core, write the blob, no GET, merge or PUT). `StudyStore` gained `mode` (`"guest"`), and saving a key leaves guest mode.
- Stage 2: the choice screen (Study without a key / Enter a sync key), K and G on the done screen (never mid-card), the "saved in this browser only" line on the choice and done screens, the refused-cards screen with S then Y to start again, and the unsaved path for blocked storage (a NOT SAVED tag, a warning on the card front, nothing paid).
- Stage 3: the game's reset clears the guest's cards (`AchievementsFeature.reset`); the sync key and the points window are left alone. The reset question ("RESET ALL PROGRESS? Y: YES") does not list what it clears, so no text change was needed. Text added to `docs/text-review.md`; `docs/flashcards.md` has a "Studying as a guest" section.

**Simplified under the "keep it small" rule** (each costs a guest an occasional answer or some progress, never a wrong payment):
- The guest blob is read once when a session opens and written after each answer; it is not re-read before every grade, so two tabs at once can lose an answer.
- One storage key, one language (`es`, the key carries it); no migration or versioning code beyond the core's own refusal.
- The reset has no extra confirmation and does not list the cards in its question.
- No separate probe for blocked storage: it is found by a failed read at open or a failed write on an answer (so a browser that reads but cannot write shows the warning after the first answer, and that answer is not paid).
- "Start again" is S then Y on the problem screen only; no control on the card screens.
- No "forget guest cards" control other than the reset and Start again.
- Switching modes needs no confirm: the guest cards are kept, the key is kept.
- Reused `RealSession` through a subclass instead of a second session class; the progress page comes with it with no extra code.

**Acceptance criteria.**
- Tests (`src/game/flashcards/guest.test.ts`, the guest block in `src/game/activities/flashcards.test.ts`, and one in `achievements/feature.test.ts`): guest end to end with a fake storage and a second visit; the key backend is never asked in guest mode and the guest backend takes no fetch at all, so there is no request but the core load; entering a key leaves the blob unchanged and the key path never reads it, G returns to it; refused cards offer Start again with one confirm and are untouched until Y; blocked storage studies unsaved, warns and pays nothing (also a write that fails part-way); reset clears the guest cards and not the key or cap; the practice deck is unchanged (`practice` flag, its existing tests pass). Existing key-screen tests only changed to go past the new choice screen.
- `npm test` (109 files, 2569 tests), `npx tsc --noEmit` and `npm run build` pass. Goldens unchanged (no art or map change).
- Bundle: the only new network call is none: the core load is the existing `import()` of `core.v1.js`. `?flashcards=demo` is still `import.meta.env.DEV` only (not in `dist`); no key, personal data or new URL was added (checked by reading the diff and grepping `dist`).
- Not verified: how it looks (layout checked by arithmetic against the 5x7 font, 6 px a character, not by eye), the sound, and any real browser. Marc to try it.

**How Marc tries it** (`cd /Users/marccordova/Dev/repos/mcordova47/life-worktrees/089-guest-mode && npm run dev`, open the printed address; the page must be able to load `https://palabras.mcord.dev/core.v1.js`, which allows any origin):
1. Normal window: open the site in a window where you have never saved a key (or in DevTools, Application, Local storage, delete `life.flashcards.v1` and `life.flashcards.guest.es.v1`). Walk to the computer, Study Spanish. You should see the choice screen. Press E on "Study without a key".
2. Flip a card (E), pick Got it (right, E). Answer a few, leave with Escape, come back: it goes straight to the cards and the ones you answered are not shown again. Finish the batch: the done screen shows "Saved in this browser only." and `E: leave   K: use a key`.
3. Press K on the done screen: it opens the key screen (a guest with no key saved changes nothing until a key is accepted; Escape leaves everything as it was). In DevTools `life.flashcards.guest.es.v1` is still there. G is only offered to a key holder (done screen: `E: leave   K: other key   G: no key`); to try it, paste a real key, finish a batch and press G, then K to come back: the guest's cards are as you left them and the key is still saved. A key holder pressing K then Escape keeps the saved key; a different key that is refused also keeps it.
4. Reset check: L, Shift+R, Y. `life.flashcards.guest.es.v1` is gone.
5. Blocked storage: a private window usually does allow storage, so it will probably NOT show this path (it saves and then forgets when the window closes; that is worth seeing too). To really block it, in Chrome go to Settings, Privacy and security, Third-party cookies / Cookies and site data, choose "Block all cookies" (or add the site address under "Not allowed to save data"), reload and try again: you should see NOT SAVED at the top left of the card, "Progress will not be kept." on its front, no points added, and "Progress was not kept." on the done screen. I could not run a browser, so none of this was tried.
6. Refused cards: in DevTools set `life.flashcards.guest.es.v1` to `nonsense`, study again: "The saved cards could not be read." then S, Y starts again.

### 2026-10-27 (claude, independent review): approve
Checked by reading the diff and by my own tests kept outside the repo (35 edge-case tests against the real activity, guest backend, store and key path; all pass). Re-ran `npm test` (109 files, 2569 tests), `npx tsc --noEmit` and `npm run build`: pass. No art or map change, so goldens are untouched.

**Criteria.**
- Tests for each listed behaviour: pass. Beyond the author's tests I checked: a guest answering through the activity makes no `fetch` call at all and never opens the key backend (the progress endpoint); after K and a pasted key, the storage log shows no read or write of the guest key, and the blob is unchanged; G returns to the blob; refused cards: S then Y erases, E leaves it untouched, Y before S does nothing, and a blocked removal ends on the same problem screen with the confirm cleared; blocked storage with get, set, remove or all three throwing (and the sync-key record's storage throwing too, and `null` storage): studies, no throw, and a failed read or write pays nothing, a write that fails part-way leaves the earlier answers paid and later ones unpaid (the flag stays set); a failed core load shows the problem screen; the practice deck still has the practice flag, the IPA line and V voices.
- Phase transitions: pass. Choice (up/down/E; E on the second item goes to the key screen with mode unchanged), key screen, K and G on the done screen, K from a guest with Escape on the key screen (mode null, blob intact, next visit shows the choice), a saved key plus guest mode (mode wins, K reconnects with the key), K when the key reconnect is offline (problem screen). K and G are read only on the done screen.
- Reset clears `life.flashcards.guest.es.v1` and leaves the key record and cap alone; clearing never throws on blocked storage. The reset question lists nothing, and Marc's answer says no extra confirmation is needed: pass.
- Text fitting (5x7, 6 px advance, box 264, 248 usable): every new string is 248 px or less (longest, "E: leave   K: other key   G: no key", is 210; "Erase them and start again? Y: yes" is 204). NOT SAVED (top left) stays clear of "Card N of M". The longest progress page ends at y 102, above the guest's "Saved in this browser only." line at 106 (box 132 high), so nothing overlaps: pass by arithmetic.
- Bundle: pass. `dist` holds the guest key string, the one `palabras.mcord.dev` origin that was already there, and no key-like 32-character string. The only new network path is the existing core load (shared function). The `flashcards=demo` check does appear in `dist` but only behind `dev` which is the constant false (`il(i,e)` with `e=!1`); the log's "not in dist" is loosely worded, the gate is what matters and it is unchanged from main.
- Marc's own try in a browser: not done by me.

**"Keep it small" simplifications judged against Marc's rule and the decisions.** All of them are consistent: single blob read once and last-write-wins (loses an answer across two tabs, never a wrong payment), one language, no extra reset confirmation (explicitly allowed), blocked storage found by a failed read or write, Start again only on the problem screen, no forget control beyond reset and Start again, a subclass of `RealSession`. No decision in the issue is contradicted, with one exception to note below.

**Noted, not blocking (Marc to decide).**
- The log says "switching modes needs no confirm: the guest cards are kept, the key is kept". That is true from a guest, but for a key holder K on the done screen calls `forgetKey()` straight away, so K then Escape deletes the saved key (the account's progress on the server is safe; it only has to be pasted again). The decision allowed a "use a different key" control, so this is within it, but a stray K costs the key holder their saved key with no confirm. A simpler-and-safer option would be to keep the key until a new one is accepted. My test `K as key-holder then Escape loses key` confirms the behaviour.
- A guest whose core refuses `grade` sees "No connection. That answer was not saved." (misleading wording; the real core is not expected to refuse).

**Unverified (not by me, not by the author).** How any screen looks in a browser (my layout check is arithmetic only); real blocked storage in a browser (only fakes that throw); sound; and the real `core.v1.js`: all tests use stand-in cores, and I did not run the downloaded core (running fetched code was refused by the sandbox), so the guest path against the app's real core (`session(null)`, `grade(blob, ...)` round trip, `overview`, and how it refuses a damaged blob) is untested here. Marc's step 2 and step 6 in the "How Marc tries it" list cover this.

Verdict: approve. `PLAN.md` needs the planner to update the table for 089.

### 2026-10-27 (claude): changes after review notes
- K on the done screen no longer forgets anything. A key holder's K opens the key screen and the saved key stays until a new one is accepted (saving it replaces the old one); Escape leaves everything as it was. A guest's K likewise changes no mode until a key is accepted (`saveKey` clears the mode). A refused key forgets the saved key only if it is the saved key (a refused different key leaves it).
- A guest's answer that the core could not record now says "That answer was not saved." (no "no connection").
- Tests added that fail on the old behaviour (K then Escape left no key in storage): K keeps the key; a refused different key keeps it and an accepted one replaces it; guest K changes nothing; the guest failure text. Step 3 of "How Marc tries it" rewritten.
