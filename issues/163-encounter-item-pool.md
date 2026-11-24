---
id: "163"
title: "Random-encounter items: a growing pool, with repeats"
short: "Item pool and repeats"
status: todo
owner: marc + claude
depends_on: []
summary: "Let random encounters draw from a growing pool of items, allow repeats, and keep repeats rare as the pool grows."
kind: design
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
    status: open
  - id: d2
    who: marc
    q: "How do items split between milestone gifts (days and achievements) and random encounters?"
    options:
      - "milestone gifts keep a fixed core set and trickle; every new item from now on joins the random pool (and may also be a milestone gift)"
      - "split by kind: art and plants by encounters, clothes and furniture by milestones"
      - "new items go only to the random pool; milestones stop adding new things"
    recommendation: "milestone gifts keep a fixed core set and trickle; every new item from now on joins the random pool (and may also be a milestone gift)"
    status: open
  - id: d3
    who: marc
    q: "How does an ad map to items (today seven ads each sell one fixed item)?"
    options:
      - "an ad is a product line (a frame shop, a plant shop, a clothing shop, a lamp shop, a rug shop) and draws a random item of its kind from the pool; the seven current ads stay as special one-offs"
      - "keep one ad per item and write many more ads"
      - "both"
    recommendation: "an ad is a product line and draws a random item of its kind from the pool; the seven current ads stay as special one-offs"
    status: open
  - id: d4
    who: marc
    q: "How strongly should the draw avoid repeats?"
    options:
      - "weight items you do not own about ten times more than ones you do, so repeats stay rare while the pool is large"
      - "strictly unowned first, repeats only when everything is owned"
      - "uniform: no avoidance"
    recommendation: "weight items you do not own about ten times more than ones you do, so repeats stay rare while the pool is large"
    status: open
---

## Goal
Marc (2026-11-24): the new plants and outfits all arrive as checkpoint gifts (game days 21 to 72, see `src/game/delivery-checkpoints.ts`); only seven ad encounters (issue 043 stage B, `src/game/encounter-ads.ts`) give items, each a fixed item, and the earlier decision was that only NEW things arrive. Marc wants to gradually increase the number of things you get through random encounters: repeats allowed, but minimized over time by eventually having a large pool.

## Notes (planner)
- Today `deliver()` refuses an item you already own, and the ads' `item` is a single fixed id (robin print, dried flowers, warm lamp, Starry Night, stool lamp, candle, Water Lilies).
- Quiet-collecting rule: no scarcity, no pressure, nothing required; a repeat must not feel like a loss.
- The random-encounter machinery (`docs/random-encounters.md`, sections 4, 6 and 9) and the delivery pipe (`docs/decor.md`) already exist.

## Acceptance criteria
To be written once d1 to d4 are answered. Likely scope: a design note section in `docs/random-encounters.md`, a pool and weighting in data, repeat handling in the delivery pipe, ad concepts by product line, tests, and the text-review lines.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
