# Encounter music (design note, issue 091)

## Summary
A short battle-style loop, a system track like the sleep lullaby, starts on the entrance's hit chord (frame 32), loops under the card and the menu, and stops with a short fade on every way out. A playing record is **ducked to silence** (it keeps its place) for the encounter and fades back after. Each outcome gets a tiny result jingle, played as sound effects (not tracks) when the closing line appears, like a battle result screen. The code mirrors the sleep sound: the game exposes an `encounterScene`, and one small sound module follows it, so any way the encounter ends cleans up by itself. Marc should compose the real loop in the track editor; an agent writes a placeholder first so the build can be tested.

No change to the `.track` format, the record player, or saves.

## 1. How it works now (what we build on)
- The entrance is a frame timeline in `ENCOUNTERS.entrance` (`config.ts`): buzz at 0, pulse run 16 to 30, **hit at frame 32**, card and menu open at 48. E skips after frame 6. The exit wipe is 12 frames.
- Entrance sounds are cues through `host.cue` into `SOUND.cues`/`SOUND.effects` (effects bus). Reduced motion plays one soft note and a 12-frame fade.
- Sleep (issue 078) is the pattern to copy: `SleepSound` reads `game.sleepScene` each frame, ducks the `music` bus with `Synth.rampBus`, plays a system track on its own bus with its own `MusicPlayer`, and restores everything itself when the scene is gone (Escape included). Mute is the master gain, so fades go on silently and unmuting lands at the right point.
- System tracks live in `src/game/music/system/`, loaded by `system-tracks.ts`, never in the record menu or the saved settings.

## 2. Recommended design

### Start
- New bus `encounter` (third bus beside `music` and `sleep`; `Bus` in `synth.ts`), at 0 until used. Gain `ENCOUNTERS.music.gain`, tuned quieter than the record (suggest 0.5 of `musicLevel`).
- The track starts at `ENCOUNTERS.music.startFrame` = 32, the frame of `encounter-hit`. A test asserts the two numbers match, so editing the entrance cannot drift them apart.
- The loop is written to continue the entrance: it begins on the downbeat the hit lands on, and the pulse run's key (G, from the 392 Hz pulse) is the loop's key.
- **E skip** (before frame 32): the entrance's remaining sounds never play, so the track starts at once when the menu opens, on its own downbeat. **Reduced motion**: no music (see decisions). **Ad blocker**: no encounter, so nothing. **No audio yet** (no synth when the encounter begins): silent for that encounter, same rule as sleep.

### Loop
- `MusicPlayer("encounter")` plays the track forever, with the existing look-ahead scheduler. Clean loop: every channel is the same length, no note runs past the loop end (a test over the system track checks that every event ends within `beats`), and the first note of the loop is on the downbeat.
- **Bounded**: after `maxLoops` (4, about 30 s) the music fades out over 4 s and the card sits in quiet. A menu left open for ten minutes never becomes a siren.
- Look closer, the second card page and the dialog voice keep playing over it unchanged; the dialog voice is already quiet.

### Stop
Three ways, one rule: the bus ramps to 0 and the player stops once the ramp has finished (never a hard cut, so no click).
| Way out | When the fade starts | Fade |
|---|---|---|
| Menu choice (any outcome) | when the closing line appears (the "result" moment) | `resultFade` 0.35 s |
| Escape, or a cancelled dialog | at once | `escapeFade` 0.25 s |
| Leave with no result line (Ignore that just leaves, E skip of nothing) | at the exit wipe | `resultFade` |

### The player's own music
- **Duck to silence, do not stop.** On the first frame of the encounter the `music` bus ramps to 0 over `duckDown` (0.3 s, so the buzz is not under a record); the record keeps playing in time, unheard. After the exit begins the bus ramps back to `SOUND.musicLevel` over `duckUp` (1.5 s). The chosen record, "Now playing", the saved choice and the payout window are never touched. A duck is never saved.
- Why silence and not a quiet duck: two tunes at different tempos and keys under each other sounds like a mistake, and the sleep duck (12 percent) works because the lullaby is slow and soft. Ducking to 0 gives the "fight music takes over" feel and the record is still back in place after.
- The little notes over the record player stop while the bus is silent, as they do in sleep (read `busLevel`).
- Encounters and sleep cannot overlap (both hold the clock and the input), but both restore to absolute levels, so a missed restore cannot stick.

