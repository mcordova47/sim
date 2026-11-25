---
id: "179"
title: "Plant pots: three on the bookshelf, each for its own kind of plant"
short: "Plant pots design"
status: todo
owner: marc + claude
depends_on: []
summary: "Design the three bookshelf pots (empty, dried arrangement, snake plant) as slots for different plant kinds, plus the window sill and floor trees."
kind: design
decisions:
  - id: d1
    who: marc
    q: "Which kind of plant does each of the three bookshelf pots hold?"
    options:
      - "pot 1: houseplants (live, watered: snake plant, pothos, monstera, spider plant); pot 2: dried arrangements and cut flowers (flowers wilt and dry in place); pot 3: low and small plants (moss, succulents, a small bonsai), empty by default"
      - "pot 1: houseplants; pot 2: dried arrangements; pot 3: flowering plants (orchid, African violet, a tulip pot), empty by default"
      - "something else (the design proposes its own split)"
    recommendation: "pot 1: houseplants (live, watered: snake plant, pothos, monstera, spider plant); pot 2: dried arrangements and cut flowers (flowers wilt and dry in place); pot 3: low and small plants (moss, succulents, a small bonsai), empty by default"
    status: answered
    answer: "pot 1: houseplants (live, watered: snake plant, pothos, monstera, spider plant); pot 2: dried arrangements and cut flowers (flowers wilt and dry in place); pot 3: low and small plants (moss, succulents, a small bonsai), empty by default"
    by: marc
    on: 2026-11-24
  - id: d2
    who: marc
    q: "Which kinds of plants should the window sill and the floor (the empty square next to the sofa, lamp and record player) hold, eventually?"
    options:
      - "the window sill: trailing or hanging plants and small herbs; the floor: small trees (a fiddle-leaf fig, a rubber plant, a potted palm); both later, after the three pots"
      - "the window sill: still items only for now (dried things and trinkets, as decided for issue 169); floor trees later"
      - "something else"
    recommendation: "the window sill: trailing or hanging plants and small herbs; the floor: small trees (a fiddle-leaf fig, a rubber plant, a potted palm); both later, after the three pots"
    status: answered
    answer: "the window sill: trailing or hanging plants and small herbs; the floor: small trees (a fiddle-leaf fig, a rubber plant, a potted palm); both later, after the three pots"
    by: marc
    on: 2026-11-24
  - id: d3
    who: marc
    q: "Which pots are live (they need watering and can droop) and which are still?"
    options:
      - "houseplants live; dried arrangements still; the third pot's low plants live but very slow and easy (a mist now and then), never punished"
      - "only the houseplant pot is live; every other pot is still"
      - "everything live"
    recommendation: "only the houseplant pot is live; every other pot is still (a live second plant is the large piece of engine work in docs/decor-expansion-design.md section 9, so do it later)"
    status: answered
    answer: "houseplants live; dried arrangements still; the third pot's low plants live but very slow and easy (a mist now and then), never punished"
    by: marc
    on: 2026-11-24
---

## Goal
Marc (2026-11-24), clarifying the empty pot (issue 170): there are three pots already on the bookshelf in his apartment. By default one is empty (that is how it was in the photo of his apartment), another has a dried arrangement, and another has a snake plant. The idea: a different kind of plant for each pot. Dried arrangements (acquired from drying cut flowers, or delivered the regular way) go in one pot; houseplants in another; maybe something else in the third (more flowery plants? lower plants to balance things out? a pot filled with moss, bonsai; open to ideas). Then yet another type of plant eventually on the window sill, and maybe trees in the empty square next to the sofa, lamp and record player. This supersedes issue 170 (the empty pot) and shapes issue 171 (cut flowers). Today only one pot is a slot (`plant-shelf`, the snake plant overlay at (160, 52)); the other pots (and the baked vase and bowl) are part of the bookshelf sprite.

## Acceptance criteria
A DESIGN issue: `docs/plant-pots-design.md` (with mockups of the bookshelf, rendered with the game's own font, palette and sprites that the agent looks at itself) covering: what the bookshelf sprite and the map really contain today (read `art/src` for the bookshelf and the plant sprites, apartment.ts, the `plant-shelf` slot and overlay, and Marc's reference photos under reference-photos/ if present: read-only, never copied, named or described in the repo); the three pot slots (positions in pixels checked against the real sprites, what each looks like empty, which pot is which in the default room and why, how the baked art becomes slot art, the swap tasks per pot and where you stand, the draw order and the pothos overhang of issue 149 which hangs over the south face), the plant categories (a `plantKind` or item category and which items fit which pot: today's snake plant, pothos, monstera, spider plant, the dried arrangements, the six cut-flower and dried items, and new ideas for the third pot such as moss, succulents, cacti, a bonsai, with art counts and sizes for a first set), how cut flowers (issue 171) dry into the dried pot, the live/still split and the engine each needs (per-pot plant variables: the design note's section 9 L-sized work; what could be done first with the single live pot), the window sill and the floor-tree spot (find the real empty square next to the sofa, lamp and record player on the map; its pixel position, size and what it would need: a tall floor slot), saves and the migration of existing saves (a save with the snake plant in its pot stays the same), the effect on the item pool (issue 163: kinds), a size and staged build plan with each stage independently releasable, and questions beyond d1 to d3 as `decisions` with a recommended default. No code and no art in this issue. Issue 170 is superseded by this design.

## Progress log
- 2026-11-24 (planner): filed on main from Marc's clarification of the empty pot idea; issue 170 is superseded by it.
