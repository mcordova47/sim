---
id: 039
title: Choosing a task at an object (options, not only first-available)
status: todo
owner: marc + claude
depends_on: []
---

## Goal
An object with several tasks currently offers the first one that can start, so the sofa and the bookshelf rotate by cooldown and requirements. Marc wants some things to be options the player picks, without taking up much screen: show one task at a time and press a key to cycle (to save space). From his playtest, 2026-10-23.

## Acceptance criteria
- Design first, with Marc: which objects cycle automatically (blinds open and close, coffee make and drink, records) and which offer a choice (sofa: nap, work, doomscroll, contemplate, admire art; bed). Write the rule into `docs/tasks.md`: an object (or a task group) is `auto` or `choose`.
- A `choose` object shows one available task in the prompt and a hint for a key (for example Tab, or Q and W) that moves to the next available one; E does the one shown. The prompt stays one line at the 320x192 view. The selection resets when the player walks away.
- Unavailable tasks are skipped or shown with their reason, whichever Marc prefers (ask).
- Works with keyboard only, and does not break the input lock, dialogs or activities (`Controls` needs a new key; use the pressed-key list from 022).
- Tests; `npm test` and `npm run build` pass. Marc plays it.

## Progress log
