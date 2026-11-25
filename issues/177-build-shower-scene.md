---
id: "177"
title: "Build the in-room shower scene"
short: "Shower scene build"
status: review
owner: marc + claude
depends_on: ["175"]
summary: "Build the in-room shower scene: the player in the tub under bubbles, steam and a hiss, then out in the robe."
kind: build
unverified:
  - "Nobody has heard the shower hiss or the click: the loudness (layers 0.03 and 0.025) and whether the looped 0.5 s noise shows its repeat are untuned and unheard."
  - "Only seen in a headless Chrome at real speed through a handful of screenshots, not played by a person, so how the timing and the effects feel is unchecked."
  - "The touch layer and the narrow phone view were not looked at with the scene."
needs:
  - who: marc
    kind: try
    why: "Play the shower in the bath and tune the hiss by ear (SHOWER_SOUND in config.ts)."
    since: "2026-11-24"
changelog: "Taking a shower is now a short comic scene with bubbles, steam and a hiss, ending in the bathrobe."
---

## Goal
Build what `docs/shower-scene-design.md` (issue 165, merged) designs, following Marc's answers in `issues/165-shower-scene.md` (d1 to d11): the scene plays in the bath room itself (no close-up); the player stays in the tub covered in bubbles with the head showing, steam and fog drift up, droplets fall, all calm and slow; a soft hiss while the water runs and a quiet click when it stops with the music playing on; reduced motion keeps still steam and fog, no floating bubbles, no pop, and keeps the droplets; Escape pays nothing and fires no occasion; no skip; every shower plays the whole scene; at the end the player appears on the tile they stood on, facing away from the tub (east), in the robe if the ROBE slot says so, else the everyday outfit, through the outfit slots occasion built in issue 175 (the scene never writes `worn`); no towel for now. Points (70), mood (+6), duration (6 s) and the task id `shower` are unchanged.

## Acceptance criteria
- Stage 1, the pose: the clothes-free `shower-tub` pose and its 16x48 sprite `player-shower-tub` (palette only, no text, head showing over a heap of bubbles, gender-neutral: the bubbles do the covering), drawn so it sorts in front of the tub, and the `TURN_AWAY_AFTER` turn on completion (about 8 lines, per the design); a missing sprite falls back to the plain player.
- Stage 2, the effects: the task phases as data (`in` 0 to 1.0 s, `water` 1.0 to 4.6 s, `off` 4.6 to 6.0 s) via `TASK_PHASES` and a `Game.taskPhase` getter generalising the sleep-only emitter phases, four particle kinds and shapes in config (droplets, steam, fog, floating bubbles) emitted by `taskEmitters.shower`, the bubble-pop burst at completion, and the steam and fog fade within about 4 s; reduced motion per d4 and d11 (`Game.reducedMotionAsked`, read live).
- Stage 3, sound: a `shower` bus and a looping noise voice with `hold` in the synth (about 25 lines) and a small `ShowerSound` class: a hiss while the water runs, a click when it stops; tune the loudness against the snore's noise layer (the design warns it may be louder than intended: say what you did; you cannot hear audio, so keep it conservative and list it as unverified for Marc to tune by ear).
- Integration test: finishing a shower with the ROBE slot filled ends in the robe, with it empty ends in everyday; Escape changes nothing; the edge cases in the design (carrying a mug, a playing record, loading a save mid-shower, an ad right after, missing pose art).
- Look at each stage in the running game yourself (dev server: `?set=` shortcuts; the bath is the room at the end of the kitchen; headless frames at several times through the 6 s) and say what you saw; the reviewer must too. Staged commits are fine, one review at the end.
- Strings into docs/text-review.md (there should be none, say so); docs/decor.md or a new section in docs/tasks.md 'What issue 177 built'; a `changelog:` line (at most 140 characters); standard checks: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean; golden frames unchanged.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main).
- 2026-11-24 (claude): started in the worktree. Plan: stage 1 the pose and sprite and the turn away, stage 2 the phases and particle effects, stage 3 the shower sound bus and ShowerSound, then the integration test, docs and a look at frames.
- 2026-11-24 (claude): built all three stages. Stage 1: `player-shower-tub` (16x48, palette only, head over bubbles from the chin down), `POSES["shower-tub"]`, `shower: { pose }` in tasks.ts, `TURN_AWAY_AFTER` (config) applied in `Game` on completion. Stage 2: `TASK_PHASES` and `Game.taskPhase`; string phases and a `motion` flag on emitters; four kinds and shapes, `taskEmitters.shower`, `PARTICLES.finish.shower`; reduced motion read live. Stage 3: `shower` bus, noise `loop` and `hold` and a returned stop handle in the synth, `ShowerSound`, `showerClick`, `SHOWER_SOUND` in config. Tests in `src/game/shower.test.ts` (35, real bath room: pose in front of the tub, fall back with missing art, turn, phases, particles, reduced motion, robe with and without ROBE, Escape, mug, record, sync, ad, sound). Docs: tasks.md 'What issue 177 built', reduced-motion.md row 57, art-style.md, ideas.md. Strings: none, so nothing for text-review.md.
- 2026-11-24 (claude): looked at it in a headless Chrome on the dev server (a temporary `?bathdemo` hook in main.ts, reverted, not committed), screenshots at 0.4, 1.6, 3.0, 5.3 and 6.5 s: the head over foam in the tub, drops from the tap, mist steam and fog drifting, a ring bubble floating, then the player on the tile facing east in the robe with a pop of bubbles over the tub. With `prefers-reduced-motion` emulated: still clouds, drops, no rings. Fixes after looking: bubble heap redrawn with fewer outlines; fog uses paper (mist read as grey blobs on the floor); the still steam keeps off the face.
- Tuning of the hiss: the design's 0.05 and 0.04 gains were halved to 0.03 and 0.025 because white noise high-passed at 2400 Hz is far louder than the snore's 300 Hz low-passed layer at the same gain. Untuned, unheard.
- Notes for the planner: no dev shortcut to open the bath exists (`?set=` sets state only); walk there (the bath is east of the kitchen). The progress popup ("TAKE A SHOWER" and its bar) sits over the tub's top for the whole task; that is the game's normal task popup and was left alone. Golden frames unchanged; `npm run sprites` leaves git clean after the commit.
