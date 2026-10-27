# Make your own tracks (design note, issue 059)

Status: Marc picked all the recommendations. Stages 1 to 3 are built (data and storage, the editor, Demos in the record player). Stage 4 (play a demo at the recording gear) is a follow-up. How it works now is in `docs/music.md` ("Your own tracks"); where the build differs from this note is listed in the issue 059 progress log.

Marc's decisions so far (2026-10-23):
- Your own tracks play in the record player menu under a **Demos** heading, and later also at the recording gear on the desk (a "play demo" action).
- It is a **free-form tool**, not a timed mini-game. No clock or score pressure while you edit.
- Saving pays points and a mood bump **once**, with a cooldown so it cannot be farmed.

## 1. The idea in one paragraph
A small step editor over the existing `.track` format (`docs/music.md`, parser in `src/game/music/track.ts`). Three channels: **melody**, **bass** and **beat**. A grid of steps across and pitches down. Move a cursor with the arrows, press E to place or clear a note, press P to play and stop. Name the track, save it, delete it. What it saves is plain `.track` text, so a made track is parsed by the same parser as a real record, plays through the same `MusicPlayer`, and can be copied out and dropped into `src/game/music/tracks/`.

## 2. The model (what the editor edits)
The editor does not keep its own format. It keeps a small grid and turns it into `.track` text on save (and back again when it loads).

- **Step**: half a beat (an eighth note). One note per step per channel, one step long. (Longer notes: stage 2 option, see open questions.)
- **Length**: 16 steps (8 beats, one bar of 4/4 with eighths) by default; the player can switch to 32 steps (two pages). Max 32.
- **Tempo**: 60 to 180 bpm, default 100, changed with `-` and `=` in steps of 4. (The parser allows 30 to 300; the editor stays in a calmer range.)
- **Channels** (fixed, always these three, so the layout never changes):
  - `melody`: wave `square`, volume 0.6. Pitches C3 to B5 (36 pitches, shown 12 at a time).
  - `bass`: wave `triangle`, volume 0.8. Pitches C2 to B3 (24 pitches).
  - `beat`: wave `drums`, volume 0.5. Rows K (kick), S (snare), H (hat).
- Waves are fixed in version 1 (open question: a key to change the melody wave).
- Rests are written for empty steps (`R:0.5`), so all three channels are the same length and loop cleanly.

Saved text looks like this (the 16-step example):
```
title: Rainy Tuesday
tempo: 100
[melody square 0.6]
C4:0.5 R:0.5 E4:0.5 G4:0.5 ...
[bass triangle 0.8]
C2:0.5 R:0.5 R:0.5 R:0.5 ...
[beat drums 0.5]
K:0.5 H:0.5 S:0.5 H:0.5 ...
```
A bar mark `|` is written every 8 steps to keep it readable by hand.

## 3. Three layouts

The view is 320x192 with 16 px tiles, so it is 20x12 tiles. The pixel font is 5x7 with a 6 px advance, so a line of text is about 8 px tall. The mockups use **one character = 8x8 px** (40 columns by 24 rows). A tile is 2x2 characters. `#` is a placed note, `>` is the play position, `[ ]` is the cursor. The whole editor is drawn over the world like a `view` picture, so the room is hidden while you edit.

### Layout A: piano roll (one channel at a time) — recommended
The classic. You see one channel's grid: 16 steps across (16 px each), 12 pitches down (8 px each, one octave). Up and down past the edge scrolls an octave. Keys 1, 2, 3 switch channel. The beat channel shows only 3 rows.

