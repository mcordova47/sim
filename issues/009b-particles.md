---
id: 009b
title: "Polish: particles"
status: done
owner: agent
depends_on: []
---

## Goal
Small particle effects that make walking, doing tasks and the room's moods feel good, in the same restrained tone as the rest of the game. Marc approved the plan below (2026-10-23).

## How this fits in
The game is top-down (issues 019 onward). Events now are `step` and `bump` (no jump or land), `taskStart`, `taskComplete`, `taskCancelled`, `taskBlocked`, `stateChanged`, `room`, dialog open and close (`src/game/events.ts`). Build this feature as its own module (like 009a and 009d did: `src/game/particles/`) that subscribes to those events and registers a layer with `game.addLayer(...)`; add exactly one line to `src/game/features.ts`. Do not edit `game.ts` unless a small read-only getter is unavoidable, and say so in the log. Text drawn by the game uses the built-in pixel font; anything the player reads must stick to the font's characters. Keep it testable without a browser: plain functions and classes, with an injected random function and an injected canvas.

## Acceptance criteria
- **Walking:** a tiny dust puff at the feet on a step, varying by floor (wood and stone puff a little, tile in the bath none), nothing when tired and shuffling (energy below the tired line), and a small bump puff where the player runs into a wall (the `bump` event; the bump is latched, so check it does not spam).
- **Task completion:** a burst of whole-pixel squares from the task's zone when a task completes. Amount and colors grow with the chain length from the award; a long variety chain (3 or more) gets multicolor confetti from the palette; a repeat with diminishing returns gets a smaller, duller burst. Cancelled and blocked tasks produce nothing.
- **Task-specific effects:** steam over the table when you make coffee (and over the mug when it is waiting); bubbles rising from the sink for the dishes; a drifting `z` from the bed when you sleep or nap on the sofa; music notes from the guitar and from the record player while a record plays (a note every second or two, only while it plays); a sparkle at the award popup when the good hour icon shows (use the existing clock-icon moment). Each is data (a table in the module or `config.ts` keyed by task id) so adding one is one line.
- **Low mood:** a small sigh puff over the head when mood drops below the low line, matching the existing "SIGH..." popup (do not duplicate its text).
- Particles live in world space and draw inside the camera transform, as whole-pixel squares (no blur, no smoothing, no sub-pixel shimmer), using only palette colors. Day and night (009d): they are drawn after the lighting tint so sparkles stay visible at night, unless that reads badly; say which in the log.
- A fixed particle budget (for example 200 live): when full, new ones replace the oldest or are skipped. No growth over time and no per-frame garbage that matters.
- Randomness comes from an injected random function so tests are deterministic. The simulation (position, velocity, gravity or drift, lifetime) is plain code with a unit test for each effect and for the budget and expiry.
- Particles pause when the game does (dialogs open, tasks that lock the world) and use game time, like the popups. They never draw over a full-screen view (`view` pictures) or dialogs.
- Amounts, speeds, drift, lifetimes and colors live in `config.ts`.
- A recording-canvas test shows particles draw inside the camera transform and never draw once expired.
- Marc looks at it: render frames of walking, a coffee, the dishes, sleeping, guitar and a long chain, and tell Marc how to see each in the dev build.

## Note from the 018 review
The canvas reset between layers covers the transform, `globalAlpha` and the compositing mode only. A layer that sets `clip`, `shadowBlur`, `filter` or similar and doesn't balance its own `save`/`restore` can leave those set for the layers after it. Balance your own `save`/`restore` (the game also wraps each draw hook in one), and if this feature uses clipping, shadows or filters, say so in the progress log so the reset can be widened.

## Progress log

### 2026-10-23: start
Plan: a self-contained module `src/game/particles/` (pool and simulation, effect builders, the feature layer) subscribing to `step`, `bump`, `taskComplete`, `stateChanged` and `room`, plus reading the running task and a few state values each frame for the continuous effects (steam, bubbles, z, notes). All numbers and the per-task effect table go in `config.ts` (`PARTICLES`). One line in `features.ts`, placed after the time-of-day line so particles draw after the tint. Verify with a temporary headless Chrome harness (deleted afterwards) rendering the real game.

### 2026-10-23: built, ready for review
What changed
- New module `src/game/particles/`: `pool.ts` (fixed pool, simulation, steps-not-smooth fade, whole-pixel drawing), `effects.ts` (pure decisions: step dust by floor and energy, burst plan by chain and repeat, where the clock icon sits in the popup), `feature.ts` (the layer and event wiring), `seeded.ts` (test random), and tests (`pool`, `effects`, `feature`, `config`; 72 new tests).
- `config.ts`: `PARTICLES` (budget, kinds, shapes, step, bump, burst, sparkle, sigh, `taskEmitters` keyed by task id, `ambientEmitters`). Adding an effect to a task is one line in `taskEmitters`.
- `features.ts`: `attachParticles` added after the time-of-day line, and `attachSound(game)` now keeps its result (`const sound = ...`) so the record-playing notes can ask the sound feature whether a record plays and is not muted. So that file changed by two lines, not one (the extra one is the `const sound =`). Particles do not import sound; they get a `musicPlaying` function.
- `render/colors.ts`: one line, `export const paletteColor = pick;`, so data files can name any palette color (COLOR has only ten). Not in the issue's scope list; a one-line export.
- `game.ts` was not touched.

