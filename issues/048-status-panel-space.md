---
id: 048
title: Status panel space (and a phone battery?)
status: review
owner: marc + claude
depends_on: []
---

## Goal
Energy and mood are on the screen, and more are likely (a phone battery was suggested). The status area is getting cluttered. Find a way to show more with less space. Needs thought, not just code.

## Acceptance criteria
- A short design note in `docs/hud-design.md` with three or four layouts for the current bars and the planned ones (energy, mood, clock, score, combo, maybe phone battery): for example icons with small meters instead of labels, bars that only appear when they change or are low, one bar cycled with a key, a pause menu that holds the detail. Mock each as ASCII or a rendered frame at the real 320x192 view. Marc picks.
- Decide whether a phone battery is a state variable (drains with doomscrolling, charges by a task) or only a gag, and what it would affect.
- Then build the pick as a small change: layout in `src/render/layout.ts`/`hud.ts`, no change to the state itself. `npm test` and `npm run build` pass. Marc looks at it.

## Progress log

### 2026-10-27, claude
Plan: design-note step only (`docs/hud-design.md`), no game code. Marc asked for 048 to be designed together with the portrait handheld shell of the mobile note (issue 049, read-only on the 049 branch): one HUD design that draws both over the 320x192 picture (desktop and landscape) and into a 320x56 strip in the shell body (portrait). The note lists what is shown and how often it matters, mocks three or four layouts at real pixel size, recommends one, decides the phone battery question, lists sprites and code, a staged build and open questions. Then an independent review. The build step (second acceptance bullet) waits on Marc's pick.
New answers from Marc (relayed 2026-10-27): he has an iPhone (Safari, notch, safe areas, no vibration); a small 1.0x to 1.33x portrait picture is fine to start; the shell's look "surprise me", so sketch both a warm grey and a dark body in the shell's stage 2.

Done (design step): wrote `docs/hud-design.md`: today's HUD and the free 32 px band above the world (the status panel overlaps the `uuu` painting, x 248 to 280, y 32 to 46, found by arithmetic from `MAIN_MAP` and `camera.ts`, not from a rendered frame), what is shown and how often, one model drawn into two containers (overlay ribbon, 320 x 56 strip), four layouts mocked at real pixel size from the game font (A icons always on, B ribbon with bars on change or low, C one cycled meter, D quiet HUD plus detail view), a recommendation (B, D later), the phone battery decision (real but gentle, later, own issue), sprites, code and a five-stage build plan, and eight open questions. Files: `docs/hud-design.md`, this issue. Mocks were generated with a script kept outside the repo; no game code touched, so `npm test` and `npm run build` were not rerun. Second acceptance bullet (build the pick) is not started: it waits on Marc's pick.
Not checked: how any layout feels on screen; icon sketches are 7 x 7 text sketches, not sprites.
