# A sleep sequence (design note, issue 078)

Status: built (stages 1 to 5, issue 078). Marc picked every recommendation in section 16. The sections below are the design as written; "As built" next to this line lists where the build differs from it, with the numbers after tuning.

## As built (read this first)
- **Wake hour (a change from the design, Marc's, stage 5).** The jump is no longer a flat +7. It is `SLEEP_WAKE` in `config.ts`: at least 7 hours and never landing before 06:30. `wakeJump(clock, rule)` in `state.ts`; the task's effect is `{ var: "clock", wake: SLEEP_WAKE }`, plant dryness is `{ var: "plantDry", addSkipped: true }` (the real hours), and the activity reads the same function for the light, so the last frame still equals the first frame after the jump. 22:00 wakes at 06:30 (8.5 hours), 23:30 at 06:30, 00:00 at 07:00, 02:00 at 09:00. Where the design said "+7" read "the wake hour". One reading to know about: the literal "max(clock + 7 h, the next 06:30)" would send a 14:00 sleep to 06:30 tomorrow (16.5 hours); the build only moves a landing that would fall in the small hours (midnight to 06:30), so a daytime sleep still wakes 7 hours on (14:00 wakes at 21:00), as before. Say if you want the literal rule.
- **The dark (tuned at 1x).** The sleep numbers are as designed (`darkAlpha` 0.38, lamps to a quarter): clear and gentle at night. The nap's `darkAlpha` went from 0.2 to 0.4 (lamps 0.6 as designed): at 0.2 a 14:00 nap was invisible, at 0.4 the afternoon room goes to a soft dusk. The nap is still the gentler version through its lamps, its shorter fall and having no sound.
- **The breath.** The bed's band is cut from the same sprite with `drawRegion` (a `RoomPainter.drawRegion` wrapper) and drawn one pixel higher while the chest is up; the art needed no change. `POSES["sleep-bed"].breath` is `{ x: 6, y: 23, w: 31, h: 8 }` for the made bed (it starts on the shoulder line, the outline row, and runs down through eight rows of flat covers, so lifting it moves the shoulder line a pixel and leaves no seam) and the unmade variant has its own, `{ x: 3, y: 21, w: 33, h: 7 }`. At the top of the breath the unmade bed's shoulder line sits next to the line under the chin (a two pixel dark line for a moment); it reads as the covers pulled up. The sofa nap has no band: the whole 16x32 picture moves up a pixel. The up phase is `SLEEP_BREATH` (up from 15 to 65 percent of a breath, the out-breath and its snore at 40 percent). The offset is 0 at the start, the end, the whole fall and wake, and whenever there is no scene.
- **The z.** Only in the asleep phase (`phases: ["asleep"]` on the emitter; the first comes the moment you are asleep), 1.4 to 2.2 s apart (the nap 1.2 to 1.8), read from `SLEEP.*.zEvery`. The color stays `denim` for the bed (the sleeper's own blue): on the dark wash at 1x it is dimmer and bluer than the default pale z and reads without glaring. The nap's z is the pale default, which reads on the dimmer afternoon room.
- **Sound.** As designed (section 6), in `sound/sleep-sound.ts`. The `sleep` bus is made lazily so a game that never sleeps makes exactly the nodes it always did. The snore is one formant voice and one noise voice (`SOUND.effects.snore`); measured offline (the master included) its peak is about 0.03 and its loudness (RMS) about 0.0016, between a footstep (0.0007) and a mumble (0.0017), and well under a record (0.0106); the lullaby at its bus level is about 0.0043. It has not been listened to by a person: tune `SLEEP.sleep.snoreGain` and `lullabyGain` by ear. The lullaby file is `music/system/sleep-lullaby.track`: 10 seconds, so one pass covers the 9 second sequence (the design's wording). See `docs/music.md`.
- **Escape with a dialog up.** Escape while a dialog is open in the middle of a clock-holding activity now leaves the clock exactly as it was (the cancel frame used to tick one frame).
- **Tests.** `sleep.test.ts` (stages 1 and 2), `sleep-breath.test.ts` (stage 3), `sleep-sound.test.ts` (stage 4), `sleep-wake.test.ts` (stage 5, the wake hour and the Escape clock), `sleep-fuzz.test.ts` (150 seeded runs against the real Game, now with a fake audio context, a record, mute and audio that starts late), `sleep-frames.golden.test.ts` (draw-call hashes of the sequence frames; re-recorded in stage 5 for the breath, the nap's dark and the new frames).

Marc's idea (2026-10-27): "Go to sleep" is a 6 second timer with the sleep pose. Make it a little sequence: sleep-type music, lighting changes, slight deep-breathing and snoring movement.

## 1. What is there today (checked in the code)
- `sleep` (`tasks.ts`, `EXTRA`) is a plain **wait** of 6 seconds with the pose `sleep-bed`. `nap` is a wait of 5 seconds with the pose `sit-sofa`. Both pay and change things only when they **finish**: energy 100, bed unmade, `clock` +7 and `plantDry` +7 (nap: energy +25, `clock` +1, `plantDry` +1). Escape cancels a wait and applies nothing (`docs/activities.md`, "Escape").
- The clock **keeps ticking** during a wait (`Game.tickClock`), so today a 6 second sleep first moves the clock 12 game minutes, then jumps 7 hours. Only an activity that sets `holdsClock` stops it.
- The clock jump goes through `State.applyEffects`, which calls `State.onClockSkip(hours)`, which calls `deliveries.advance(hours)`. Plant dryness is an ordinary effect. Neither runs on Escape, because no effects run on Escape.
- **Light** is `TimeOfDayFeature.drawWorld` (`time-of-day/feature.ts`). Each frame it reads `clock`, calls `lightAt(clock)` (a list of colour washes plus a `lamps` number from 0 to 1) and `roomWashes(...)`, fills the washes over the world, then draws the lamp glows with `lamps` as their strength. It draws inside the world pass, after the player, so the HUD, prompt, popups and dialogs are never tinted. Particles are added after it, so they are not tinted either.
- **The pose** is drawn in `Game.drawWorld`: `painter.draw(ctx, sprite, piece.bounds.x + def.at.x, piece.bounds.y + def.at.y)`. The bed pose is one 80x96 picture of the whole bed with the sleeper in it (made or unmade, picked when the task starts). The sofa pose is only the person (16x32) with no furniture.
- **The z** is a task emitter (`PARTICLES.taskEmitters.sleep` and `.nap`, `from: "pose"`): one `z` every 0.9 to 1.4 seconds for as long as the task runs.
- **The banner**: while a task runs, `Game.drawWorldUi` calls `drawProgress`, which puts the task name and a progress bar in a box above the player (`placeLabel`), after the layers, so it is not tinted. For the bed pose that box sits over the sleeper's head (the known issue from 053).
- **Sound** (`docs/music.md`): `SoundEngine` makes the audio context on the first key (`unlock`, called on every key down); until then there is no synth and `engine.play` does nothing. `Synth` has an `effects` bus and a `music` bus (level `SOUND.musicLevel`) into one master gain. Mute sets the master gain to 0 and nothing else; the music keeps scheduling silently. `MusicPlayer` plays one track on the `music` bus. Records live in `src/game/music/tracks/` and all show in the record player menu.
- **Saved state**: the game does **not** save the apartment state, the clock or the running task. Only four localStorage keys exist (`life.sound.v1`, `life.tracks.v1`, `life.progress.v1`, `life.flashcards.v1`). So a reload in the middle of sleep starts a fresh game (see section 10).

## 2. The sequence in one picture
One new activity, `sleep`, in place of `wait` for the two tasks. It runs a timeline of three phases and, each frame, publishes a small **scene** value (how dark, how far toward the new morning, how hushed, where the breath is). The light, the sound, the particles and the banner all **read that value**. None of them is told "sleep started" or "sleep ended". That is the main idea of this note: when the scene is gone for any reason (finish, Escape, an error), every reader sees "no scene" and goes back to normal on its own.

```
seconds   0         2                             7         9
          |---------|-----------------------------|---------|
phase     | FALL    |  ASLEEP                     |  WAKE   |
          | ASLEEP  |                             |         |
dark      0 -> 1    1 (hold)                      1 -> 0
morning   0         0                             0 -> 1  (blend to the new hour's light)
lamps     1x -> 0.25x  0.25x                      -> new hour's lamps
banner    1 -> 0    0                             0 -> 1
record    1 -> 0.12 (duck, 1 s)  0.12             0.12 -> 1 (return, 1.5 s from 7 s)
lullaby   0 -> 1 (from 0.3 s, 1.5 s)  1           1 -> 0 (2 s)
snore     --        from 2.5 s, one per breath    --
breath    --        3.0 s cycle, 1 px             slow stop
z         --        every 1.4 to 2.2 s            --
clock     held      held                          to the wake hour at the very end (effects)
```

## 3. Timings (one config table)
All of these go in one object, `SLEEP`, in `config.ts` (nothing in the code but names). Seconds unless marked. Nap numbers keep its current 5 second length.

| setting | sleep | nap | meaning |
|---|---|---|---|
| `fall` | 2.0 | 1.0 | fall asleep: the light dims, the banner fades |
| `asleep` | 5.0 | 2.5 | the middle: dark, breathing, snore, lullaby |
| `wake` | 2.0 | 1.5 | the light comes up to the new hour |
| total | 9.0 | 5.0 | `fall + asleep + wake`; this replaces the task's `duration` (6 and 5) |
| `darkAlpha` | 0.38 | 0.4 (was 0.2, see As built) | extra night wash on top of the hour's own light at full dark |
| `darkLamps` | 0.25 | 0.6 | the lamps' strength is multiplied by this at full dark (1 = no change) |
| `bannerFade` | 1.0 | 0.5 | seconds the banner takes to fade out at the start (and back in at the end) |
| `breathPeriod` | 3.0 | 2.4 | one breath, in and out |
| `breathPixels` | 1 | 1 | how far the covers rise (whole pixels only, section 5) |
| `snore` | true | false | a snore on each out-breath while asleep |
| `snoreGain` | 0.07 | n/a | loudness of the snore voice (the lowest sound in the game) |
| `lullaby` | true | false | the lullaby track plays |
| `lullabyGain` | 0.55 | n/a | level of the lullaby bus, next to the records at `musicLevel` 0.7 |
| `lullabyIn` | 1.5 (from 0.3) | n/a | fade in |
| `lullabyOut` | 2.0 (starts at `fall + asleep`) | n/a | fade out |
| `duckTo` | 0.12 | 1 (none) | a playing record's level while you sleep (x its normal level) |
| `duckDown` | 1.0 | n/a | seconds to go down, from the start |
| `duckUp` | 1.5 | n/a | seconds to come back, from the start of the wake phase |
| `escapeRestore` | 0.4 | 0.4 | after Escape: seconds for the light, sound and record to go back |
| `zEvery` | [1.4, 2.2] | [1.2, 1.8] | gap between z's, and only while asleep |
| `holdClock` | true | true | the clock stands still during the sequence (section 8) |

The task's `duration` field stays in `tasks.ts` as the total (9 and 5) so the progress bar and `docs/tasks.md` still make sense; a test checks that it equals `fall + asleep + wake`.

## 4. The light

### The two ways
**A. Animated clock sweep.** The clock really moves forward during the sequence (22:00 to 05:00 in 2 seconds, say) and the existing tint code follows it for free.
**B. Visual only, clock jump at the end.** The clock stays where it is. The tint feature draws an extra "deep night" layer over the normal light, and in the wake phase it blends from there to the light of the hour you will wake at. At the very end the normal effects run (`clock` +7) and the overlay is gone, in the same frame.

### Recommendation: B
- **Cancellation.** With A, the clock has been moved when Escape is pressed. "Escape leaves the clock alone" (046) then needs a rollback of the clock, of `onClockSkip` (deliveries have already advanced; there is no un-advance), of `plantDry` and of anything that listened to the hourly `clock` event on the way (the yawn, the achievements, the mirror lines). B changes no state until the task completes, so Escape is correct by construction and nothing needs a rollback.
- **The lighting code.** The tint code reads the clock each frame and has no idea of a sequence. With B it gets one small, pure addition (`sleepLight(base, scene)` next to `lightAt`, unit-testable with plain numbers). With A the tint code is untouched, but the activity must step the clock in many small effects, each firing `stateChanged` and `onClockSkip`.
- **It looks right.** A sweep from 22:00 to 05:00 only passes through night colours (the key list is `night` from 22:30 to 04:30), so it would show nothing but a slow blink at the ends. What the player wants is "dark, then morning", and that is what B draws. If the new hour is a bright morning (a nap at 13:00 wakes at 14:00; a sleep at 06:00 wakes at 13:00), B brightens to exactly that.
- **Seamless at the end.** While the clock is held, the wake target is `lightAt(clock + skip)` and the final clock is `clock + skip`, so the last frame of the overlay and the first frame after the jump are the same picture.

### How B draws
The activity publishes `scene = { dark, morning, skipHours, ... }`. In `TimeOfDayFeature.drawWorld`:
1. `base = mix(lightAt(clock), lightAt(clock + skipHours), morning)` (`mix` blends the washes' alphas and the `lamps` numbers; at `morning = 0` it is exactly `lightAt(clock)`).
2. `roomWashes(base, ...)` as now (rooms and blinds unchanged).
3. One more wash, `night` at `darkAlpha * dark`, drawn after those.
4. The lamp glows use `base.lamps * (1 - dark * (1 - darkLamps))`.

### The tint layer and the lamps during it
- The tint layer stays the one thing that dims the world; the extra wash is a second fill of the same kind, so nothing else changes. The prompts, popups, HUD, `ESC TO STOP` and dialogs are not tinted today and stay that way.
- The lamp glows (the lamp by the sofa from the decor slot, the desk glow) **fade to a quarter** at full dark: someone turned the lights down but not out, so the room is still a room. `darkLamps` 0 would put them out. In the wake phase they follow `base.lamps`, which is the new hour's value.
- The blinds-closed wash (`blindsClosedDim * (1 - lamps)`) uses the lamps of `base`, not the dimmed ones, so closing the blinds does not make the room darker at the same time as the overlay.
- Particles (the z) are drawn after the tint and stay bright. That is the reason the z is readable in the dark. Check at 1x that a denim z on the dark wash is not too loud; if it is, give the z a dimmer colour while `dark > 0.5` (open question 8).
- The whole camera view is covered (the same `fillRect` as now), so the kitchen filler and the edge go dark together.

### A note on the follower
The feature does not use `scene.dark` directly. It keeps its own `dark` and `morning` numbers that move toward the scene's values (or toward 0 when there is no scene) by at most `1 / escapeRestore` per second when going down. While the scene is running they follow it exactly (the scene is already smooth); after Escape or an error they ease back in 0.4 seconds instead of snapping. When both are 0 and there is no scene the feature draws exactly what it draws today (a golden test proves this).

## 5. Breathing (moving the pose layer with no new sprites)
**Where the offset goes.** In `Game.drawWorld`, the pose is a drawable: `painter.draw(ctx, sprite, x, y)` with `y = piece.bounds.y + def.at.y`. That one line is the only place. Add a per-frame `poseOffset` to the pose drawing and keep `bottom` (the draw-order key) unchanged so the sleeper never jumps in front of or behind something.

Two cases, because the two poses are different pictures:

- **The sofa nap (`player-sit-sofa`, 16x32, the person only).** Draw the whole sprite at `y + dy`, with `dy` stepping 0, 1, 0 once per `breathPeriod`. Nothing else is in that picture, so a 1 px bob is clean.
- **The bed (`player-sleep-bed`, 80x96, the bed and the sleeper in one picture).** Moving the whole picture would move the bed. So draw it in **two cuts**: first the whole sprite as now, then, over it, one band (the covers over the chest) cut out of the same sprite with `drawRegion` and drawn `breathPixels` higher. `Sprites.drawRegion` already exists (used for zoom views) and draws a window of a picture at a whole-number scale with smoothing off; the room painter needs a one-line wrapper. The band is a rectangle in the sprite's own pixels, in `POSES["sleep-bed"].breath = { x, y, w, h }`, chosen against the picture (it must start and end on rows of flat covers so the 1 px seam is invisible; to confirm when looking at `public/sprites/player-sleep-bed.png`, and for the unmade variant too, which may need its own rectangle). No new sprite, no extra frames.
- **Why whole pixels.** The canvas has smoothing off (`imageSmoothingEnabled = false`), so a half-pixel offset is just a pixel snap at a moment the browser picks, and it would shimmer. Use 0 or 1. The "sub-pixel" feel comes from timing: `dy = 1` for the in-breath half of the cycle's middle (an ease: 0 for the first 15 % of the period, 1 up to 65 %, 0 after), which reads as a slow rise and a slow fall.
- **Fall and wake.** The breath starts when `fall` ends and stops (ends at `dy = 0`) when `wake` begins, so the pose is always at rest when the scene begins and ends and the picture at the end of the task is the same as today's.
- **Not in the golden frames.** `dy` is 0 whenever there is no scene, so a normal frame draws exactly the old calls.

## 6. Sound

### Where it plugs in
A new small class, `SleepSound` in `src/game/sound/sleep-sound.ts`, owned by `SoundFeature`. Each frame `SoundFeature.update` hands it the scene (or null). `SleepSound` only looks at what the scene says and at the clock of the audio context; it never talks to the interaction system. It moves through three states: **idle**, **sleeping**, **restoring**, and always ends in idle with every level back at rest.

### Three small changes to the engine
1. `Synth` gets a third bus, `sleep` (the lullaby; its own gain, 0 at rest), next to `effects` and `music`. The `Bus` type grows by one word.
2. `Synth.rampBus(bus, level, seconds)`: sets the bus gain at now to its last level and ramps (`linearRampToValueAtTime`) to `level`. It remembers the last level so the next ramp starts from the right place. It also gets `busLevel(bus)` for tests.
3. `MusicPlayer` takes the bus name in its constructor (today it is the word `"music"` in one line), so a second `MusicPlayer` can play the lullaby on the `sleep` bus. The record player's player is untouched.

### The snore
Within the existing voice types, no files. A snore is one in-breath and one out-breath, only the out-breath is loud:
- `snore` effect in `SOUND.effects` (priority `low`, so a crowded moment drops it first):
  - a **formant voice**: source `sawtooth` at about 58 Hz, two band-pass resonances (about 240 Hz and 520 Hz, `q` 3 and 4), length 1.1 s, gain `snoreGain` (0.07). The low buzzy source through those resonances gives the rattle of a snore; the existing envelope (attack and decay) gives the breath shape.
  - a **noise voice** under it: low-pass noise at about 300 Hz, length 1.3 s, gain 0.04, for the air.
- It plays through `engine.play("snore")` once per breath, at the start of the out-breath, only in the asleep phase and only when `snore` is true. Muted, or with no synth, `engine.play` already does nothing.
- Two voices of the 14 voice cap, low priority. The footsteps and so on are not affected.
- The loudness is lower than every other effect (the quietest today are the 0.16 mumble and the footstep). Tune by ear; the number is one config line.

### The lullaby (a system track)
- A `.track` file in a **new folder**, `src/game/music/system/sleep-lullaby.track`, and a loader that mirrors the one in `records.ts` but reads that folder. The record player builds its menu from `music/tracks/` only, so a system track is never in the menu, never saved as the chosen record, and is not part of `life.sound.v1`. A test asserts that the menu has no entry named like it.
- Slow and soft: sine melody and triangle bass, no beat, 72 bpm, three beats to a bar, four bars. 12 beats at 72 bpm is exactly 10 seconds, so one pass covers the sequence and the loop only repeats if someone makes the sequence longer:
```
title: Sleep Lullaby
note: System track for the sleep sequence. Not in the record player.
tempo: 72

[melody sine 0.5]
E5:2 D5:1 | C5:2 A4:1 | G4:2 A4:1 | C5:3

[bass triangle 0.4]
C3:3 | A2:3 | F2:3 | G2:3
```
  (C major pentatonic, falling lines, a last note that stays. The notes are a first draft to be judged by ear; the file is what Marc can change.)
- **Fade in and out** is the `sleep` bus gain, not the notes: `rampBus("sleep", lullabyGain, lullabyIn)` when the scene starts (after 0.3 s) and `rampBus("sleep", 0, lullabyOut)` when the wake phase begins. The notes keep their normal loudness inside the bus.
- **Start and stop.** The lullaby player starts (`play(track)`) when the scene begins and `stop()`s once the bus is back at 0 (after the fade out, or after `escapeRestore` on Escape), so nothing plays on in silence.

### A record that is playing
The record's notes are scheduled on the `music` bus, so ducking is a ramp of that bus, not a change to the player or the notes:
- scene starts: `rampBus("music", musicLevel * duckTo, duckDown)`.
- wake phase starts: `rampBus("music", musicLevel, duckUp)`.
- Escape or any end of the scene: `rampBus("music", musicLevel, escapeRestore)`; the lullaby bus goes to 0 in the same time.
- The record keeps playing, in tune and on time, just quiet; it is never stopped, so the record player menu, the saved choice and "Now playing" are unchanged. If a record is **started** during the sequence (impossible: you are asleep), it does not matter.
- The record's mood lift is already off during the sequence because the clock is held (`liftMood` returns while `holdsClock`).
- The little music notes that float up from the record player while it plays (`musicPlaying` in `features.ts`) stop while a scene is on (`&& !game.sleepScene`), since the record is nearly inaudible.

### Mute
M works as always: the master gain goes to 0 and everything is silent, snore and lullaby too, because they all pass through it. The scene does not care. Because the fades are bus ramps on the audio clock and not per-note timers, unmuting halfway through puts you at the right point of the fade. A muted game stays muted, and `MUTE` still shows. Nothing in the sequence ever changes `muted` or the saved `life.sound.v1`.

### Locked sound (before the first key, or no audio)
There is no synth, so `SleepSound.update` does nothing: the sequence runs in silence and looks the same. Because the E that starts the sleep is itself a key press (the sound feature unlocks on every key down), this almost never happens, except when audio is unavailable in the browser (then it never makes a sound). One rule keeps it simple: **the lullaby starts only if there is a synth when the scene begins**. If the context is created late, the sequence stays silent to its end rather than starting the lullaby in the middle, and the next sequence works normally.

## 7. Naps (the smaller version)
Same activity, other numbers (section 3): 5 seconds total, a lighter dark (`darkAlpha` 0.2, lamps to 0.6), a shorter fade, **no lullaby, no snore, no ducking**. It keeps the breath (a 1 px bob of the whole `player-sit-sofa` picture), a z, and the same blend to the new hour (one hour on). Nobody sleeps through a nap, so the record plays on at its normal level. `NAP.energy` and `NAP.hours` stay in the effects as now. The nap's clock is held too, so `clock` is `+1` exactly at the end.

## 8. The clock during the sequence
Recommendation: `holdsClock = true` for both. Reasons: Escape then leaves the clock **exactly** where it was (a test can say `clock === start`, not "within 18 minutes"); the wake target is exactly `clock + skip`; deliveries and plant dryness do not creep by a few minutes during a sequence that is only a picture. What is lost: the 12 to 18 game minutes that used to tick during the timer (and the same drain of energy and mood drift; energy is set to 100 at the end anyway). A nap loses 10 minutes of tick; it is an hour long in the game anyway. See open question 5.

## 9. Escape at every point
Escape cancels the activity (no payout, no effects, no cooldown, `taskCancelled`, the combo untouched), as for every task. What the sequence adds, with the scene gone:

| moment | light | record | lullaby | pose | clock and effects |
|---|---|---|---|---|---|
| 0 s (just started) | nothing to restore | nothing | nothing | back to the normal player | unchanged |
| in `fall` (1 s) | eases to normal in 0.4 s | ramps back in 0.4 s | fades in 0.4 s | normal at once | unchanged, bed made as it was |
| `asleep` (any) | eases to normal in 0.4 s | ramps back in 0.4 s | fades out in 0.4 s, then stopped | normal at once, breath offset gone | unchanged |
| `wake` (any, `morning` part way) | `dark` and `morning` both ease to 0 in 0.4 s: the room goes back to the hour you went to sleep at, because the clock did not jump | same | same | same | unchanged: no +7, no energy 100, bed not unmade |
| last frame before the end | same as above | same | same | same | unchanged |
| after it ended by itself | the scene ended and the effects ran in one go | returning (1.5 s) | fading out | normal | +7 hours, energy 100, bed unmade, points |

An error in the activity is treated like Escape (the interaction system already does that); because every reader works from "no scene", an error also restores everything. The buffered E that cancels does not restart the task (existing rule).

## 10. Saved state and a reload
The apartment state, the clock and the running task are never saved (section 1), so there is nothing to restore: a reload in the middle of a sequence starts a new game at the start hour, in the main room, awake, with no overlay, the record player's remembered record starting at the first key as always. The only saved thing the sequence could touch is `life.sound.v1` (mute, the record, the payout window), and the sequence **does not write it**: the duck is a runtime bus level and is never stored, so a reload cannot come back ducked. A test compares the stored text before and after a full sequence and after an Escape. If a future issue saves the game, the scene is runtime-only and must not be part of it.

## 11. Deliveries, plants, other listeners
Everything that skips time still goes through the task's effects at the end, so nothing changes: `onClockSkip(7)` and `deliveries.advance(7)` once at wake, `plantDry` +7, the `clock` event once (a change of many hours reports one event). A package that arrives during those 7 hours is there on the first frame after wake. Because the clock is held, no hourly tick or delivery advance happens inside the sequence. On Escape none of it runs (test: `deliveries.advance` is not called).

## 12. The z, the banner, and the other pieces
- **Particle z.** Today the z comes out every 0.9 to 1.4 s from the first second. In the sequence it appears only while asleep, a little slower (`zEvery`). Add an optional `phases` list to an emitter (`phases: ["asleep"]`) read from the scene; emitters without it behave as now. The pose anchor (`from: "pose"`) already finds the pillow. The z particles are drawn after the tint, so they stay bright.
- **GO TO SLEEP banner.** Recommendation: **fade it out** over `bannerFade` at the start and fade it back in over the same time at the end, so it is not over the sleeper's head while asleep, and the player still gets the bar when it matters (waking). The fade is `ctx.globalAlpha` around `drawProgress` in `Game.drawWorldUi` with `scene.bannerAlpha` (1 when there is no scene). Hidden entirely is the other choice (simpler: `if (scene && scene.dark > 0.05) skip`); fading costs about five lines more and avoids a pop. `ESC TO STOP` in the HUD stays all the time, so the way out is always shown.
- **Pose changes at the end.** At the end the bed becomes unmade and the pose ends, as today. The pose sprite is picked when the task starts (made or unmade), so it does not change mid-sequence.
- **Existing wake-up effects** are the task effects: energy 100, bed unmade, `clock` +7, mood +10, the award popup and the finish sound, all unchanged and all at the end of the wake phase. A stretch or a sigh at wake would be new (open question 9).

## 13. Storyboard at 320x192
The frames to render at 1x (the world, 320x192; the HUD and prompts not tinted). `#` is the room, `.` is dim. The bed sits in the main room's lower left. The numbers are what the test records.

```
 t=0.0 s  (press E)          t=1.0 s  (falling)          t=2.0 s  (asleep, full dark)
+----------------------+    +----------------------+    +----------------------+
|ESC TO STOP    22:00  |    |ESC TO STOP    22:00  |    |ESC TO STOP    22:00  |
|######## ###### ######|    |######## ###### ######|    |.... .... .... .... ..|
|##     [GO TO SLEEP]  |    |##     [go to sleep]  |    |..      (banner gone) |
|## bed with sleeper   |    |## bed, light dimmer  |    |.. bed, glow of lamp 1/4|
|######## lamp glow ###|    |###### lamp glow 60% #|    |...... lamp glow 25% ..|
+----------------------+    +----------------------+    +----------------------+
 dark 0.00  record 1.00      dark 0.50  record 0.56      dark 1.00  record 0.12
 breath 0   lullaby 0        breath 0   lullaby 0.4      breath 0   lullaby 0.55

 t=4.0 s (asleep, breath in)  t=7.0 s (wake starts)       t=8.0 s (waking)
+----------------------+    +----------------------+    +----------------------+
|ESC TO STOP    22:00  |    |ESC TO STOP    22:00  |    |ESC TO STOP    22:00  |
|.... .... ....  z ....|    |.... .... ....  z ...|    |###### ###### ########|
|.. covers up 1 px     |    |.. covers at rest     |    |##   bed, tangerine   |
|.. bed .... snore     |    |.. bed .... lullaby   |    |## [GO TO SLEEP] back |
|...... z .............|    |....... fading .......|    |###### lamps by new hr|
+----------------------+    +----------------------+    +----------------------+
 dark 1.00  breath 1         dark 1.00  morning 0.00     dark 0.50  morning 0.50
 snore on the out-breath     lullaby fades 0.55 -> 0     record 0.56 (returning)
 (see the note below)        clock still 22:00

 t=9.0 s (done, clock at the wake hour: 22:00 wakes at 06:30): normal light for that hour, bed unmade, award popup.
```
The times in the clock slot read 22:00 for the whole sequence because the clock is held (open question 5); the true hour shows after wake.

Snore times: the asleep phase starts at 2.0 s and a breath is 3.0 s with the out-breath beginning 1.2 s in, so snores land at about 3.2 s and 6.2 s (`fall + k * breathPeriod + inhale`, only inside the asleep phase).

## 14. Recommendation and the staged build plan
**Recommendation.** Build it as designed here: one `sleep` activity with a published scene; light as an **overlay with the clock jump at the end** (B); the clock held during the sequence; the breath as a 1 px band cut from the existing sprite (a whole-sprite bob for the sofa); a quiet formant-and-noise snore; a four-bar sine and triangle lullaby on its own bus in a system folder; the record **ducked on its own bus** and restored by ramps; the banner **faded**; the nap as a short, quiet version with no lullaby. Everything comes back by itself when the scene is gone.

**Stages** (each ends with `npm test` and `npm run build` green and the golden frames unchanged; each can be merged alone):
1. **The sequence and the scene, no look.** `SLEEP` in `config.ts`; the `sleep` activity (phases, timeline, `holdsClock`, the scene value); `sleep` and `nap` use it; the progress bar and the effects as before. Tests: timings, Escape matrix without the visuals (no payout, clock unchanged), nap, `duration` equals the sum. What is left: nothing visible changes yet except 9 and 5 seconds.
2. **The light and the banner.** `mix`/`sleepLight` in `time-of-day/tint.ts`, the follower in the feature, the banner fade. Tests: pure light numbers, no-scene frames identical, the end frame equals the first frame after the jump, Escape eases back.
3. **Breath and the z.** `poseOffset` in `Game.drawWorld`, `drawRegion` wrapper, the band rectangles per pose (needs a look at the art from 076; if the art moves, change the rectangle), `phases` on emitters. Tests: offset is 0 at the start and the end and whenever there is no scene, and a recorded draw call at `dy = 1`.
4. **Sound.** Bus, `rampBus`, `SleepSound`, the `snore` effect, record ducking and its return, then the lullaby file and its loader. Tests with the fake audio context (section 15).
5. **Polish and docs.** Render the storyboard frames at 1x and look; tune numbers; update `docs/music.md` (system tracks, ducking), `docs/activities.md` (the `sleep` kind) and `docs/state.md` (the clock held).

## 15. Testing plan
- **Timing.** Step a `Game` with `dt = 1/60` from the press of E and check the phase at each second, the total, `dark`, `morning`, `bannerAlpha`, breath offset (0 or 1, 0 at the start and end) and the snore moments against `SLEEP`.
- **Fake audio.** `fake-audio.ts` records what is asked of the context. Add: the `music` bus ramp calls (down to `0.7 * 0.12` in `duckDown`, up to 0.7 in `duckUp`), the `sleep` bus ramps (up, hold, down), and that `play("snore")` creates the two voices. With no record playing there are no `music` ramps that matter (the level is the same), and a record that is playing is still the same `MusicPlayer` object and track (not stopped).
- **Mute.** Mute before, during (mid-fade) and unmute during: the master stays 0 while muted, `muted` is never changed by the sequence, `MUTE` shows, and unmuting mid-sequence is at the right level.
- **Locked.** An engine that was never unlocked (and one that is unavailable): the sequence runs, finishes with the right effects, makes no audio calls and never throws.
- **Saved.** `life.sound.v1` text is identical before and after a full sequence and after Escape; no duck value is ever written.
- **Golden frames.** `main-room-frames.golden.test.ts` passes unchanged (no scene means the old draw calls, byte for byte); a second golden file records the sequence frames of section 13 (draw-call logs, the same recorder) so later changes to them are deliberate.
- **Escape matrix.** Like `escape.test.ts`: for sleep and for nap, Escape at 0, 0.5, 1.0, 2.0 (a phase boundary), 4.0, 7.0 (boundary), 8.0, 8.99 s and one frame after the end. For each: no points, no cooldown, `taskCancelled`, `clock` exactly the start value, energy, bed and `plantDry` unchanged, `deliveries.advance` not called, the pose gone, the record's bus back at its level and the lullaby stopped within `escapeRestore`, the follower `dark` and `morning` back to 0 within `escapeRestore`, the z stops.
- **Deliveries and plants.** On finish: `advance(7)` once, `plantDry` +7, the `clock` event once; on Escape none.
- **Render.** Render the section 13 frames with the real painter at 1x, look at them (the art may be placeholder rectangles in a test; the room light is what is checked), and keep the images out of the repo.

## 16. Open questions for Marc (with my recommendations)
1. **Light: overlay with the jump at the end (B), or an animated clock sweep (A)?** Recommend B (section 4).
2. **How dark?** `darkAlpha` 0.38 on top of the hour's light, lamps down to a quarter. Darker (lamps fully out) or lighter? Recommend the quarter glow: the room stays readable in a 1x screenshot.
3. **The lullaby.** Four bars of a soft sine and triangle tune, 10 seconds, the draft in section 6. Fine to start with, or do you want to write it in the track editor and paste it in (`C`, then a file in `src/game/music/system/`)? Recommend: build with the draft, you replace it later; it is one file.
4. **The record ducks to 12 %** and returns in 1.5 s. Or stop the record for the night? Recommend duck: it picks up where it was, and nothing in the menu or the save changes.
5. **Hold the clock still during the sequence?** The clock slot then shows the same hour until wake. Recommend yes (exact Escape, exact end); the cost is that the old 12 game minutes of ticking go away.
6. **The banner:** fade out and back in (recommended) or hide for the whole sequence.
7. **Snore on or off?** Recommend on, at the lowest level, `snore: false` is one line.
8. **Does the z need a dimmer colour on the dark wash?** Decide after the first look at 1x; recommend leaving it and judging in stage 5.
9. **A stretch or a sigh at wake** (a sparkle or a yawn sound at the very end)? Recommend not now; the light coming up is the wake-up.
10. **The breath on the bed needs the covers band cut from the 076 art.** I recommend asking whoever draws it (Marc, 076) to keep a flat row of covers above and below the chest, so a 1 px band moves cleanly; the exact rectangle is read from the final picture in stage 3. Is that fine, or should the sleeper breathe by a tiny pillow-and-head offset instead?
11. **Nap with no lullaby** and half the dark. Fine, or should a nap have a short hum too? Recommend none.

If Marc says "just build it": build sections 14 to 15 as written, with the recommendations above.
