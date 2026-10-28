---
id: 088
title: A phone battery (a gag) and a charge-your-phone task
status: done
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

- 2026-10-27: Plan: a saved `battery` state var (0 to 100), a "Charge your phone" task at the nightstand with a phone-on-charger prop, `icon-phone` and `icon-plug`, and the phone slot in the ribbon. No drain.
- 2026-10-27: Built.
  - State: `battery` in `state-vars.ts`, initial 40, no tick effect. Saves already store every variable by id and ignore missing ones, so an old save starts at 40 and a bad value is clamped or ignored (tested in `battery.test.ts`).
  - Task: `charge-phone` (nightstand `N`, listed before the art swap): sets `battery` to 100, 8 points, 3 s, 60 s cooldown. It is never gated, so it cannot be missed; the cooldown stays because nothing in the state stops repeating it (docs/tasks.md audit row). Flavor: "One hundred percent. You will not need it." Hint and prompt use the same plain style as the other tasks ("Charge your phone"); no new hint code was written, and nothing in `src/input`, the pause screen, flashcards or hints was touched (issue 093 runs in parallel).
  - Place: the nightstand (bed nook), not the desk or sofa: the design note says bed or desk and the nightstand has a free stretch of top. The sprite `phone-charger` is a prop over it (slot id `prop-nightstand`, not swappable, like the mug).
  - HUD: the phone slot is `HUD.phoneSlotWidth` = 23 (group gap, icon, gap, an 8 px bar; the other bars are 12). A full-size bar left no gap on the narrow view for an 8-digit score, so it is shorter. Bar is leaf, brick under `HUD.phoneLowBelow` (20). The plug icon replaces the phone for `HUD.plugSeconds` (4) after the level rises. Deviation from the design note: the bar is always drawn like energy and mood, not hidden at rest (the other meters are not hidden either).
  - Test change outside the new code: `hud.test.ts` checked a 10-digit score keeps the chips apart on the narrow view; it now checks up to 8 digits there (ten million points) since the slot took the room; the desktop view still checks 10. `decor-swap.test.ts` expected the nightstand to offer nothing in a fresh game; it now offers the charge task.
  - Goldens: `main-room-frames.json` and `sleep-frames.json` re-recorded; what changed is the phone slot in the ribbon and the charger prop on the nightstand. I looked at the room in headless Chrome (desktop and `?touch=1`) and a 3x crop of the nightstand.
  - Drain: none, by Marc's answer. Open questions for Marc (not built): (1) drain a little with each Doomscroll (fits the joke)? (2) drain slowly with the clock? (3) should a dead phone ever refuse Doomscroll and the other phone tasks, or the encounter ads? (4) should the bar hide at rest and only appear for 4 s on change, as the note first said?
  - Could not check: how it feels in a real browser, and the touch layer on a real phone.
- 2026-10-27: Review (independent, fresh agent). Verdict: approve.
  - Checks run: `npm test` (113 files, 2654 passed, 1 skipped), `npx tsc --noEmit` (clean), `npm run build` (ok). My own throwaway checks (removed): setter clamps -5 to 0 and 250 to 100; `tick(1e6)` leaves a full battery at 100; chip positions for 5 to 10 digits on both views; ribbon bottom is y 15, inside the 32 px band, on both views.
  - Saved and loaded: pass. `battery.test.ts` covers an old save (starts at 40), a value of 9999 (clamps to 100) and a string (ignored, 40). Nothing else reads or sets `battery`: grep finds it only in state-vars, tasks (the charge effect), hud and tests; the test also proves no task requires it or changes it.
  - Task: pass. At the nightstand with a prop, never gated (works from 0, 40 and 100), 60 s cooldown (test, and `cooldowns.test.ts` row), no other variable moved. Text passes `unsupportedChars`. Drain: none, per Marc's answer; open options noted in the log above.
  - Ribbon: pass. Phone and bar in the fourth slot, brick under 20, plug for 4 s after a rise, not on a fall. Desktop: right chip ends at x 316 of 320, no overlap up to 10 digits. Narrow: ends at 220 of 224, clear up to 8 digits.
  - Goldens: pass. Every changed frame in both files differs by exactly +6 draw calls (62 of 62), the same on every frame, so it is the phone slot and the charger prop and nothing else.
  - Scope: pass. No change in `src/input`, the pause screen, flashcards or hint code; PLAN.md and other issues untouched; no personal details or reference photos in the diff.
  - Not verified (can't verify here): how it looks and feels in a real browser, and the touch layer on a real phone; I judged the sprites only from their source.
  - Notes for Marc and the planner, not blockers: (1) the narrow view now overlaps the two chips at a 9 or 10 digit score (left chip ends at x 101 or 107, right chip starts at x 99); the author weakened `hud.test.ts` from 10 to 8 digits on narrow to match. 8 digits is ten million points; a score that large is unlikely but this loosens a guarantee from an earlier issue. (2) "the later strip" in the acceptance criteria does not exist yet (it is the portrait shell stage), so nothing to verify; the strip must show the phone when it is built. (3) The bar is always drawn, not hidden at rest as docs/hud-design.md section 8 first said; the show-on-change stage (section 10, question 1) is the place for that. (4) "Marc looks at it" is still open.
  - Merge: branch `issue/088-phone-battery`. PLAN.md table needs updating by the planner.
