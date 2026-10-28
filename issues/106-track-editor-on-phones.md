---
id: 106
title: The track editor (mixing tool) on phones
status: todo
owner: marc + claude
depends_on: [093]
---

## Goal
Marc (2026-10-28): the track mixing tool (the make-track editor, `docs/make-tracks.md`) is not usable on mobile. It was skipped on phones on purpose in the first stages (`docs/mobile.md`, stage 4: a tap-based track editor), and the touch hints still name keyboard keys there (issue 093 left the editor's help lines). This issue makes it usable by touch.

## What to do (design first, then build)
- A short design note in `docs/mobile.md` (or `docs/make-tracks-touch.md`): what the editor needs (placing and removing notes on the grid, choosing instrument and length, naming, play and stop, save and delete, paste of a `.track` text, the made-tracks list), how each works by touch on the 224 px narrow view and the landscape view (tap cells, a note palette, a pad scrolling the grid, a bottom bar of buttons with the 093 tap-target sizes of at least 44 CSS px where possible), naming with the hidden-input keyboard from 093, and what stays desktop-only (if anything). Recommend, and say how large it is. Marc picks from a few questions, asked one at a time.
- Then build it in small stages, reusing the 093 tap targets and hint function, with tests driving taps; desktop behaviour and goldens unchanged.

## Acceptance criteria
- A track can be made, played, saved, renamed and deleted by touch only on a phone-sized view; no hint in the editor names a key the player cannot press on the touch layer; `npm test`, `npx tsc --noEmit`, `npm run build` pass; Marc tries it on his phone; unverified items listed.

## Progress log