```
+--------------------------------------+
| RAINY TUESDAY             100 BPM  16|
| 1 MELODY  2 BASS  3 BEAT   STOPPED   |
|   +----+----+----+----+----+----+----|
|B4 |    |    |    |    |    |    |    |
|A#4|    |    |    |    |    |    |    |
|A4 |    |    |    |    |    |    |    |
|G#4|    |    |    |    |    |    |    |
|G4 |    |    |##  |    |    |##  |    |
|F#4|    |    |    |    |    |    |    |
|F4 |    |    |    |    |    |    |    |
|E4 |    |##  |    |    |##  |    |    |
|D#4|    |    |    |    |    |    |    |
|D4 |    |    |    |[  ]|    |    |    |
|C#4|    |    |    |    |    |    |    |
|C4 |##  |    |    |    |    |    |##  |
|   +----+----+----+----+----+----+----|
|    1 . 2 . 3 . 4 .  5 . 6 . 7 . 8 .  |
|                                      |
| ARROWS MOVE   E NOTE   P PLAY        |
| N NAME  S SAVE  D DELETE  ESC EXIT   |
+--------------------------------------+
```
(The mockup shows 7 of the 16 steps to fit this page's width; the real grid is 16 steps at 16 px = 256 px, with a 24 px pitch label on the left, 40 px spare. Rows are 8 px, so the 12-row octave is 96 px tall.)

Fits: header 16 px, tabs 8 px, grid 104 px, beat ruler 8 px, help 16 px, margins. About 160 px of 192.

### Layout B: three lanes (everything at once)
All channels stacked, so you can see how melody, bass and beat line up. Melody lane 8 rows (a window of 8 pitches that follows the cursor), bass lane 6 rows, beat lane 3 rows. Smaller view of each, more to look at. Up and down move through all lanes, so one cursor walks the whole picture.

```
+--------------------------------------+
| RAINY TUESDAY             100 BPM  16|
|                                      |
| MELODY                               |
|G4 |    |    |##  |    |    |##  |    |
|F4 |    |    |    |    |    |    |    |
|E4 |    |##  |    |    |##  |    |    |
|D4 |    |    |    |[  ]|    |    |    |
|C4 |##  |    |    |    |    |    |##  |
|B3 |    |    |    |    |    |    |    |
| BASS                                 |
|G2 |    |    |    |    |    |    |    |
|E2 |    |    |    |    |    |    |    |
|C2 |##  |    |    |    |##  |    |    |
| BEAT                                 |
|K  |##  |    |    |    |##  |    |    |
|S  |    |    |##  |    |    |    |##  |
|H  |    |##  |    |##  |    |##  |    |
|   1 . 2 . 3 . 4 .  5 . 6 . 7 . 8 .   |
|                                      |
| ARROWS MOVE  E NOTE  P PLAY  S SAVE  |
| N NAME  D DELETE  ESC EXIT           |
+--------------------------------------+
```
Pros: one picture of the whole track. Cons: the melody lane shows only 8 pitches at once, notes are small (8 px rows) and the lane labels eat space. Higher notes need scrolling that moves one lane while the others stay.

### Layout C: tracker columns (a list of steps)
Steps run **down** as rows, channels are **columns** that show the note name as text, like an old tracker. Up and down move through steps, left and right move between channels. With E on a cell, up and down while holding E (or `+` and `-`) change the pitch; the cell shows the note name. 16 rows at 8 px is 128 px; the 32-step version scrolls.

```
+--------------------------------------+
| RAINY TUESDAY             100 BPM  16|
| STEP  MELODY   BASS    BEAT  STOPPED |
|  01   C4       C2      K             |
|  02   ---      ---     H             |
|  03   E4       ---     ---           |
|  04   ---      ---     H             |
|  05   G4       ---     S             |
|  06   ---      ---     ---           |
|> 07   [ G4 ]   C2      H             |
|  08   ---      ---     ---           |
|  09   E4       C2      K             |
|  10   ---      ---     H             |
|  11   ---      ---     ---           |
|  12   ---      ---     H             |
|  13   C4       ---     S             |
|  14   ---      ---     ---           |
|  15   ---      ---     H             |
|  16   ---      ---     ---           |
|                                      |
| ARROWS MOVE  E NOTE  W/Q PITCH       |
| P PLAY  N NAME  S SAVE  D DEL  ESC   |
+--------------------------------------+
```
Pros: tiny code, easy to read, exact pitch is a word, no scrolling in pitch. Cons: you cannot see a melody's shape, which is the fun part of a grid; picking a pitch takes more presses.

### Which one
**Recommend A (piano roll).** The melody's shape is what makes it feel like making music, and a grid with a cursor and E to place is what Marc described. C is the cheapest to build and is the fallback if A takes too long. B is the most to look at and the least comfortable to edit; skip it unless Marc likes the stacked picture.

## 4. Controls (layout A; B and C differ only where noted)
Letters avoid the keys the game already uses: Escape, E, X, L, M (mute), Tab and the arrows' normal meaning.

| key | does |
|---|---|
| arrows | move the cursor one step or one pitch. Past the top or bottom of the window it scrolls an octave. Past the last step it wraps to the first |
| E | place a note at the cursor; on a note, clears it. In the beat channel the row decides the drum. Each press makes a small blip of that note so you hear what you placed |
| 1, 2, 3 | switch to melody, bass or beat (keeps the step) |
| P | play from the start (loops) and stop. A moving `>` marker shows where it is. Editing while playing is allowed and takes effect on the next loop |
| `-` and `=` | tempo down and up by 4 bpm |
| `,` and `.` | shorten and lengthen the track (16 or 32 steps); shortening asks nothing but keeps the cut notes until you save (so lengthening again brings them back) |
| N | rename: letters type, Backspace deletes, Enter accepts. Escape here leaves the whole editor like everywhere else (the old name stays) |
| S | save (section 7 says what that also does) and stay in the editor |
| D | delete this track (a yes/no menu; the default choice is No) |
| C and V | copy this track as `.track` text, and paste one in (section 8) |
| Escape | exit at once, any time, from anywhere in the editor (section 6) |

In layout C: left and right change channel, up and down change step, E places or clears, `W` and `Q` raise and lower the pitch of the note under the cursor.

## 5. Where it is opened
Options:
1. **The desk (the laptop)**: a new task at the desk, "Make a track" (the prompt reads `Make a track`). The standing desk is where the recording gear belongs (audio interface, laptop) and the earlier task ideas had a "Mix the demo" at the desk, so this replaces that idea. The player sits down with the laptop; the desk art already exists.
2. **The audio interface** as its own prop on the desk: nicer, but needs new art, and the real recording photos show the gear is spread over the desk, so one object to press E on is awkward.
3. **A menu entry at the record player** ("Make a demo..."): cheapest, but the record player is for listening, and it makes the record menu longer.

**Recommend 1: the desk.** The desk has other tasks (work, journal), so the build needs to check how the interaction picks between several tasks on one spot; if it is a rotation rather than a menu, "Make a track" needs the choice menu (issue 023) or its own tile. The **recording gear's "play demo"** later (stage 4) is the same spot: the desk's choice menu lists "Make a track" and "Play a demo".

Opening the editor with no saved track starts a fresh 16-step track called `NEW TRACK`. With saved tracks, it first shows a short menu: each saved track (titles), `New track` and `Cancel`.

## 6. Input lock, Escape and dialogs
The editor is an **activity** (`src/game/activities/`, registered like `typing` and `notes`), so it already gets everything an activity gets:
- The player cannot walk (movement keys do not move the player while an activity runs) and the interaction system is held. No new `lockInput()` is needed.
- It sets `readsKeys = true` so a stray E press is not kept to start another task when it ends.
- It is `cancellable`: **Escape always exits.** The game cancels the activity, the dialog (if any) and the lock in one go, pays nothing, starts no cooldown. This also covers Escape pressed in the rename box and in the delete confirm: it leaves the whole editor, it does not just close the box. The Escape tests (`src/game/escape.test.ts` tries every real task at several moments) should list this task too.
- Inside the editor, the rename uses in-editor text entry (letters go into the name), not a dialog, so typed letters cannot trigger commands and no dialog can fight the editor for keys. The yes/no for delete and the list of tracks at the start use `openDialog`, which the activity already waits for.
- The game clock: the editor should hold the clock still (as a dialog does with `DIALOG.pauseClock`) so there is no time pressure and the apartment does not move on while you edit. The build must check how activities treat the clock and add this if they do not.
- Mute (M) still works.

**Save on exit?** Escape cannot ask "save changes?" because it must exit at once. So:
- **S saves** to the saved list (and does the reward, section 9).
- **The draft is kept automatically.** Every edit (and Escape) writes the work in progress to a `draft` slot in storage. Next time the editor opens it offers `Continue your draft` first. A draft is not listed in the Demos and plays nowhere. Closing the browser tab keeps the draft as well (it is written after each edit, not only on exit).
- Nothing is ever lost by Escape and nothing is saved by accident.
- Exit-with-save is not offered as a key (S then Escape is two presses), to keep "Escape = out, nothing changes in your saved tracks" simple and testable.

**Preview and the record player.** Playing in the editor uses the same `MusicPlayer`. It remembers the record that was on and puts it back on exit (or leaves silence if there was none). The record player's mood-over-time bonus (`MUSIC.moodPerStep`) must not count the preview, so the editor cannot be used to farm mood.

## 7. Saving: what S does
1. Checks the track (section 10). On a problem it shows the message in the editor's footer line, saves nothing.
2. Writes the track's `.track` text into storage, keeping its id (a new track gets a new id).
3. Clears the draft.
4. Pays the reward if allowed (section 9) and says so in the footer: `SAVED. +90 POINTS` or `SAVED.` when the reward is on cooldown.
5. The editor stays open so you can keep going.

## 8. Storage, limits, export and import
Storage is its own key: **`life.tracks.v1`** (not `life.sound.v1`, not `life.progress.v1`; bumping the number starts afresh and leaves the old save alone, like the other keys). The key lives in `config.ts` next to the others.

```
{ "version": 1,
  "tracks": [ { "id": "demo-1", "text": "title: Rainy Tuesday\ntempo: 100\n[melody ...", "made": 1761200000000 } ],
  "draft": { "id": "demo-1" | null, "text": "..." } | null,
  "nextId": 2,
  "reward": { "lastGameMinute": 0, "times": 0 } }
```
- The track is stored as `.track` text (the one source of truth), parsed with `parseTrack` on load. A track that no longer parses is skipped with a console message and kept in storage untouched (so it is never destroyed by a load).
- Reads and writes are guarded like `SettingsStore` (blocked or full storage, bad JSON, wrong shapes give defaults and never throw). If a write fails, the editor says `COULD NOT SAVE (STORAGE FULL OR BLOCKED)` in the footer and keeps your work in the editor. Export (below) is the way out.
- Ids are `demo-1`, `demo-2`, ... and never reused (`nextId`), so the record player's remembered choice (`life.sound.v1` holds a track id) can never point at a different track after a delete.

**Limits** (all in `config.ts`, `MAKE_TRACKS`):
| limit | value |
|---|---|
| steps per track | 32 (16 by default) |
| channels | 3, fixed |
| pitches | melody C3 to B5, bass C2 to B3 |
| tempo | 60 to 180 |
| name length | 24 characters, drawable letters only (A to Z, 0 to 9, space, `. , ! ? ' - ( ) &`); `#`, `:` and `[` are not allowed (they would break the `.track` line); trimmed |
| saved tracks | 12 |
| one track's text | 2 KB (a full 32-step track is about 1 KB) |
| whole save | well under 64 KB (12 tracks x 2 KB + one draft) |

**Names must be unique** among saved tracks, the records and `Stop the music` (the record menu picks a record by its label, `trackForLabel`). A clash is refused with `THAT NAME IS TAKEN`. (Records and demos never get the same label in the menu.)

**Export**: `C` copies the track's `.track` text to the clipboard (`navigator.clipboard`, with a hidden textarea and `execCommand("copy")` as the fallback, and if neither works it prints the text to the console and says so). The footer says `COPIED`. The text is exactly what a file in `src/game/music/tracks/` contains, so Marc can paste it into `07-rainy-tuesday.track` and the real parser accepts it. (A download-as-file button is an extra for later; it needs a click, not a key.)

**Import**: `V` reads from the clipboard (needs the browser's permission and a key press, which `V` is; if the clipboard cannot be read it asks the player to paste with Ctrl+V and handles the `paste` event). The text is parsed with `parseTrack` and then **must fit the editor**: at most 3 channels, one of each kind (a pitched channel in the melody range, a pitched one in the bass range, a drums one), every start and length a multiple of half a beat, total 32 steps or fewer, notes inside the pitch ranges, and the size/name limits above. A track that parses but does not fit is rejected with a plain reason (`NOTE TOO LONG FOR THE EDITOR (STEP 7)`). The parser's own error text with its line number is shown for bad syntax. An imported track becomes the draft (not saved until S).

## 9. Points and mood
- Saving (S) pays **90 points and +6 mood** (config: `MAKE_TRACKS.points`, `MAKE_TRACKS.mood`), matching the desk's 90-point "Record a demo" and a bit above the record's +5. Tune after Marc plays.
- **Once, with a cooldown**: the first save, and after that at most one paid save per **6 game hours** (`MAKE_TRACKS.cooldownHours`), counted in game time and kept in `reward.lastGameMinute` in the tracks save (so reloading the page does not reset it).
- A save pays only if the track is worth saving: at least **8 notes** in total and **at least 2 channels** with notes. An empty track saves (so you can store a draft) but pays nothing and says so.
- Saving an existing track again (an edit) counts the same: it is a save, it is on the same cooldown.
- No quality scaling (`NICE`/`SLOPPY` do not apply to a free-form tool).
- Backing out with Escape pays nothing, as for every other task.
- Build note: normal tasks pay when an activity **finishes**, and a task on cooldown is *blocked* from starting. The editor must not be blocked by its own cooldown (you should always be able to open it). So the task has no cooldown, points 0, and the save calls a small reward function (`awardTrackSave(host)`) that checks the reward cooldown and adds the points and mood through the same scoring path other tasks use, so the combo and popups still work. Stage 2 must look at what the scoring module allows. If the hook is awkward the fallback is: S closes the editor and finishes the activity with `completed: true`, and the task's cooldown is the reward cooldown (with a clear "come back later" message when blocked, and a free "play demos" entry that does not need the cooldown).
- **Mood while playing**: a demo plays like a record (the record player's mood lift over game time applies to demos chosen at the record player).

## 10. Errors and what the player sees
Everything shows in the editor's footer line (one line, plain words, clears after 3 s) except storage trouble at load, which goes to the console.

| problem | what happens |
|---|---|
| name empty or only spaces | save refused: `GIVE IT A NAME` |
| name taken or reserved | `THAT NAME IS TAKEN` |
| bad character in a name | the key is ignored (nothing is typed) |
| no notes | saves, no reward: `SAVED. ADD SOME NOTES FOR POINTS` |
| 12 tracks already | save of a new track refused: `12 TRACKS SAVED. DELETE ONE FIRST` (editing an existing one still works) |
| storage blocked or full | `COULD NOT SAVE`; work stays on screen and in the draft if possible; `C` still copies |
| a stored track fails to parse at load | skipped, logged, left in storage; the others load |
| the stored save is not JSON, or the wrong shape | treated as empty and not overwritten until the first successful save |
| bad import | the parser's message (with line) or the fit message; nothing changes |
| clipboard unavailable | `PASTE WITH CTRL+V` (import) or text printed to the console (export) |
| the editor throws | the activity framework reports it, cancels the task and releases the lock; the draft written so far remains |
| audio not started or unavailable | P does nothing audible and says `SOUND IS OFF (PRESS A KEY)` the first time; editing is unaffected |
| delete the track currently on the record player | the player stops (the id is gone); `life.sound.v1` then holds an id that no longer exists, which already loads as silence |

## 11. How Demos are listed in the record player menu
Today `RECORD_MENU` is built once from the files (`recordMenu(TRACKS)` in `records.ts`) and `trackForLabel` finds a record by its label. Demos change at runtime, so the menu has to be built each time the player presses E at the record player (the task's `dialog` becomes a function, or the task opens the dialog from code with `openDialog`), from `TRACKS` plus the saved demos.

Two ways to show the heading ("Marc: under a Demos heading"):
- **Submenu (recommended).** The top menu is the records, then `Demos...` (only when there is at least one), then `Stop the music`. `Demos...` opens a second menu of the demo titles; Escape goes back to the records (menus nest and cancel goes back within a run of menus, per `docs/dialogs.md`). It keeps the record menu short however many demos there are, and a heading is a real thing you can read.
- **Flat list with a heading row.** `-- DEMOS --` then the titles. It matches "under a Demos heading" literally, but the menu has no unselectable row, so the heading would be a choice that does nothing, or the menu needs a small change. Longer menu with 12 demos plus the records.

The choice made at the menu (a demo's title) is turned into a track by looking in both lists (`trackForLabel` takes the demo list too). Sound plays it like any record, remembers its id in `life.sound.v1`, and the now-playing line reads `Now playing: Rainy Tuesday. Your demo.` (the `note` line is the editor's own text, or "Your demo" if empty). The task's +5 mood and points work the same for demos.

The records module stays free of the sound feature: the demo list comes from a small `demos.ts` store (the storage code of stage 1), read when the menu is built, so if the tracks store is empty or broken the menu looks exactly as it does today.

## 12. Staged build plan
Each stage ends with `npm test` and `npm run build` passing and is safe to stop at.

**Stage 1: data, storage and the parser round trip (no UI).**
- `src/game/music/demos.ts` (or `maker/`): the grid model (`DemoGrid`: tempo, steps, three channels of cells), `gridToTrackText(grid, title)` and `trackTextToGrid(text)` (the "fit" check from section 8), name checks, limits from `MAKE_TRACKS` in `config.ts`.
- `DemoStore` over `KeyValueStorage` (the same interface `SettingsStore` uses), key `life.tracks.v1`: list, save, delete, draft, reward state; every read and write guarded.
- Tests: the editor's output always parses with `parseTrack` (a property-style test over random grids: random notes, 16 and 32 steps, every channel, empty channels, the edge pitches); the round trip grid to text to grid is the same grid; bad input is rejected (bad names, too many steps, odd lengths, out-of-range pitches, three drum channels, 13 tracks, oversize text); storage failures are tolerated (null storage, a throwing `getItem` and `setItem`, bad JSON, wrong shapes, a full quota); ids are never reused after a delete; the reward cooldown logic with a fake clock.

**Stage 2: the editor UI.**
- The `make-track` activity (layout chosen by Marc), the desk task, the start menu (draft, saved tracks, new), preview through the music player with restore on exit, footer messages, rename entry, delete confirm, copy and paste, the reward on save.
- Tests with the fake host: arrows and E place and clear, P toggles, S saves and pays once and not again inside the cooldown, Escape at every moment (placing, renaming, in the delete confirm, playing, mid-paste) cancels cleanly with no points and the lock released, the draft is written after edits, a throwing storage does not break the editor. Add the task to the Escape table test. Look at it in the browser (needs Marc's eye).

**Stage 3: Demos in the record player menu.**
- The menu built at press time (records, `Demos...`, stop), `trackForLabel` for demos, `life.sound.v1` remembering a demo id, a deleted demo resolving to silence, the now-playing line.
- Tests: with no demos the menu is unchanged (a snapshot of today's), with demos the submenu lists them, choosing plays that track, Escape backs out and pays nothing, titles cannot collide.

**Stage 4: the recording gear action.**
- A "Play a demo" action at the desk (same place as "Make a track"), with its own points and cooldown like other listen tasks (numbers in `tasks.ts`). If Marc wants it on a separate prop (audio interface), that is a new art issue first.
- Tests: the action lists demos, plays the chosen one, nothing is offered when there are none.

Update `docs/music.md` (a "Your own tracks" section) and `docs/activities.md` (the `make-track` activity) as each stage lands.

## 13. Recommendation
- **Layout A**, the piano roll, one channel at a time. C is the fallback.
- **Open it at the desk** (the laptop), as a new task replacing "Mix the demo". The record player stays for listening and lists demos; the desk later also plays them.
- **Step = half a beat, 16 steps by default, 32 at most, three fixed channels**, melody, bass and beat.
- **Escape always exits at once; S saves; a draft is kept automatically.** No "save on exit" question.
- **Demos under a `Demos...` submenu** in the record menu.
- **One reward per 6 game hours**, only for a track with real notes, 90 points and +6 mood.
- **Four stages as above**; stage 1 can start right away because it does not depend on the layout.

## 14. Open questions for Marc
1. **Layout:** A (piano roll), B (three lanes) or C (tracker columns)?
2. **Where to open it:** the desk (recommended), a separate audio interface prop (new art), or from the record player?
3. **Demos heading:** a `Demos...` submenu (recommended) or a flat list with a heading row?
4. **Reward numbers:** 90 points, +6 mood, 6 game hours cooldown, at least 8 notes. Right?
5. **Note length:** one step per note only (simplest) or also longer notes (a key to hold a note for 2, 4 steps)? Longer notes make slower melodies and a nicer bass.
6. **Waves:** fixed per channel, or a key to change the melody and bass wave (square, triangle, sawtooth, sine)?
7. **Limits:** 12 saved tracks, 24 letters in a name, 32 steps. Enough? (Longer songs would need pages and are a bigger build.)
8. **Clock while editing:** hold the game clock still (my suggestion, matches "no pressure") or let it run?
9. **Import:** is "only tracks the editor can show" fine, or should a pasted track that does not fit still be listed as a playable demo you cannot edit?
10. **Should demos also lift mood over time while they play** (as records do)? I assumed yes.
11. **Names of the made tracks:** a free name only, or a few random starting names ("Untitled 3")?
