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
