# Music: the record player and the track format

Sound and music are made in code with the Web Audio API. There are no audio files. The sound feature is `src/game/sound/` and is switched on by one line in `src/game/features.ts`; delete that line and the game is silent (the record player menu is still there, it just plays nothing).

## How the record player works
- Face the record stand and press E (task `record-play`, "Choose a record"). A menu lists every record (and `Demos...`) plus **Stop the music**. Escape backs out and changes nothing.
- **No cooldown** (issue 068): the menu is always open to you, like the track editor.
- **It pays only for a real change.** Starting a record or demo that is different from the one now playing (or when nothing was playing) pays the task's 25 points and +5 mood, the same as any award. Choosing the one already playing, **Stop the music**, and backing out (Escape, or the cancel key) end quietly (`quiet` in `ActivityResult`, issue 059): no payout, no mood change, no cooldown and no `taskCancelled`, so the "Changed My Mind" count is not affected. A demo counts as a record for all of this.
- **A payout window** stops flipping back and forth from being farmed: a payout happens at most once per `MUSIC.payoutEveryMinutes` (10) game minutes. A different record chosen inside the window still switches, silently, with no payout. The time left is kept in the sound feature and **saved with its settings** (`payoutLeft` in `life.sound.v1`, game minutes), so a reload cannot skip the wait; it counts down in game time while the game runs (not while a dialog or the track editor holds the clock), and a missing or damaged value means no wait. Stopping the music does not start the window.
- The code is `activities/record-player.ts` (the choice), `sound/feature.ts` (what is on, the window) and `Game.jukebox` (how the activity asks the sound feature; with no sound feature nothing is playing and any record pays). Escape on the reply line ("Now playing...") drops the pick, as before.
- While a record plays, mood climbs a little over game time: `MUSIC.moodPerStep` every `MUSIC.everyGameMinutes` of game time, never past `MUSIC.moodCap` (all in `config.ts`).
- A line at the bottom of the screen names the record for a few seconds after choosing, and any time you face the record player.
- The chosen record is remembered between visits (and the mute setting) under the localStorage key `life.sound.v1`. The game starts in silence the very first time. Browsers only allow sound after a key press, so a remembered record starts at the first key you press.

## Your own tracks (issue 059)
Design and the reasons for each choice are in `docs/make-tracks.md`. In short:
- **Making one:** at the desk (the laptop) the choice cycle (Tab or Q) has **Make a track**. It opens a piano roll editor drawn over the whole screen. The game clock, energy and mood stand still while it is open, and Escape leaves at once from anywhere and pays nothing. A new track is called `Untitled 1`, `Untitled 2` and so on.
- **Keys:** arrows move the cursor (up and down for pitch, left and right for the step, which wraps), **E** places a note or clears it (on another row it puts a new note in its place), **1 2 3** switch between melody, bass and beat, **T** sets the note length (1, 2 or 4 steps; on a note it changes that note), **P** plays and stops (edits are heard from the next loop), **- =** change the tempo (60 to 180), **, .** switch between 16 and 32 steps, **N** renames (letters type; Enter keeps it), **S** saves and stays in the editor, **D** deletes the saved track (asks first, and No is the first choice), **C** copies it as `.track` text, **V** pastes one in.
- **Drafts:** the work in progress is saved after every edit, so Escape loses nothing. The next time the editor opens, the first choice is `Continue your draft`.
- **Saving:** needs a name that is free (not another demo, a record, or a menu word) and at least one note. A save pays 90 points and +6 mood when the track has at least 8 notes on at least 2 channels, and then not again until 6 game hours have passed. All of this is in `MAKE_TRACKS` in `config.ts`, with the limits: 12 saved tracks, names up to 24 letters, up to 32 steps.
- **Where they play:** the record player's menu lists the records, then `Demos...` (only when there is at least one demo), then `Stop the music`. `Demos...` opens a list of your tracks. A demo plays and lifts mood like a record. The menu is built when you press E at the record stand, so a track made a moment ago is there.
- **Saved under** the localStorage key `life.tracks.v1` (not `life.sound.v1`): the tracks as `.track` text, the draft, the next id and the reward cooldown. Ids (`demo-1`, `demo-2`, ...) are never reused. Blocked or full storage never breaks the game: the editor says `Could not save` and keeps your work on screen.
- **Putting a track in the game for good:** open the editor, load the track (pick it in the start menu), press **C**, and paste the text into a new file in `src/game/music/tracks/`, for example `04-rainy-tuesday.track`. It is exactly the file format above, so `npm test` accepts it. Delete the demo afterwards (a record and a demo cannot share a name, so rename or delete one).
- **Pasting in** (V) accepts only what the editor can show: one beat channel and up to two tunes, notes on the half beat and at most 4 steps long, at most 32 steps, notes between C3 and B5 (melody) or C2 and B3 (bass), a whole-number tempo of 60 to 180, a name the editor allows, and at most 2 KB. Anything else is refused with the reason, and nothing changes. A pasted track is a draft until you press S.
- The code is `src/game/music/demos.ts` (the grid and the text round trip), `demo-store.ts` (storage and the reward), `demo-library.ts` (the shared store and the record menu), `src/game/activities/make-track.ts` (the editor) and `src/render/track-editor.ts` (how it looks).

