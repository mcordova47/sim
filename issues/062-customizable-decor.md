---
id: 062
title: Customizable decor (inventory, swap, buy new things) (explore)
status: in-progress
owner: marc + claude
depends_on: []
---

## Goal
Marc's idea (2026-10-23): the apartment can be customized: an inventory of decor you can swap in and out, and new things to buy (plants, paintings, furniture and so on). Recorded for later; start with a design note before any code.

## Design questions
- **Pillar check:** the game has no win condition, and points do not buy anything yet. Decide what you buy with: points (which gives points a use, a soft goal), a separate small currency, or nothing (things just turn up: gifts, finds, a delivery). Marc decides whether the game should have this kind of progression; the pillar "no goal" is the thing to protect.
- **What can change:** wall art slots (the paintings over the table, desk and nightstand, the gallery wall), plants (shelf top, windowsill), small props on surfaces, and bigger furniture swaps (sofa, rug, lamp). Each slot has a size and a list of items that fit it; swapping is a task at the object (with the choice cycle from 039).
- **Where the stuff lives:** a state variable per slot holding the chosen item id (saved with progress, defaults to today's decor), plus an owned-items list.
- **Where it comes from:** a shop (a laptop task: "browse"), a delivery to the door, thrift finds (random encounters, issue 043), gifts. Pick one source first.
- **Art cost:** every item is a sprite at the slot's size; list the first set (three plants, five paintings, two rugs, a second lamp) and the art budget.
- **Interactions with other systems:** mood (a nicer room lifts it slowly), the lighting (lamp glow), the Photos/reference rule (items drawn from real things in the apartment first).

## Acceptance criteria
- A design note in `docs/decor.md` with the choices above, a data model (slots, items, owned list, save format tolerant of old saves), mockups of the swap and shop prompts at 320x192, a staged build plan, and open questions for Marc.
- Marc picks; then stage 1 (data and storage, slots rendered from state with today's decor as the default, tests) is a build issue.

## Marc's answer (2026-10-23)
Getting things starts as a **quiet side effect**, not a goal: the game is a little zen garden. It might become a goal later; Marc does not know yet. So: no currency pressure, no scarcity, no grind. Things turn up (gifts, finds, deliveries, small purchases that are never required) and you arrange them. Design the data model so a goal could be added later without changing it.

## Marc's picks on the design note (2026-10-23): all the recommendations, with the rug later
A separate decor store; gifts and finds first (no laptop shop gating anything); nothing costs anything; decor does not affect mood or points; first cut slots: the three paintings, plant, lamp (props and the guitar later); one owned list for decor, plants and plugins (ids by kind); a swapped-in plant starts small; real things first; the game looks identical to today until the first gift. **The rug is wanted but not in the first cut.** Stages: 1 data and rendering from state with today's decor as the default (no visible change), 2 the swap task, 3 acquisition (gifts and finds), 4 art. Stage 1 waits for 063 to report whether the plant is its own overlay or a bookshelf variant, so the plant slot matches it.

## Progress log
- 2026-10-23: design note written in `docs/decor.md` (slot model, items, decor store vs a state variable per slot, swap task and mockups at 320x192, sources without pressure, first item set and art budget, plants 063 and plugins 064 as the same owned model, tolerant save format, staged plan, open questions). Recommendation: a separate decor store drawn through the existing appearance path, gifts and finds first, nothing costs anything, no mood or points effect. Status stays `in-progress` until Marc answers the open questions; then stage 1 becomes a build issue. No code changed.
