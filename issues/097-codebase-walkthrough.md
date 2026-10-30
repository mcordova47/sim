---
id: 097
title: A guided walkthrough of the codebase, with small hands-on tasks
status: in-progress
owner: marc + claude
depends_on: []
---

## Goal
Marc (2026-10-27): he has been high level so far and wants to know the codebase better: a walkthrough of the code, bit by bit, with small tasks to work on to get familiar. Done in conversation (the planner walks through, Marc does the tasks himself, the planner reviews), not by agents.

## How it runs
- One **stop** at a time: a short guided read of two to four files (with the idea first, then the code, mapped to functional ideas Marc already uses where it helps), then one **small task** that Marc does himself on a branch (`learn/<name>`), then a review of what he did. A stop ends when he says he is happy with it.
- Tasks go on a branch and a pull request, so Netlify's branch preview shows the result and nothing goes live until he merges. Small enough for an evening; each leaves the tests passing (`npm test`) and `npm run build` green.
- Where the walkthrough finds something confusing, missing from the docs or worth simplifying, it is logged here and may become an issue.

## Stops (a proposed order, changed as he likes)
1. **The map and the loop:** `src/main.ts`, `src/game/loop.ts`, how a frame goes (fixed update steps, render with interpolation). Task: change one tuning number in `src/game/config.ts` (for example how fast energy falls) and see it, then find the test that pins it.
2. **State, tasks and data:** `src/game/state-vars.ts`, `state.ts`, `tasks.ts`, `apartment.ts` (rooms, legends, props). The apartment is mostly data. Task: add a small new task (a prompt, a flavor line, a cooldown, an effect on a variable) at some place in a room, with a test.
3. **Interaction and activities:** `interaction.ts`, `activity.ts`, one simple activity (`wait.ts`) and one richer (`notes.ts`). Task: add a tiny activity or change one.
4. **Game and events:** `game.ts` (the hub), `events.ts`, `features.ts` (how achievements, sound and time-of-day plug in without the game knowing). Task: add a small feature listener (a toast on some event).
5. **Rendering and art:** `render/` (canvas, camera, hud, sprites, the room painter), `.sprite` files and the pipeline (`scripts/sprites.mjs`), the palette. Task: draw a small sprite and place it as a prop.
6. **Sound and music:** the Web Audio synth, effects as data, the `.track` format. Task: add a sound effect to a task.
7. **Tests, goldens and the workflow:** how the tests are laid out, the golden frames and why they are re-recorded deliberately, the issue and review workflow, deploying. Task: write a test for something he added earlier.

## Progress log
- 2026-10-29: the seven-stop outline above is replaced by a self-contained curriculum, `docs/learning-path.md` (15 short modules in two tracks: core knowledge for working around the engine, and the parts Marc works in, configuring and changing; each has a task with a test, build or visible check, so it works without Claude). Stop 1 is covered by module 2, which starts where the loop reading ended and drops the FPS panel and the config-number task. Tasks were done and verified in a scratch worktree. Branch `issue/097-curriculum`, awaiting review.
