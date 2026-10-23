---
id: 059
title: Make your own tracks in the game (mix-in mini-game)
status: review
owner: marc + claude
depends_on: []
---

## Goal
Marc's idea (2026-10-23): create tracks in the game itself. The "mix" mini-game (see `docs/tasks-v2.md`) becomes a small editor that writes `.track` files (format in `docs/music.md`), and the results show up in the soundtrack. Decide where the player finds them: through the record player too, or somewhere else that fits the fiction.

## Design questions (Marc decides)
- **Where do your own tracks live and play?** Options: (a) the record player menu, with your tracks listed after the records; (b) a separate source that fits the room: the recording gear on the desk (audio interface and laptop from the recording photos) plays "demos", so the record player stays for real records and your demos have their own entry; (c) both, with the record player listing demos under a "Demos" heading. Recommendation: (c) in the menu with a clear label, since the player is already the music control, and keep a separate "play demo" action at the recording gear later.
- **How you make them:** a small step editor over the existing track format, not a full tracker: one melody channel, one bass, one beat; a grid of 16 steps by pitch, moving a cursor with the arrows and placing a note with E; play and stop; name it. It is a free-form tool (decided).
- **Where saved:** browser storage (alongside `life.sound.v1`), exportable as a `.track` text file (a copy-to-clipboard or download) so Marc can put good ones into `src/game/music/tracks/`; importing a pasted `.track` is a bonus.
- **Mood and points:** making a track pays points and a mood bump; a track you made plays like a record (mood lift while it plays).

## Marc's answers (2026-10-23)
- **Where tracks play: both.** Your tracks are listed in the record player menu under a "Demos" heading, and later the recording gear at the desk (audio interface and laptop) gets its own "play demo" action.
- **A free-form tool, not a timed mini-game:** no clock or score pressure while editing; making and saving a track pays points and a mood bump once, with a cooldown so it cannot be farmed.

## Marc's picks on the design note (2026-10-23): all of the recommendations in `docs/make-tracks.md`
Layout A (piano roll); opens at the desk laptop as a new task (it appears in the 039 choice cycle) replacing "Mix the demo"; notes may be held for 2 or 4 steps (a key to change the length); waves fixed per channel; Demos under a `Demos...` submenu in the record menu; reward 90 points and +6 mood once per 6 game hours for a track of at least 8 notes across at least 2 channels; limits 12 tracks, 24-letter names, 32 steps; the game clock held still while editing; import rejects tracks the editor cannot show; a playing demo lifts mood like a record; new tracks start as "Untitled N". Stage 4 (play a demo at the recording gear) is a follow-up.

## Acceptance criteria
- A short design note in `docs/make-tracks.md` with the choices above and mockups of the editor at 320x192 (ASCII is fine), Marc picks.
- Then a first build: the editor, saving, listing and playing made tracks, with tests (the editor output always parses with the track parser, bad input is rejected, storage failures are tolerated) and a way to delete a track. `npm test` and `npm run build` pass; Marc tries it.

## Progress log

