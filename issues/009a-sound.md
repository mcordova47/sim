---
id: 009a
title: "Polish: sound effects"
status: todo
owner: agent
depends_on: [017]
---

## Goal
Give the game sound: small, charming effects for the things you do. No audio files and no licences to worry about: synthesize everything with the Web Audio API.

## How this fits in
Issue 017 added `game.events` (typed events for jump, land, task start, task complete and task blocked) and `game.addLayer(...)` for extra update and drawing hooks. Build this feature as its own module that subscribes to those events and, if it draws, registers a layer. Add exactly one line to `src/game/features.ts` to switch it on. Do not edit `game.ts` unless the issue says so, and keep every colour from `render/colors.ts` and every number you may want to tune in `config.ts`. Other agents are building the other three polish features at the same time, so stay inside your own module.

Text drawn by the game uses the built-in pixel font (A-Z, 0-9 and `+ - * . , : ! ? ' ( ) / %`, uppercase). Anything the player reads must stick to those characters.

Keep it all testable without a browser: put the logic in plain functions and classes, and inject anything that touches the browser (audio, storage, a canvas) so tests can fake it.

## Acceptance criteria
- Effects, all generated in code: jump, landing (softer for small drops, a thump for a hard landing, using the impact speed from the event), task start, task complete (a pleasant chime), combo (pitch climbs with the chain length, capped, so a longer variety chain sounds more exciting) and a low blip when a task is blocked by its cooldown.
- The browser only lets audio start after a key press: create or resume the audio context on the first key press, and never throw or log errors before then or when audio is unavailable.
- Mute toggle on the M key, with a small unobtrusive indicator in the HUD or toast area only while muted (or briefly after toggling). The mute setting survives reloads if storage is available, and fails silently if not.
- Master volume and each effect's pitch, length and loudness live in `config.ts`. Overlapping effects shouldn't clip: cap simultaneous voices.
- Per-effect decisions that depend on game values (pitch from chain length, loudness from impact speed) are plain tested functions.
- The scheduling code is tested against a fake audio context (it creates the expected oscillators and gains, and stops them), and no test needs a browser.
- Nothing in the game logic imports audio; removing the line in `features.ts` removes sound completely.

## Notes
- Marc will listen and tune. Keep the volume modest by default, and make every effect easy to change in one place.

## Progress log
