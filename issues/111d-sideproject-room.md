---
id: 111d
title: Side project config 4: the real config file and the figure
status: review
owner: claude
depends_on: [111a, 111b, 111c]
---

## Goal
Stage D: the real `side-project-room.txt` (the figure standing on the desk, a few drifts: sofa the wrong way, desk and table swapped as Marc described in issue 101), the figure sprite, shipped-file tests, golden. The old PNG is removed only after Marc agrees.

Design and Marc's answers (2026-10-29): `docs/side-project-config-design.md` (the little room is a faithful copy of the real room plus overrides from a config text file; drawn as a smoothed half-scale copy with a dim and light noise; `when` conditions come later in stage E; the tiny figure is a fixed glitch standing on the desk; no real effect at first, the picture only). Marc's idea (2026-10-29): the side project could have its own title, something like "Siminal Crossing" (text for the text review when picked). Main must be no worse than today after this stage (docs/deploy.md).

Marc's meaning of "perspective" (2026-10-29): not a geometric warp. Each piece of the little room is drawn from a different, wrong viewpoint, about an order of magnitude more wrong than the game is wrong about the real room (base reality, then the game, then the game inside the game): for example the sofa drawn from behind, the bed and the bookshelf top-down. That is art, not code: draw a small set of "wrong view" variants of the pieces (sofa-back, bed-top, bookshelf-top, and more as Marc picks) and select them with the config line `look <piece> <variant>`; plus the cheap config-only drifts (move, hide, swap the desk and the table, flip). The row distortion tried in 111c was removed.

## Acceptance criteria
- Acceptance by eye on both views; shipped-file tests pass; the checks above pass; an independent review; Marc agrees before the old picture is deleted.

## Progress log

- 2026-10-29 (claude): started. Plan: wrong-view sprites in art/src, `look floor` for bigger floor tiles in the composer, a mapping between the parser's ops and the composer's, the shipped `src/game/side-project-room.txt`, view fed by `composeSideProject`.
- 2026-10-29 (claude): built. Sprites (house palette, same sizes as the pieces they replace, flat and chunky, no text): `sp-sofa-back`, `sp-bed-top`, `sp-bookshelf-top`, `sp-nightstand-side`, `sp-desk-front`, `sp-desk-front-figure` (the tiny person stands on the desk, part of the sprite), `sp-table-front`, `sp-floor-big` (32x32); `desk-with-figure` deleted (replaced). Code: `side-project-room.ts` (`look floor <sprite>`: the floor drawn once per 2 x 2 tiles with a 32x32 sprite), new `side-project-room-config.ts` (`toRoomOps`: parser `piece`/`amount` to composer `id`/`value`, `add` gets id `added-line-N`; `SHIPPED_CONFIG` parses the `?raw` text; `sideProjectRoom()` falls back to the plain faithful copy with one warning if the composer refuses a name), `side-project-view.ts` (hard-coded pieces and `defaultRoomOps` removed; source is `sideProjectRoom()`, dim comes from the file), `side-project-room.txt` (look floor; sofa, bed, bookshelf, nightstand wrong views; desk and table swapped, both front-on, figure on the desk; chair moved with the desk; dim 0.08; the wall art left alone). Tests: `side-project-room-config.test.ts` (parses with no problems, every piece id and sprite exists via `hasSprite`, values in limits, the wrong views are drawn and the desk is left of the table, mapping, fallback, floor blocks), view test updated. Docs: short section in `docs/art-style.md`.
- Checks: `npm run sprites`, `npm run build`, `npx tsc --noEmit`, `npm test` (158 files pass), `check:dist` ok. Golden unchanged (this screen is not in it). Rendered old and new side by side at 1x and 2x on 320 x 192, plus the new one at 4x, in headless Chrome and looked (contact sheet `<scratchpad>/contact-111d.png`); one iteration (sofa seam removed, bed simplified, floor seams darker). The room reads as the real room drawn wrong: swapped desk and table front-on with the figure on the desk, flat sofa from behind, plain top-down bed, big floor boards. At half scale the differences are subtle for the sofa and bed because the game's own views of those are already near top-down.
- Old picture `view-side-project` is KEPT as the fallback (if a sprite is missing the cutscene still shows it). It is removed only after Marc agrees.
- Not verified: Marc's taste (how wrong, which pieces, the figure's size), feel in the real browser game end to end.
