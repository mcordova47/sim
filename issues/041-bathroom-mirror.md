---
id: 041
title: Look in the mirror (bathroom)
status: review
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
