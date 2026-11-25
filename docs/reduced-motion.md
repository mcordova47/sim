# Reduced motion: every animation in the game (issue 162)

The browser (and the operating system under it) has a "reduce motion" setting. It is an accessibility request: large, fast, whole-screen, spinning, zooming or flashing motion can cause dizziness, nausea and migraines. It does not mean "no animation": small, slow, local motion and motion the player causes are generally fine. This document lists every moving thing in the game, measures what could be measured, and says which should change when the setting is on.

## Summary

**Today.** The setting is read in one place, `src/game/reduced-motion.ts` (`matchMedia("(prefers-reduced-motion: reduce)")`), passed from `src/main.ts` into `Game` (`reducedMotion` option, issue 080) and from there to the ad encounter only. It is read each time an encounter starts (`EncounterActivity.start`), so switching the setting mid-game takes effect on the next ad. Nothing else in the game looks at it.

**Worth changing: one thing.**

1. **The candle's flicker** (`flickerAt` in `src/game/decor-data.ts`, drawn by `src/game/time-of-day/feature.ts`). It is the only brightness change that runs by itself, for as long as you stay in the main room at night. Measured below: it is *not* a flash by the usual definition (its largest brightness swing is about 0.03 of the 0 to 1 scale, the definition needs 0.10) and covers about 2% of the picture. But it never stops, it changes 12 times a second, and it is exactly the kind of looping, attention-pulling motion the setting exists for. Recommended calmer version: a steady glow at its average strength. Cost: about five lines and one test (draft 162b below).

**Already fine (or fine to leave).** Everything else is one of: small (a few pixels), slow, short and ending by itself (under about 1.6 s), or caused by the player's own key press. The ad encounter entrance is the only strong motion in the game (a one-pixel shake, two full-screen white flashes, bars across the whole picture) and issue 080 already replaces it with a plain fade under the setting. Details and a few judgement calls (the art close-up zoom, the phone camera scroll, the waking light ramp) are in the table and the decisions.

**What this audit could not do.** It did not run the game in a browser or measure real pixels. All brightness numbers are computed from the palette and the code's own formulas (see "How it was measured"). See "Unverified".

## How it was measured

