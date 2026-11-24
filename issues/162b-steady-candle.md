---
id: "162b"
title: "Steady candle glow when the browser asks for less motion"
short: "Steady candle"
status: todo
owner: claude
depends_on: ["162"]
summary: "Hold the candle's glow steady when reduced motion is asked, and honour the setting without a reload."
kind: build
changelog: "The candle's glow holds steady if your device asks for reduced motion."
needs: [{who: marc, kind: try, why: "Look at the steady candle: cd ~/Dev/repos/mcordova47/sim-worktrees/162b-steady-candle && npm run dev, open /?hour=21&own=lamp-candle, place the candle from the lamp swap, turn Reduce motion on; then say 'merge 162b'", since: 2026-11-24}]
---

## Goal
From the reduced-motion audit (issue 162, `docs/reduced-motion.md`, row 11 and the draft 162b), and Marc's answer (d1, 2026-11-24: yes, hold the candle steady). The candle's glow flicker (`flickerAt`) is the only brightness change that runs by itself, forever, at night in the main room. It is not a flash by the usual definition, but it never stops, so with the browser's reduced-motion setting on it should hold steady at its average strength. Nothing else changes (d2 and d3: no own motion switch, leave the art zoom, camera scroll and light ramp).

## Acceptance criteria
- In `src/game/time-of-day/feature.ts` `drawWorld`, use `{ alpha: 1, radius: 1 }` instead of `flickerAt(...)` when reduced motion is asked. `Game` already has the private `reducedMotion` function; expose it read-only (for example `game.reducedMotionAsked`).
- The candle runs continuously, so the setting must take effect without a reload: read it cheaply (ask `matchMedia` once a second rather than 60 times a second, or keep a `MediaQueryList` and its `change` event). Do not copy the encounter's read-at-start.
- With the setting on, the candle glow at night is the same size and strength every frame (a test draws two different times and compares). With it off, `flickerAt` is unchanged (the existing tests pass).
- Switching the setting while playing takes effect within a second (a test with a fake `matchMedia`).
- The golden main-room frame test is unchanged (tests run with the setting off); `docs/reduced-motion.md` row 11 is updated to say it is done.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`. About five lines of code, one test, no art. Nothing else in the audit is built here.
- Say how Marc can see it (use absolute `~/...` paths): `?hour=21` and `?own=lamp-candle`, place the candle from the lamp swap, then turn the setting on (macOS Reduce motion or the devtools emulation described in docs/reduced-motion.md).

## Progress log
- 2026-11-24 (planner): filed on main from the draft in docs/reduced-motion.md after Marc answered d1 of issue 162.
