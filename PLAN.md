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
| 009 | [Polish (umbrella)](issues/009-polish.md) | marc + claude | done | 009a-d |
| 009a | [Polish: sound effects](issues/009a-sound.md) | agent | done | |
| 009b | [Polish: particles](issues/009b-particles.md) | agent | done | |
| 009c | [Polish: achievements and saved progress](issues/009c-achievements.md) | agent | done | |
| 009d | [Polish: time of day](issues/009d-time-of-day.md) | agent | done | |
| 010 | [Scrolling camera](issues/010-scrolling-camera.md) | claude | done | 005 |
| 011 | [Integrate the floor plan and task data](issues/011-integrate-floor-plan.md) | claude | done | 005, 003 |
| 012 | [Interaction edge cases](issues/012-interaction-edge-cases.md) | claude | done | |
| 013 | [Physics robustness](issues/013-physics-robustness.md) | claude | done | |
| 014 | [HUD polish](issues/014-hud-polish.md) | claude | done | 010, 011 |
| 015 | [Extract the game scene from main.ts](issues/015-extract-game-scene.md) | claude | done | |
| 016 | [Draw the level and player with sprites](issues/016-draw-level-with-sprites.md) | agent | done | 007, 008, 010, 011 |
| 017 | [Game events and drawing layers](issues/017-game-events-and-layers.md) | claude | done | |
| 018 | [Layer hardening](issues/018-layer-hardening.md) | claude | done | 017 |
| 019 | [Top-down foundation (grid steps, facing, interact)](issues/019-topdown-foundation.md) | claude | done | |
| 020 | [Top-down floor plan of the apartment](issues/020-topdown-floor-plan.md) | marc + agent | done | 019 |
| 021 | [Apartment state and tasks that change it](issues/021-apartment-state.md) | claude | done | 019 |
| 022 | [Activities, mini-games and cutscenes](issues/022-activities.md) | claude | done | 019 |
| 023 | [Dialog box and choice menus](issues/023-dialog-and-menus.md) | claude | done | 019 |
| 024 | [Personal touch interview](issues/024-personal-touch-interview.md) | marc + agent | done | |
| 025 | [Top-down art spec](issues/025-topdown-art-spec.md) | marc + agent | done | |
| 026 | [Spanish flashcards on the in-game computer (stretch)](issues/026-spanish-flashcards-terminal.md) | marc + claude | in-progress (stages 1 to 3 of 4 done; stage 4, offline, is optional) | |
| 027 | [State hardening](issues/027-state-hardening.md) | claude | done | 021 |
| 028 | [Top-down art: main room](issues/028-art-main-room.md) | agent | done | 020, 025 |
| 029 | [Top-down art: kitchen and bath](issues/029-art-kitchen-bath.md) | agent | done | 020, 025 |
| 030 | [Top-down art: player character](issues/030-art-player-character.md) | agent | done | 025 |
| 031 | [Draw the top-down game with sprites](issues/031-wire-sprites-topdown.md) | claude | done | |
| 032 | [Activity follow-ups from the 022 review](issues/032-activity-followups.md) | claude | done | |
| 033 | [Floor plan fixes found while drawing the art](issues/033-floor-plan-art-fixes.md) | claude | done | |
| 034 | [Art follow-ups from 028 to 030](issues/034-art-followups.md) | agent | done | |
| 035 | [Task variety from the first playtest](issues/035-task-variety.md) | claude | done | |
| 036 | [Art: more accurate paintings, gallery wall, blinds states](issues/036-art-paintings-and-couch.md) | agent | done | |
| 037 | [Text pass: drop "the", tone down the jokes](issues/037-text-pass.md) | marc + claude | todo | |
| 038 | [Mood (morale) state](issues/038-mood.md) | claude | done | |
| 039 | [Choosing a task at an object](issues/039-choose-or-cycle.md) | claude | done | |
| 040 | [Admire the art: a view of just the gallery wall](issues/040-admire-art-view.md) | claude | done | |
| 041 | [Look in the mirror (bathroom)](issues/041-bathroom-mirror.md) | claude | done | |
| 042 | [Clutter that moves (desk, clothes, mail)](issues/042-clutter-states.md) | claude | todo | |
| 043 | [Random encounters (explore the idea)](issues/043-random-encounters.md) | marc + claude | todo | |
| 044 | [Place the new art on the map](issues/044-place-new-art.md) | claude | done | 034 |
| 045 | [Draw the doing poses, outfits and held items](issues/045-draw-poses-outfits-items.md) | claude | done | 034 |
| 046 | [Escape during any action (and a cutscene's text)](issues/046-cutscene-escape.md) | claude | done | |
| 047 | [Art round 2 from the 034 playtest](issues/047-art-round-2.md) | agent | done | |
| 048 | [Status panel space (and a phone battery?)](issues/048-status-panel-space.md) | marc + claude | todo | |
| 049 | [Mobile (explore)](issues/049-mobile.md) | marc + claude | todo | |
| 050 | [Guitar redraw (Marc's tweaks)](issues/050-guitar-redraw.md) | agent | done | |
| 051 | [The meta side project](issues/051-meta-side-project.md) | marc + claude | done | |
| 052 | [Fix the sleeping and sofa-sitting poses](issues/052-pose-fixes.md) | agent | done | |
| 053 | [Sleeping on an unmade bed shows a made bed](issues/053-sleep-on-unmade-bed.md) | agent | done | 052 |
| 054 | [Wall texture from the new photo](issues/054-wall-texture.md) | marc + agent | done | |
| 055 | [Replace the GOOD HOUR text with an icon](issues/055-good-hour-icon.md) | claude | done | |
| 056 | [Redraw the mic stand; take the robin print off the map](issues/056-mic-and-robin.md) | agent | done | |
| 057 | [Bookshelf top order; guitar pose shows the neck](issues/057-bookshelf-and-guitar-pose.md) | agent | done | |
| 058 | [Add warm greys to the palette; re-tint the plaster and kitchen walls](issues/058-warm-grey.md) | agent | done | |
| 059 | [Make your own tracks in the game](issues/059-make-your-own-tracks.md) | marc + claude | done | |
| 060 | [Draw the gallery wall view](issues/060-gallery-wall-view.md) | agent | done | |
| 061 | [Admire the art: zoom in and comment very seriously](issues/061-art-zoom-gag.md) | marc + claude | done | |
| 062 | [Customizable decor (inventory, swap, buy) (explore)](issues/062-customizable-decor.md) | marc + claude | in-progress (stages 1, 2 and 3a done; 3b and 4 remain) | |
| 063 | [Plants that grow in stages](issues/063-plant-growth.md) | marc + claude | done | |
| 064 | [Plugins (VSTs) for the track editor (explore)](issues/064-track-editor-plugins.md) | marc + claude | todo | |
| 065 | [Both windows' blinds; the dinner plate only when there is dinner](issues/065-blinds-and-plate.md) | claude | done | |
| 066 | [Flattened boxes and collected packages are linked](issues/066-boxes-and-packages.md) | claude | todo | |
| 068 | [Record player: no cooldown, pay only for a real change](issues/068-record-player-rewards.md) | claude | done | |

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
- **View orientation (Marc, 2026-10-23):** the main room is seen from the sofa side, looking toward the table, desk, bookshelf and bed wall. The sofa is on the near (bottom) wall, seen from behind; the pieces against the far (top) wall are drawn front-on. Kitchen and bath orientation to be agreed in 020.
- **Personal touch:** an interview (issue 024) gathers Marc's day-to-day to shape tasks, cutscenes and the character.
- **Level size and scale:** decided again in 020 (the old 1 tile = 1 ft and the scrolling camera belonged to the side view).
- **Day and night cycle:** yes. A game clock, lighting through the day and tasks that pay better at the right hour (issue 009d).
- **Persistence (2026-10-22):** yes, the game remembers state between sessions in localStorage (score, apartment state, settings, and for issue 026 the flashcards key). Wrapped in try/catch so a blocked or empty store never breaks the game. Issue 009c owns the detail.
- **Combo rule:** rewards variety (different tasks in quick succession), not repetition.
- **Collecting is a quiet side effect, a zen garden (Marc, 2026-10-23):** decor (062), plants (063) and track-editor plugins (064) are things you accumulate calmly, not a goal or a progression ladder. The game has no win condition and Marc is not sure where it goes; it might become a goal later, but not now. Do not add pressure, scarcity or grinding around them.
- **Humor (Marc, 2026-10-23):** deadpan and sincere. The joke is the disconnect (a lofty, serious narrator over a plain visual), not winking at the medium: never acknowledge that it is pixels or a game. Plain wording elsewhere; Marc reviews text in issue 037.

## Open questions
- Rooms as separate screens joined by doorways, or one scrolling map? (020; Pokemon-style screens preferred.)
- Character size: 16x16 or taller? (025)
- Lowercase text and more punctuation in the pixel font, for dialog and excerpts? (023)
- Is the final player character agent-drawn or generated with an external tool?
- Keyboard only, or gamepad support too?