## System tracks and the sleep lullaby (issue 078)
`src/game/music/system/` holds tracks the game plays for itself. They are `.track` files like the records, but the record player never reads that folder: they are not in its menu, cannot be chosen, and are not saved in `life.sound.v1`. `src/game/music/system-tracks.ts` loads them by id (the file name). Today there are two: the encounter's battle loop (see "The encounter's music" below) and `sleep-lullaby.track`, a first draft by Claude to be replaced by ear (edit the file, or make one in the track editor and paste it in): four bars of three beats at 72 bpm, a sine melody over a triangle bass, exactly 10 seconds, so one pass covers the 9 second sleep.

The sound has extra buses, `sleep` (issue 078) and `encounter` (issue 091a), next to `effects` and `music` (`Bus` in `synth.ts`). Each is made the first time it is used, and sits at 0 (silent) until ramped up. `Synth.rampBus(bus, level, seconds)` moves a bus's gain in a straight line from where it is now (it replaces a ramp that is going; `busLevel` reads where a bus is); only the bus moves, never the notes on it and never the master, so mute is untouched. `MusicPlayer` takes the bus name (`"music"` for the record player, `"sleep"` for the lullaby's own player).

**While you sleep** (`src/game/sound/sleep-sound.ts`, driven by the scene of the sleep activity, see `docs/sleep.md`):
- The lullaby fades in over `lullabyIn` (1.5 s) starting `lullabyInDelay` (0.3 s) after you lie down, to `lullabyGain` (0.55) on the sleep bus, and fades out over the last `lullabyOut` (2 s). Naps have none.
- A **playing record is ducked, not stopped**: its bus goes to `duckTo` (12 percent) of its level over `duckDown` (1 s), and comes back over `duckUp` (1.5 s) from the start of the wake. The record keeps playing in time and tune, quietly; the player, the chosen record, "Now playing" and the saved choice never change. The little notes over the record player stop while it is ducked. Naps do not duck.
- A **snore** (`SOUND.effects.snore`, the quietest sound in the game, `SLEEP.sleep.snoreGain`) on each out-breath while asleep, only in a sleep, never a nap.
- **Escape** (or an error) puts every bus back to rest in `escapeRestore` (0.4 s) and stops the lullaby.
- **Mute** is untouched: the master gain is 0 and everything is silent, the fades going on in time, so unmuting part way is at the right point of the fade. The sequence never changes the mute or writes the saved settings (a duck is never saved).
- With **no audio** (before the first key, or no audio in the browser) the sequence runs in silence. The lullaby starts only if there is a synth when the sequence begins: audio that starts part way through stays silent to its end.

