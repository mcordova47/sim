---
id: 037
title: Text pass: drop "the", tone down the jokes
status: todo
owner: marc + claude
depends_on: []
---

## Goal
Make the in-game text read the way Marc wants. From his playtests (2026-10-23).

## Acceptance criteria
- **Short names:** task names and prompts drop the article: "Write in journal", "Water plant", "Alphabetize records", not "...the...". Apply it across `src/game/tasks.ts`, `apartment.ts` object names where shown, dialogs and flavor lines. Keep the pixel font limits.
- **Tone:** Marc finds some text too jokey (the contemplate line "The answer is probably the dishes" is one he named). Claude writes one file listing every player-visible string by source (tasks, flavor lines, dialogs, contemplate menus, typing text, popups) in `docs/text-review.md`, with a one-line note per string where the tone is a gag. Marc goes through it and marks keep, soften or rewrite; Claude applies his marks. Nothing is rewritten before Marc has marked it.
- A test or script keeps the list in `docs/text-review.md` in sync with the source (so new text appears in the review).
- `npm test` and `npm run build` pass.

## Progress log
