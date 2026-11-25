---
id: "167"
title: "Trinkets and display instruments on the desk"
short: "Trinkets"
status: todo
owner: marc + claude
depends_on: []
summary: "A trinket slot on the desk's right corner with the first trinkets and small display instruments."
kind: build
decisions:
  - id: d1
    who: marc
    q: "Which trinkets first?"
    options:
      - "all six Marc listed: an alebrije, a little decorative telescope, a finger skateboard (tech deck), a painted goose egg, a worry doll, a raccoon in a can"
      - "the first three (alebrije, telescope, finger skateboard)"
      - "a different set"
    recommendation: "all six Marc listed: an alebrije, a little decorative telescope, a finger skateboard (tech deck), a painted goose egg, a worry doll, a raccoon in a can"
    status: answered
    answer: "all six Marc listed: an alebrije, a little decorative telescope, a finger skateboard (tech deck), a painted goose egg, a worry doll, a raccoon in a can"
    by: marc
    on: 2026-11-24
  - id: d2
    who: marc
    q: "Which display instruments go with them (display only, not playable)?"
    options:
      - "a harmonica, a kalimba, a jaw harp and a mini keyboard, as trinket-slot items in a second batch"
      - "only the harmonica and kalimba now"
      - "none for now"
    recommendation: "a harmonica, a kalimba, a jaw harp and a mini keyboard, as trinket-slot items in a second batch"
    status: answered
    answer: "could do the harmonica, kalimba, and jaw harp (keyboard is maybe too big compared to the other trinkets)"
    by: marc
    on: 2026-11-24
  - id: d3
    who: marc
    q: "May the agent look at your private reference photos (read-only, never copied or captioned) for the real objects?"
    options:
      - "yes, where photos exist in reference-photos/ (the raccoon in a can is in reference-photos/toys); draw a stylized version"
      - "no: draw from the kind of thing; revise later after you add photos"
      - "wait until you have added the photos you want to use"
    recommendation: "yes, where photos exist in reference-photos/ (the raccoon in a can is in reference-photos/toys); draw a stylized version"
    status: answered
    answer: "yes, where photos exist in reference-photos/ (the raccoon in a can is in reference-photos/toys); draw a stylized version"
    by: marc
    on: 2026-11-24
  - id: d4
    who: marc
    q: "How do they arrive?"
    options:
      - "checkpoint gifts spaced three days apart after the rugs (from about day 81) and in the random-encounter pool when issue 163 lands"
      - "only through the random-encounter pool"
      - "both, at once"
    recommendation: "checkpoint gifts spaced three days apart after the rugs (from about day 81) and in the random-encounter pool when issue 163 lands"
    status: answered
    answer: "a is fine for now — i want to separately think about how to space things out in a way that feels right, i don't want things to arrive too quickly"
    by: marc
    on: 2026-11-24
  - id: d5
    who: marc
    q: "Trinkets (167, d5): the raccoon in a can has no photo in reference-photos yet, so it was drawn from the kind of thing. Add a photo so it can be redrawn?"
    options:
      - "leave it stylized"
      - "yes, I will add a photo to reference-photos/ and it gets redrawn"
    recommendation: "leave it stylized"
    status: answered
    answer: "it's in trinkets (canned-raccoon.jpeg)"
    by: marc
    on: 2026-11-24
needs: []
---

## Goal
Build steps C and H of `docs/decor-expansion-design.md` (section 3 and 4). Marc (decision d2 of issue 148): the desk's right corner holds the first trinket and the left corner stays free for the desk clutter of issue 042. The slot `trinket-desk` (kind `trinket`, instruments allowed, abs (140, 17, 16x16), a prop on the desk `D` at local (44, 1), no default so a fresh game looks the same) is changed at the standing desk; the empty-slot option and the `trinket` kind exist (issue 151). Marc (d9): the worry doll is plainly named WORRY DOLL in the list, the Spanish name only in its note once the accent is seen in the swap-list row.

## Acceptance criteria
- The slot and the swap task (`swap-trinket-desk`, 'Change the trinket') at the standing desk, checked against the desk's task spots and the typing pose (nothing hides the laptop or a task spot); the THINGS entries and notes (deadpan, 80 characters or fewer, capitals, the font); no real brands; no readable text in sprites.
- The trinkets chosen in d1 as items with art (16x16 or smaller inside the cell, palette only), and the display instruments of d2 as a second batch (one agent pass is enough; say what you saw at 1x and 8x on the desk, and on the THINGS page).
- If d3 is yes, you may look at images in `reference-photos/` read-only to understand the real objects, but NEVER copy, trace, caption, name a file from, or reproduce anything from them in the repo; the art is your own stylized sprite.
- Gift days as chosen in d4 (state them); everything stays calm: nothing required, no scarcity.
- Look at all art yourself in the room at 1x and 8x and say what you saw (the reviewer must too); tell Marc how to see it with absolute `~/...` paths.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git status clean; golden frames for a fresh game unchanged; new strings go into docs/text-review.md; docs/decor.md gets a short 'What issue NNN built' section.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
- 2026-11-24 (planner): a first version was built and reviewed on branch issue/167-trinkets (ten 16x16 things in the desk's right corner). Marc tried the coffee gear and looked at the trinkets: they look too big and some do not look right; small things need a different way to be shown (see issue 173, which designs how trinkets are displayed and examined). The branch stays unmerged until 173 says what to keep (the slot, the swap task and the items are likely reusable); the open decisions d1 to d5 wait for that design.
