---
id: 009a
title: "Polish: sound effects"
status: todo
owner: agent
depends_on: []
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

## Current state of the game (2026-10-23, replaces the old "blocked" note)
The game is top-down (issues 019 onward). Events now are `step` and `bump` (no jump or land), `taskStart`, `taskComplete`, `taskCancelled`, `taskBlocked`, `stateChanged`, `room`, dialog open and close; see `src/game/events.ts` and `features.ts` (one line per feature, as 009c and 009d did). Sound effects: footsteps (soft, varied by floor: wood, stone in the kitchen, tile in the bath; quieter when tired), bump, task start and complete, cancelled, blocked, doors and room changes, dialog text blips (typewriter), achievement toast, the typing and notes mini-games (each key press), good-hour awards. Everything synthesized with Web Audio, no files. Browsers block audio until the first key press, so start it after input and fail quietly if audio is unavailable or blocked. A mute key (not Tab, Escape, E, X, L or the arrows; say which) and the saved on/off choice go in the 009c save (add a `sound` field, tolerant of old saves).

## Marc's decisions (2026-10-23)
- **Music lifts mood:** while a record plays, mood (038) gets a small lift over time (for example +1 every in-game 10 minutes up to a cap), and choosing a record is a real action like playing guitar (it pays points and a small mood bump at the start). Put the numbers in `config.ts`.
- **The record player controls the soundtrack** (see the note below). Marc will write tracks himself; build the player and the format, with two or three starter tracks of your own so it works, clearly marked as placeholders for Marc's.
- Sound effects stay quiet and plain: Marc finds some jokey text too much, and this applies to tone in sound too (no gag sounds).

## Progress log

## Note from Marc (2026-10-23)
Listening to music could play 8-bit music, and Marc may design the tracks himself. When this issue is picked up, plan for a small music player (a song list, play and stop tied to the record and guitar tasks and maybe an ambient track) and a format Marc can write by hand (for example a text score of notes and lengths, or a tiny tracker file) that the game plays with Web Audio.

## Note from Marc (2026-10-23): the record player controls the soundtrack
The music is controlled through the record player in the game. Design to settle when this is picked up (ask Marc):
- Interacting with the record player (`record-play`, today "Flip the record") changes what is playing: it cycles to the next record, or offers stop. Show what is playing in the prompt or a small now-playing line (one line at the 320x192 view); a record sprite on the player could change with the track.
- Playing music affects mood (038) while it plays, or only the choice of track does; the volume or an on/off switch lives on the record player too, so there is no separate settings screen.
- Tracks are Marc's own 8-bit pieces in a text format he can write by hand; the track list is data (title, a short note for the now-playing line). Default is silence or a first track; remember the choice in saved progress (009c adds a save store; add a `music` field).
- Browsers block audio until the first key press; start sound only after input, and fail quietly if audio is unavailable.
