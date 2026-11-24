---
id: "162b"
title: "Steady candle glow when the browser asks for less motion"
short: "Steady candle"
status: done
owner: claude
depends_on: ["162"]
summary: "Hold the candle's glow steady when reduced motion is asked, and honour the setting without a reload."
kind: build
unverified:
  - "Not seen in a real browser with the operating system setting (only headless Chrome with the setting emulated), and not judged by eye whether the steady glow looks right."
  - "Old browsers whose MediaQueryList has only addListener (no addEventListener): the setting is read once and then not followed (checked by a scratch test; the criteria do not ask for it)."
changelog: "The candle's glow holds steady if your device asks for reduced motion."
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
- 2026-11-24 (claude): built. `liveReducedMotion()` in `src/game/reduced-motion.ts` holds the setting from a `MediaQueryList` `change` listener (so no per-frame `matchMedia` call and no reload needed; false without `matchMedia`); `main.ts` passes it to `Game`; `Game.reducedMotionAsked` getter; `feature.ts` `drawWorld` uses `{alpha:1,radius:1}` when it is true. Tests in `src/game/reduced-motion.test.ts` (fake `matchMedia`: default flickers, setting on gives the same rings every frame at radius 20/13.2/6.6, flipping while playing takes effect at once). Docs: `docs/reduced-motion.md` row 11 and the how-to line, `docs/decor.md` candle line. Golden frame unchanged. Checks: `npm test` (4233 pass), `npx tsc --noEmit`, `npm run build`, `npm run check:dist`.
  Looked at it in headless Chrome (dev server `?hour=21&own=lamp-candle`, candle placed with `decor.place("lamp-sofa","lamp-candle")` which is what the swap menu does; temporary `window.__game` hook removed afterwards). Sampled brightness of the canvas around the candle every 100 ms for 6 s: setting off jitters up and down (30 direction reversals, 42 distinct values); emulated on moves only with the slow evening dimming (10 reversals, steps held for several samples). Flipping the emulation with no reload: flickering to steady to flickering, each within the sample. Screenshot of the steady state looked right.
- 2026-11-24 (reviewer, independent): **approve.**
  Criteria: (1) `drawWorld` uses `{alpha:1,radius:1}` when `game.reducedMotionAsked` is true, getter is read-only: pass (feature.ts:151, game.ts:155). (2) No reload and cheap: pass; `liveReducedMotion` calls `matchMedia` once and follows the `change` event (scratch test: 101 reads, 1 call; a change event flips the answer). (3) Steady with the setting on: pass; the existing test draws five times and compares, and in headless Chrome the candle's rings were radius 20 / 13.2 / 6.6 on every one of 270 arc calls over 3 s with the setting emulated on, one fill style, against dozens of different radii with it off. With it off `flickerAt` is unchanged (existing tests pass). (4) Switching while playing: pass; the unit test flips a fake `matchMedia`, and in Chrome off to on to off with no reload went flickering, steady, flickering. (5) Golden frames unchanged (no golden file in the diff, `npm test` 4233 pass); `docs/reduced-motion.md` row 11 says done: pass. (6) Standard checks: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate` (197 valid) all pass. (7) How to see it: the how-to line in docs/reduced-motion.md was updated, but it still names no absolute `~/...` path to run from for the candle (it reuses the encounter's path): minor, not blocking.
  Edge cases I wrote (scratch, outside the repo): no `matchMedia` gives false; `matchMedia` throwing gives false (it is retried and caught on every read, 3 calls in 3 reads, harmless); `matchMedia` returning null gives false; initial true is honoured on the first read; a `change` event after reads is followed. Found: a MediaQueryList with only `addListener` is read once and then never updated (note in `unverified`; not in the criteria). Other glows: the code only changes the `glow.flicker` branch, so the desk glow and the lamp ramp are untouched (not separately rendered). The encounter's `reducedMotion` still works: `main.ts` now passes `liveReducedMotion()`, which the encounter reads once at start (`encounter.ts:79`), same answer as before; existing encounter tests pass.
  Looked at it: dev server in the worktree on port 5473, `?hour=21&own=lamp-candle`, candle placed with `decor.place("lamp-sofa","lamp-candle")` through a temporary `window.__game` hook (reverted, worktree clean). Brightness around the candle sampled every 100 ms for 6 s: off, 31 direction reversals and 58 distinct values in a 11-point range; on, the picture only drifts down with the evening dimming (small tint steps, a few tiny reversals from the clock), no flicker. The screenshot with it on shows a soft steady glow around the candle on the sofa end.
  Out of scope: none (8 files, all expected). Unverified: real OS setting and how the steady glow feels (see front matter). PLAN.md table needs updating by the planner (162b done).
