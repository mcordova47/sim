---
id: "177"
title: "Build the in-room shower scene"
short: "Shower scene build"
status: todo
owner: marc + claude
depends_on: ["175"]
summary: "Build the in-room shower scene: the player in the tub under bubbles, steam and a hiss, then out in the robe."
kind: build
changelog: "Taking a shower is now a short comic scene with bubbles, steam and a hiss, ending in the bathrobe."
needs: [{who: marc, kind: try, why: "Take a shower and tune the hiss by ear: cd ~/Dev/repos/mcordova47/sim-worktrees/177-shower-scene && npm run dev, walk through the kitchen to the bath at the east end, stand on the tile east of the tub (column 3, rows 1 to 4), face west, press E; ?set=clock:8 and your OS reduce-motion setting show the other cases; then say 'merge 177' or what is off", since: 2026-11-24}]
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
