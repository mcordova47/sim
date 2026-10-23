---
id: 041
title: Look in the mirror (bathroom)
status: done
owner: claude
depends_on: []
---

## Goal
A bathroom task, from Marc's playtest: look in the mirror and notice you are getting older. Quiet, a little wry, not a joke machine (see 037).

## Acceptance criteria
- A `mirror` task on the vanity: a short dialog (`dialog` activity) with a few variants chosen by state or time of day (the clock), so it is not the same line every time. Draft the lines in plain wording; Marc reviews them in the text pass (037) before they stay.
- Small effect: points, maybe a tiny mood change if 038 has landed (otherwise none).
- `docs/tasks.md` updated; tests; `npm test` and `npm run build` pass.

## Progress log

- 2026-10-23 (start): plan: variants as separate tasks (same prompt) on the vanity, picked by energy and clock requirements, since the engine picks the first startable task; dialog data only, no engine change.
- 2026-10-23 (done, in review): added four tasks `mirror-tired`, `mirror-morning`, `mirror-day`, `mirror-night` (tasks.ts, `MIRROR` thresholds in config.ts, two-line dialogs `MIRROR_*` in dialog-data.ts), listed on the vanity ahead of `brush-teeth` (apartment.ts) so the two alternate. 15 points, 60 s cooldown, no state effect (no mood; 038 not merged). `docs/tasks.md` has a Mirror section. New `src/game/mirror.test.ts` (offered variant for every quarter hour, edges, tired override, scoring, cooldown fall-through to brush teeth, cancel scores nothing). Existing dialog-data tests cover font and length of the new lines. `npm test` (575) and `npm run build` pass.
  - Deviation: "a `mirror` task" is four ids with a `mirror-` prefix, because a task's dialog is fixed data.
  - Not checked: how it reads and feels in a browser; the wording is a draft for the 037 text pass. Likely conflicts with 038/040: tasks.ts (EXTRA list, imports), dialog-data.ts (end of file), config.ts (before CLOCK), docs/tasks.md (end).

- 2026-10-23 (review, independent): verdict **approve**.
  - Criterion 1 (mirror task, dialog variants by state/clock, plain draft lines): pass. Four `mirror-*` tasks on the vanity (apartment.ts), each a two-line `say` dialog, chosen by energy (tired, at or below 25) then clock (morning 5-12, day 12-21, night 21-5 via `anyOf`). Own scratch test (outside the repo), grid of clock 0..24 in 0.05 steps against energy 0,1,24,25,26,50,100: a variant is offered every time, no gaps. Edges: 4.99 night, 5 morning, 12 morning, 20.99 day, 21 day, 24 and 0 night; energy 10 gives tired at every hour. Repeat cycle at 15:00: mirror-day, brush-teeth, brush-teeth, mirror-day (60 s cooldown alternates with brushing, as claimed).
  - Criterion 2 (small effect, points, no mood since 038 not landed): pass. 15 points, no state effects; 038 is still todo in PLAN.md.
  - Criterion 3 (`docs/tasks.md`, tests, `npm test`, `npm run build`): pass. Mirror section added and matches the code; `npm test` 575 passed, `npm run build` ok, `npx tsc --noEmit` clean. The new mirror.test.ts is meaningful (checks every quarter hour, edges, cancel, scoring).
  - Scope: only the files named in the log changed; no edits to other issues or PLAN.md. No reference-photos or personal details. Deviation (four ids instead of one `mirror`) is reasonable and documented.
  - Minor, non-blocking: in config.ts the "The game clock..." comment now sits above `MIRROR` instead of `CLOCK` (the new block was inserted between the comment and its object); worth moving when next touched. The tired line says "than you did this morning" even at 3 AM; wording is for the 037 pass.
  - Unverified: how it reads and feels in a browser (not run in a browser); the wording and tone (draft for the 037 text pass). Expected merge conflicts with 038/040 as the author noted.
