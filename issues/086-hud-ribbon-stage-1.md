---
id: 086
title: HUD ribbon, stage 1: icons and small bars in the empty top band
status: todo
owner: claude
depends_on: [048]
---

## Goal
Build stage 1 of the HUD design Marc picked (layout B, `docs/hud-design.md`, issue 048): replace the two corner panels with a one-row ribbon in the empty top 32 px of the picture, so the status area stops covering the top-right painting. This stage keeps the small bars always visible so Marc can see it first; the show-on-change rule is stage 2.

## What to build (see the note's sections 4 to 7 and its stage plan)
- New small icons (the note's list: sun, dusk, moon, bolt, bolt-low, three faces, star; 7x7 each, off-grid as `art-style.md` allows; `icon-phone` and `icon-plug` are for the later battery issue, not this one), drawn as sprites in the usual pipeline.
- `HUD_BAND` (the top 32 px) and chips instead of the two panels: left chip for the score and combo, right chip for the clock with its sun, dusk or moon icon (`9:40`, no AM/PM, Marc's answer), energy and mood as an icon with a small bar. Everything else in the picture stays as it is.
- Popups, labels and toasts keep avoiding the HUD: the avoid boxes follow the chips (the right chip's grown extent is about 116 px, see the note), and the existing tests that use `HUD_BOX` and `STATUS_BOX` are updated, not weakened.
- The score chip is sized for five digits and widens to the right for more.
- A slot (empty for now) is left for the phone icon of the later battery issue.

## Acceptance criteria
- Nothing from the HUD is drawn below y 32 in any room, so no painting, door or prop is covered (a test that renders each room and checks the pixels below the band are the room's own, on the real map).
- The corner panels are gone; the ribbon shows score, combo, clock, energy and mood at rest and while values change; low energy and low mood are legible (colour and icon).
- Golden main-room frames are re-recorded deliberately with a note of what changed, and the sleep and dialog goldens are unaffected or explained.
- Popup and toast placement tests pass against the new boxes.
- `npm test`, `npx tsc --noEmit`, `npm run build` pass; sprites regenerate cleanly (`npm run sprites`).
- Marc looks at it in the browser (stage 1 is made to be looked at); unverified items are listed.

## Progress log
