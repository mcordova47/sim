---
id: 111d
title: Side project config 4: the real config file and the figure
status: todo
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

