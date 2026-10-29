---
id: 122
title: A dev-only music lab (live .track editing with the real synth, intro tuning)
status: todo
owner: claude
depends_on: []
---

## Goal
Marc (2026-10-29): a quick way to iterate on music design. A dev-only page (served by the Vite dev server, never in the production build; `npm run check:dist` fails if it leaks) that uses the game's own sound engine, so it sounds exactly like the game.

Marc's requirements: edit a track as `.track` text (the make-track editor's format, `docs/make-tracks.md`) and hear it; **live preview must be switchable off** (a toggle; when off, a Play button replays on demand); a way to **tune the intro as well as the loop and hear both together** (a track's intro section plus the looping body; see how `docs/music.md` and the record player treat intros and loops, and the encounter music design in `docs/encounter-music-design.md` on the 091 design branch); loop a chosen section; sliders for tempo, instrument gains and the master level (copy the final values back); mute a channel; a link or button that plays the same track in the real encounter (entrance flash, bar wipe, record ducking) through the existing `?encounter=` dev shortcut. Prefer reusing the track parser and player; no new sound code beyond what the lab needs.

## Acceptance criteria
- The lab plays a pasted `.track` with live preview on and off; intro and loop tuned and heard together; the controls above work; dev-only (check:dist passes, production bundle unchanged); tests for the parts that are pure (text to track, section selection, copy-back of values); an agent cannot hear: unverified until Marc listens, with exact steps; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log

