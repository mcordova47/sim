---
id: 111
title: The side project picture reacts to editable config (stretch)
status: todo
owner: marc + claude
depends_on: [101]
---

## Goal
Marc (2026-10-28), a stretch goal: the side project could actually have an effect, not only show a picture. To start, an editable config text for things like positions and sprite variants of what the little room shows (so the little room can drift from the real one, deliberately, and Marc can change it without redrawing).

## What to do (design first)
- Ask Marc one question at a time: what is editable (positions, variants, the glitch), where the config lives (a text file in the repo, or in the pause screen), and whether the picture is drawn live from the config (compose the 320x192 view from sprites and the config) rather than a static PNG.
- Then plan small issues. The 101 drawing is the starting look.
- 2026-10-29 (Marc): the side project, as a game inside the game, could have its own title, something like "Siminal Crossing" (the game's name is Simagotchi). Text for `docs/text-review.md` when picked; fits the side-project lines in `src/game/side-projects.ts`.
