---
id: 080
title: Ad encounter entrance: a battle-style flash and bar wipe
status: review
owner: claude
depends_on: [043]
---

## Goal
Marc (2026-10-27): ad encounters should enter like a Pokemon or FFVII battle. Played completely straight for a candle email: the disconnect is the joke (never acknowledge the game). Marc chose the flash and bar wipe.

## Design
- Entrance, about 0.8 s: a short phone-buzz rumble with a tiny screen shake; two screen flashes; alternating horizontal bars slide across and cover the screen; the card shows as the bars part. A short synth stinger from the existing sound system (a rising two-note jingle, brief).
- Exit: a quick reverse wipe back to the room, faster than the entrance.
- E skips the entrance after its first frames. Escape still leaves at once as today.
- The clock is held throughout, as the encounter already does. With the ad blocker on, no encounter and no sequence.
- With reduced motion requested by the browser (`prefers-reduced-motion`), skip the flashes and shake and use a plain short fade.
- Keep it to the encounter activity plus one small transition module (pure timing and a draw function, tested without a canvas).

## Acceptance criteria
- Entrance and exit as above, deterministic from frame count; golden main-room frames unchanged outside encounters.
- Skippable with E; Escape leaves cleanly at every moment of the transition (clock, input lock, dialog, room clean).
- Reduced-motion path works and is tested.
- The sound is one short stinger through the existing sound feature, muted when the game is muted.
- `npm test`, `npx tsc --noEmit`, `npm run build` pass. Not verified without a browser: how it feels; say so.

## Progress log

- 2026-10-27: Starting. Plan: pure `src/game/encounter-transition.ts` (frame timeline + draw), tuning in `ENCOUNTERS.entrance`, one `encounter-entrance` sound cue, the activity waits out the entrance before opening its menu and keeps itself alive for the exit wipe (Escape still ends it at once), reduced motion read through a `GameOptions.reducedMotion` hook set in main.ts.
- 2026-10-27: Done, in review. Added `src/game/encounter-transition.ts` (pure timeline `transitionFrame`, `barRects`, `drawTransition`) and its test; tuning in `ENCOUNTERS.entrance`; sound effect `encounterEntrance` and cue `encounter-entrance` (config.ts); the encounter activity now plays the entrance (menu opens at frame 48, or on E after frame 6), keeps itself alive for the 12-frame exit after its last line, and Escape (or a cancelled dialog) ends it at once; `GameOptions.reducedMotion` (set from `matchMedia` in main.ts) gives the plain-fade path. Existing encounter-game tests now wait out the entrance and exit; new tests cover timing, E skip, Escape at every frame, reduced motion, rendering and the muted sound. Docs: section 13 of docs/random-encounters.md. Files: src/game/{encounter-transition.ts,encounter-transition.test.ts,config.ts,game.ts,encounter-game.test.ts,activities/encounter.ts,sound/feature.test.ts}, src/main.ts. Dialog runner untouched. `npm test`, `npx tsc --noEmit`, `npm run build` pass; main room golden unchanged. Not verified: how it feels in a browser (timing, shake, the stinger), and the self-copy shake on the real canvas.
