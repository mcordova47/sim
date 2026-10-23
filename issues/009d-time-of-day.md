---
id: 009d
title: "Polish: time of day"
status: done
owner: agent
depends_on: []
---

## Goal
Give the apartment a sense of time: lighting that changes through the day, a clock, and tasks that pay better at the right hour (coffee in the morning, cooking in the evening). Marc approved the day and night cycle.

## How this fits in
Issue 017 added `game.events` (typed events for jump, land, task start, task complete and task blocked) and `game.addLayer(...)` for extra update and drawing hooks. Build this feature as its own module that subscribes to those events and, if it draws, registers a layer. Add exactly one line to `src/game/features.ts` to switch it on. Do not edit `game.ts` unless the issue says so, and keep every colour from `render/colors.ts` and every number you may want to tune in `config.ts`. Other agents are building the other three polish features at the same time, so stay inside your own module.

Text drawn by the game uses the built-in pixel font (A-Z, 0-9 and `+ - * . , : ! ? ' ( ) / %`, uppercase). Anything the player reads must stick to those characters.

Keep it all testable without a browser: put the logic in plain functions and classes, and inject anything that touches the browser (audio, storage, a canvas) so tests can fake it.

## Acceptance criteria
- A game clock that advances with game time (not wall time), so it pauses with the game. How fast a day passes, and the start time, live in `config.ts`. One full day is about a few minutes by default.
- Lighting that changes with the hour: a tint over the world (and a softer one over the HUD, or none) that moves through night, dawn, day and dusk, using only palette colours with alpha. It is drawn as a layer inside the camera transform, after the world. The window sprites make a nice place for extra light, but that is optional.
- A small clock readout in the HUD area that never overlaps the score and combo panel, in the pixel font.
- Task bonuses: tasks gain an optional list of good hours in the data (`src/game/tasks.ts`), and finishing one at a good hour multiplies its points by a configured amount. Add sensible hours to the real tasks (for example make the bed and coffee in the morning, cooking and dinner in the evening, a shower in the morning or evening). The prompt for a task shows a short hint when it is a good time. The change to scoring is small and goes through one clear hook (for example a points modifier on the scoreboard or interaction system); that hook is the one place this issue may touch `scoring.ts` or `interaction.ts`, with tests, and everything else stays in its own module.
- The award popup says when the time bonus applied, with text the font can draw.
- Tests (no browser): the clock wraps correctly and pauses with the game, the tint for each hour is a valid palette colour with an alpha in range and changes smoothly across the day, the bonus applies only inside its hours (including windows that wrap past midnight), and the hint appears only at good hours.

## Notes
- Be careful that lighting never makes the game hard to read. Night should be moody but the prompts, HUD and furniture must stay legible.
- Marc wants this in the game (decided 2026-10-22).

## Note from the 021 review
The clock now lives in the apartment state (issue 021: `CLOCK` in `config.ts`, the `clock` variable, `formatClock`). Build the lighting on that clock, not on a new one. Its `stateChanged` event fires when the rounded value changes (about 25 times a day, with an extra one at midnight), so do not rely on it for exact hours; issue 027 decides what this feature can rely on. Read the exact time each frame if you need a smooth tint.

## Note from the 018 review
The canvas reset between layers covers the transform, `globalAlpha` and the compositing mode only. A layer that sets `clip`, `shadowBlur`, `filter` or similar and doesn't balance its own `save`/`restore` can leave those set for the layers after it. Balance your own `save`/`restore` (the game also wraps each draw hook in one), and if this feature uses clipping, shadows or filters, say so in the progress log so the reset can be widened.

## Current state of the game (2026-10-23, replaces the old "blocked" note)
The game is top-down and the clock already exists (apartment state, `clock`, formatted in a HUD clock panel; `CLOCK` in `config.ts`). Changes since this issue was written:
- Events: `step` and `bump` replace `jump` and `land`. The `stateChanged` event for `clock` fires once per whole in-game hour (floor), and a multi-hour jump (sleep adds 7) gives one event; for smooth lighting read `game.state.get("clock")` every frame instead of listening. See `docs/state.md`.
- The clock is saved with the rest of the apartment state (009c), so a reload resumes the same hour.
- Lighting: a layer drawn inside the camera transform after the world and before the HUD, with a softer or no tint over dialogs, activity views and the HUD. Every full-screen view (`view` picture from issue 040, dialogs) must stay legible. Use only palette colors with alpha; no sudden jumps at midnight (the clock wraps).
- Light comes from windows: if it is easy, let the blinds (state `blinds`, issue 035) change how much daylight reaches the room, and add a faint lamp glow at night near the lamp table and the desk; keep these optional extras small and listed in the log.
- The tint must not hide sprites the way a flat overlay would: check the room at every hour at 1x, in all three rooms (kitchen and bath have no windows in the map; decide whether they follow the outside hour).
- Task bonus hours (good hours per task) must use the existing `pointsBonus` and award popup code paths; add hours to the real tasks, including the new ones (nap, coffee and drink-coffee in the morning, mirror, etc.) with sensible values. `mood` (038) is a separate nudge; do not change it here.
- Marc finds some text too jokey (issue 037); keep the popup wording plain.

