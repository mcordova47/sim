---
id: 050
title: Guitar redraw (Marc's tweaks)
status: todo
owner: marc + agent
depends_on: []
---

## Goal
The hanging guitar (`guitar`, 16x16, headstock west, neck and body east, profile like the player facing right) reads weakly: at 1x it looks like a small bow-tie, with no sound hole or strings. Marc has tweaks and may draw it himself (2026-10-23). `guitar-nylon` should match.

## Acceptance criteria
- Marc supplies a drawing or direction (as a `.sprite` grid, a sketch or a photo); an agent turns it into `guitar` and `guitar-nylon` (same format, 16x16, palette only) and renders it at 1x and 4x in the main room next to the player sprite.
- If 16x16 cannot carry it, propose a different footprint or pose, with Marc's pick, then do it in 044 (map).
- Guitar and nylon guitar both read as guitars at 1x (sound hole, a few strings, a clear body-and-neck shape); Marc signs off.
- `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log