### Result jingles
- Played when the closing narrator line opens (the result), on the **effects** bus through the existing cue path, so they honour mute and the voice cap and need no new engine code. Four, each under one second, tuned in `SOUND.effects` like the entrance:
  - unsubscribed: a bright rising three-note flourish and a held top note.
  - unsubscribe failed: two notes, the second a half step down, soft.
  - Add to cart (also an impulse buy): a quick two-blip "cha-ching" (high square, then higher).
  - Ignore: nothing new; the existing `encounter-exit` stays as the plain soft end.
- The exit-wipe echo (`encounter-exit`) now plays only when there is no jingle, so the two never stack. A refusal line (already own it, cart full) has no jingle.
- The result fade runs while the jingle plays, so the jingle is heard over a dying loop, not a cut.

### Mute and calm
- Muted: master gain 0, so everything runs silent and in time; unmuting part way is on the right beat. The scene module never touches mute or saved settings.
- Calm: 120 bpm at most, no sawtooth, no sustained high notes, gain below the record, a fade on every leave, a bounded loop, and nothing begins before the hit.

## 3. Code shape
```
src/game/encounter-scene.ts          pure: EncounterScene {phase, frame, outcome, t}; test without audio
src/game/sound/encounter-sound.ts    like sleep-sound.ts: follows the scene, owns the "encounter" MusicPlayer
src/game/music/system/encounter-battle.track
src/game/music/system-tracks.ts      + ENCOUNTER_BATTLE
src/game/config.ts                   ENCOUNTERS.music = { startFrame, gain, maxLoops, duckTo, duckDown, duckUp,
                                       resultFade, escapeFade, loopFadeOut, jingles: {outcome: cue} }
                                     + 4 effects and cues
src/game/sound/{synth,engine}.ts     "encounter" bus; engine.updateEncounter(scene) next to updateSleep
src/game/game.ts, activities/encounter.ts   expose encounterScene; the activity sets the phase and outcome
```
The scene is `null` when no encounter runs; the sound module treats a vanished scene as "ending" and restores the buses within `escapeFade`, whatever the cause (the sleep pattern). Phases: `entering` (frame), `open`, `result` (outcome), `leaving`.

## 4. The track
**Format: no change needed.** Three channels (square melody, triangle bass, drums), per-channel volume, tempo up to 300, loops at the longest channel. That is enough for a driving 8th-note bass, a staccato melody and a K H S H beat.
- Marc's editor limits (relevant if he composes in-game): one beat channel and two tunes, notes on the half beat, up to 32 steps (16 beats, about 8 s at 120 bpm), tempo 60 to 180. A 16-step loop at 120 bpm is 4 s; 32 steps is 8 s. That is short but fine for a loop that fades after four passes. Sixteenth-note runs (the classic battle bass) are not possible in the editor, only in hand-written text (`0.25` lengths).
- **Nice-to-have, not planned**: an `intro:` section played once before the loop. Skip it: the entrance is the intro.
- **Who writes it: Marc, in the track editor (or by hand), recommended.** The sound is the whole point and is his call; he already made the editor for this. The agent writes a placeholder (`encounter-battle.track`: 8 steps of bass, a four-note staccato melody, kick and snare) so stages 1 to 3 are testable, marked as a first draft exactly like the lullaby. Marc replaces the file by pasting editor text into it (C in the editor, then the file). The jingles are config, so he can tune them by ear in `SOUND.effects` too.

