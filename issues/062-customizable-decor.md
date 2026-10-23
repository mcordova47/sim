---
id: 062
title: Customizable decor (inventory, swap, buy new things) (explore)
status: todo
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

## Progress log