How each criterion was checked
- Walking: dust at the tile just left, wood 2 to 3 specks, stone 1 to 2, tile none, none when energy is below `ENERGY.lowBelow` (unit tests with the real game; seen in headless frames at 3x on wood and stone). Bump puff: once per push (the bump is latched; test holds the key 3 seconds and counts spawns; pushing again after letting go gives a second puff).
- Completion: burst from inside the zone; count and colors grow with the chain; chain 3 or more is palette confetti (9 colors); repeats (`repeatFactor` below 1) are smaller, in mist and taupe, 1 pixel. Cancelled, blocked and start events make nothing (tested). Seen in frames: single task, a repeat, a chain of 3.
- Task effects: steam from the kettle and dripper while making coffee, steam from the carried mug (placed by facing direction) while you are free and the mug waits, and at the mug during the drink pose; bubbles over the sink basin for dishes; z from the pillow when sleeping and from the sofa seat on a nap; notes from the guitar neck during the guitar task and from the record stand while a record plays (every 1 to 2 seconds, only in the room that has the stand, only when a record is on and not muted); a plus-shaped sparkle around the clock icon in the award popup when `timeFactor` is above 1 (the icon's place is worked out from the popup's layout, see `popupIconSpot`). All data in `PARTICLES.taskEmitters` / `ambientEmitters`.
- Low mood: puff of three or four mist squares over the head on the same crossing as the SIGH popup, once (tested: not repeated while low, again after recovering).
- World space, whole pixels, palette only: yes (`config.test.ts` checks every color name is in `art/palette.json`; the recording-canvas test checks integer coordinates and 1 by 1 squares). Day and night: the layer is added after the time of day, so particles are not tinted. At `?hour=23` it reads fine: confetti and the z stay bright; the dust specks are a bit brighter than the dim room around them, which I left as it is (a small glow that suits the sparkle idea). Say if Marc wants it dimmer.
- Budget: 200; when full a new one replaces the oldest (tests with a small pool and 1000 spawns; a 3000-frame run stays far below the budget). Slots are reused: nothing is allocated while playing.
- Random is injected (`random` option, a seeded one in tests). Unit tests for each effect, budget and expiry.
- Pause: while a dialog is open (and `DIALOG.pauseClock`) or something else holds the controls with no task running (the achievements list), neither emitters nor particles move. They use game `dt`. Tested with a real dialog and `lockInput`.
- Never over a full-screen view or a dialog: the feature has only `drawWorld`, and the game draws views and dialogs after the world pass. Looked at: a burst alive while "Admire the art" showed its picture; no particle shows over it.
- Recording-canvas test: particle fills fall between the camera translate and the restore, whole numbers, and there are none after expiry.
- Clip, shadow, filter: none used; `save`/`restore` are the game's own (the layer adds none); the test checks no `clip`.
- `npm test` 1236 pass, `npx tsc --noEmit` and `npm run build` pass.
- Rendered the real game (temporary Vite page and headless Chrome through the DevTools protocol, deleted afterwards) with the real sprites and features, at 1x full frame and 3x or 4x crops: walking (wood, stone, tired, tile, bump), coffee (during and carried mug), dishes, sleeping, nap, guitar, record player notes, sigh, good hour sparkle, a chain of 3 on the bed, the view picture over particles, and the night frames at `?hour=23`.

How Marc can see each in the dev build (`npm run dev` in the worktree)
- Walking: walk around the main room (wood) and the kitchen (stone); the bath (tile) shows none. Walk into a wall and keep holding: one small puff. Tired: let energy fall below 25 (play a while) and the dust stops.
- Coffee (and the good-hour sparkle): the game starts at 8:00, inside coffee's good hours. Stand below the table (row under it, west half) facing up and press E: steam over the kettle and dripper for the 6 seconds; at the end `+105` with the clock icon and plus-shaped sparkles around it. Then walk around with the mug: steam from the mug in your hand until you drink it (press E at the table again: steam at the mug while you drink).
- Dishes: `?room=kitchen`, face the sink counter from the row above it (west of the stove), press E: bubbles over the sink basin.
- Sleeping: `?hour=23`, face the bed from the lane on its west side (first E makes the bed, second E sleeps): a blue z drifts from the pillow. Nap: needs energy below 75 and the sofa's earlier tasks out of the way (see the follow-up below); a white z comes up from the sofa seat.
- Guitar: face the guitar at the west end of the sofa (it hangs by the left wall) and press E: notes leave the neck during the mini-game.
- Records: face the record stand (south of the lamp table, east end of the sofa), press E, pick a record; notes rise from the stand every second or two while it plays, and stop when you pick "Stop the music" or press M to mute.
- Long variety chain: within 25 seconds of each other do three different tasks (for example coffee, water the plant at the bookshelf, make the bed): the third gives a multicolor spray over the task's object and the popup says COMBO X2.0.
- Repeat: do the same quick task twice within 90 seconds (water the plant): the second burst is smaller and grey, with REPEAT X0.50.
- Sigh: let mood fall below 25 (doomscrolling repeatedly): a few grey puffs by the head with the SIGH popup.
- Night check: add `?hour=23` to the address (`?hour=23&room=bath` also works).

