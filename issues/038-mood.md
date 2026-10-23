---
id: 038
title: Mood (morale) state
status: review
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
