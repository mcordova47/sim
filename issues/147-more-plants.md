---
id: "147"
title: "More houseplants and dried-flower arrangements"
short: "More plants"
status: done
owner: claude
depends_on: []
summary: "Three more live houseplants and three more dried arrangements for the plant shelf, arriving as gifts."
kind: build
changelog: "Three more houseplants and three dried arrangements for the plant shelf; they arrive as gifts on later days."
unverified:
  - "How the six plants look in the real room in a browser (viewed only as 16x16 sprites at 8x on a brown background)."
  - "How the gifts feel when they arrive on days 21 to 36: only the schedule is tested, not played."
  - "Review 2026-11-23: the monstera's leaf-hole rings read a little like clover at stages 1 to 3, and the spider plant is close to the snake plant's silhouette at stages 0 to 2 (only the teal pot tells them apart); judged from 16x16 sprites at 12x, not in the real room or a browser."
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
- 2026-11-23 (claude, review): independent review of branch issue/147-more-plants (one commit, 9817c79). Verdict: approve.
  - Sprites: 18 PNGs in public/sprites re-encoded from art/src with sprite-lib and compared byte for byte, 0 mismatches; `npm run sprites` leaves git status clean. Viewed a 12x sheet (plant-0..3, wilted, dried above the new ones). Pothos: orange terracotta pot, stage 0 a few shoots, stages 2 and 3 a dense mound with vines hanging over the pot sides (3 adds yellow flower dots); wilted is a flat yellow-tan mound with drooping tan tips. Monstera: white pot, broad round leaves with holes; reads as a big-leaved plant, though the ring-shaped holes look a little like clover at stages 1 to 3. Spider plant: teal pot, upright blades that arch outward by stage 2 and 3 with yellow tips; the least distinct (close to the snake plant's silhouette, the pot colour tells them apart). Stages visibly differ for all three (sprout, small, full, fullest), and wilted is clearly yellow-tan and drooped in each. Pampas: cream and tan plumes on pale stems in a taupe vase, reads as pampas; lavender: purple spikes with pink dots in an oak jug, reads clearly; eucalyptus: round teal-green leaves on stems in a pale blue glass jar, reads as stems in a jar. Nothing in any sprite reads as text or letters; colours are palette keys (parseSprite reports no errors).
  - Data: 6 items, all kind plant, fit only plant-shelf, `how: gift`, `from: A PACKAGE`; notes are 63, 38, 43, 49, 50 and 56 characters (limit 80), capitals, no characters the pixel font cannot draw (unsupportedChars empty for notes and names), no digits or the word OF, no brands or recent artists. Strings are in docs/text-review.md in the item-lines section. Live items are families pothos, monstera and spider with `{stages: 4, droops: true}`; still items have no family. No engine change (decor-data.ts, delivery-checkpoints.ts only).
  - My own checks (scripts outside the repo): saves round trip with each of the six placed and all six owned; all 36 swaps between the six work; a save placing an unowned item, an unknown item id, or the same item in two slots is repaired (falls back to the snake plant, keeps owned ids); a build lacking the new ids keeps them owned and drops the placement; 30 items against maxOwned 500. Checkpoints: 16, ids and items unique, new gifts on days 21, 24, 27, 30, 33 and 36, all later than the last existing one (day 16). Golden frames: no golden file changed and the tests pass.
  - Checks: npm test 170 files, 3899 passed; `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; `npm run issues:check -- --validate` 181 files valid (two unrelated summary-length warnings in other issues).
  - Docs: docs/decor.md has the "What issue 147 built" section; docs/art-style.md plant rule extended. Scope: no PLAN.md or other issue edits. No reference-photos content or personal details.
  - Criteria: all six pass. Not verified: browser feel and the look in the real room, and playing the gifts arriving. PLAN.md table needs updating (planner only). Marc's own look at the art and notes (the needs entry) stays open.
