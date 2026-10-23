# Life: a studio apartment platformer

A single-room platformer set in Marc's real studio apartment. There is no win condition. You do mundane day-to-day tasks (make coffee, do the dishes, shower, doomscroll) and earn points for them.

## Design pillars
- **One room, one screen.** No scrolling camera. The apartment is the whole level.
- **Furniture is the level.** Couch, counter, loft bed and shelves are platforms and interactables.
- **Mundane is the joke.** Tasks are small, slightly absurd and satisfying. Feedback (popups, sounds, little animations) matters more than depth.
- **No goal, soft incentives.** Points, streaks, combos and achievements. Repeating a task has diminishing returns.

## Stack
- HTML5 canvas, TypeScript, Vite. No game framework.
- Pixel art at a fixed tile size and a single shared palette (defined in issue 006).
- Sprites are loaded by filename, so any sprite can be swapped for hand-made or generated art without code changes.

## Working conventions
- **Issues live in [issues/](issues/)**, one markdown file per issue, named `NNN-short-slug.md`.
- Frontmatter fields: `id`, `title`, `status` (`todo` | `in-progress` | `blocked` | `review` | `done`), `owner` (`claude` | `agent` | `marc`), `depends_on`.
- Each issue has a goal, acceptance criteria and a progress log.
- **An agent edits only its own issue file** (status and progress log) plus the code it was assigned. Do not edit other issues or this file. Report back instead.
- When an issue is done, set `status: done` and update the table below.
- Keep commits small and one per issue where possible.
- **Every issue is worked in its own git worktree**, at `../life-worktrees/NNN-slug` on branch `issue/NNN-slug`, including the planner's own issues. Nothing lands on `main` until it has been reviewed. Agents commit on their branch, start their own independent review when they finish (see `work-issue`), and never merge. The planner merges approved branches with `/merge-issue NNN` (see `.claude/skills/merge-issue/`), which checks the review record, builds and tests the merged result, and updates the table below. Status in an issue file is only current on its branch until merged.

## Milestones and issues

| # | Issue | Owner | Status | Depends on |
|---|-------|-------|--------|------------|
| 001 | [Scaffold project](issues/001-scaffold-project.md) | claude | done | |
| 002 | [Player movement and collision](issues/002-player-movement.md) | claude | done | 001 |
| 003 | [Interaction and scoring system](issues/003-interaction-scoring.md) | claude | done | 002 |
| 004 | [HUD and feedback](issues/004-hud-feedback.md) | claude | done | 003 |
| 005 | [Floor plan and task list](issues/005-floor-plan-tasks.md) | marc + agent | done | |
| 006 | [Sprite pipeline and style guide](issues/006-sprite-pipeline.md) | agent | done | 001 |
| 007 | [Furniture sprites (umbrella)](issues/007-furniture-sprites.md) | marc + claude | done | 007a-d |
| 007a | [Sprites: west main room](issues/007a-sprites-west-main-room.md) | agent | done | 005, 006 |
| 007b | [Sprites: east main room](issues/007b-sprites-east-main-room.md) | agent | done | 005, 006 |
| 007c | [Sprites: kitchen west](issues/007c-sprites-kitchen-west.md) | agent | done | 005, 006 |
| 007d | [Sprites: kitchen east and bath](issues/007d-sprites-kitchen-east-and-bath.md) | agent | done | 005, 006 |
| 008 | [Player character sprite](issues/008-player-sprite.md) | agent | done | 006 |
| 009 | [Polish (umbrella)](issues/009-polish.md) | marc + claude | todo | 009a-d |
| 009a | [Polish: sound effects](issues/009a-sound.md) | agent | todo | 017 |
| 009b | [Polish: particles](issues/009b-particles.md) | agent | todo | 017 |
| 009c | [Polish: achievements and saved progress](issues/009c-achievements.md) | agent | todo | 017 |
| 009d | [Polish: time of day](issues/009d-time-of-day.md) | agent | todo | 017 |
| 010 | [Scrolling camera](issues/010-scrolling-camera.md) | claude | done | 005 |
| 011 | [Integrate the floor plan and task data](issues/011-integrate-floor-plan.md) | claude | done | 005, 003 |
| 012 | [Interaction edge cases](issues/012-interaction-edge-cases.md) | claude | done | |
| 013 | [Physics robustness](issues/013-physics-robustness.md) | claude | done | |
| 014 | [HUD polish](issues/014-hud-polish.md) | claude | done | 010, 011 |
| 015 | [Extract the game scene from main.ts](issues/015-extract-game-scene.md) | claude | done | |
| 016 | [Draw the level and player with sprites](issues/016-draw-level-with-sprites.md) | agent | todo | 007, 008, 010, 011 |
| 017 | [Game events and drawing layers](issues/017-game-events-and-layers.md) | claude | todo | |

## Order of work
1. **Playable skeleton first:** 001, 002, 003, 004 with rectangles for art.
2. **In parallel:** Marc supplies photos and measurements (005) while 006 builds the sprite pipeline.
3. **Real level:** 011 (integrate the floor plan) and 010 (scrolling camera, since the real room is wider than the screen) once 005 is merged.
4. **Art:** 007a-d and 008 can start now (floor plan and style guide are done); then 016 draws the level and player with them once the camera (010) and real data (011) are in.
5. **Polish:** 017 (events and layers) first, then 009a-d in parallel, each as its own module.
6. **Cleanup:** 012 and 013 any time (minor findings from reviews of 003 and 002); 014 after the camera and real floor plan are in (minor findings from the review of 004).

## Decisions
- **Level wider than the screen:** scrolling camera (issue 010), chosen over smaller tiles or a compressed room.
- **Scale:** 1 tile = 1 ft with the player 14px tall (about 10 in) stays as is for now. Revisit if the sprites feel too small. Re-run 005's reachability check if the player or jump constants ever change.
- **Day and night cycle:** yes. A game clock, lighting through the day and tasks that pay better at the right hour (issue 009d).
- **Combo rule:** rewards variety (different tasks in quick succession), not repetition.

## Open questions
- Is the final player character agent-drawn or generated with an external tool?
- Keyboard only, or gamepad support too?
- Should the game persist score between sessions (localStorage)?
