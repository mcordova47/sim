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
- **Every issue is worked in its own git worktree**, at `../life-worktrees/NNN-slug` on branch `issue/NNN-slug`, including the planner's own issues. Nothing lands on `main` until it has been reviewed. Agents commit on their branch and never merge. The planner merges approved branches and updates the table below. Status in an issue file is only current on its branch until merged.

## Milestones and issues

| # | Issue | Owner | Status | Depends on |
|---|-------|-------|--------|------------|
| 001 | [Scaffold project](issues/001-scaffold-project.md) | claude | done | |
| 002 | [Player movement and collision](issues/002-player-movement.md) | claude | done | 001 |
| 003 | [Interaction and scoring system](issues/003-interaction-scoring.md) | claude | todo | 002 |
| 004 | [HUD and feedback](issues/004-hud-feedback.md) | claude | todo | 003 |
| 005 | [Floor plan and task list](issues/005-floor-plan-tasks.md) | marc + agent | blocked | needs photos from Marc |
| 006 | [Sprite pipeline and style guide](issues/006-sprite-pipeline.md) | agent | todo | 001 |
| 007 | [Furniture sprites](issues/007-furniture-sprites.md) | agent | todo | 005, 006 |
| 008 | [Player character sprite](issues/008-player-sprite.md) | agent | todo | 006 |
| 009 | [Polish: sound, particles, achievements, time of day](issues/009-polish.md) | agent | todo | 004, 007 |

## Order of work
1. **Playable skeleton first:** 001, 002, 003, 004 with rectangles for art.
2. **In parallel:** Marc supplies photos and measurements (005) while 006 builds the sprite pipeline.
3. **Art:** 007 and 008 once the floor plan and style guide exist.
4. **Polish:** 009.

## Open questions
- Is the final player character agent-drawn or generated with an external tool?
- Keyboard only, or gamepad support too?
- Should the game persist score between sessions (localStorage)?
