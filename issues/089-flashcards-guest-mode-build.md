---
id: 089
title: Flashcards guest mode: study without a sync key (build)
status: todo
owner: claude
depends_on: [083, 082]
---

## Goal
Build the guest mode designed in `docs/flashcards-guest.md` (issue 083), with Marc's answers recorded in `issues/083-flashcards-guest-mode.md`: someone with no sync key can study the real Spanish deck, with progress kept only in their own browser.

## Decisions (Marc, 2026-10-27; do not re-open)
- Option (a): progress is the string `core.grade` returns, stored in localStorage under its own key that carries the language (`es` only for now). Only the static core file is fetched; no call to the progress endpoint, no minted keys.
- The key screen gets a second choice, "Study without a key" (wording as drafted in the note, to be reviewed in the issue 037 text pass). Pasting a key later starts from that account's own progress; the guest's saved cards are **kept untouched and never merged**.
- One small control to leave a mode (use a different key, or study without a key), on the done and choice screens, never mid-card.
- If the core refuses a guest's saved cards (newer format, damage): say so, offer an explicit Start again with one confirm.
- If storage is blocked or unavailable: study unsaved, with a plain warning that progress will not be kept; no points are paid in that state (the daily cap cannot be tracked either).
- The game's own reset (L, then SHIFT+R) also clears the guest's flashcard progress; the reset's confirmation (add one if there is none) must say the cards go too.
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
