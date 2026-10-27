---
id: 083
title: Flashcards for someone who is not Marc: a mode with no sync key (design first)
status: todo
owner: marc + claude
depends_on: [026]
---

## Goal
Marc (2026-10-27): instead of an offline mode, support a mode for someone who is not him and has no sync key (token). He has not thought through how it would work, so **this issue is a design note first, nothing is built until he has read it.**

## Why this is not obvious
Today the game is a front end for Marc's own account: the key screen asks for his pairing key, every answer is sent to his app, and the points rule rewards delivered answers (`docs/flashcards.md`). A visitor has no key and should not touch his data. Also, the published game would be seen by others (see the privacy notes in PLAN.md about the app address in config).

## What the design note (`docs/flashcards-guest.md`) must cover
1. **What a guest is and wants.** Someone playing the game who opens Study Spanish with no key. What do they see on the key screen (a choice: enter a key, or study without one), and what is the minimum that feels like a real thing rather than a demo.
2. **Where a guest's progress lives.** Options to weigh, with a recommendation: (a) kept only in this browser, using the same core: the core takes a progress string in and returns a new one (`grade(progress, ...)`), so the game could store the guest's blob in localStorage and never call the server; (b) the app mints anonymous keys for visitors (needs app changes, abuse and storage questions); (c) keep only the fixed practice deck (nothing remembered). Say what each costs, what each needs from the app (Marc's other repo), and what can go wrong.
3. **Moving a guest to a real key later.** The core has `merge`; can a guest who later pastes a key bring their local progress along, and should they.
4. **Points and the rest of the game.** Do guest answers pay points (same rules and cap), and is the cap per browser. Does anything else in the game assume the key (achievements, saved progress, `life.flashcards.v1`).
5. **The deck and language.** The real core's deck is Marc's vocabulary list for Spanish; is that right for a guest, and is the language configurable (the core takes a `language` argument).
6. **Privacy and safety.** Nothing about Marc in what a guest sees or sends; a guest's data never leaves the browser in option (a); what the production build must not expose.
7. A staged build plan and the open questions for Marc, with recommendations, in the style of `docs/random-encounters.md`.

## Acceptance criteria
- `docs/flashcards-guest.md` exists and covers the seven points, with a recommended option and the questions for Marc; no code changes.
- Independent review of the note (a fresh agent), as for any design note.

## Progress log
- 2026-10-27 (Marc's answers before the note is written): the real Spanish deck is the right deck for a guest. Moving a guest's local progress into a real key later by merging is **not wanted** (no merging): a guest stays a guest, and pasting a key starts from that account's own progress. Leave the language argument and the other questions to the note.
