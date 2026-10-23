---
id: 038
title: Mood (morale) state
status: done
owner: claude
depends_on: []
---

## Goal
A second pressure besides energy: mood. Doomscrolling and working drain it; playing guitar, a good meal, sunlight (blinds open), admiring art and the like raise it. Marc's idea, 2026-10-23.

## Acceptance criteria
- A `mood` state variable (range, default, meaning) in `state-vars.ts`, shown in the HUD next to energy in the same style (see 021 and 014).
- Tasks get `effects` on mood (a table of which raise and lower it, with small numbers; in `docs/tasks.md`), and some tasks may `require` a minimum mood or pay a bonus by mood (`pointsBonus`), without making the game a chore: low mood never blocks the player from everything, it only nudges.
- Low mood has a visible effect that is not a lock: for example a different idle line, a slower or slumped walk (a flag the renderer can use later), or a dimmer popup. Pick one small thing and say what is left for later.
- Mood changes pass through `stateChanged`, so saving (009c) and lighting (009d) can hear it. Time passing slowly pulls mood toward the middle, so it is never stuck at the ends.
- Tests for each rule; `npm test` and `npm run build` pass.

## Notes
- Pair with 037's text pass for any flavor lines; use plain wording.

## Progress log

### 2026-10-23, claude
Plan: add `mood` var, `MOOD` config, drift in `ApartmentState.tick`, mood effects in `tasks.ts`, HUD bar under energy, a sigh popup on dropping below the low line.

Done:
- `mood` (0 to 100, start 60) in `state-vars.ts`; `MOOD` (rest 50, drift 3 per game hour, lowBelow 25) in `config.ts`.
- `tick` pulls mood toward `MOOD.rest` without overshooting; skipped if a state has no mood var. All changes go through `onChange`, so `stateChanged` carries them.
- Task effects table in `tasks.ts` and `docs/tasks.md` (guitar +10, dinner +6, blinds +5, art +8, doomscroll -8, work -5 and so on). No task requires mood; guitar pays `0.3` points per mood point and the journal `0.2`.
- HUD: MOOD label and bar under ENERGY; `STATUS_BOX` taller (38 to 50).
- Low mood: a "SIGH..." popup when crossing below 25. Left for later: slumped walk flag/frames, a different idle line.
- Tests: `src/game/mood.test.ts`; two older tests used "mood" as a made-up unknown variable name, renamed to "cheer"; the tick-order test sets mood to rest so it still checks clock then energy.
- `npm test` (578 pass) and `npm run build` pass.

Not checked: how the HUD looks in a browser (not rendered), and the sigh popup is not covered by a test (popups are private to Game).
Likely conflicts: `tasks.ts` (admire-art, with 040; shower or mirror task, with 041).

### 2026-10-23, review (independent reviewer)
Verdict: **approve**.

Checks run: `npm test` (578 pass), `npm run build` (ok), plus my own edge script outside the repo (vite-node, not committed).
- Criterion 1, `mood` var and HUD bar: **pass** for the var (0 to 100, start 60, in `state-vars.ts`). HUD drawn against a recording canvas: label at y 33, bar at 252,43 (60 wide, 3 high), same style as energy, fill 0/14/15/60 px at mood 0/24/25/100, brick below 25. Draws without throwing when the state has no mood var. Real look in a browser: **can't verify**. Geometry note: the mood bar bottom (y 46) sits flush with the panel bottom (STATUS_BOX 4..46), with no padding below it, unlike the 4px above the clock text. Cosmetic, check by eye. Prompts and popups already avoid STATUS_BOX (`game.ts` drawWorldUi), so the taller box does not move labels onto the HUD; nothing else is drawn in the top-right.
- Criterion 2, task effects, `docs/tasks.md`, no requires on mood: **pass**. No task `requires` mood (checked over all 33 tasks). Largest single change is 10. Guitar (0.3) and journal (0.2) use `pointsBonus`, which is worked out before effects.
- Criterion 3, one visible low-mood effect: **pass in code, can't verify visually**. The SIGH popup fires on crossing below 25 in `Game.stateChanged`; no test covers the popup and I did not run it in a browser. Drift can only move mood toward 50, so a sigh comes only from effects. Left for later is stated.
- Criterion 4, `stateChanged` and drift: **pass**. From 0, 100, 50, 50.5, 49.2, 24.9 and 25, 20000 ticks of 0.5s each: always monotone, never past 50, ends exactly at 50, no mood event once at rest. Effects clamp at 0 and 100 (set then add, and sequential adds). Tick order in the event log: clock, energy, mood; time-driven events report only on a floor change, like energy.
- Criterion 5, tests: **pass**; each rule has a test except the popup.

Beyond the criteria:
- Scope: only the 038 issue file, docs/tasks.md, config, state, tasks, game, HUD, layout, new test, and two older tests renamed from "mood" to "cheer" (fair, they used it as an unknown name). PLAN.md untouched. No reference-photos or personal details.
- A state built without `mood` does not throw on `tick`, but 23 of 33 tasks have a mood effect and would throw if completed in such a state. Level load already runs `validateStateNames`, so a custom room without mood fails at build time, not in play. This matters for 009c: saved states from before mood must be filled with the default for `mood` when loaded.
- Minor, not blocking: `docs/state.md` line 46 still says a tick moves "the clock and energy"; it now also moves mood. Not updated.
- Unverified: HUD in a browser, sigh popup, how the drift and bonus numbers feel in play.
- Likely merge conflicts (author noted): `tasks.ts` with 040 and 041.
