---
id: 051
title: The meta side project (this game as a side project)
status: todo
owner: marc + claude
depends_on: []
---

## Goal
Marc's idea (2026-10-23): the game supports side projects as things the character works on, and one of them is this project itself. You stare at a lower-res version of this screen and reflect that that version of you has its own simulation, which gives you a funny feeling that perhaps you are actually living in someone's side project.

## Acceptance criteria
- A task on the desk (a side-project task, for example "Work on side project") that opens the scene: the screen shows a lower-resolution picture of the game itself, with a few lines of quiet, wry reflection (not a gag machine; Marc reviews the wording in the text pass 037).
- Version 1: a static `view` (issue 040), a small, lower-res screenshot of the main room drawn as a sprite (an agent or a script can render it from the real game at 160x96 and quantize to the palette). Version 2, if it works: a live, lower-res render of the running game inside the view (a small canvas with the same room drawn at 1/2 scale, with the tiny player moving on its own), which is the better joke; decide after v1.
- Possible extra: the tiny player's own screen shows a still smaller one; at most one nested level, so it cannot recurse forever.
- Side projects as a concept: the task is one of several possible side projects (a small data list); only this one is written now. Each can have its own mood effect, points and cooldown.
- Does not break Escape (046), the input lock or saved progress. Tests; `npm test` and `npm run build` pass.

## Progress log