## Progress log

### 2026-10-23 start
Plan: a `time-of-day` module (hours, tint, layer + dev shortcuts), one line in `features.ts`, `goodHours` on tasks, a `timeFactor` through the scoreboard (same path as the mini-game quality factor), a hint in the prompt and a line in the award popup.

### 2026-10-23 done, ready for review
What changed
- `src/game/time-of-day/hours.ts`: `HourWindow` (from, to; `to` before `from` wraps past midnight), `inWindow`, `inAnyWindow`, `windowProblem`.
- `src/game/time-of-day/tint.ts`: `lightAt(hour)` blends keyframes from `TIME_OF_DAY.tint` in `config.ts` (night, dawn, day, dusk, back to night; first and last key match, so no jump at midnight). Between keys of different colours one palette colour fades out as the next fades in, so only palette colours are ever drawn. `roomWashes` scales it per room and adds the blinds dimming.
- `src/game/time-of-day/feature.ts`: a layer with `drawWorld` only (inside the camera transform, after the world and player, before the prompts, popups, HUD, dialogs, activity pictures and `view` pictures, so none of those are tinted). It reads `game.state.get("clock")` every frame. Plus a faint butter glow (three rings) at night around the lamp table and the desk in the main room. Uses no clip, shadow or filter; draws with plain `fillRect` and `arc`, no save/restore of its own needed.
- `config.ts`: `TIME_OF_DAY` (bonus multiplier 1.5, tint keys, per-room light, blinds dimming, glows) and `TIME_DEV`.
- Task bonus: `Interactable.goodHours`, data in `tasks.ts` (`GOOD_HOURS`, every real task that has a sensible hour, including nap, coffee, drink-coffee, the mirror lines, sleep, contemplate). `InteractionSystem.isGoodTime` and `finish` pass `timeFactor` to `Scoreboard.complete` (new optional 4th argument, `Award.timeFactor`). The hour is read before the task's effects, so sleep and nap, which move the clock, are judged by when they ended. `pointsBonus` is untouched and still adds first.
- Prompt hint: `GOOD HOUR` in green after the verb (`world-ui.ts`, new last argument to `drawPrompt` and `promptSize`). Not shown while the task is on cooldown or blocked. Award popup gets a line `GOOD HOUR X1.5`.
- Decisions: the existing HUD clock panel (issue 021) already is the clock readout and is not changed; no tint over the HUD at all. The kitchen has a window so it gets 85% of the light; the bath has none so it gets 50% (it follows the outside hour but softly). Closed blinds (state `blinds`) take 10% of the light away in the main room by day (the blinds start closed, so noon in the main room is a touch dimmer until they are opened); lamps glow only in the main room. Day length stays what issue 021 set (`CLOCK.minutesPerSecond: 2`, 12 minutes a day), not changed here.
- Dev only: `import.meta.env.DEV` turns on `?hour=19.5`, `?room=kitchen` and the `[` / `]` keys (back and forward one hour; ignored while a task, dialog or lock has the keyboard). None of it exists in a built game.

Files outside the module (small, needed): `game.ts` (a `currentLevel` getter, the `GOOD HOUR` popup line, passing the hint flag to `drawPrompt`), `interaction.ts`, `scoring.ts`, `interactable.ts`, `tasks.ts`, `render/world-ui.ts`, `config.ts`, `features.ts` (one line), and one fixture in `achievements/feature.test.ts` that builds an `Award` by hand (needed the new field).

