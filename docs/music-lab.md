# The music lab (issue 122)

A dev-only page for iterating on music with the game's own synth and track player, so it sounds as the game does. Run `npm run dev` and open `http://localhost:5173/music-lab.html`.

**Dev only.** `music-lab.html` is a file at the project root, which the dev server serves and `vite build` never includes (only `index.html` is a build input). The encounter hook is loaded with a dynamic import behind `import.meta.env.DEV`. `npm run check:dist` fails if `dist/` has `music-lab.html` or any of the lab's code or its saved key (`life.musiclab`). The production bundle is byte for byte what main builds (the sound code was only given type-level visibility changes: `Engine.synth`, `Synth.master` and `MusicPlayer.pending`).

## The text
It is the `.track` format (`docs/music.md`, `docs/make-tracks.md`) plus two optional marker lines, because the format has no intro:
```
title: My Track           # title, note and tempo go above the first marker and are shared
tempo: 120
== intro ==               # played once
[melody square 0.5]
...
== loop ==                # then this, forever
[melody square 0.5]
...
```
With no marker the whole text is the loop, so a plain `.track` file pastes in as it is. To put a result in the game, copy the loop (or the plain text) into `src/game/music/tracks/` as usual; the game has no intro yet (the 091 design note says to skip one, since the entrance is the intro), so for an encounter the lab's intro is a way to audition a lead-in.

## Controls
- **Play** starts from the top (Ctrl or Cmd + Enter in the text does too). **Stop** stops.
- **Live preview** (a checkbox). On: while playing, edits and sliders are heard as you make them. The loop changes at the next loop end, on the beat. An edit during the intro starts again from the top (a player cannot swap an intro without losing the loop behind it). Off: nothing changes the sound until you press Play, which replays on demand.
- **Play with the encounter intro** (issue 123) plays the game's real entrance sounds (the schedule `ENCOUNTERS.entrance.sounds`: buzz, rising pulse run, hit chord, each cue looked up in `SOUND.cues`, a frame being `TIMESTEP` seconds) and starts the track's loop on the hit (frame 32, about 0.53 s in), so you hear intro into loop without the game tab. The loop goes on the same `sleep` bus at the **encounter music level** that "Try in the encounter" uses, so the balance is the game's. The text's own `== intro ==` section is not played (the entrance is the intro); live preview still works (the loop is read when the hit arrives, then changes at the next loop end). Play and Stop replace it. Code: `src/lab/lab-intro.ts` (plan and timing, tested in `lab-intro.test.ts`). The intro cue gains are not tunable here (they are `SOUND.effects` values in `config.ts`; sliders that write them back were left out to keep the preview simple).
- **Play: intro then loop / loop only / intro only (repeating)**: the intro and the loop are heard together by default. "Intro only" repeats the intro by itself so you can tune it.
- **Tempo**, **master** (`SOUND.master`), **encounter music level**, and per channel **volume** and **mute** (muting is for listening and is never written to the text). Slider values override the text until you press **Write slider values into the text**, which rewrites the `tempo:` line and each `[name wave volume]` line in place (comments and notes untouched). **Copy text** puts that text on the clipboard without changing the box. **Reset sliders** forgets them. Master and the encounter level live in `config.ts`, not the text: they are listed under "Values that belong in config.ts".
- A slider overrides the text's own tempo only once you move it. Each channel's volume is per section (`intro: bass` and `loop: bass` are separate).
- The text, mode and sliders are remembered in `localStorage` (`life.musiclab.v1`).

## The real encounter
Choose an ad and press **Try in the encounter**. It saves the lab state and opens `/?encounter=<ad>&labmusic=1&again=1` in a new tab, the existing dev shortcut (`decor-dev.ts`): press any key in that tab to start the entrance. With `labmusic=1` (dev only, `src/lab/lab-encounter.ts`) the lab track plays under the encounter the way the 091 design note describes: the playing record is ducked to silence over 0.3 s from the first frame, the track starts on the hit frame (frame 32), or when the card opens if E skipped the entrance, and when the encounter ends it fades out over 0.35 s while the record returns over 1.5 s. It is a stand-in for that feature, not the feature: it plays on the `sleep` bus, has no loop limit and no result jingles. The master slider moves the game's master level for that tab until you press M twice (unmuting resets it).

## Code
- `src/lab/lab-text.ts`: the pure parts (text to tracks, section choice, sliders applied, copy-back). Tests in `lab-text.test.ts`.
- `src/lab/lab-player.ts`: intro then loop on a `MusicPlayer`. `lab-audio.ts`: the small bridge to the synth.
- `src/lab/lab-store.ts`: what is remembered. `src/lab/lab-encounter.ts`: the encounter hook.
- `src/lab/music-lab.ts` and `music-lab.html`: the page.

An agent cannot hear: how any of this sounds is checked only by listening (the audition steps are in the issue 122 log).
