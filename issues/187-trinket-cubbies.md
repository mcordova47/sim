---
id: "187"
title: "Trinkets: the bookshelf cubby scene"
short: "Cubby scene"
status: todo
owner: marc + claude
depends_on: ["185", "182"]
summary: "Examine the bookshelf opens a close-up of its cubbies with books, each able to hold a trinket."
kind: build
changelog: "Examine the bookshelf to see its cubbies and put a trinket in one."
---

## Goal
Stage E of `docs/trinket-display-design.md` (issue 173, section 7 and 9), with Marc's answers (d3: Examine the bookshelf opens a composed close-up showing its cubbies with books, each able to hold a trinket; you move between cubbies and can place or take one there; d11: the real bookshelf is an IKEA-style unit, technically four rows of three, but one column has drawers for clothes, so the close-up could be a 2x2 square of four cubbies). Read the design's mockups (`docs/trinket-display-mockups/08` to `12`; note they assumed a row of four: redraw them for the 2x2 square) and the composed-view precedents (the side project room of issue 111, `activities/reel.ts`'s child pattern is gone with photos: read `activities/swap-decor.ts` and the Examine card of issue 185 for children), and the three plant pots of issue 182 on the same bookshelf (the pots are separate slots at the top; the cubby scene is about the cubbies).

## Acceptance criteria
- `activities/cubbies.ts` (`cubbies`), a pure `cubbyLayout(view)`, four off-map cubby slots (kinds trinket and instrument), the task `examine-cubbies` offered only when something is owned that fits (a quiet end like Examine), the menu per cubby (EXAMINE and DISPLAY TRINKET) using the card of issue 185 and the swap list as children, the 2x2 layout at 320x192 and 224x208, books drawn in the cubbies (four 16x16 cubby interior sprites: palette only, no text), closing with Esc or a tap, keys and touch, quiet and calm (no points); the scene is an optional extra task and a fresh game is unchanged.
- Tests for the layout, navigation, placing and taking a trinket in a cubby, the one-place-at-a-time rule across the desk, the nightstand and the cubbies, saves and sync (decor fields copied by hand in three places of `sync/merge.ts` if a new field is needed); Look at all art and the result in the running game yourself (dev server with `?own=` ids; see docs/decor.md) at 1x and 8x on desktop and phone size and say what you saw; the reviewer must too; give Marc exact commands with absolute `~/...` paths.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean; golden frames for a fresh game unchanged unless the issue says which change; new strings into docs/text-review.md; docs/decor.md 'What issue NNN built' (use this issue's number); a `changelog:` line (at most 140 characters) stays.

## Progress log
- 2026-11-25 (planner): filed on main from the merged designs; not started (Marc asked to file the remaining build issues without starting them).
