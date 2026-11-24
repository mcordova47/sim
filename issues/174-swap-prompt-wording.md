---
id: "174"
title: "Shorter swap prompts: drop the 'the'"
short: "Shorter swap prompts"
status: done
owner: marc + claude
depends_on: ["166", "168"]
summary: "Change the swap task prompts to read 'Change coffee gear', 'Change rug' and so on, and use 'Display trinket' for trinkets."
kind: build
changelog: none
unverified:
  - "Review 2026-11-24: how the shorter wording looks in a real browser on a phone and on the desktop was not checked by eye (the reviewer measured pixel widths with the game's own promptSize only)."
  - "How the shorter wording reads and looks in a browser on a real phone and on the desktop was not checked by eye; only the pixel widths were measured by test."
  - "d1 and d2 are still open: the build follows their recommended defaults (no 'the' in any swap prompt; trinket prompt 'Display trinket' belongs to the trinket branch, not added here)."
needs:
  - who: marc
    kind: decide
    why: "Answer d1 and d2 (the build assumed the recommended defaults), and say if 'Work from couch', 'Stare into fridge' or 'Open fridge' read badly without 'the'."
    since: 2026-11-24
decisions:
  - id: d1
    who: marc
    q: "Drop the word 'the' from every swap prompt?"
    options:
      - "yes: 'Change painting', 'Change plant', 'Change lamp', 'Change rug', 'Change coffee gear' (and so on)"
      - "only the new ones (rug, coffee gear, trinket)"
    recommendation: "yes: 'Change painting', 'Change plant', 'Change lamp', 'Change rug', 'Change coffee gear' (and so on)"
    status: open
  - id: d2
    who: marc
    q: "What should the trinket prompt be?"
    options:
      - "'Display trinket' for adding and for changing"
      - "'Change trinket'"
      - "'Display trinkets'"
    recommendation: "'Display trinket' for adding and for changing"
    status: open
  - id: d3
    who: marc
    q: "Other prompts and task names that contain 'the' ('Water the plant', 'Take out the trash', 'Do the dishes' and so on)?"
    options:
      - "leave them as they are for now"
      - "drop the 'the' from all task names and prompts too"
      - "only where a prompt overflows a narrow phone view"
    recommendation: "leave them as they are for now"
    status: answered
    answer: "drop the 'the' from all task names and prompts too"
    by: marc
    on: 2026-11-24
---

## Goal
Marc (2026-11-24): 'change coffee gear' reads better than 'Change the coffee gear' and takes a bit less space; remove 'the' from various places. For trinkets maybe 'Display trinket', which works for both adding and changing.

## Acceptance criteria
- After issues 166 (rug) and 168 (coffee gear) are merged (they add prompts of their own), change the swap prompts in `SWAP_PROMPT` and wherever else they are built (`src/game/tasks.ts`, `activities/swap-decor.ts`, the text-review strings in docs/text-review.md, docs/tasks.md and the decor docs) to the wording chosen in d1 to d3; the trinket prompt per d2 (note that issue 173 redesigns trinkets, so change whatever is merged then).
- Tests that quote the old prompts are updated, and a test fails if a swap prompt contains ' the '; the narrow phone view's prompt box still fits every prompt (check the longest).
- A `changelog:` line is not needed (`changelog: none`). Standard checks pass.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
- 2026-11-24 (claude): started. Plan: drop the word 'the' from every task name and prompt (d3, answered by Marc), the swap prompts and the achievement descriptions that name tasks; working assumptions for the open decisions: d1 yes (no 'the' in any swap prompt) and d2 'Display trinket' (not added here: the trinket branch, issue 167, is unmerged and issue 173 redesigns it; main's existing `trinket` swap prompt just loses its 'the': 'Change trinket'). The decisions are left open.
- 2026-11-24 (claude): done, ready for review. Changed in `src/game/tasks.ts` (names and prompts, `SWAP_PROMPT`, Open package), `achievements/data.ts` (three descriptions that quote tasks), `side-projects.ts`, `placeholder-level.ts`, a comment in `state-vars.ts`, and docs (`text-review.md` Tasks table and lines, `tasks.md`, `decor.md`, `state.md`). Marked lines in text-review keep their marks; a note at the top of the Tasks section lists the changed rows. Tests that quoted the old text are updated; new `src/game/task-wording.test.ts` fails if any task name, prompt, swap prompt or item word (also as built with each plant and coffee item) contains 'the', and measures the prompt box against `NARROW_VIEW` for every prompt. That test found a real overflow that was already there: the drooping-plant prompt with a spider or snake plant was wider than the phone view (236 and 230 px against 224), so the prompt of `water-plant-droop` is now 'Water plant' (it is never offered together with 'Water plant'); its name while running stays 'Water drooping plant'. The fixture `scripts/fixtures/text-review-snapshot.md` is unchanged and its tests pass; golden frames unchanged. Left alone on purpose: object names in `apartment.ts` ('painting over the table'), the grey 'unmet reason' lines ('FLATTEN THE BOXES FIRST'), index.html's page description, historical design docs, and other achievement descriptions that say 'the desk' or 'the records' (places, not task names). Running label 'Water drooping spider plant' is 222 px wide, 2 px past the 220 px of free width on the phone view (it was wider before); not changed.
- 2026-11-24 (review, independent): verdict APPROVE. Evidence: `npm test` 182 files / 4352 passed; `npx tsc --noEmit` clean; `npm run build` and `check:dist` ok; `issues:check --validate` ok (only length warnings). Criteria: (1) wording changed in `SWAP_PROMPT` (art, plant, lamp, rug, trinket, coffee, furniture; `rug-bed` slot prompt 'Change bed rug'), task names and prompts, achievements, docs: pass. 'Display trinket' is deliberately not added (d2 open, trinket branch unmerged): the d1 and d2 defaults are assumptions, d3 was answered by Marc and followed. (2) old-prompt tests updated and a test fails on a swap prompt containing 'the': pass; my own script (scratchpad `chk.ts`, via vite-node) walked every TASKS name and prompt plus the name and prompt built with every plant and coffee item in its slot (snake, pothos, monstera, spider; pour-over, french press, drip, pod, stovetop, percolator, moka, briki), found no 'the', no double or edge spaces, and the widest prompt (ready with key, choice hint and good-hour icon, or cooling down) is 208 px against 216 px of room on NARROW_VIEW (224 - 8): pass. The droop prompt became 'Water plant', same as `water-plant`; both are `exclusive: plant` so only one shows at a time, and its running name stays 'Water drooping <plant>': acceptable. (3) no changelog needed, standard checks pass: pass. Beyond criteria: `scripts/fixtures/text-review-snapshot.md` untouched, no golden frame files touched (tests pass); `git diff main...HEAD` touches only src, docs and this issue file (the two-dot diff showing PLAN.md and issue 175 is just main having moved on); no PLAN.md edit; no reference-photos or personal details. Remaining 'the' in src is only in comments, test names, uppercase dialog or unmet-reason lines and object names, as the author said. Not verified: the real-browser look on a phone. PLAN.md row 174 needs updating by the planner.
