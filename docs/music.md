# Music: the record player and the track format

Sound and music are made in code with the Web Audio API. There are no audio files. The sound feature is `src/game/sound/` and is switched on by one line in `src/game/features.ts`; delete that line and the game is silent (the record player menu is still there, it just plays nothing).

## How the record player works
- Face the record stand and press E (task `record-play`, "Choose a record"). A menu lists every record plus **Stop the music**. Escape backs out and changes nothing (and pays nothing).
- Choosing pays points (like the guitar) and gives a small mood bump (+5, in `tasks.ts`). The record then loops until you pick another or stop.
- While a record plays, mood climbs a little over game time: `MUSIC.moodPerStep` every `MUSIC.everyGameMinutes` of game time, never past `MUSIC.moodCap` (all in `config.ts`).
- A line at the bottom of the screen names the record for a few seconds after choosing, and any time you face the record player.
- The chosen record is remembered between visits (and the mute setting) under the localStorage key `life.sound.v1`. The game starts in silence the very first time. Browsers only allow sound after a key press, so a remembered record starts at the first key you press.

## Mute
Press **M** to mute and unmute. While muted a small `MUTE` tag shows at the top of the screen; after unmuting `SOUND ON` shows for a moment. M is a letter in the typing (work) mini-game, so it does nothing there.

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