- 2026-10-23: Started (work-issue). Building stages 1 to 3 of `docs/make-tracks.md`: (1) data, storage `life.tracks.v1`, parser round trip, limits, tests; (2) the piano roll editor as an activity at the desk laptop, clock held, Escape always exits, drafts, export and import; (3) Demos under `Demos...` in the record menu (built at press time), demos lift mood like records. Stage 4 (play a demo at the recording gear) is left as a follow-up.
- 2026-10-23: Built stages 1 to 3. Branch `issue/059-make-your-own-tracks`.
  - **Stage 1 (data, storage, round trip):** `src/game/music/demos.ts` (the grid, `gridToTrackText`, `trackTextToGrid` with the "fit" check, names, edit functions), `demo-store.ts` (`DemoStore` over `KeyValueStorage`, key `life.tracks.v1`, draft, ids never reused, reward cooldown), `demo-library.ts` (the shared store and `currentRecordMenu`), limits in `MAKE_TRACKS` in `config.ts`. Tests: `demos.test.ts`, `demo-store.test.ts`.
  - **Stage 2 (the editor):** `src/game/activities/make-track.ts` (the `make-track` activity, layout A, the piano roll) and `src/render/track-editor.ts` (drawing). New desk task `make-track` ("Make a track", last in the desk's choice cycle; `apartment.ts`, `tasks.ts`); "Mix the demo" replaced in `docs/tasks-v2.md`. The game clock is held still by a new optional `holdsClock` on activities (`Game.tickClock`); Escape always exits; drafts are written after every edit; C copies, V pastes (`src/input/clipboard.ts`, with a fallback to Ctrl+V). Saving pays through a new `InteractionSystem.award` (reached by `host.reward`), so popups, combo and sound still work, and the task has no cooldown of its own. Preview plays through the music player via new `preview` and `blip` events; `MusicPlayer.swap` makes edits take effect at the end of the loop. Tests: `activities/make-track.test.ts` (incl. a random key fuzz over the activity), `make-track-game.test.ts` (real `Game`, incl. a random key fuzz, Escape at every moment, clock held, reward, sound), the Escape table in `escape.test.ts`, `music-player.test.ts` (`swap`).
  - **Stage 3 (Demos in the record player):** the record task's `dialog` may now be a function (`dialogOf`), and the record menu is built when E is pressed: records, `Demos...` (only when there are demos; opens a list of titles), `Stop the music`. `SoundFeature` finds demos as well as records (a chosen demo is remembered in `life.sound.v1`; a deleted one stops; a saved-again one plays as it is now) and lifts mood for a demo like a record. Tests in `make-track-game.test.ts` ("Demos in the record player menu").
  - **Docs:** `docs/music.md` ("Your own tracks", including how to export a track into `src/game/music/tracks/`), `docs/activities.md`, `docs/tasks-v2.md`, status line of `docs/make-tracks.md`.
  - **Where the build differs from the design note (please read):**
    1. A track with no notes is **refused** at save (`Add some notes first.`), not saved without a reward. The draft already keeps unfinished work, and this keeps the rule "everything saved parses and plays" (the parser refuses a track with no notes).
    2. The reward cooldown is stored as `cooldownLeft` (game minutes left) rather than `lastGameMinute`, because game minutes restart at zero on each page load. It counts down in game time while the game runs and is written with every save or draft write. It is counted from the first time the editor looks at it in a session, so a reload can only make the wait a little longer, never shorter.
    3. In the record menu, Escape in `Demos...` leaves the whole task (the game's rule since issue 046, with its test); the cancel key (X) goes back one level to the records, as in other nested menus. The note said Escape goes back.
    4. Leaving the editor with Escape is a cancelled task, so it also counts toward the "Changed My Mind" achievement (stop a task partway, three times). Not changed; a follow-up if Marc minds.
    5. While the editor is open the apartment clock, energy and mood stand still and the music gives no mood, but the interaction timer (other tasks' cooldowns, the combo window) still runs.
    6. M still mutes in the editor except while a name is typed (new optional `readsLetters` on activities).
    7. Pasting normalises waves and volumes to the editor's own (it does not reject a `sine` lead); channels named `melody` and `bass` go where the name says, otherwise the lower of two tunes is the bass.
    8. Names are compared without caring about case. Reserved: `Stop the music`, `Demos...`, `New track`, `Continue your draft`, `Cancel`, `Yes`, `No`, `Back`, and every record title.
  - **How checked:** `npm test` (1400+ tests, all pass) and `npm run build` pass. The editor was rendered in the real game in headless Chrome at 1x (320x192 canvas, driven with real key events: desk, choice cycle, editor, notes, beat, playing, naming, save, 32 steps, Demos menu, copy, paste prompt) and looked at; a 700-key random run in that real browser logged no errors. Fuzz-style checks in the tests: random edits always give text that `parseTrack` accepts (300 random grids, round trip equal), random key and dialog sequences over the activity (60 seeds) and over the real game (40 seeds) never throw, never leave the game locked, and every saved track parses.
  - **Not checked:** how the preview sounds (no speakers in headless; the audio path is covered by fake-audio tests only), `swap` timing by ear, paste with the real Ctrl+V and the clipboard permission prompt in a normal browser tab, Firefox and Safari.
  - **Left for later:** stage 4 (a "Play a demo" action at the recording gear on the desk), a download-as-file button for export, the achievement note above.
