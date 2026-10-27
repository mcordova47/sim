---
id: 074
title: Art for the first gifts (paintings, lamps, plant, poster)
status: done
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

- 2026-10-27 (start): plan: draw the 15 wall pieces, 2 lamps and the dried flowers from the reference photos (read by absolute path from the main checkout, not copied), render them, add a mockup script, list them in docs/art-style.md. No game code, no item registration.
- 2026-10-27 (done, ready for review):
  - Drew all 15 sprites in `art/src/` with exactly the names and sizes in the issue: `art-robin`, `art-silver-landscape`, `art-green-still-life`, `art-concert-poster`, `art-dark-animal` (32x16), `art-white-building` (48x16), `art-oak-box`, `art-pale-mat`, `art-small-blue`, `art-tall-brown`, `art-dark-postcard`, `art-gold-narrow` (32x16), `lamp-warm`, `lamp-candle`, `plant-dried` (16x16). PNGs rendered to `public/sprites/` by `npm run sprites`. They are abstract impressions with no text, signatures or brand names. Wall pieces sit in the middle of the slot with transparent margins, as the existing paintings do; the frames differ in size and shape (the robin, still life, dark animal, tall brown, oak box are portrait or near square; the silver landscape and small blue are landscape).
  - Note for Marc: the poster photo shows the same framed gold-and-orange print as the existing `painting-desk`. To keep `art-concert-poster` a different picture I drew it as an unframed paper poster (pale border, tape at the corners) with a mirrored, more geometric orange and gold field. It still shares the idea of the S-curve, pale disc and dark bar, so at 1x it is related to `painting-desk` but not the same picture. If Marc wants a different poster, say what it shows.
  - `lamp-warm` has a conical tangerine and butter shade on a round brick-red base; `lamp-candle` is a cream candle with a flame in a green glass votive. Both keep `lamp-table`'s small table and 16x16 cell so they swap in. The flicker is for stage A.
  - `plant-dried` is a turned wooden vase with cream and plum sprays and a tan rose, in the same 16x16 cell and base row as `plant-0..3`.
  - New `scripts/gifts-mockup.mjs` composes every new wall piece beside the existing paintings on the main room's back wall, the four lamps (old and new, with `stool-lamp`) on floor, and three bookshelves with `plant-0`, `plant-3` and `plant-dried` in the plant slot. `docs/art-style.md` lists the new sprites.
  - How to view: from the worktree run `npm run sprites -- --sheet=art-,lamp-,plant-dried` (contact sheet at 4x: `art/contact-sheet.png`) and `node scripts/gifts-mockup.mjs` (`art/mockup-gifts.png` at 4x and `art/mockup-gifts-1x.png`). Both are gitignored. Worktree: /Users/marccordova/Dev/repos/mcordova47/life-worktrees/074-art-first-gifts.
  - Checks: `npm run sprites` passes (palette only, sizes validated); `npm test` 1994 passed, golden main-room frame test unchanged (nothing is placed in the room); `npm run build` passes. I looked at the contact sheet and the mockup at 4x and 1x and at 8x close-ups of each group. Distinct at 1x: yes for all of the first-ten pictures (marsh, still life, robin, poster, animal, building). The six later pieces are tiny frames and are alike in pairs (`art-pale-mat` and `art-gold-narrow` are both ornate gold with a wide mat; they differ in size and print colour, as the real two do).
  - Honest weak spots: the dried flowers' cream sprays read a little like antlers at 1x; the candle is small; the white building is tiny inside its wide slot (the real piece is tall).
  - Not checked: how it looks in the running game (nothing is registered or placed, per the issue).

- 2026-10-27 (Review, independent): verdict APPROVE.
  - Criterion 1 (names, sizes, palette, no text, no photo copies): pass. Own script checked all 15 sprite files (the log says 18 but the list has 15) against the exact names and sizes: all correct. `npm run sprites` passes (palette only). No photo files or names in the sprite files; at 16px height nothing is legible as text.
  - Criterion 2 (distinct, lamps read as lamps, dried flowers): pass. Pixel comparison of every 32x16 pair including `painting` and `painting-desk` found none with under 50% differing pixels, and no sprite is identical to `painting-wide`, `lamp-table` or `plant-0`. Looked at 1x and 4x: the pictures are clearly different. `art-concert-poster` is related to `painting-desk` by colour (orange and gold) but differs in frame (unframed with tape), layout and shape. The cream sprays of `plant-dried` read slightly like antlers at 1x but as dried flowers in a vase at 4x, not a growing plant. The candle is small but reads as a candle with a flame.
  - Criterion 3 (sheet and mockup): pass. Rendered `npm run sprites -- --sheet=art-,lamp-,plant-dried` and `node scripts/gifts-mockup.mjs` and looked at both at 4x and 1x. The mockup shows every new painting beside the existing ones, the lamps and the three plants on the shelf slot. The log says how to view them. The paintings are on a back-wall strip, not at the real slot coordinates.
  - Criterion 4 (not registered, no game code, docs, checks): pass. The diff touches only `art/src`, `public/sprites`, `docs/art-style.md`, `scripts/gifts-mockup.mjs` and this issue; nothing under `src/`. `docs/art-style.md` lists all 15. `lamp-warm` and `lamp-candle` share `lamp-table`'s 16x16 cell and its table (rows 11 to 15 identical; the bases differ above). `plant-dried` fits the cell and ends on row 15 like `plant-0..3`. `npm test` 1994 passed, `npm run build` passes.
  - Not verified: how it looks in the running game (nothing placed).
  - Minor, not blocking: the later-list pieces are small frames and alike in pairs (`art-pale-mat` and `art-gold-narrow`).
