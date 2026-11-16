---
id: 127
title: "Study Spanish: the verb drills from the flashcards app's core"
status: todo
owner: marc + claude
depends_on: [026]
short: "Study Spanish: the verb drills from the flashcards core"
thread: "026"
summary: "Spanish verb drills from the flashcards core, once the flashcards app has deployed."
needs: []
---

## Goal
Marc (2026-11-15): support the grammar (verb) drills from the Spanish app in the game's "Study Spanish". Today the game uses only the vocabulary cards (`docs/flashcards.md`: "Only the self-graded vocabulary cards (the `es` blob) are used. The drills are not."). The flashcards app's pull request [mcordova47/flashcards#234](https://github.com/mcordova47/flashcards/pull/234), "Let another client drill the verbs, with answers checked by the core" (merged 2026-11-15, closes its issue #172), adds the drill functions to the shared core so another client can run them with the app's own logic and the same saved progress.

## What the core now offers (from the PR; check against the deployed `core.v1.js` before building)
New exports on `core.v1.js` (no `language` argument; the drills are Spanish):
- `drillNamespace` is `"verbs"`: the path segment for `GET`/`PUT /api/progress/<key>/verbs` (where the cards use a language such as `es`); same sync key, a second blob.
- `drillEmpty()`, `drillSession(progress, now?)` (slugs in the drills page's order), `drillQuestion(progress, slug)` (`{ slug, kind, label, prompt, hint, before, after, options }`; `kind` is `"checked"` (type the answer), `"choice"` (pick an option) or `"selfGraded"` (a paraphrase the player judges); the answer is never in it), `drillCheck(progress, slug, given)` (`{ verdict: "exact" | "unaccented" | "wrong" | null, gotIt, expected, note, rubric }`: accent forgiveness, case, spaces and final punctuation are the core's), `drillGrade(progress, slug, gotIt, now?)`, `drillRequeue(progress, slug, queue, position?)` (the family-aware requeue of a miss; the cards' `requeue` is wrong for drills), `drillMerge(mine, theirs)`.
- The call order matters: `drillQuestion` and `drillCheck` take the progress from **before** `drillGrade`, `drillRequeue` takes it from **after**. The queue is the client's (not in the saved progress). End to end: GET the blob (404 is `null`), `drillSession`, then per drill `drillQuestion`, show it, `drillCheck` with what was typed (or the option's text), `drillGrade(..., r.gotIt)`, `drillRequeue` on a miss; then GET, `drillMerge`, PUT.
- Drills never graduate to production recognition (`RecognitionOnly`); the saved JSON carries `language: "verbs"` and each page refuses the other's blob.

## What exists in the game today
- `src/game/flashcards/core.ts` (`Core`, `checkCore` requires `session`, `card`, `grade`, `merge`, `requeue`; `ipa` and `overview` are optional), `backend.ts`, `real.ts`, `guest.ts`, `study.ts`, the activity `src/game/activities/flashcards.ts`, the key screen, the guest mode (issue 089) and the progress page (issue 082).
- The core is loaded at run time from `FLASHCARDS.origin` (`https://palabras.mcord.dev/core.v1.js`), not bundled. The PR says the core is now about 436 KB because the Spanish verb banks come in with it (not measured against the previous main).

## What to do (design first; ask Marc one question at a time)
Write a short design (`docs/verb-drills-design.md`) and ask Marc about, most important first:
1. **Where the drills live:** the same "Study Spanish" screen with a choice (cards or verbs), a separate desk task, or mixed into one session; and how it relates to guest mode (a guest has no key: drills in local storage, or key-only).
2. **The screen:** a drill is a sentence with a gap: `before`, an input box (or `options` to pick), `after`; then the verdict (`exact`, `unaccented` with the note, `wrong` with `expected`). How a typed answer works on the touch layer (the hidden input, accents: the core forgives missing accents but the player may want to type them), and what the key names for keyboard-only players.
3. **`selfGraded` drills (paraphrases):** offer them (show `expected` and the `rubric`, the player judges) or skip them (they stay due, and a session then has fewer drills); the PR included them because sessions mix kinds.
4. **Sync cadence:** GET then PUT per answer (as the cards do) or per session (the merge makes either safe); what the screen says when delivery fails (the cards' rule: nothing is paid and the answer is not kept).
5. **Points and tone:** points per correct drill and the daily cap (shared with the cards or separate), nothing for a miss, no streaks, and the deadpan voice for verdict lines (new text goes to `docs/text-review.md`). Mumblespeak or the IPA voice for the Spanish sentence, or silence.
6. **Loading and failure:** the core is bigger; load it lazily on opening Study Spanish (as now).
Then split into small issues (a `Core` type and `checkCore` extension with optional drill functions and a fake core for tests; the drill backend over the real and guest storage; the screen; text and docs).

## Sequencing (Marc, 2026-11-15)
Wait for the app's deploy before shipping, do not design around an older core. Design and build can happen now: the game's tests use a fake core, and everything can merge to `main` ahead of the app's deploy (`main` is not production). **Do not push `main` to `production` for this feature until the deployed `core.v1.js` at palabras.mcord.dev has the drill exports**, and check once against the real core before releasing. The drill functions are added to the `Core` type as optional (like `ipa` and `overview`), so that if the app is ever rolled back the cards keep working and the drill choice simply is not offered; that is a three-line guard on the cards, not a supported "old core" mode.

## Constraints
- The flashcards repo is read-only for this project: never modify it (a gap in the core is reported to Marc, who owns it).
- The sync key stays private: never in the repo, logs or tests (tests use a fake core and a fake storage, as the cards do).
- Desktop and golden frames unchanged until the screen ships; the clock stands still while studying, as for the cards.

## Acceptance criteria
- A design agreed with Marc, then build issues filed. (Each build issue has its own criteria; none touches the flashcards repo.)

## Progress log
- 2026-11-15 (planner): filed from Marc's request, with the PR's contents summarised above. Not yet checked: whether the deployed `core.v1.js` at palabras.mcord.dev already has the drill exports (the PR merged today; the app may need a deploy). Marc: wait for the deploy before shipping (see Sequencing).

