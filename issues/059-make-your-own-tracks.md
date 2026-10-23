---
id: 059
title: Make your own tracks in the game (mix-in mini-game)
status: todo
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
