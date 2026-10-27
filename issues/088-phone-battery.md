---
id: 088
title: A phone battery (a gag) and a charge-your-phone task
status: todo
owner: claude
depends_on: [086]
---

## Goal
Marc (2026-10-27), on the 048 design: the phone battery is kind of a gag, plus a task to charge the phone; leave open that it may affect phone tasks later. Design in `docs/hud-design.md` section 8.

## What to build
- A saved `battery` level (a state variable, 0 to 100) shown as a phone icon with a small bar in the HUD's fourth ribbon slot (issue 086 leaves the slot); art: `icon-phone` and `icon-plug`, and a plug prop by the desk or the sofa as the task's place.
- A "charge your phone" task with its own short action, cooldown and tiny reward in the usual task framework, which fills the level.
- Whether the level drains at all (with doomscrolling, or slowly with time) is for this issue to propose and Marc to choose: ask him before building a drain; default is that nothing drains it, so it is only a level the charge task raises, and no other task changes or refuses. A later effect on phone tasks stays an open option, noted in the log.
- Text for Marc's review in `docs/text-review.md` (deadpan, sincere).

## Acceptance criteria
- Saved and loaded with progress (tolerant of old saves), shown in the ribbon and the later strip, tested; the task works and is not missable.
- `npm test`, `npx tsc --noEmit`, `npm run build` pass; goldens updated only where the HUD changed, with a note.
- Marc looks at it.

## Progress log
