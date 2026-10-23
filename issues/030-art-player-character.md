---
id: 030
title: Top-down art: player character
status: review
owner: agent
depends_on: [025]
---

## Goal
Draw the player: 16x16, four directions, idle and walk frames, in the home outfit, plus the doing poses. Look and rules are in `docs/character-brief.md` and `docs/art-style.md`.

## Acceptance criteria
- `player-idle-<dir>` and `player-walk-<dir>-1`, `-2` for down, up, left, right (left may be omitted and flipped from right, but say so in the log). Idle and walk must differ clearly at 1x (the reviewer found the samples too alike).
- Doing poses from the style guide: `player-sit-sofa`, `player-type-desk`, `player-guitar`, `player-read-sofa`, `player-sleep-bed`, `player-eat-table`, at the sizes in the doc (adjust a size only with a note in the log).
- Hair is the strongest shape (curly, brown, mid-length), per the brief; nothing beyond what the brief says about likeness.
- Outfits are separate files by name (`player-<outfit>-...`) only if time allows; the home outfit is required. List the other outfits as follow-ups.
- Retire the old side-view `player-*` sprites from `art/src` once nothing refers to them.
- A contact sheet and a walk-cycle preview Marc can look at. `npm test` and `npm run build` pass.
- Marc's photo (if provided in `reference-photos/`) is not needed; do not read or copy it.

## Progress log

- 2026-10-23: Started. Plan: draw the home outfit in four directions (idle plus two walk frames; left generated as a mirror of right, so the files exist and the game needs no flip), the six doing poses, a walk-cycle preview script, and retire the old side-view player-* sprites.
- 2026-10-23: Done, ready for review.
  - Drawn (home outfit): `player-idle-<dir>` and `player-walk-<dir>-1/-2` for down, up, left, right (all 16x16); the six doing poses at the doc's sizes, none adjusted (`sit-sofa` 16x16, `type-desk` 16x32, `guitar` 32x16, `read-sofa` 32x16, `sleep-bed` 32x48 on `bed-made`'s footprint, `eat-table` 16x16).
  - Left is a mirror of right, and walk-2 a mirror of walk-1 for down and up; the mirrored files are committed so the game needs no flip code (031 can load them by name). Hair is the strongest shape: a wide, uneven curly mass in `8/9/7` that is almost all of the back view. Home outfit: `h` t-shirt, `4` sweatpants.
  - Idle vs walk: a walk frame dips the figure one row, spreads the legs with one foot lifted and swings the arms, so it is 20+ pixels from idle (a test asserts that).
  - Retired the old side-view `player-idle`, `player-walk-1..4`, `player-jump`, `player-fall`, `player-task` (source and PNG); nothing in `src` or `scripts` referred to them (`room-mockup` uses `player-idle-down`, kept).
  - Added `scripts/walk-preview.mjs` (writes gitignored `art/walk-preview.png`), tests for the sprite set in `scripts/sprite-lib.test.mjs`, and a short player section in `docs/art-style.md`.
  - Checked: `npm run sprites` (51), `npm test` (385 pass), `npm run build` pass; looked at the walk preview, a zoomed render of each direction and each pose, and the contact sheet.
  - **Not checked:** how the walk reads when animated in a browser (only the static preview); the doing poses were only seen alone, not on the real furniture in the game (the poses draw their own furniture strip: sofa back, chair back, table edge). The sleep lump is fairly plain.
  - Follow-ups: other outfits (casual, out, pajamas) as `player-<outfit>-...`; held-item overlays (mug, laptop); wiring and the doing-pose placement are 031/022.