## 5. Staged build plan (small issues)
1. **091a Bus and scene.** The `encounter` bus, `EncounterScene`, `encounter-sound.ts` with start, loop, bounded loops, stop and fades, ducking the record, and the placeholder track. Tests (fake audio, as `sleep-sound` tests): starts at frame 32 and not before; E skip starts at the open; Escape at every frame leaves buses at rest within `escapeFade`; record ducks to 0 and returns, keeping its place; muted is silent with the same schedule; no synth means silence; loop has no note past its end; `startFrame` equals the hit's frame; 4 loops then fade.
2. **091b Result jingles (Marc 2026-10-29: only when the action succeeds).** Two cues and effects (unsubscribed, add to cart), the phase `result`, the exit echo whenever there is no jingle (failed unsubscribe, refusals, Ignore). Tests: each successful outcome plays one jingle, never with the exit echo; failure, refusal and Ignore play none and keep the exit echo; muted plays none.
3. **091c Docs and tuning pass.** Section in `docs/random-encounters.md` and `docs/music.md`; every number in `ENCOUNTERS.music`. Not verifiable here: how it sounds.
4. **091d Marc's track.** Marc replaces the placeholder (no code); a test already guards that it parses and loops cleanly.
Existing tests: the golden main-room frames and the golden voice files should be unchanged (they do not run encounters with sound). The entrance tests in `encounter-game.test.ts` stay valid because the music is driven from the scene, not from `host.cue`.

## 6. Risks
- **Sync**: the music starts from the frame loop and the audio clock runs separately, so the downbeat may be off the hit by up to one frame (16 ms). Tolerable; a later option is to schedule both on the audio clock.
- **It may feel too much** for a candle email, or not enough. The numbers are all in config and Marc will judge by ear. Nothing here is checked in a browser.
- **Stuck duck**: if a record stays silent after an encounter. Mitigation: the scene-vanishes rule restores in every case, and a test drops the encounter at every frame.
- **Voice cap**: loop plus entrance tail plus dialog voice. The loop is on its own player and the cap counts voices; a test with the loop playing checks that dialog voice still sounds.
- **Fatigue**: this repeats every 2 to 5 game hours at most 2 a day, and the loop fades after four passes. Fine.

## 7. What I decided myself and why
- **System track on its own bus**, not the record player's `music` bus: the record can then be ducked independently and the record player never knows.
- **Scene-driven, not event-driven**: matches sleep, and cleans up after Escape, errors and any future way to drop the encounter.
- **Jingles as effects, not tracks**: they are one second, need no loop, honour mute and the voice cap for free and are tuned in the same place as the entrance.
- **Duck to silence**, not a quiet duck or a pause (see above).
- **Jingle at the result line**, not at the exit wipe: it is the battle-result moment, and the wipe is only 0.2 s.
- **No music with reduced motion.** The issue lists it with the quiet paths, and the entrance already softens there. Cheap to flip later (one flag).
- **Bounded loop of four passes, then a fade**: the issue asks for a bounded loop and calm.
- **No format change**, no `intro:` section.
- **Placeholder by the agent, real track by Marc.**

## 8. Open questions for Marc (most important first)
1. **Who writes the real track? ANSWERED by Marc 2026-10-29: (a) Marc composes in the editor or the music lab (issue 122), agent writes a placeholder first.**
   Recommend: Marc, in the editor; the agent only a placeholder.
   (a) Marc composes in the editor, agent placeholder first. (b) Agent writes it by hand with sixteenth-note bass and Marc tunes it. (c) Agent only, and it stays as is.
2. **What happens to the record during an encounter? ANSWERED by Marc 2026-10-29: (a) duck to silence.**
   Recommend: duck to silence (keeps its place, no clash).
   (a) Silence, continues unheard. (b) Quiet duck like sleep (12 percent). (c) Truly pause and resume where it stopped.
3. **Which results get a jingle? ANSWERED by Marc 2026-10-29: a jingle only when the action succeeds, none when it fails.** So: unsubscribed and add to cart get a jingle; a failed unsubscribe, a refusal (already own it, cart full) and Ignore get none and keep the plain soft exit (`encounter-exit`). (Original recommendation was unsubscribed, failed and cart.)
   Recommend: unsubscribed, failed, and cart; Ignore keeps the plain soft end.
   (a) Those three. (b) All four including Ignore. (c) None, just the loop's fade.
4. **How long should the battle music play if the card stays open? DECIDED by the planner 2026-10-29 (Marc: use judgement): (a) four passes, then fade into quiet; all numbers in `ENCOUNTERS.music`, easy to change.**
   Recommend: four passes (about 30 s), then fade into quiet.
   (a) Four passes then fade. (b) Loop until you choose. (c) One pass only.
5. **Reduced motion: music or no music? DECIDED by the planner 2026-10-29: (a) no music.**
   Recommend: no music (keeps the quiet path quiet).
   (a) No music. (b) Music at a gentler gain with a slower fade-in.