- **Where the numbers come from.** Speeds, sizes and times are read from `src/game/config.ts` and the code that uses them. The game steps at 60 a second (`TIMESTEP`); the picture is 320 x 192 game pixels on desktop (`DESKTOP_VIEW`, 61,440 px) and 224 x 208 on a phone (`NARROW_VIEW`, 46,592 px). One game hour is 30 seconds of play (`CLOCK.minutesPerSecond` is 2).
- **Brightness.** "Relative luminance" here is the WCAG one (0 black to 1 white, from the palette's hex colours in `art/palette.json`). The test used for flashing is WCAG 2.2, success criterion 2.3.1 (Three Flashes or Below Threshold), which I read at its W3C "Understanding" page on 2026-11-24: a *general flash* is a pair of opposing changes in relative luminance of 10% or more of the maximum (that is 0.10 on the 0 to 1 scale) where the darker image is below 0.80; no more than three flashes in any one second; and it does not apply when the flashing area is under 25% of any 10 degree field of view (the page gives 341 x 256 CSS pixels, 87,296 px, at a 1024 x 768 screen, about 11% of that screen). The related criterion 2.2.2 (Pause, Stop, Hide) asks that moving or blinking content that starts by itself and lasts over five seconds can be stopped, unless essential; the candle is the one thing in the game that fits that.
- **The candle** was measured by running the game's own `flickerAt` (imported, not copied) for 10 minutes of play at 60 samples a second, outside the repo, and then by computing the pixel colour the glow draws over night-washed floor colours with the same formulas the code uses (night wash alpha 0.46, then three butter rings of alpha `glow.alpha x lamps x 0.5`, stacked at the centre).

## Candle flicker, measured

Config: `lamp-candle` has `glow: { radius: 20, alpha: 0.18, flicker: { alpha: 0.2, radius: 0.08, seed: 11 } }` (decor-data.ts). It only shows when the lamps are on (`lamps > 0.01`, evening and night, main room) and only while that item is placed.

| Measure | Result |
|---|---|
| Update rate | The wander is read in steps of 1/12 s: 12 changes a second (measured 11.998 per second). |
| Glow strength multiplier | 0.81 to 1.18 (the setting allows 0.8 to 1.2). Largest single step 0.165. |
| Glow radius multiplier | 0.92 to 1.08, so 18.4 to 21.6 px. Largest step 0.056 (about 1 px). |
| Reversals of direction | 5.1 a second on average, so about 2.5 up-and-down cycles a second. In the worst one-second window it crossed its average 6 times: 3 cycles. That is exactly at the "three a second" line, but see the next row. |
| Strongest brightness change | Computed on the palette floor colours under night wash: the centre pixel's relative luminance moves by 0.024 to 0.033 across the whole range (0.031 on walnut, 0.033 on oak and tan, 0.024 on paper), and by at most 0.015 in one 1/12 s step. WCAG needs 0.10. So **it never counts as a flash**, by a factor of about three. Relative to the pixel's own brightness it is larger on very dark floor: from 0.084 to 0.115 on walnut, a 37% swing, which is why it reads as a flicker at all. |
| Area | A circle of radius 18.4 to 21.6 px: 1,064 to 1,465 px, 1.7% to 2.4% of the desktop picture and 2.3% to 3.1% of the phone picture. The brightness change is strongest at the centre; the three rings step down toward the edge, so less of it is at the full change. Far below the 25% of a 10 degree field the standard uses. |
| Stops? | It follows game time (`deliveries.hours`), so it stands still while the clock is held (sleep sequence, the track editor) and moves otherwise, without end. |

Verdict: safe by the flash numbers, but a never-ending local flicker. Recommend a steady glow.

## Other brightness changes measured

| What | Change | Rate | Flash? |
|---|---|---|---|
| Time-of-day tint (`TIME_OF_DAY.tint`) | Over the whole picture; the biggest stretch is 4.5 to 9.5 (night to day), 150 s of play. On a tan floor that is 0.119 to 0.268. | About 0.001 a second | No: far too slow. |
| Waking from a full sleep (`SLEEP.sleep`: wake 2 s) | Whole picture. The extra night wash (0.38) lifts and the hour's light blends to the wake hour (06:30 to 09:00). Floor tan: 0.075 asleep to about 0.12 at the 22:00 look; bright surfaces (paper) 0.16 up to 0.31 and further as the morning light comes up. | Up to about 0.2 to 0.4 a second on the brightest surfaces, once, in one direction, over 2 s (nap: 1.5 s) | No: one smooth ramp, not a pair of opposing changes. Falling asleep is the same in reverse over 2 s. |
| After Escape in the sleep scene (`escapeRestore` 0.4 s) | The wash goes back in 0.4 s: paper 0.16 to 0.31 | About 0.4 a second, once | No (one way, once). The quickest brightness *ramp* in normal play (the blinds are a step, below). |
| Blinds closed (`blindsClosedDim` 0.1) | An instant 10% night wash in the main room by day: on a paper surface 0.88 to 0.73 (about 0.15), on a tan floor 0.27 to 0.23 (about 0.04) | A single step, player-caused | One change, not a pair, so not a flash by the rule; but on bright surfaces the step is over 0.10 over the whole room, and closing then opening the blinds quickly would make a pair (the player's own two key presses). The quickest change in the game that is not an ad. |
| Track editor playhead | A paper stripe at alpha 0.22 over one 16 x 96 px column (2.5% of the picture) hops one column every step, `60 / tempo x 0.5` s: 0.5 s at 60 bpm down to 0.167 s at 180 bpm (2 to 6 a second). Brightness change over the editor's dark cells: ink 0.058, night 0.072, slate 0.084. | Up to 6 hops a second at 180 bpm | Not by definition: 0.058 to 0.084 is under 0.10, and the area is small. It is the one place that reaches "6 a second", so it is the second one to watch. |
| Ad encounter entrance (without reduced motion) | Two white (`paper`, 0.88) full-screen flashes of 3 frames each (frames 6 to 8 and 12 to 14: 0.1 s and 0.2 s in), a one-pixel shake for 16 frames, then eight bars (ink 0.012) slide in over 16 frames and out over 16 (48 frames, 0.8 s). The darker image is well under 0.80 and the change is far over 0.10 on the whole screen. | Counting up-down pairs: two white flashes and one dark-and-back (the bars), about three in 0.8 s | **At the limit of three a second, over the whole screen.** It passes the rule only just. Issue 080 already removes all of it under the setting. |
| Ad encounter exit (without reduced motion) | The bars cover in 6 frames and part in 6: a dark-and-back in 0.2 s | One pair | Under the limit. Replaced by an 8 frame fade under the setting. |

## The table

Columns: where it is; speed; size (game pixels; the picture is 320 x 192); loops or ends; whether the player causes it; flash; recommendation. "Instant" means it just changes with no animation. Sound is not motion and is not listed (the encounter music is switched off under the setting already, `docs/encounter-music-design.md`).

### The player and the world

| # | What | Where | Speed | Size | Loops / ends | Player causes | Flash | Recommendation |
|---|---|---|---|---|---|---|---|---|
| 1 | Walking: the player moves a tile | `player.ts`, `WALK.stepTime` | 16 px in 0.16 s, 100 px/s | 16 x 16 tile | Ends at the next tile | Yes | No | Leave: the player's own movement. |
| 2 | Walk frames (foot swap) | `render/player-sprite.ts`, `playerFrame` | One of two frames per step: swaps every 0.16 s (6.25 a second) while a key is held | Player sprite, about 16 x 20 | While walking | Yes | No (a sprite swap) | Leave. |
| 3 | Turning on the spot | `WALK.turnTime` 0.08 s | Instant sprite change | Player | Ends | Yes | No | Leave. |
| 4 | Camera follow (phone view only: the 19-tile main room is 304 px wide, the phone picture 224 px; the desktop picture fits every room) | `render/camera.ts`, `CAMERA.followSpeed` 6 a second (smoothing) | At most the player's pace, around 100 px/s while crossing the room, easing out | The whole picture scrolls | Ends when the player stops | Yes | No | Leave, but see decision d3: a whole-picture scroll is the classic vestibular trigger, though this one is slow, smooth and only as fast as the player walks. |
| 5 | Walk dust puffs | `PARTICLES.step` (`dustWood`, `dustStone`) | 2 to 3 puffs per step on wood (1 to 2 on stone), speeds up to 16 px/s, life 0.25 to 0.42 s | 2 x 2 px each | Ends in under half a second | Yes | No | Leave. |
| 6 | Bump puff against a wall | `PARTICLES.bump` | 3 to 4 dots, life 0.2 to 0.35 s | 1 px dots | Ends | Yes | No | Leave. |
| 7 | Poses (sitting, sleeping, playing, drinking, and so on) | `poses.ts`, `game.ts` pose drawing | Instant swap of a sprite when a task starts | Up to the piece's size | Held until the task ends | Yes | No | Leave. No pose has frames; all are still pictures. |
| 8 | The sleeper's breath | `SLEEP.*.breathPeriod`, `SLEEP_BREATH`, `game.ts` | One whole pixel up and down: every 3 s asleep (nap 2.4 s), 0.33 Hz | A band of 33 x 7 px on the bed (or the whole pose picture on the sofa), 1 px | Only while asleep (5 s; nap 2.5 s) | Yes | No | Leave: 1 px, slow, short. |
| 9 | Sleep banner fade | `SLEEP.*.bannerFade` 1 s | Opacity fade | A text label | Ends | Yes | No | Leave. |
| 10 | The player's carried mug and held items | `poses.ts` `held-*` | Instant | 16 px | Until put down | Yes | No | Leave. |

### Light

| # | What | Where | Speed | Size | Loops / ends | Player causes | Flash | Recommendation |
|---|---|---|---|---|---|---|---|---|
| 11 | **Candle glow flicker** | `decor-data.ts` `flickerAt`; `time-of-day/feature.ts` `drawWorld` | 12 changes a second; 2.5 up-down cycles a second on average (3 at worst) | A circle, radius 18 to 22 px: 1.7% to 2.4% of the picture | Loops forever at night while in the main room | No (the candle was a gift; the flicker runs by itself) | Not by the WCAG number (0.03 of the 0.10 needed), see above | **Done (162b): steady under reduced motion** (glow at its average, multipliers 1 and 1). The setting is held from a `MediaQueryList` change listener (`liveReducedMotion`), so it takes effect without a reload. Candle is the only item with `flicker`. |
| 12 | Desk glow at night | `TIME_OF_DAY.glows` (`desk`, radius 28, alpha 0.1) | None: steady, fades with the hour | 28 px radius | Follows the hour | No | No | Leave: it does not move. |
| 13 | Time-of-day tint over the world | `time-of-day/tint.ts`, `TIME_OF_DAY.tint` | Moves smoothly with the game clock: the biggest stretch is 150 s long | Whole picture | Follows the clock, forever | No (it follows the clock) | No: about 0.001 of luminance a second | Leave. |
| 14 | Lamps coming on (the glow strength follows `lamps`) | same | Same pace as row 13 | The glow circles | Follows the clock | No | No | Leave. |
| 15 | Fall asleep and wake light ramp | `time-of-day/feature.ts`, `tint.ts` `sleepLight`, `SLEEP.*` | 2 s (nap 1 s down, 1.5 s up), once each; Escape restores in 0.4 s | Whole picture | Ends | Yes (the player chose to sleep) | No: one smooth direction, not a pair (about 0.2 to 0.4 a second on bright surfaces) | Leave (decision d3 asks whether the waking ramp should lengthen). |
| 16 | Blinds open and closed | `roomWashes`, `blindsClosedDim` | Instant 10% wash change | The main room | A step | Yes | One change of about 0.15 on bright surfaces (0.04 on the floor), not a pair | Leave: one step the player chose, instant, no motion. |

### Particles, popups and feedback

| # | What | Where | Speed | Size | Loops / ends | Player causes | Flash | Recommendation |
|---|---|---|---|---|---|---|---|---|
| 17 | Steam over the kettle and dripper while making coffee | `PARTICLES.taskEmitters.coffee` | One puff each 0.16 to 0.3 s and 0.4 to 0.7 s; rises 8 to 14 px/s, sways 1.6 px at 1.4 Hz, life 0.9 to 1.4 s | 2 x 2 px | While the task runs (a few seconds) | Yes | No | Leave. |
| 18 | Steam from the mug (drinking, and carried) | `drink-coffee`; `ambientEmitters` with `mug` | A puff each 0.2 to 0.35 s (carried: 0.35 to 0.6 s); same drift | 2 x 2 px | While drinking, or while the mug is carried (can last minutes) | Yes | No | Leave: tiny and slow. If the carried mug is judged too busy, thin it with 162b; not recommended now. |
| 19 | Dish bubbles | `taskEmitters.dishes` | A puff each 0.2 to 0.4 s; rises 9 to 16 px/s, sways 1.5 px at 1.1 Hz | 2 x 2 px | While the task runs | Yes | No | Leave. |
| 20 | Sleeping Zs | `taskEmitters.sleep`, `nap` | One each 1.2 to 2.2 s; rises 6 to 9 px/s, sways 1.5 px at 0.7 Hz, life 1.8 to 2.4 s | 3 x 5 px | Only while asleep | Yes | No | Leave. |
| 21 | Guitar and record notes | `taskEmitters.guitar`; `ambientEmitters` with `music` | Guitar: one each 0.6 to 1.1 s; record: one each 1 to 2 s, for as long as a record plays; rises 8 to 12 px/s, sways 1.8 px at 0.9 Hz | 5 x 6 px | While playing (a record can play for minutes) | Yes | No | Leave. |
| 22 | Task complete burst (confetti) | `PARTICLES.burst` | 8 dots, plus 4 per link in a chain, up to 40; speeds up to about 90 px/s with gravity 170; life 0.7 to 1.1 s | 2 x 2 px each, 160 px in all at most (0.26% of the picture) | Ends in 1.1 s | Yes | No | Leave. |
| 23 | Good hour sparkle | `PARTICLES.sparkle` | 4 to 5 sparkles; life 0.5 to 0.8 s | 3 x 3 px | Ends | Yes | No (small, butter on dark: each is a few pixels) | Leave. |
| 24 | Mood sigh | `PARTICLES.sigh` | 3 to 4 dots, life 0.8 to 1.1 s | 2 x 2 px | Ends | Indirectly | No | Leave. |
| 25 | Plant grows: leaf glints | `PARTICLES.plantGrow` | 7 to 9 dots, life 0.8 to 1.3 s | 2 x 2 px | Ends | Yes (watering) | No | Leave. |
| 26 | Popups: the +points, combo, repeat, quality lines | `render/popups.ts`: `LIFETIME` 1.6 s, `RISE` 18 px (ease out), `FADE_TIME` 0.4 s | Rises 18 px over 1.6 s | A few text lines, about 50 x 30 px | Ends in 1.6 s | Yes | No | Leave. |
| 27 | Achievement toast | `achievements/toasts.ts`, `ACHIEVEMENTS_UI` (`toastSeconds` 4, `toastSlide` 0.35, `slideDistance` 24) | Slides 24 px in over 0.35 s and out the same, with a fade; shows 4 s | 150 px wide box, about 40 tall | Ends; up to two at once | No (it comes when earned) | No | Leave: small, local, and ends. A fade without the slide is possible if wanted; no need. |
| 28 | Score counting up | `render/hud.ts` `Hud.update` | The shown score eases toward the real one (`diff x min(1, dt x 10)` each step: an exponential approach, 0.1 s time constant): within one point after about 0.23 s for a gap of 10, 0.46 s for 100, 0.69 s for 1000 | A few digits | Ends | Yes | No | Leave. |
| 28b | Combo time bar | `render/hud.ts`, `SCORING.comboWindow` 25 s | A bar a few pixels wide drains steadily over 25 s | About 23 x 2 px (as wide as the text `X1.0`) | Ends when the chain ends | Yes | No | Leave: information, slow. |
| 28c | Energy and mood meters | `render/hud.ts` | Instant jump to the new value | `HUD.barWidth` 12 x 3 px | Steady | Indirectly | No | Leave. |
| 28d | Task cooldown text "(N SEC)" on a prompt | `render/world-ui.ts` | The number ticks down once a second | Text | Ends | No | No | Leave. |
| 29 | Phone charging bolt | `HUD.plugSeconds` 4 | A steady bolt shown 4 s, no blink | 7 x 7 | Ends | Yes | No | Leave. |
| 30 | Progress bar for a running task | `render/world-ui.ts` | Grows steadily with the task's time | Bar 3 px tall | Ends with the task | Yes | No | Leave (this is information). |
| 31 | "AD BLOCKER: ON" text | `ACHIEVEMENTS_UI.flashSeconds` 1.5 | A text label shown 1.5 s; steady | Small | Ends | Yes | No | Leave. |
| 32 | The clock icon (sun, moon) | `HUD.sunFrom` and so on | Instant swap by hour | 7 x 7 | Steady | No | No | Leave. |
| 33 | State changes: dishes pile, plant stages and droop, bed made, blinds sprite, takeout bag, delivery box | `apartment.ts`, `plant.ts`, `deliveries.ts`, `game.ts` | Instant swap of a sprite | 16 to 48 px pieces | A step | Yes (mostly) | No | Leave. Nothing animates between states. |

### Dialog, menus, activities

| # | What | Where | Speed | Size | Loops / ends | Player causes | Flash | Recommendation |
|---|---|---|---|---|---|---|---|---|
| 34 | Dialog box opening | `render/dialog-box.ts` | Instant (no slide or fade) | Box along the bottom | Steady | Yes | No | Leave. |
| 35 | Text typing out | `dialog.ts`, `DIALOG.charsPerSecond` 45 | 45 characters a second, E shows the rest at once | Text lines | Ends per page | Yes | No | Leave: reading, and skippable. |
| 36 | "Press E" arrow that blinks | `dialog.ts` `blink`, `dialog-box.ts` | 2 changes a second (1 on-off cycle a second) | 5 x 3 px | Loops while a page waits | No | No: tiny (15 px), and one cycle a second | Leave. |
| 37 | Menu cursor | `dialog.ts` | Jumps instantly to the next line | A text row | Steady | Yes | No | Leave. |
| 38 | Typing mini-game | `activities/typing.ts` | Characters appear as keys are pressed | Text | Ends | Yes | No | Leave. |
| 39 | Notes mini-game | `activities/notes.ts`, `NOTES` (`window` 1.2 s, `gap` 0.3 s) | A prompt arrow changes every 1.5 s; a time-left bar shrinks over 1.2 s | An arrow and a bar | Ends after 6 (up to 14) notes | Yes | No | Leave: gameplay; the shrinking bar is information, not decoration. |
| 40 | Waiting tasks | `activities/wait.ts` | Progress bar only (row 30) | | Ends | Yes | No | Leave. |
| 41 | Flashcards | `activities/flashcards.ts` | None found: pages change instantly on a key press | Full screen text | Steady | Yes | No | Leave. |
| 42 | Delivery arrival and takeout | `deliveries.ts`, `collect-delivery.ts` | No animation: a box sprite appears and a line of text says so | 16 to 32 px | A step | No (arrives with game time) | No | Leave. |
| 43 | Swapping decor | `activities/swap-decor.ts` | Menus and instant swap | | Steady | Yes | No | Leave. |

### Full-screen views and cutscenes

| # | What | Where | Speed | Size | Loops / ends | Player causes | Flash | Recommendation |
|---|---|---|---|---|---|---|---|---|
| 44 | Cutscene walks (`walk`, `goto`, `back`) | `activities/cutscene.ts` | The same step as row 1 | One tile each | Ends | Yes (the player started the scene) | No | Leave. |
| 45 | Cutscene `view` (the sofa, side project, art views): covering the world with a picture | `cutscene.ts`, `render/composed-views.ts`, `render/side-project-view.ts` | Instant cut, no fade | Whole picture | Held, then instant cut back | Yes | No: a still picture replacing the room: one change, not a pair | Leave. The pictures themselves are still (the side project look's `wobble` is a fixed nudge of up to 2 px, not motion). |
| 46 | Art close-up push-in (admire art): zoom to 2x, 4x, 8x | `activities/cutscene.ts` `zoom`, `view-zoom.ts` `pushedView`, `art-pieces.ts` `PUSH_MS` (500 ms each) | Each push holds the old window for the first beat, then steps (never blends) to the next whole-number scale and slides the centre: one crisp jump per 0.5 s, then a line of text to read | Whole picture | Three jumps per scene, ends with `unview` | Yes | No: one change per push, about 4 s apart in practice (reading time) | Leave, but it is a whole-picture zoom, the thing the setting exists for: see decision d3. Cheapest calmer version: skip the half-second hold and cut straight to the target (one condition in `cutscene.ts`, needs the setting passed to the activity host). |
| 47 | Photo reel (sofa): gallery and close-up | `activities/reel.ts`, `reel/gallery.ts` | Instant: moving the cursor or opening a photo just changes the picture; no slide or fade | Whole picture, a static 70% dim behind the phone | Steady | Yes | No | Leave. |
| 48 | Title and pause screens, achievements legend, THINGS and PHOTOS pages, sync and transfer screens | `achievements/draw.ts`, `gallery-draw.ts`, `inventory-draw.ts`, `photos-draw.ts` | All still: a page change is an instant redraw; the legend icon is a still sprite | Whole picture | Steady | Yes | No | Leave. |
| 49 | Track editor | `render/track-editor.ts`, `activities/make-track.ts` | Playhead stripe hops one step 2 to 6 times a second (60 to 180 bpm); the name cursor blinks twice a second | The stripe is 16 x 96 px (2.5% of the picture); the cursor is 1 character | While the track plays; the cursor while naming | Yes (the player pressed play) | Below the line: 0.058 to 0.084 of the 0.10 needed (see the table above) | Leave; it is the piece of the game closest to the threshold. Safe fix if ever needed: draw the playhead as an outline instead of a fill, or hold it steady under the setting. |
| 50 | Music lab page (`music-lab.html`) | `src/lab/music-lab.ts` | Its `requestAnimationFrame` only feeds the audio; no visuals move (checked: no CSS animation or transition in the page) | | | | No | Leave. A developer page. |

### The ad encounters

| # | What | Where | Speed | Size | Loops / ends | Player causes | Flash | Recommendation |
|---|---|---|---|---|---|---|---|---|
| 51 | Entrance (not reduced): shake, two flashes, bars | `encounter-transition.ts`, `ENCOUNTERS.entrance` | 16 frame shake of 1 px; flashes frames 6 to 8 and 12 to 14; bars 16 frames in and 16 out; 48 frames in all (0.8 s); E skips after 6 frames | Whole picture | Ends | No (an ad can appear after a doomscroll or emailing) | Yes: two full-screen flashes plus the bars (about three in 0.8 s: right at the three per second limit) | Already handled. |
| 52 | Entrance (reduced) | same, `fadeInFrames` 12 | A plain opacity fade of the card, 12 frames (0.2 s) | Whole picture | Ends | No | No | Already done (issue 080). |
| 53 | Exit (not reduced / reduced) | `exitCoverFrames` 6, `exitPartFrames` 6 / `fadeOutFrames` 8 | 12 frame wipe / 8 frame fade | Whole picture | Ends | Yes (the player finishes it) | One pair / none | Already done. |
| 54 | The card, its menus and the closing line | `render/encounter-card.ts`, `activities/encounter.ts` | Still after the entrance | | | Yes | No | Leave. |
| 55 | Ad over the photo close-up (sofa) | `activities/reel.ts`, `interruptWithAd` | Builds the same encounter, so it takes the same setting (checked: `buildEncounter` passes `reducedMotion`) | | | | | Already done. |
| 56 | The encounter's music | `ENCOUNTERS`, `encounter-music-design.md` | Not motion; off under the setting | | | | | Already decided. |
| 57 | The shower scene (issue 177) | `config.ts` `PARTICLES.taskEmitters.shower`, `PARTICLES.finish`, `Game.reducedMotionAsked` | Drops fall 1 x 2 px over a few pixels in 0.15 s; steam and fog drift up 8 to 20 px and sway; floating bubbles rise; a burst of bubbles pops at the end | A few pixels each, about 25 alive | Ends with the 6 s task | Yes (the player starts it) | No (no flash, no screen change) | Done (Marc, d4 and d11): with the setting on, the steam and fog are a fixed set (6 and 3 clouds) standing still for the water phase, there are no floating bubbles and no pop, and the drops stay (they are what says the water is on). Read live each frame. The dithered mist over the tub (issue 177 follow-up) keeps the same density with reduced motion and only stops drifting. |

### Other things looked for and not found

Searched all of `src/` for `requestAnimationFrame` (the game loop in `loop.ts` and the music lab, both just clocks), `setInterval` (none), `setTimeout` (a debounce in the lab, file clean-up timers and a network timeout: none visible), `Math.sin` and `Math.cos` (only the candle and the particle sway), `performance.now` and `Date.now` (the loop, and time stamps), `globalAlpha` (popups, toasts, the encounter fade, the sleep banner, the 70% dim behind the phone, the side project look: all static or the fades above), shake (only the encounter's), and CSS (`index.html` and `music-lab.html` have no `transition`, `animation` or `@keyframes`). There is no screen shake, no flash and no sprite sheet animation other than the two walk frames. `dishes-1` and `plant-1` sprite pairs are states, not frames.

## What the setting does, and how to try it

`prefers-reduced-motion: reduce` is true when the person has asked their system for less motion. MDN lists it as widely available across browsers since 2020.

**Turn it on in the operating system** (settings paths from MDN, read 2026-11-24):
- macOS: System Settings, Accessibility, Display, **Reduce motion** (macOS 26 and later: Accessibility, Motion). Chrome, Safari and Firefox all follow it.
- Windows 11: Settings, Accessibility, Visual effects, **Animation effects** off (Windows 10: Ease of Access, Display, Show animations in Windows off).
- iOS: Settings, Accessibility, Motion, **Reduce Motion**. Android 9 and later: Settings, Accessibility, **Remove animations**.
- Linux: GNOME, Settings, Accessibility, Seeing, Reduced animation.

**Without touching the system** (so you can try it in a minute):
- Chrome, Edge, and other Chromium browsers: open DevTools, press Cmd+Shift+P (Ctrl+Shift+P on Windows), type "Emulate CSS media feature prefers-reduced-motion", choose `prefers-reduced-motion: reduce`. This is from general knowledge, not from the MDN page, and I did not run it.
- Firefox: type `about:config` in the address bar, add a number preference `ui.prefersReducedMotion` set to 1 (0 turns it off again); it takes effect at once (MDN). Firefox's devtools also have a toggle in the Inspector's rules panel in recent versions (not checked).
- Safari: the Web Inspector has an "Emulate" toggle for reduced motion in the Elements tab's media emulation control (from memory; not checked).

**To see it in this game**, the visible difference today is the ad encounter: from the worktree or main checkout run `cd ~/Dev/repos/mcordova47/sim && npm run dev`, open the address it prints with `?encounter=random` added (a dev-only shortcut that shows an ad on your first key press, so sound is unlocked), with the setting off (a shake, two flashes and bars, then music) and on (a plain fade, no music, one soft note). The game reads the setting when the ad starts, so you can flip it between two reloads without restarting. To see the candle, play to evening in the main room with the candle placed (or use the dev shortcut `?hour=21`, plus `?own=lamp-candle` to own it, and place it from the swap menu); with the setting on it holds steady (162b), and flipping the setting while playing takes effect at once.

## Follow-up build issue drafts (not built here)

### 162b: Steady candle glow under reduced motion

Cheap and clearly right: one condition.

- In `src/game/time-of-day/feature.ts` `drawWorld`, use `{ alpha: 1, radius: 1 }` instead of `flickerAt(...)` when reduced motion is asked. `Game` already has the private `reducedMotion` function; expose it read-only (for example `game.reducedMotionAsked`).
- Read it cheaply: ask `matchMedia` once a second rather than 60 times a second (or keep a `MediaQueryList` and its `change` event); the encounter's read at its start is enough precedent but the candle runs continuously, so the setting should take effect without a reload.
- Acceptance criteria: (1) with the setting on, the candle glow at night is the same size and strength every frame (a test draws two different times and compares); (2) with it off, `flickerAt` is unchanged (the existing tests pass); (3) switching the setting while playing takes effect within a second without a reload; (4) the golden main-room frame test is unchanged (tests run with the setting off); (5) `docs/reduced-motion.md` row 11 updated.
- Cost: about five lines, one test, no art.

Not drafted, deliberately: the other items are fine, and a growing list of tiny options would cost more than it gives.

## Unverified

- Nothing was run in a browser: not the setting in any browser, not the game with it on, and not the candle as it looks on screen. Every brightness number is computed from the palette and the code's formulas, assuming the floor under the glow is one of a handful of palette colours with the night wash on top; the real floor sprites have other colours and the sprites under it will shift the numbers a little (not the order of magnitude).
- Physical size: WCAG's area rule is about a 10 degree field of view, which depends on screen size and distance. This document uses the page's own pixel equivalent (about 11% of a 1024 x 768 screen) and the picture's share of the screen, so it is a close, not exact, comparison.
- The "three flashes" count of the encounter entrance is a count of up-and-down pairs by hand, not a measurement of rendered frames; whether the shake and bars count as a third flash depends on how strictly "opposing changes" is read.
- The browser and OS settings paths come from MDN as fetched; the Chrome and Safari emulation steps are from general knowledge and not tried.
- I did not check how many ads a player sees (about two a game day at most, `maxPerDay`); the entrance is a one-off, not repeated, but each can follow the last by 3 game hours (90 s).
