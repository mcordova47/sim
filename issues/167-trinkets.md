---
id: "167"
title: "Trinkets and display instruments on the desk"
short: "Trinkets"
status: in-progress
owner: marc + claude
depends_on: []
summary: "A trinket slot on the desk's right corner with the first trinkets and small display instruments."
kind: build
changelog: "Six small trinkets and four display instruments can arrive as gifts and sit on the desk's right corner."
unverified:
  - "Not seen in a real, interactive browser session by a person: the art was looked at in headless Chrome screenshots of the room at 4x and 8x."
  - "The THINGS page and the swap list rows were checked by tests (font, fit, note length) but not looked at as pictures for these ten items."
  - "Reviewer (2026-11-24) also could not do a real interactive session; checked headless screenshots at about 2x and 8x, not a true 1x, and did not view the THINGS page or swap-list rows as pictures."
  - "How the trinket picture feels at the real play size on a phone screen."
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
- 2026-11-24 (claude): started. Working assumptions, because d1 to d4 are still open and I may not answer them: d1 all six trinkets, d2 harmonica, kalimba, jaw harp and mini keyboard as a second batch, d3 yes (looked at the real objects, read-only; nothing copied, traced or named in the repo), d4 checkpoint gifts three days apart from day 81. Only the recommended defaults were followed; if Marc picks otherwise the items and days are one line each in `decor-data.ts` and `delivery-checkpoints.ts`.
- 2026-11-24 (claude): built. Slot `trinket-desk` (no default), a sprite-less prop on the desk `D` at local (44, 1), `swap-trinket-desk` ("Change the trinket") on the desk's tasks. Ten items (6 `trinket-*`, 4 `instrument-*`), 16x16 each, palette only, drawn in rows 1 to 14 so they never meet the typing pose (`type-desk`) or a task spot. Gift days: alebrije 81, telescope 84, finger skateboard 87, goose egg 90, worry doll 93, raccoon in a can 96, harmonica 99, kalimba 102, jaw harp 105, mini keyboard 108. Rug (166) uses 75 and 78 and coffee gear (168) starts at 85: mine are all multiples of 3 and the later issue's days at 85, 88... are not, so they cannot clash whatever 168 adds. The worry doll is plainly WORRY DOLL, no Spanish name (d9). Raccoon: there was no raccoon photo in `reference-photos/toys` (only finger-skateboard photos), so it is drawn from the kind of thing.
- 2026-11-24 (claude): art seen. Sprites checked on the desk tan at 8x, then the real room (dev server, headless Chrome) at 4x and 8x with each item placed: every item sits in the desk's right corner, clear of the laptop and the stand; at 1 tile the fox, egg, doll, raccoon and keyboard read at once, the telescope reads as a tube on a tripod, the finger skateboard is the smallest and reads as a little deck with wheels, the kalimba and jaw harp are the least obvious. The golden frames for a fresh game are unchanged (the slot is empty).
- 2026-11-24 (claude): checks. `npm test`, `npx tsc --noEmit` pass; new `src/game/decor-trinkets.test.ts` (slot, prop, clear of pose and task spots, items, gift days, swap in and NOTHING out in the real Game). Existing tests that assumed every real slot holds an item now skip the empty one (decor.test.ts, decor-inventory.test.ts); gift counts moved (deliveries.test.ts, checkpoints-stage-a.test.ts, decor-worn.test.ts). docs/decor.md has "What issue 167 built"; the strings are in docs/text-review.md. Files likely to conflict with main: `decor-data.ts` (slot and GIFT_ITEMS tail), `delivery-checkpoints.ts` (tail), `apartment.ts` (desk task line, MAIN_PROPS) and the gift-count tests, since 166 and 168 touch the same lists.
- 2026-11-24 (reviewer, independent): approve. Checks: `npm test` (4256 pass), `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate` (valid), `npm run sprites` leaves git status clean. Own throwaway tests (deleted, not committed): a filled slot round-trips through toJSON/load/parseDecor; hand-edited saves (item not owned, trinket in the art slot or the worn slot, art item in the trinket slot, null, number, array, unknown id, junk, null, whole-save garbage) all repair to an empty slot or one shown place with no duplicates; the swap list offers all ten items and no other slot offers any of them; gift days are unique across every checkpoint stat (72 then 81 to 108, 75 and 78 left for 166; 166's branch uses only 75 and 78); ids and items unique. Art: with each item set as the slot default (temporary edit, reverted) I looked at the room in headless Chrome at 8x and about 2x: fox, telescope on a tripod, finger skateboard, egg, worry doll, raccoon in a can, harmonica, kalimba, jaw harp and mini keyboard all sit inside the desk's right corner on bare wood, clear of the laptop and keyboard, no text, palette only. At 8x all ten read; the kalimba and jaw harp are the least obvious, the finger skateboard is the smallest. Typing pose and task spots: checked by the author's test (art in rows 1 to 14) and by eye in the empty-slot and filled room. Scope: only trinket files, tests that assumed every slot has a default, docs and this issue file; no PLAN.md or other issues touched; nothing from reference-photos is named or copied in the diff. Unverified: see front matter. Planner: update the PLAN.md table; expect conflicts in decor-data.ts, delivery-checkpoints.ts, apartment.ts and gift-count tests with 166 and 168.