Not checked
- How it feels at 1x in a live browser over a play session (frames only; at 1x the particles are very small, which is the intent but Marc should judge).
- Whether the nap and sleep are easy to reach: at the sofa the first startable task wins (doomscroll, then contemplate, then work, then nap), so a nap needs those on cooldown. That is existing behavior (issue 039 is about it). The headless run disabled the others to get to the nap.
- Sound: notes depend on the sound feature's saved record (`life.sound.v1` in localStorage), which headless Chrome starts empty, so I set one through the page. Not run with a real audio device.

Open items for the planner
- `features.ts` has two changed lines instead of one, and `render/colors.ts` one added line (both explained above).
- Possible follow-up: a slumped walk for low mood is still not done (the issue said not to).

### 2026-10-23: review (independent)
Verdict: approve.

Checks I ran myself (not the author's tests): `npm test` 1236 pass, `npx tsc --noEmit` clean, `npm run build` ok. A throwaway vitest file (deleted) that completes every interactable in every room with chains 1 to 6, repeats and good hours (no throw, never above the 200 budget); 20 s of holding into a wall (one bump puff of 4) and tapping; a dialog opened over a live burst (ages and positions frozen); mug steam then a room change (pool cleared); mood crossing down, staying low, recovering and crossing again; 100 updates of dt = 5 s (stays within budget); a full pool drawn through a recording proxy (every fillRect integer, only fillRect used, alpha back to 1, no clip/shadow/filter, no save/restore of its own). Emitter anchors checked per room: kitchen and bath return null for the record stand (no notes there), and every task emitter resolves in its own room. A temporary Vite page plus headless Chrome through the DevTools protocol (deleted) rendered the real game with all features, with fresh progress each run, at 1x full frame and 4x/6x crops, day and `?hour=23`.

Criteria
- Walking: pass. Wood dust and stone dust seen; bath none (tests); tired (energy 10) leaves zero particles; bump puff is one burst per hold, a second after letting go.
- Task completion: pass. Single burst, chain of 3 (coffee, water-plant, make-bed) gives multicolor squares plus COMBO X2.0; repeat is a smaller grey burst (unit tests and burstPlan); cancelled and blocked make nothing.
- Task effects: pass. Seen: steam at the kettle and dripper, carried mug steam (facing down and left), bubbles at the sink, blue z from the bed pillow at night, white z from the sofa on a nap (others disabled in the harness to reach it), notes from the guitar neck, a note from the record stand with a record selected, plus-shaped sparkles around the clock in the popup. The drink pose steam sat behind the progress banner in my frame, so only unit-tested. Table-driven in `PARTICLES.taskEmitters` / `ambientEmitters`.
- Low mood: pass. Mist puff beside the head with the SIGH popup, once per crossing.
- World space, whole pixels, palette: pass. Drawn in drawWorld after the time-of-day layer (so not tinted); at `?hour=23` dust, z, and confetti read fine and stay bright. Popups, HUD, views and dialogs are drawn by game.ts after the world pass, so particles cannot cover them.
- Budget: pass. 200, oldest replaced, slots reused. Nit (not blocking): `emitAll` builds a `Set` and a key array each frame, a few tiny allocations per update; not meaningful.
- Injected random and unit tests: pass.
- Pause: pass. Dialog open (pauseClock true) freezes particles and emitters; locked-controls-without-a-task pauses too; tasks running carry on (like popups).
- Config: pass. Numbers and colors in `PARTICLES`.
- Recording-canvas test: pass (exists, and my own proxy check agrees).
- Marc looks at it: frames rendered; Marc's own look at 1x is still his to do. The how-to-see list in the log is accurate for what I reproduced.
- Canvas balance note: pass. No clip, shadow, filter, or own save/restore.

Scope: `game.ts` untouched. Changes limited to `src/game/particles/`, `config.ts` additions, `features.ts`, `render/colors.ts`, and this issue file. features.ts is two changed lines (the extra is `const sound =` so the layer can ask whether a record plays) and colors.ts one added export line (`paletteColor`). Both are small and sensibly justified; acceptable, though the planner should know the "one line in features.ts" wording was stretched. No reference-photos content in the repo.

Could not verify: feel in a live browser over a session (frames only; particles are very small at 1x, as intended); real audio for the record player (I only checked the notes spawn with a track set in `life.sound.v1`, no audio device); reaching the nap at the sofa in normal play (needed doomscroll, contemplate, work and art removed; existing behaviour, issue 039).
Note for whoever drives the dev build: progress persists in `life.progress.v1`, so a low mood or energy left from an earlier session changes which effects you see.
