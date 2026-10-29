---
id: 091
title: Encounter music: a short battle-style track during an ad, and a result jingle
status: todo
owner: marc + claude
depends_on: [080]
---

## Goal
Marc (2026-10-27): "encounter music", like the fight music in Pokemon or Final Fantasy VII, for the ad encounters. Played completely straight for a candle email, in the same deadpan as the entrance (issue 080): never acknowledge the game.

## Ideas to settle (design first; short note in `docs/random-encounters.md` or `docs/music.md`)
- **The track.** A short looping battle-style track (urgent, driving, a few seconds to a minute, chiptune from the existing synth) that starts as the entrance ends (the entrance's hit is the natural downbeat, so the track may be built as its continuation) and loops while the card and the menu are up. It is a **system track** like the sleep lullaby (`src/game/music/system/`, the `.track` text format, `system-tracks.ts`, the engine's bus), so no record-player or save changes.
- **The player's own music.** If a record is playing (or the player's own track), it ducks or pauses for the encounter and comes back after, without losing its place if possible. Decide which (duck is gentler; pause matches the "fight music takes over" feel).
- **How it ends.** Options: a short outro on any leave; and optionally a tiny "result" jingle per outcome, played straight as a battle result: a bright victory flourish for a successful unsubscribe, a small deflated note for a failed one, a cash-register-like blip for Add to cart, a plain soft end for Ignore. Keep them very short.
- **Calm tone.** No pressure: the music must not stress the player (not too fast, not too loud, bounded length of loop, a fade on leaving), and the muted game and `prefers-reduced-motion` or reduced-sound paths stay quiet; the ad blocker means no encounter and no music.
- **Who writes the music.** Either the agent writes the `.track` by hand (the format is text; the make-tracks docs describe it) and Marc tunes it, or Marc composes it in the in-game track editor and drops the saved text into `system/`. Ask Marc which; the plugin and editor ideas (issue 064) may matter later.

## Acceptance criteria (for the build, after Marc approves the design)
- The track and any jingles exist as system tracks, loop cleanly (no click at the loop point), start with the entrance's hit and fade out on every way of leaving (menu choice, Escape, E skip), with tests for the start and stop timing and for the player's music ducking or pausing and returning.
- Muted game silent; the encounter's existing entrance and exit sounds still correct; golden voice and frame tests unchanged or explained.
- `npm test`, `npx tsc --noEmit`, `npm run build` pass; how it sounds is Marc's call and is listed as unverified until he plays it.

## Progress log
- 2026-10-28: Design note written: `docs/encounter-music-design.md` (branch issue/091-design). Awaiting Marc's answers to its open questions before any build.
