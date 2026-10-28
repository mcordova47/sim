---
id: 096
title: Asset review: go over every sprite for perspective and consistency
status: review
owner: marc + claude
depends_on: []
---

## Goal
Marc (2026-10-27): an asset review, going over all the assets in detail and deciding whether anything needs to change. The first thing he has noticed is that **perspectives differ**. What works best, in his view, is when things against the **south wall** (the bottom wall of the room on screen) are drawn **nearly top-down** (the sofa, the kitchen counter, the stove), and **everything else** is seen **diagonally from the top and front**. Some pieces do not follow that logic: the **computer chair** is drawn top-down and the **lamp** is drawn from the front and top.

## What to do
1. **Survey (this step, no sprite changes).** Write `docs/asset-review.md`: a table of every sprite under `art/src/` (and what the game uses from `public/sprites/`), grouped by kind (furniture, props, wall art, decor items and gifts, plants, characters and poses, tiles, icons, view pictures), with: where it appears (room and wall), its footprint, its **perspective class** (near top-down, diagonal top and front, front-on, flat), whether it **matches Marc's rule** for its place, and a verdict (keep, adjust, redraw) with a short reason and a rough effort. Start from the rule above and the notes in `docs/art-style.md` (section Perspective and the reuse table); say where the written rule and Marc's rule differ and recommend what the style doc should say. Also record, per piece, anything else a careful pass finds: palette use and outline weight, light direction and the shadow strip, size against the player and the footprint, readability at the phone's 1.0x to 1.67x, names and signatures or readable text (none allowed), animation frame consistency, unused or duplicate sprites (for example `icon-phone` and `icon-plug` are no longer drawn by the HUD).
2. **Look at them.** Render contact sheets of each group (with the room context where it helps) into a local folder that is not committed (`art/contact-sheet.png` is already ignored) and look at them; list in the doc which images were viewed.
3. **Decide with Marc, one group at a time** (the planner asks him the questions, a few at a time, with a recommendation each; the doc has the checklist and records his answers).
4. **Fix in follow-up issues**, grouped by kind of change (for example "south wall pieces to near top-down", "chair and lamp", "tiles"), each small enough to review; golden frames are re-recorded deliberately in each.

## Acceptance criteria (for the survey step)
- `docs/asset-review.md` covers every sprite in use, flags every perspective mismatch with a proposed fix, and ends with the ordered list of decisions for Marc. No sprite, map or code changes; no personal photos or private details (the reference photos are never copied or described beyond what the repo already says).
- Independent review of the survey (a fresh agent spot-checks the classifications against the sprites).

## Progress log

- 2026-10-27 (agent): Started the survey step. Plan: read the style guide, floor plan, maps and pipeline; render contact sheets of every group (outside the repo) and look at each piece in its room; write `docs/asset-review.md` with the table, the mismatch list, a style-doc recommendation and the decision checklist. No sprite, map or code changes.
- 2026-10-27 (agent): Survey done. Wrote `docs/asset-review.md` (table per kind, mismatch list, style-doc recommendation, 12 ordered decisions). Viewed contact sheets of every group and the room mockups (kept outside the repo). No sprite, map or code changes. Not checked: the real game at 1.0x to 1.67x on a phone; light direction on every sprite (sampled). Files: `docs/asset-review.md`, this file.
