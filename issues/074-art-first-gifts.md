---
id: 074
title: Art for the first gifts (paintings, lamps, plant, poster)
status: todo
owner: agent
depends_on: []
---

## Goal
Stage A of issue 043 (the checkpoint source) needs the sprites for the first ten gifts (`docs/random-encounters.md`, section 3 'The first ten milestones'). Draw them now so the items can go live as soon as they are registered. Marc asked for this art on 2026-10-27.

## Sprites (name, size, what)
Names equal the item ids so stage A can register them without renaming. All palette-only, in the room's style (docs/art-style.md: top-down 3/4, ink outline, top-left light), no readable text, signatures or brand names; abstract impressions of the real things, as the existing paintings are.
- `art-robin` 32x16: the robin print, a matted version of the existing `painting-robin` (16x16) for the wall slots (table wall and desk wall are 32x16). Source: the robin photo (`robin-painting` and `barn-and-robin-over-table`).
- `art-silver-landscape` 32x16: the silver landscape from the gallery wall (the `gallery-wall*` photos; it is the first piece in `src/game/art-pieces.ts`, `silver-landscape`).
- `art-green-still-life` 32x16: the green still life (`green-still-life` in art-pieces.ts).
- `art-concert-poster` 32x16: the poster over the desk (the `bon-iver-poster` and `desk-with-bon-iver-poster` photos): an abstract impression with no text or band name.
- `art-dark-animal` 32x16: the dark animal print (`dark-animal` in art-pieces.ts; the wolf-like figure).
- `art-white-building` 48x16: the white building piece for the wide bed wall (`white-building` in art-pieces.ts).
- `lamp-warm` 16x16: a second table lamp with a warm shade, same size and angle as `lamp-table`, clearly different (see the lamp photos `record-player-and-lamp`).
- `plant-dried` 16x16: dried flowers in a vase, a plant that never grows (see `dried-flowers-on-top-of-bookshelf`); drawn to sit in the plant-shelf slot like `plant-0..3` (same 16x16 cell and base line).
- `lamp-candle` 16x16: a candle in a small holder, the first item that will flicker (the glow flicker is an engine change for stage A; draw only the sprite).
Also draw (no extra gifts yet): the other gallery wall pieces from the 'later' list as 32x16 sprites named after their item ids: `art-oak-box`, `art-pale-mat`, `art-small-blue`, `art-tall-brown`, `art-dark-postcard`, `art-gold-narrow` (they come from the same `art-pieces.ts` list; reuse the proportions of the existing `gallery-wall` strip pieces but at the wall slot size with a frame).

## Acceptance criteria
- Every sprite above exists in `art/src/` with exactly that name and size, passes `npm run sprites` (palette only), with its PNG; photos are read by absolute path from `/Users/marccordova/Dev/repos/mcordova47/life/reference-photos/` and never copied or described by name in the repo; no readable text.
- The 32x16 paintings read as different pictures from each other and from the existing `painting`, `painting-desk` and `painting-wide` at 1x and 4x; the lamps read as lamps; the dried flowers read as dried flowers and not as a growing plant.
- A contact sheet of all new sprites for Marc (`npm run sprites -- --sheet=art-,lamp-,plant-dried`), and a main-room mockup (extend the mockup script if needed) that shows each painting on the table wall, plus each lamp on the lamp table and the dried flowers on the plant shelf; render and look at them at 1x and 4x. Say in the log how to view them.
- Not registered in the game's item data (stage A does that); do not change game code. `docs/art-style.md` lists the new sprites. `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log
