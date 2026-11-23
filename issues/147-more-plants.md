---
id: "147"
title: "More houseplants and dried-flower arrangements"
short: "More plants"
status: review
owner: claude
depends_on: []
summary: "Three more live houseplants and three more dried arrangements for the plant shelf, arriving as gifts."
kind: build
unverified:
  - "How the six plants look in the real room in a browser (viewed only as 16x16 sprites at 8x on a brown background)."
  - "How the gifts feel when they arrive on days 21 to 36: only the schedule is tested, not played."
needs:
  - {who: marc, kind: review, why: "Look at the new plant art and the six note lines in docs/text-review.md; the arrival days (21 to 36) are a default you can change.", since: 2026-11-23}
---

## Goal
Marc (2026-11-23): more decor in the plant slot, using the existing decor system with as little new engine as possible. Three more live houseplants (a pothos, a monstera and a spider plant) that grow and droop like the snake plant, and three more still dried arrangements (pampas plumes, a lavender bundle, eucalyptus in a jar) that hide the watering tasks and freeze the slot, like the dried flowers. All go in the `plant-shelf` slot and arrive as gifts. Nothing is required, missable or announced.

## Acceptance criteria
- Six new items for `plant-shelf`, 16x16, palette-only text sprites, no text in the art; PNGs rebuilt and committed.
- Live items are new families with stages 0 to 3 and `-wilted`; still items have no family.
- Each item has a one-line capitals note (80 or fewer) and a `from`; the strings are in docs/text-review.md.
- Gifts are in the delivery checkpoints at days later than the existing ones.
- Tests cover data validity, fit, live vs still behaviour, the inventory entry; golden frames of the main room do not change.
- Checks green: npm test, tsc, build, check:dist, issues:check --validate; `npm run sprites` leaves git clean.

## Progress log
- 2026-11-23 (claude): filed. Plan: draw 18 sprites (3 families x stages 0 to 3 plus wilted = 15, plus 3 still) , add the items to `GIFT_ITEMS` and families, six day-based checkpoints, tests, docs.
- 2026-11-23 (claude): built on branch issue/147-more-plants.
  - Engine: none. `FAMILIES` allows any `stages` count (the look clamps to the last stage), so fewer than four stages was possible, but four costs only two more sprites per plant and keeps the same growth as the snake plant, so each new live family is `{ stages: 4, droops: true }`. A swapped-in live plant starts small by the existing rule (stage, growth and dry count to 0).
  - Items (in `GIFT_ITEMS`, `from: "A PACKAGE"`, plant shelf only): live `plant-pothos`, `plant-monstera`, `plant-spider` (families `pothos`, `monstera`, `spider`; sprites `<family>-0..3` and `-wilted`); still `plant-pampas`, `plant-lavender`, `plant-eucalyptus` (one sprite each, no family: they hide the watering tasks and freeze the slot's variables).
  - Art: 18 text sprites in art/src, palette only, no text; PNGs rebuilt and committed; `npm run sprites` leaves git clean. Looked at them in an 8x sheet of all 18 next to the snake plant stages and dried flowers: pots differ (terracotta, white, teal) so the live plants read apart, the monstera reads as big notched leaves, the spider plant as an arching tuft (the least distinct), the pampas as pale plumes in a tall vase. Drooping versions are yellow-tan like the snake plant's.
  - Gifts (planner default, Marc can change any number in `delivery-checkpoints.ts`): pothos day 21, pampas day 24, monstera day 27, lavender day 30, spider plant day 33, eucalyptus day 36, each two game hours after the day starts. Chosen later than day 16 and after the 20-day schedule test window so the existing tests still describe the first ten. Nothing required, missable or announced.
  - Notes: six one-line capitals notes added to docs/text-review.md (the "Browsable inventory: item lines" section, unmarked). "OF" is avoided in notes by the existing no-counts test.
  - Tests: new `src/game/decor-plants-147.test.ts` (validation, fit, font and length, sprites exist, families, look by stage and droop, swap-in restart for live, freeze and hidden tasks for still, inventory entry, gift days). Existing tests adjusted: the production checkpoint list is now 16 (checkpoints-stage-a: first ten as a prefix, 19 gifts; deliveries.test: 16).
  - Found, not done: the tasks `water-plant`, `water-plant-droop`, `check-plant` are named "snake plant" and still say so with another plant on the shelf (as they already did for the test plant). A small follow-up issue could make them say "plant".
  - Checks: `npm test` (170 files, 3899 passed), `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate` (no errors) pass; golden frames unchanged.