## The encounter's music (issue 091)
An ad encounter has a battle-style loop and two result jingles. How it behaves in the game (when it starts, four passes then a fade, ducking the record, reduced motion, Escape) is in `docs/random-encounters.md` ("The encounter's music and result jingles"); the design and Marc's answers are in `docs/encounter-music-design.md`. This section is about the track and how to tune it.

### What a system track is
A `.track` file in `src/game/music/system/`, loaded by `system-tracks.ts` by its file name (`encounter-battle.track` is `SYSTEM_TRACKS["encounter-battle"]`, exported as `ENCOUNTER_BATTLE`). It is the same format as a record, but the record player never reads that folder, so it is never in the menu, cannot be chosen and is never saved. The game plays it itself, through its own `MusicPlayer` on its own bus (`"encounter"`), so the record can be ducked independently. A file with a mistake is logged and left out (the encounter is then silent; the tests fail on it).

### The encounter track
`encounter-battle.track` holds **only the loop**: the format has no intro, and the entrance (buzz, rising pulse run, hit chord) is the intro. It is Marc's (issue 091d, merged from his own PR): key of G, 135 bpm, sixteen beats (four bars of four) so a pass is 16 x 60 / 135, about 7.1 s; channels `melody` (square), `harmony_h` and `harmony_l` (sawtooth), `bass` (triangle) and `beat` (drums). It starts on the downbeat the hit chord lands on, and it plays `maxLoops` passes then fades (all in the table below). The old placeholder (8 s, 120 bpm, three channels) is gone; Marc also chose on purpose to go past the editor's limits (135 bpm, sawtooth harmonies, sixteen-beat loops written by hand), so only the guard below applies.

**The guard test** is `src/game/encounter-sound.test.ts`, "the placeholder system track" (the name is from the first draft). It checks that `system/` holds exactly the two files (add a system track and you must add it to that list), that the track parses, that it is not a record or in the record menu, that no note ends after the track's end and the first note is at beat 0, and that one pass is at least 6 s and four passes are 24 to 40 s. It does not check tempo or waves. It does not check that every channel is the same length (only that none runs past the longest), so keep the channels equal by hand or the shorter ones go quiet at the end of each pass.

### Lab markers versus the game
The music lab (`docs/music-lab.md`) reads the `.track` format plus two marker lines, `== intro ==` (played once) and `== loop ==`. The game has no intro: a system track is only a loop. So to put a lab result in the game, copy the header (`title:`, `note:`, `tempo:`) and the channels of the **loop** section only into `encounter-battle.track`, with no marker lines (a text with no marker is all loop, so plain text round-trips). The lab's intro is for auditioning a lead-in; "Play with the encounter intro" plays the game's real entrance cues and starts the loop on the hit, so you hear it the way the game does. The lab's sliders (tempo, per-channel volume) are not in the file until you press "Write slider values into the text". The lab's **encounter music level** is `ENCOUNTERS.music.gain` and is not written into the text: copy that number into `config.ts` by hand. The lab's own encounter stand-in (`labmusic=1`) has its own copy of the duck and fade numbers (`LAB_ENCOUNTER` in `src/lab/lab-encounter.ts`), which are not read from config.

### Tuning by ear
An agent cannot hear; this is Marc's to do.
1. **The track:** run `npm run dev`, open `http://localhost:5173/music-lab.html`, edit the loop, and use "Play with the encounter intro" to hear it after the real entrance. Copy the result into `src/game/music/system/encounter-battle.track` (above). `npm test` guards it.
2. **In the real game:** open `http://localhost:5173/?encounter=ad-candle&again=1` (the dev server only; any ad id or `random`). Press any key to start (the browser keeps audio locked until a key press), play it, then press any key to start it again with no reload. Listen for: the loop starting on the hit chord and in time with it; the record going quiet and coming back; four passes then a quiet card; each way out (Ignore, Unsubscribe, Add to cart, Escape, E to skip the entrance); and a reduced-motion setting in the browser (no music, the jingles still play).
3. **The numbers:** change them in `ENCOUNTERS.music` in `src/game/config.ts` (the dev server reloads). The jingle notes are `SOUND.effects.encounterUnsubscribed` and `encounterCart`; their gains are in the voices. The loop level is also easy to try in the lab first.

