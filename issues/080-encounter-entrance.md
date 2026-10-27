---
id: 080
title: Ad encounter entrance: a battle-style flash and bar wipe
status: todo
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
