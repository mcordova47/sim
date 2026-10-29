# Simagotchi: a studio apartment game

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
- **Every issue is worked in its own git worktree**, at `../sim-worktrees/NNN-slug` on branch `issue/NNN-slug`, including the planner's own issues. Nothing lands on `main` until it has been reviewed. Agents commit on their branch, start their own independent review when they finish (see `work-issue`), and never merge. The planner merges approved branches with `/merge-issue NNN` (see `.claude/skills/merge-issue/`), which checks the review record, builds and tests the merged result, and updates the table below. Status in an issue file is only current on its branch until merged.

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
| 026 | [Spanish flashcards on the in-game computer (stretch)](issues/026-spanish-flashcards-terminal.md) | marc + claude | done (stages 1 to 3 shipped; stage 4, offline, abandoned by Marc 2026-10-27) | |
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
| 043 | [Random encounters (explore the idea)](issues/043-random-encounters.md) | marc + claude | done | |
| 044 | [Place the new art on the map](issues/044-place-new-art.md) | claude | done | 034 |
| 045 | [Draw the doing poses, outfits and held items](issues/045-draw-poses-outfits-items.md) | claude | done | 034 |
| 046 | [Escape during any action (and a cutscene's text)](issues/046-cutscene-escape.md) | claude | done | |
| 047 | [Art round 2 from the 034 playtest](issues/047-art-round-2.md) | agent | done | |
| 048 | [Status panel space (and a phone battery?)](issues/048-status-panel-space.md) | marc + claude | in-progress (design note merged and answered, layout B; the build is its own issue) | |
| 049 | [Mobile (explore)](issues/049-mobile.md) | marc + claude | in-progress (design note merged and answered; stage 1 build issue to write) | |
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
| 066 | [Flattened boxes and collected packages are linked](issues/066-boxes-and-packages.md) | claude | done | |
| 068 | [Record player: no cooldown, pay only for a real change](issues/068-record-player-rewards.md) | claude | done | |
| 069 | [Decor items decide whether they give light; the stool is a real item](issues/069-decor-glow.md) | claude | done | |
| 070 | [Boxes: flatten, take out the recycling, they disappear](issues/070-boxes-recycling.md) | claude | done | 066 |
| 071 | [No recycling bin; recycle from the boxes; no cooldowns on state-gated tasks](issues/071-recycling-and-cooldowns.md) | claude | done | |
| 072 | [A real pantry (a stack of clear bins); remove the tote bag](issues/072-pantry-and-no-tote.md) | agent | done | |
| 073 | [Decor: an item is displayed in one place at a time (swap, inventory)](issues/073-decor-inventory.md) | claude | done | |
| 074 | [Art for the first gifts (paintings, lamps, plant, poster)](issues/074-art-first-gifts.md) | agent | done | |
| 075 | [Experiment: a per-letter voice for dialog text, behind a toggle](issues/075-dialog-voice-experiment.md) | claude | done | |
| 076 | [More paintings from Marc's unhung pieces; a different concert poster](issues/076-more-paintings-and-poster.md) | agent | done | |
| 077 | [Make the per-letter voice the default for dialog text](issues/077-letters-voice-default.md) | claude | done | |
| 078 | [A sleep sequence instead of just a timer](issues/078-sleep-sequence.md) | marc + claude | done | |
| 079 | [Open the box one gift at a time](issues/079-open-box-one-at-a-time.md) | claude | done | 043 |
| 080 | [Ad encounter entrance: flash and bar wipe](issues/080-encounter-entrance.md) | claude | done | 043 |
| 081 | [Menus ignore stray keys right after a typing game](issues/081-stray-keys-after-typing.md) | claude | done | |
| 082 | [Flashcards: a progress page when no cards are left](issues/082-flashcards-progress-page.md) | claude | done | 026 |
| 083 | [Flashcards for someone who is not Marc: a mode with no sync key (design first)](issues/083-flashcards-guest-mode.md) | marc + claude | done (design note and the build, issue 089) | 026 |
| 084 | [Put the game on the internet (hosting, domain, repo name, privacy pass)](issues/084-productionize.md) | marc + claude | done (live at https://sim.mcord.dev/ and the repo is on GitHub as mcordova47/sim) | |
| 085 | [Remove or decide on personal info before the repo goes on GitHub](issues/085-personal-info-before-github.md) | marc + claude | done (audit, decisions and the history rewrite; the clean repo is sim) | |
| 086 | [HUD ribbon, stage 1: icons and small bars in the empty top band](issues/086-hud-ribbon-stage-1.md) | claude | done | 048 |
| 087 | [Mobile, stage 1: a touch layer in a flat portrait shell](issues/087-mobile-stage-1.md) | claude | done | 049 |
| 088 | [A phone battery (a gag) and a charge-your-phone task](issues/088-phone-battery.md) | claude | done | 086 |
| 089 | [Flashcards guest mode: study without a sync key (build)](issues/089-flashcards-guest-mode-build.md) | claude | done | 083, 082 |
| 090 | [Mobile: a taller, squarer picture that scrolls (assess, then prototype)](issues/090-mobile-narrow-view.md) | claude | done | 087 |
| 091 | [Encounter music: a short battle-style track during an ad, and a result jingle](issues/091-encounter-music.md) | marc + claude | design done, build issues filed | 080 |
| 091a | [Encounter music 1: bus, scene, placeholder track](issues/091a-encounter-bus-scene.md) | claude | done | 091 |
| 091b | [Encounter music 2: result jingles (success only)](issues/091b-encounter-jingles.md) | claude | todo | 091a |
| 091c | [Encounter music 3: docs and tuning](issues/091c-encounter-docs.md) | claude | todo | 091b |
| 091d | [Encounter music 4: Marc writes the real track](issues/091d-encounter-real-track.md) | marc | todo | 091a |
| 092 | [Mobile landscape: the controls must not cover the picture](issues/092-mobile-landscape-controls.md) | claude | done | 087, 090 |
| 093 | [Mobile stage 3: key entry, a tappable pause screen, and key hints that match the controls](issues/093-mobile-text-menus-and-hints.md) | claude | done | 087, 089 |
| 094 | [Phone battery: drains a little, and looks like a phone battery indicator](issues/094-battery-drain-and-indicator.md) | claude | done | 088 |
| 095 | [Sync the game's progress across devices (design first)](issues/095-sync-across-devices.md) | marc + claude | done (the note, and the builds 102 to 104; Marc still checks the server with netlify dev and two browsers) | |
| 096 | [Asset review: go over every sprite for perspective and consistency](issues/096-asset-review.md) | marc + claude | done | |
| 097 | [A guided walkthrough of the codebase, with small hands-on tasks](issues/097-codebase-walkthrough.md) | marc + claude | in-progress | |
| 098 | [Art style doc: the perspective rule](issues/098-art-style-perspective-rule.md) | claude | done | 096 |
| 099 | [Redraw the south-wall pieces near top-down](issues/099-south-wall-pieces-top-down.md) | claude | done | 096 |
| 100 | [Desk chair diagonal, the desk pose, and the typing prompt placement](issues/100-desk-chair-pose-and-typing-prompt.md) | claude | done | 099 |
| 101 | [Asset cleanup: plant pots, side-project picture, unused sprites](issues/101-asset-cleanup.md) | claude | done | 100 |
| 102 | [Sync stage 1: export and import a save, and the pure mergeSaves](issues/102-sync-stage-1-export-import-merge.md) | claude | done | 095 |
| 103 | [Sync stage 2: the Netlify Function with Blobs and the pairing link](issues/103-sync-stage-2-server.md) | claude | done | 102 |
| 104 | [Sync stage 3: automatic sync and the pause-screen control](issues/104-sync-stage-3-automatic.md) | claude | done | 103, 093 |
| 105 | [Dried flowers should not offer to be watered](issues/105-dried-flowers-no-watering.md) | claude | done | |
| 106 | [The track editor (mixing tool) on phones](issues/106-track-editor-on-phones.md) | marc + claude | done | 093 |
| 106a | [Track editor on phones 1: touch layout and drawing](issues/106a-editor-touch-layout.md) | claude | done | 093 |
| 106b | [Track editor on phones 2: taps that edit](issues/106b-editor-touch-taps.md) | claude | done | 106a |
| 106c | [Track editor on phones 3: name, More menu, delete](issues/106c-editor-touch-name-menu.md) | claude | done | 106b |
| 106d | [Track editor on phones 4: share and paste](issues/106d-editor-touch-share-paste.md) | claude | todo | 106c |
| 106e | [Track editor on phones 5: long press, drag paint, polish (optional)](issues/106e-editor-touch-polish.md) | claude | todo | 106d |
| 107 | [The guitar: flipped so it reads as standing on a stand](issues/107-guitar-on-a-stand.md) | claude | done | 100 |
| 108 | [The guitar's timbre follows the current instrument](issues/108-guitar-timbre.md) | claude | done | |
| 109 | [A browsable inventory, like a pokedex](issues/109-browsable-inventory.md) | marc + claude | done | 073 |
| 109a | [Inventory 1: entry data](issues/109a-inventory-entry-data.md) | claude | done | 109 |
| 109b | [Inventory 2: the THINGS page](issues/109b-inventory-page.md) | claude | done | 109a |
| 109c | [Inventory 3: seen silhouettes](issues/109c-inventory-silhouettes.md) | claude | todo | 109b |
| 110 | [A manual deploy button on GitHub](issues/110-manual-deploy-action.md) | claude | review | |
| 111 | [The side project picture reacts to editable config (stretch)](issues/111-side-project-config.md) | marc + claude | done | 101 |
| 111a | [Side project config 1: the parser and command set](issues/111a-sideproject-parser.md) | claude | done | 111 |
| 111b | [Side project config 2: compose the little room from the real one](issues/111b-sideproject-compose.md) | claude | done | 111 |
| 111c | [Side project config 3: the view and the painter](issues/111c-sideproject-view.md) | claude | todo | 111 |
| 111d | [Side project config 4: the real config file and the figure](issues/111d-sideproject-room.md) | claude | todo | 111a, 111b, 111c |
| 111e | [Side project config 5: `when` conditions](issues/111e-sideproject-when.md) | claude | todo | 111d |
| 111f | [Side project config 6: one real effect (later)](issues/111f-sideproject-effects.md) | marc + claude | todo | 111e |
| 112 | [Real-world effects: what is feasible (research)](issues/112-real-world-effects-research.md) | marc + claude | done | |
| 113 | [Photo reel: pixelated pictures from your own device (experiment)](issues/113-photo-reel-experiment.md) | marc + claude | todo (design first) | 112 |
| 113a | [Photo reel 1: pixelate](issues/113a-reel-pixelate.md) | claude | done | 113 |
| 113b | [Photo reel 2: the store](issues/113b-reel-store.md) | claude | done | 113 |
| 113c | [Photo reel 3: PHOTOS page](issues/113c-reel-photos-page.md) | claude | done | 113a, 113b |
| 113d | [Photo reel 4: the reel and sofa task](issues/113d-reel-activity.md) | claude | done | 113c |
| 113e | [Photo reel 5: on-device pass](issues/113e-reel-phone-pass.md) | claude | todo (superseded by 117g) | 113d |
| 114 | [Guitar skill: from single notes to fingerstyle](issues/114-guitar-skill.md) | marc + claude | design done (docs/guitar-skill-design.md); build is 114a to 114c | 108 |
| 114a | [Guitar skill 1: rule, chords, strumming (levels 1 to 3)](issues/114a-guitar-skill-levels-1-3.md) | claude | done | 108 |
| 114b | [Guitar skill 2: the groove and melody (level 4)](issues/114b-guitar-skill-groove.md) | claude | done | 114a |
| 114c | [Guitar skill 3 (optional): the pause-screen line](issues/114c-guitar-skill-pause-line.md) | claude | todo | 114a |
| 115 | [A gentle limiter on the master output (clipping safety)](issues/115-master-limiter.md) | claude | done | |
| 116 | [Name the game Simagotchi](issues/116-simagotchi-name.md) | claude | done | |
| 117 | [Photos like a phone gallery: browse, delete one, close-up scene](issues/117-photo-gallery.md) | marc + claude | done | 113 |
| 117a | [Photo gallery 1: looks and the store](issues/117a-gallery-looks.md) | claude | done | 113c |
| 117b | [Photo gallery 2: the gallery core (not wired)](issues/117b-gallery-core.md) | claude | done | 113c |
| 117c | [Photo gallery 3: manage mode with delete one](issues/117c-gallery-manage.md) | claude | done | 117b |
| 117d | [Photo gallery 4: the LOOK switch](issues/117d-gallery-look-switch.md) | claude | todo | 117a, 117c |
| 117e | [Photo gallery 5: the sofa scene replaces the slideshow](issues/117e-gallery-scene.md) | claude | done | 117b |
| 117f | [Photo gallery 6: an ad can interrupt the close-up](issues/117f-gallery-ad-interrupt.md) | claude | todo | 117e |
| 117g | [Photo gallery 7: text review, phone pass, docs](issues/117g-gallery-pass.md) | claude | todo | 117f, 117d |
| 118 | [Ads for framing a photo, then hang or shelve it](issues/118-framed-photos.md) | marc + claude | todo | 117 |
| 119 | [A Simagotchi logo and favicon](issues/119-simagotchi-logo.md) | claude | todo | 116 |
| 120 | [Pause legend overlap on the narrow view](issues/120-pause-legend-narrow.md) | claude | todo | 116 |
| 121 | [Fix the flaky flashcards activity test](issues/121-flaky-flashcards-test.md) | claude | done | |
| 122 | [A dev-only music lab](issues/122-music-lab.md) | claude | done | |
| 123 | [Music lab: hear the encounter intro into the track](issues/123-lab-intro-preview.md) | claude | done | 122 |

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
