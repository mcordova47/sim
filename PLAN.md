# Life: a studio apartment game

A top-down, Pokemon-style game set in Marc's real studio apartment. There is no win condition. You do day-to-day tasks (make coffee, do the dishes, write a song, doomscroll, contemplate existence) and earn points for them. The apartment and the character change as you go.

> **Direction change, 2026-10-22.** The first version was a side-view platformer (kept in git history and the tag `side-view-prototype`). It worked as a prototype, but a horizontal lane squeezed the apartment and made the character tiny, and jumping had nothing to do with the game. The game is now top-down: walk tile to tile, face something, press E. Issues 001 to 018 were built for the side view; the ones that are not about the view (loop, camera, HUD, scoring, events and layers, sprite pipeline, process) carry over. Issue 019 onward is the switch.

## Design pillars
- **Walk, face, press E.** Pokemon-style: you step tile to tile, face a direction and use what is in front of you. Rooms are screens joined by doorways.
- **The apartment is real and it changes.** The layout follows Marc's actual apartment, and doing things changes it: dishes pile up, the bed gets made and unmade, the character gets tired.
- **Personal and a bit silly.** Work, songwriting, open mics, reading, records, side projects, and abstract tasks like contemplating existence. Tasks can be a wait, a cutscene or a mini-game.
- **Mundane is the joke.** Tasks are small, slightly absurd and satisfying. Feedback (popups, sounds, little animations) matters more than depth.
- **No goal, soft incentives.** Points, variety combos and achievements. Repeating a task has diminishing returns.

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
| 009 | [Polish (umbrella)](issues/009-polish.md) | marc + claude | blocked | 009a-d |
| 009a | [Polish: sound effects](issues/009a-sound.md) | agent | blocked | 017 |
| 009b | [Polish: particles](issues/009b-particles.md) | agent | blocked | 017 |
| 009c | [Polish: achievements and saved progress](issues/009c-achievements.md) | agent | blocked | 017 |
| 009d | [Polish: time of day](issues/009d-time-of-day.md) | agent | blocked | 017 |
| 010 | [Scrolling camera](issues/010-scrolling-camera.md) | claude | done | 005 |
| 011 | [Integrate the floor plan and task data](issues/011-integrate-floor-plan.md) | claude | done | 005, 003 |
| 012 | [Interaction edge cases](issues/012-interaction-edge-cases.md) | claude | done | |
| 013 | [Physics robustness](issues/013-physics-robustness.md) | claude | done | |
| 014 | [HUD polish](issues/014-hud-polish.md) | claude | done | 010, 011 |
| 015 | [Extract the game scene from main.ts](issues/015-extract-game-scene.md) | claude | done | |
| 016 | [Draw the level and player with sprites](issues/016-draw-level-with-sprites.md) | agent | done | 007, 008, 010, 011 |
| 017 | [Game events and drawing layers](issues/017-game-events-and-layers.md) | claude | done | |
| 018 | [Layer hardening](issues/018-layer-hardening.md) | claude | todo | 017 |
| 019 | [Top-down foundation (grid steps, facing, interact)](issues/019-topdown-foundation.md) | claude | todo | |
| 020 | [Top-down floor plan of the apartment](issues/020-topdown-floor-plan.md) | marc + agent | todo | 019 |
| 021 | [Apartment state and tasks that change it](issues/021-apartment-state.md) | claude | todo | 019 |
| 022 | [Activities, mini-games and cutscenes](issues/022-activities.md) | claude | todo | 019 |
| 023 | [Dialog box and choice menus](issues/023-dialog-and-menus.md) | claude | todo | 019 |
| 024 | [Personal touch interview](issues/024-personal-touch-interview.md) | marc + agent | todo | |
| 025 | [Top-down art spec](issues/025-topdown-art-spec.md) | marc + agent | todo | |

## Order of work
**Done, side view (001 to 017):** the playable prototype. Kept in the tag `side-view-prototype`.

**Now:**
1. **019, top-down foundation**, then a **decision gate**: Marc plays it and says continue, adjust or stop.
2. **In parallel with 019, because they don't depend on it:** 024 (personal interview), 025 (top-down art spec) and 018 (layer hardening).

**After the gate:**
3. **020** (top-down floor plan) and, in parallel, **021** (apartment state), **022** (activities) and **023** (dialog and menus).
4. **Art:** new furniture and character batches, written once 020 gives the piece list and 025 the rules.
5. **Content:** a new task list from the interview (024): the tasks, cutscenes, mini-games and "contemplate" menus, written as data.
6. **Polish:** 009a to 009d, rewritten for the new view (footsteps instead of jumps, a day and night cycle on the clock from 021).

## Decisions
- **View (2026-10-22):** top-down, Pokemon-style, replacing the side-view platformer. An isometric version (like Focus Friend) is a possible later project that Marc may make his own art for; not this one.
- **Movement:** grid steps, tile to tile, with turning before stepping. Interact with the faced tile.
- **The side-view version** lives in git history and the tag `side-view-prototype` only.
- **Personal touch:** an interview (issue 024) gathers Marc's day-to-day to shape tasks, cutscenes and the character.
- **Level size and scale:** decided again in 020 (the old 1 tile = 1 ft and the scrolling camera belonged to the side view).
- **Day and night cycle:** yes. A game clock, lighting through the day and tasks that pay better at the right hour (issue 009d).
- **Combo rule:** rewards variety (different tasks in quick succession), not repetition.

## Open questions
- Rooms as separate screens joined by doorways, or one scrolling map? (020; Pokemon-style screens preferred.)
- Character size: 16x16 or taller? (025)
- Lowercase text and more punctuation in the pixel font, for dialog and excerpts? (023)
- Is the final player character agent-drawn or generated with an external tool?
- Keyboard only, or gamepad support too?
- Should the game persist score between sessions (localStorage)?
