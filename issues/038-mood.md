---
id: 038
title: Mood (morale) state
status: todo
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
