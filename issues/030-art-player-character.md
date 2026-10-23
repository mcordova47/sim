---
id: 030
title: Top-down art: player character
status: todo
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