### Every number in `ENCOUNTERS.music`
Times are seconds; "bus level" is a Web Audio gain (1 is unchanged); everything goes on through the master (`SOUND.master`, 0.35) and mute.

| Key | Value | Meaning and unit |
|---|---|---|
| `startFrame` | 32 | The entrance frame (60 a second) on which the loop starts; must equal the frame of the `encounter-hit` cue in `ENCOUNTERS.entrance.sounds` (a test checks). With an E skip the loop starts when the card opens instead. |
| `gain` | 0.35 | Level of the `encounter` bus while the loop plays (absolute, not times `SOUND.musicLevel`; with `musicLevel` 0.7 it is half the record). The track's own channel volumes are on top of it. |
| `maxLoops` | 4 | Number of full passes before the loop fades itself out (a count; one pass is about 7.1 s, so about 28.4 s). |
| `loopFadeOut` | 4 | Seconds the loop fades to silence after the last pass. |
| `duckTo` | 0 | The record's level during an encounter as a fraction of `SOUND.musicLevel` (0 is silence, 1 no change). The record keeps playing. |
| `duckDown` | 0.3 | Seconds the record takes to go down to `duckTo`, from the first frame of the encounter. |
| `duckUp` | 1.5 | Seconds the record takes to return to `SOUND.musicLevel`, starting when the exit wipe begins (and after an Escape). |
| `resultFade` | 0.35 | Seconds the loop fades when the closing line opens, or when the exit wipe begins with no closing line. |
| `escapeFade` | 0.25 | Seconds the loop fades when the encounter ends any other way (Escape, a cancelled dialog, an error). |
| `jingles` | `{ unsubscribed: "encounter-unsubscribed", cart: "encounter-cart" }` | Outcome to cue name, for the outcomes that succeeded. An outcome not listed has no jingle and keeps `entrance.exitCue`. Cue to effect is in `SOUND.cues`; the notes are in `SOUND.effects`. |

Related numbers elsewhere: `SOUND.musicLevel` (0.7) is the record's level; `ENCOUNTERS.entrance.skipAfter` (6) is the frame after which E skips; `entrance.exitCue` and `softCue` name the exit echo and the reduced-motion note.

## The music lab (issue 122)
A dev-only page for trying tracks with the real synth (live `.track` editing, an intro and a loop heard together, sliders, the real encounter): see `docs/music-lab.md`.

## Mute
Press **M** to mute and unmute. While muted a small `MUTE` tag shows at the top of the screen; after unmuting `SOUND ON` shows for a moment. M is a letter in the typing (work) mini-game, and while a name is typed in the track editor, so it does nothing there.

## Tuning the sound effects
Everything is in `config.ts`, under `SOUND` and `MUSIC`: master volume (`SOUND.master`), the voice cap, and every effect (`SOUND.effects`): each is a list of voices with a wave, pitch (Hz), length (seconds) and loudness. Footsteps differ by room floor (`SOUND.floors`: wood, stone in the kitchen, tile in the bath) and are quieter when tired. The combo sound climbs `SOUND.combo.semitonesPerStep` for each link of the variety chain, up to `maxSteps`.

## Adding a record
Put a text file ending in `.track` in `src/game/music/tracks/`. Files are listed in file name order (so `01-`, `02-` put them in order). It appears in the record player's menu the next time the game loads (the dev server reloads by itself). A mistake in a file is logged to the console with its line, and `npm test` fails on it with the file and line named.

