---
id: 089
title: Flashcards guest mode: study without a sync key (build)
status: review
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
3. Press K on the done screen, then paste a (not your real) key or Escape. In DevTools check `life.flashcards.guest.es.v1` is still there. To see it return: with no key saved, G is not offered; pick "Study without a key" again from the choice screen after clearing `mode` in `life.flashcards.v1`.
4. Reset check: L, Shift+R, Y. `life.flashcards.guest.es.v1` is gone.
5. Blocked storage: a private window usually does allow storage, so it will probably NOT show this path (it saves and then forgets when the window closes; that is worth seeing too). To really block it, in Chrome go to Settings, Privacy and security, Third-party cookies / Cookies and site data, choose "Block all cookies" (or add the site address under "Not allowed to save data"), reload and try again: you should see NOT SAVED at the top left of the card, "Progress will not be kept." on its front, no points added, and "Progress was not kept." on the done screen. I could not run a browser, so none of this was tried.
6. Refused cards: in DevTools set `life.flashcards.guest.es.v1` to `nonsense`, study again: "The saved cards could not be read." then S, Y starts again.
