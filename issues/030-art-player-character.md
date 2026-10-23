---
id: 030
title: Top-down art: player character
status: done
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

- 2026-10-23 Review (independent reviewer): **approve**.
  - Method: my own PNG decoder and checker (outside the repo), then looked at 10x renders of all 12 character frames, all 6 doing poses, and the author's walk preview.
  - Idle/walk names (pass): all 12 `player-idle-<dir>` / `player-walk-<dir>-1/-2` exist as .sprite and .png, 16x16, for down, up, left, right. Left is a mirror of right (pixel-identical when mirrored, for idle, walk-1 and walk-2); the log says so. walk-2 is an exact mirror of walk-1 for down and up (0 px differ when mirrored).
  - Idle vs walk differ at 1x (pass): 61 to 84 of 256 pixels differ from idle for every walk frame, in every direction. In the renders the dip, spread legs and arm swing read clearly. Walk-1 and walk-2 differ from each other by 27 to 56 px.
  - Doing poses (pass): all six exist at the doc's sizes (sit-sofa 16x16, type-desk 16x32, guitar 32x16, read-sofa 32x16, sleep-bed 32x48, eat-table 16x16), none adjusted. `player-sleep-bed` shares its outer frame (headboard, wall, footboard rows) with `bed-made` at 32x48. The sofa poses use the same k/b/7 front strip colours as `sofa-td`.
  - Palette and alpha (pass): every opaque pixel in all 18 PNGs is a palette colour, alpha is only 0 or 255, none empty.
  - Hair/likeness (pass): hair (8/9/7 curly mass) is the biggest shape in all four views and almost all of the back view; nothing beyond the brief (no glasses, light skin).
  - Home outfit only (pass): other outfits listed as follow-ups in the log.
  - Old sprites retired (pass): `player-idle`, `player-walk-1..4`, `player-jump`, `player-fall`, `player-task` are gone from `art/src` and `public/sprites`. grep over src, scripts, art, docs, tests finds no reference (only history in the art-style reuse table, issue 008, and a comment in `player-idle-left.sprite`). `room-mockup` uses `player-idle-down`, which exists.
  - Contact sheet and walk preview (pass): `npm run sprites` regenerates 51 sprites with a clean `git status` (committed PNGs match the sources); `node scripts/walk-preview.mjs` writes the gitignored `art/walk-preview.png`, which I looked at. `npm test` 385 pass, `npm run build` pass.
  - Reference photos (pass): not read, not copied.
  - Scope (pass): changes are art, `docs/art-style.md`, `.gitignore` (the preview), `scripts/walk-preview.mjs`, tests, and this issue file. `PLAN.md` and other issues untouched.
  - **Can't verify:** (1) how the walk reads when animated in a browser; only static frames and the static preview were seen. (2) how the doing poses look on the real furniture in the game; they were only seen alone. This is left to 031 and 022.
  - Notes for 031 and 022, not blocking:
    - `player-eat-table` shows the figure facing the camera with the table edge in front. The floor plan has the table on the north wall and the player eating from the south side facing up, so 022 may want a back view or to place the pose on the far side.
    - `player-guitar` is a horizontal 32x16 pose, but the floor plan's guitar is 1x2 vertical (col 0, rows 4-5). 022 should confirm the size and placement.
    - Floor-plan furniture is larger than these pose strips: the bed is 5x6 and the sofa 6x2 tiles, against `bed-made` 2x3 and `sofa-td` 2x2. The poses match the art-style doc footprints and will need to match whatever furniture art the furniture batches produce.
    - Facing-down faces have no visible eyes (the brief says two dots are optional at 16 px). The side-profile nose reads as a long beak in a couple of frames. The sleep lump is plain (the author noted this). All are taste points for Marc.
  - Out-of-scope findings: none. Branch to merge: `issue/030-art-player-character`. `PLAN.md` table needs updating by the planner.