Verified
- `npx tsc --noEmit`, `npm run build`, `npm test` (1010 tests, 30 of them new in `time-of-day/time-of-day.test.ts`: clock wraps and pauses with a dialog, tint colour is a palette colour with alpha in range for every hour, stays moderate, changes by under 5 shades per 3 minutes of game time, matches across midnight, bonus only inside hours including windows that wrap, popup line, hint only at good hours, every real task window valid, prompt widths fit the screen, layer draws in the world pass, dev shortcuts are off unless dev).
- Looked at rendered frames (headless Chrome against the dev server, 2x scale) of main room, kitchen and bath at 6:30, 12:00, 19:30 and 23:00. Night is moody but furniture, prompt, HUD and the lamp prompt stay legible; dawn is cool, dusk warm; the bath is dimmer but readable. Also looked at the prompt hint (temporarily forced on the sofa task, then removed).

Not checked
- How it feels at 1x in a real browser window over a long play (headless frames only, at 2x).
- Smooth fading seen live, and the `[` `]` keys in a real keyboard session (tested with fakes).
- Popup text looked at on screen (tested through the popup call, not seen).
- Window light (optional) was not added.

### 2026-10-23 review (independent)
Verdict: approve.

Checks run: `npx tsc --noEmit` clean; `npm run build` ok; `npm test` 1010 passed. Wrote a throwaway edge-case test file (deleted afterwards, not committed) and looked at headless Chrome frames (640x400) of main, kitchen and bath at 3:00, 6:30, 12:00, 19:30 and 23:00.

Criteria
- Game clock advances with game time, config-driven, pauses: pass. Clock is the existing `clock` var (wrap, 0 to 24) and ticks only in `state.tick`, which a dialog stops (unless `DIALOG.pauseClock` is off).
- Tint layer, palette colours with alpha, inside camera transform after the world: pass. `drawWorld` only, so prompts, popups, HUD, dialogs, activity and `view` pictures are untinted. Hours -1, 24, 24.0001, 48, +-1e9 all give valid palette colours and alpha 0 to 1; `lightAt(0)` equals `lightAt(24)` (no midnight jump). Largest per-minute change of the composited colour over a grey is 0.58 of a shade (at 19:30), so it fades smoothly. Drawing the layer on a recording canvas for five hours in the kitchen only calls `fillRect` (no clip, shadow or filter), `globalAlpha` stays 1.
- Clock readout not overlapping score and combo: pass (existing 021 HUD panel, seen at the right of every frame, clear of score and combo).
- Task bonuses through one hook: pass. `goodHours` data on tasks, `timeFactor` through `Scoreboard.complete`, `pointsBonus` untouched. Coffee is good at 10.99 and not at 11; sleep is good at 23 and 3.9, not at 4 or 16 (the hour is read before the +7). Real task windows are valid per the author's test.
- Prompt hint only at good hours: pass in code (not shown on cooldown or blocked). Not seen on screen in my frames; unverified visually.
- Award popup says the bonus: pass in code (`GOOD HOUR X1.5`, font-legal characters per the author's test); not seen on screen.
- Tests: pass (30 new): wrap, pause, palette and alpha, smoothness, wrapping windows, hint.

Beyond the criteria
- Legibility: pass. Night frames in all three rooms keep furniture, the player, the prompt and the HUD readable. Bath at night is dim but fine. The lamp glow at 3:00 is visible and faint.
- Dev shortcuts: pass. With `dev: false` the feature ignores `?hour` and `?room` and registers no key listener; the real wiring gates on `import.meta.env.DEV`. Odd inputs (`?hour=30` gives 6, `-5` gives 19; `abc`, empty and `Infinity` ignored; `?room=__proto__` or `constructor` logs a caught error and stays put) are harmless.
- Scope: files touched match the log. `game.ts` was edited (currentLevel getter, popup line, hint flag), which the popup path needs. PLAN.md untouched. Nothing from reference-photos.
- No clip, shadow or filter used, as the author said.

Minor notes (not blocking)
- The hint is judged when the prompt shows, the bonus when the task finishes, and tasks take game time (2 game minutes per second). Starting a task just before a window edge can show GOOD HOUR and then pay no bonus, or the reverse.
- The `tasks.ts` comment says the mirror windows "match MIRROR", but mirror-morning is 6 to 10 (MIRROR morning is 5 to 12) and mirror-night is 21 to 24 (MIRROR night runs to 5). Narrower bonus windows are fine; only the comment is off. `mirror-day` has no good hours.
- The log says sleep and nap are judged "by when they ended"; they are judged by the hour just before their effects run (end of the task's own duration, before the +7 or nap jump). Sensible behaviour.
- The optional window light was not added (the issue allowed this).

Unverified (not passed)
- Feel at 1x in a real browser over a long play.
- Live smoothness of the fade (only step size and stills checked).
- The `[` and `]` keys with a real keyboard (only fakes).
- The prompt hint and the award popup line rendered on screen.