## The track format
```
# A comment: from a "#" at the start of a word to the end of the line.
title: My First Tune       # required, shown in the menu
note: Twinkle, twinkle.    # optional, shown after "Now playing"
tempo: 100                 # beats per minute, 30 to 300 (default 100)

[melody square 0.6]        # a channel: name, wave, volume 0 to 1 (volume optional)
C4:1 C4:1 G4:1 G4:1 | A4:1 A4:1 G4:2
F4:1 F4:1 E4:1 E4:1 | D4:1 D4:1 C4:2

[bass triangle 0.8]
C3:2 C3:2 | F3:2 C3:2
F3:2 C3:2 | G3:2 C3:2

[beat drums 0.5]           # the "drums" wave plays K (kick), S (snare), H (hat)
K:1 H:1 S:1 H:1 | K:1 H:1 S:1 H:1
K:1 H:1 S:1 H:1 | K:1 H:1 S:1 K:1
```
- **Notes** are a letter A to G, an optional `#` (sharp) or `b` (flat), and an octave 0 to 8 (`C4` is middle C, `A4` is 440 Hz), then `:` and the length **in beats**: `1`, `0.5`, `.25`, `1/2`, `3/2`. Leave off the length and it is one beat. `R:1` is a rest. `|` is ignored, so use it to mark bars.
- **Waves:** `square` (hollow, classic 8-bit), `triangle` (soft, good for bass), `sawtooth` (buzzy), `sine` (pure), `drums`.
- **Channels** each play one note at a time, all together, from the start. A channel's notes can continue over several lines. The track is as long as its longest channel, then it loops. Keep channels the same length or the shorter ones go quiet at the end of each loop.
- At 100 bpm one beat is 0.6 seconds. The example above is 16 beats (9.6 seconds).

The starter records `01-placeholder-*.track` to `03-placeholder-*.track` are placeholders so the player works; delete or replace them. The parser is `src/game/music/track.ts`.

## The dialog voice (issues 075, 077)
Dialog text types out in one of two voices: `letters` (the default since issue 077) or the older plain beep (`blip`, one per `SOUND.blipEveryChars` characters). `letters` is the flashcards' spelling voice (`mumbleNotes` in `src/game/flashcards/mumble.ts`) played for the dialog typewriter. At each beep slot it plays the soft `mumble` sound for the letter that just appeared (vowels higher, consonants lower; a space or a mark is a rest), at half the flashcards' loudness (`SOUND.dialogLetters`) and with a little random wobble in pitch. Text that is skipped ahead plays nothing, it stops when the dialog closes, and it stays inside the usual voice cap. The flashcards' own voices are untouched.
- **`letters` is the default.** `beep` is the other option and sounds exactly as before (a golden test, `src/game/sound/golden/dialog-beep-voices.json`, was recorded on main and compares it call by call).
- **Switch it in the game:** press L (achievements), then **D**. The right of the footer row shows `DIALOG VOICE: BEEP` or `LETTERS`. It is saved in `life.sound.v1` as `dialogVoice` (plus `dialogVoiceChosen: true`, written only when you press D; the 075 build had saved a plain `beep` into every save, so a saved `beep` counts only with that marker. An old save, a `beep` without the marker, a junk value or junk marker, or no storage at all means `letters`).
- **Quick try, dev server only:** `?dialogvoice=beep` (or `letters`) uses that voice for the visit without saving it (it sets neither the voice nor the marker).
- Keys now used in the list screen: L (close), arrows, D (dialog voice), Shift+R then Y (reset). Issue 043's ad blocker key must avoid these.
- To judge it: open any dialog (the record player menu, a note, a cutscene line) in each mode and listen. Switch back to beep with D, or remove the choice (`SOUND.dialogLetters`, `dialogVoices`, the `letters` method in `sound/feature.ts` and the D key are all the code there is).

