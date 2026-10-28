---
id: 100
title: Desk chair redrawn diagonal, the typing-at-the-desk pose, and the typing prompt placement
status: todo
owner: claude
depends_on: [099]
---

## Goal
Marc's decision (2026-10-28, `docs/asset-review.md`): redraw the **computer chair** diagonal from the top and front (it is top-down and about as big as the player now; make it a little smaller than the player) and redo the **typing-at-the-desk player pose** (`player-type-desk` and whatever else shows the player seated) to match. Marc's note: he had never seen the chair pose, because the **typing prompt covers it**: move or resize the typing activity's text prompt (and anything else drawn over the desk while typing) so the seated player and chair are visible while he types, on the desktop view and on the narrow phone view. Fold in the outline pass for the chair.

## Acceptance criteria
- The chair and the seated pose match each other and the diagonal class; the player is visible at the desk during the typing game on both views (a render test or frame check of the prompt box against the player's rectangle, plus before and after images viewed).
- Goldens re-recorded deliberately with a note; `npm run sprites` clean; `npm test`, `npx tsc --noEmit`, `npm run build` pass. Marc looks at it; unverified items listed. Do not touch the south wall pieces (issue 099, merge it first) or the sleeping sprites.

## Progress log
