---
id: 048
title: Status panel space (and a phone battery?)
status: todo
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
