---
id: "163"
title: "Random-encounter items: a growing pool, with repeats"
short: "Item pool and repeats"
status: todo
owner: marc + claude
depends_on: []
summary: "Let random encounters draw from a growing pool of items, allow repeats, and keep repeats rare as the pool grows."
kind: build
decisions:
  - id: d1
    who: marc
    q: "What does a repeat do when a random encounter gives you an item you already own?"
    options:
      - "prefer items you do not own; if everything in the pool is owned, the repeat arrives and a deadpan line says you already have one, and nothing is added"
      - "a repeat goes to a spares count shown on the THINGS page"
      - "a repeat turns into a small different thing (a postcard or sticker) instead"
      - "a repeat just arrives silently and is ignored"
    recommendation: "prefer items you do not own; if everything in the pool is owned, the repeat arrives and a deadpan line says you already have one, and nothing is added"
    status: dropped
    note: "misread: a repeat is an ad for something you already own, which already shows the YOU ALREADY HAVE ONE card (nothing is reversed); the real question is how rare those are (d4)"
    by: marc
    on: 2026-11-24
  - id: d2
    who: marc
    q: "How do items split between milestone gifts (days and achievements) and random encounters?"
    options:
      - "milestone gifts keep a fixed core set and trickle; every new item from now on joins the random pool (and may also be a milestone gift)"
      - "split by kind: art and plants by encounters, clothes and furniture by milestones"
      - "new items go only to the random pool; milestones stop adding new things"
    recommendation: "milestone gifts keep a fixed core set and trickle; every new item from now on joins the random pool (and may also be a milestone gift)"
    status: answered
    answer: "milestone gifts keep a fixed core set and trickle; every new item from now on joins the random pool (and may also be a milestone gift)"
    by: marc
    on: 2026-11-24
  - id: d3
    who: marc
    q: "How does an ad map to items (today seven ads each sell one fixed item)?"
    options:
      - "an ad is a product line (a frame shop, a plant shop, a clothing shop, a lamp shop, a rug shop) and draws a random item of its kind from the pool; the seven current ads stay as special one-offs"
      - "keep one ad per item and write many more ads"
      - "both"
    recommendation: "an ad is a product line and draws a random item of its kind from the pool; the seven current ads stay as special one-offs"
    status: answered
    answer: "an ad is a product line (a frame shop, a plant shop, a clothing shop, a lamp shop, a rug shop) and draws a random item of its kind from the pool; the seven current ads stay as special one-offs"
    by: marc
    on: 2026-11-24
  - id: d4
    who: marc
    q: "How strongly should the draw avoid repeats?"
    options:
      - "weight items you do not own about ten times more than ones you do, so repeats stay rare while the pool is large"
      - "strictly unowned first, repeats only when everything is owned"
      - "uniform: no avoidance"
    recommendation: "weight items you do not own about ten times more than ones you do, so repeats stay rare while the pool is large"
    status: answered
    answer: "weight items you do not own about ten times more than ones you do, so repeats stay rare while the pool is large"
    by: marc
    on: 2026-11-24
  - id: d5
    who: marc
    q: "Item pool (163, d5): how often should a shop ad come up compared with the seven special ads?"
    options:
      - "equal chance: each shop and each special ad is one entry in the draw (weighted 10:1 toward what you lack)"
      - "shops more often than the specials (as the pool grows)"
      - "specials more often"
    recommendation: "equal chance: each shop and each special ad is one entry in the draw (weighted 10:1 toward what you lack)"
    status: open
---

## Goal
Marc (2026-11-24): the new plants and outfits all arrive as checkpoint gifts (game days 21 to 72, see `src/game/delivery-checkpoints.ts`); only seven ad encounters (issue 043 stage B, `src/game/encounter-ads.ts`) give items, each a fixed item, and the earlier decision was that only NEW things arrive. Marc wants to gradually increase the number of things you get through random encounters. A "repeat" means an ad for something you already own: that already happens and already shows the `YOU ALREADY HAVE ONE.` card (docs/random-encounters.md section 4), and nothing about it is reversed. The aim is to make such ads rarer over time by having a large pool.

## Notes (planner)
- Clarified by Marc (2026-11-24): he does NOT want duplicates delivered or any earlier decision reversed; `deliver()` still refuses an owned item and the already-own card stays. d1 (what a repeat does) was a misreading and is dropped. Today the ads' `item` is a single fixed id (robin print, dried flowers, warm lamp, Starry Night, stool lamp, candle, Water Lilies).
- Quiet-collecting rule: no scarcity, no pressure, nothing required; a repeat must not feel like a loss.
- The random-encounter machinery (`docs/random-encounters.md`, sections 4, 6 and 9) and the delivery pipe (`docs/decor.md`) already exist.

## Acceptance criteria
Decided by Marc (d2 to d4, 2026-11-24): milestone gifts keep a fixed core set and trickle, and every new item from now on joins the random pool (and may also be a milestone gift); an ad is a product line (a frame shop, a plant shop, a clothing shop, a lamp shop, a rug shop and so on) that draws a random item of its kind from the pool, and the seven current ads stay as special one-offs; the draw weights items you do not own about ten times higher than ones you do, so repeats (an ad for something you already own, which keeps showing the `YOU ALREADY HAVE ONE.` card) stay rare while the pool is large. Nothing about delivery or the already-own card is reversed.
- **The pool in data.** Items get a way to be in the pool (a field or a derived rule: every real decor item that is not a starting item, not a TEST item and not a kind the ads cannot sell); the checkpoint list and the seven current ads are unchanged. A test lists which items are in the pool so a new item is not forgotten, and a test fails if an item in the pool has no art the ad card can draw.
- **Product-line ads.** A small data list of product lines, each with an invented generic shop name (no real brand; a line may reuse the style of the existing ad concepts in `src/game/encounter-ads.ts` and `docs/random-encounters.md` section 6), the kind or kinds it sells, its copy lines and its card style, so a line draws an item of its kind through the weighted draw; adding a line or an item is data. Kinds that need it: art, plant, lamp, rug, outfit, coffee, trinket, instrument (read the items in `decor-data.ts`; the unmerged branches add rugs, trinkets and coffee gear, so make it work from the item kinds, not from a hard-coded id list).
- **The draw.** A pure, seeded function (takes the random function and the owned and queued sets) picks the line then the item with the 10:1 weights; when every item of the kind is owned the weights are equal and the repeat arrives as the already-own card; the existing gates (cooldown, per-day maximum, mood, the ignore, unsubscribe and look-closer choices, the music and reduced motion paths) are unchanged; the delivery pipe still refuses an owned, queued or waiting item.
- **The card.** The product picture is the item's own sprite scaled 3x (see the note in random-encounters.md); large sprites (rugs 128x64 and 112x48, tall plants, 16x32 or 16x48) need a fit-in-the-card rule (scale down or crop to the picture area): say what you did and look at one of each size.
- **Tests.** The weighted draw with a seeded random over a pool of several items (statistics: unowned items are chosen about ten times as often, within a tolerance), the all-owned case, an item with no art skipped or rejected, save compatibility (the encounter save format is unchanged or tolerant), the existing encounter tests unchanged.
- **Docs and text.** Update `docs/random-encounters.md` (sections 5, 6 and 9 and a 'What issue 163 built'), add the new shop names and lines to `docs/text-review.md`, a `changelog:` line (at most 140 characters), and the standard checks (`npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean; golden frames unchanged).
- Look at one ad of each product line in the running game yourself (dev shortcut `?encounter=random`; see docs/random-encounters.md) and say what you saw; the reviewer must too.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
