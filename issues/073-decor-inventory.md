---
id: 073
title: Decor: an item is displayed in one place at a time (swap, inventory)
status: review
owner: claude
depends_on: []
---

## Goal
Marc (2026-10-26): it does not make sense to have the same painting in several places. Things you own but are not showing sit in an inventory, and you can place them again: receive a new painting, replace the barn drawing with it, then replace the abstract gold and orange one with the barn drawing (the abstract one goes to the inventory).

## Acceptance criteria
- An item can be displayed in at most one slot at a time. The owned items not currently displayed are the inventory (derive it: owned minus placed, plus each slot's default item if it is not shown anywhere).
- **Swap rule:** placing an item that is displayed in another slot swaps the two (the other slot gets the item this slot was showing, if it fits there; if it does not fit, the placement is refused with a plain reason in the list and nothing changes). Placing an item from the inventory puts the replaced item into the inventory. A slot's default item is no longer 'always available': if the default barn drawing is in another slot or has been replaced, it is simply an owned item in the inventory like any other (the default is only what a fresh game shows).
- The swap list (issue 062 stage 2) shows the owned items that fit the slot, marks which one is shown now, and for each item shows where it is displayed if elsewhere (for example the slot name in small text, 'ON THE DESK WALL'); choosing such an item swaps. Escape and the quiet exit stay as they are; the live preview shows the swap's effect on both slots.
- The saved decor stays tolerant: old saves load as today's room (a save may have the same item placed in two slots because earlier versions allowed it: on load keep the first placement in a fixed slot order and move the rest to the inventory, or reset the later slot to its default if that default is free; say which). Hand-edited saves never create duplicates (tests).
- Deliveries never give an item you already own (check it still holds, `deliver` refuses owned items), and docs/decor.md describes the inventory.
- Tests: swap between two slots, from the inventory, refusal when it does not fit, the save and reload round trip, old saves with duplicates, the preview, the golden main-room frames unchanged for the default room. `npm test` and `npm run build` pass; render the swap list with an item displayed elsewhere at 1x and look.

## Progress log

- 2026-10-26 (claude): plan: one-place-per-item rule in `Decor` (`plan`, `inventory`, `displayedAt`), swap list shows where, tolerant load, tests, docs.
- 2026-10-26 (claude): built, status review.
  - **Code:** `decor.ts` (`plan` decides a placement or refusal; `place`/`preview` use it; `inventory`, `displayedAt`, `canChange`; `choices` is owned-and-fitting in table order; `parseDecor` repairs duplicates; `validateDecorData` rejects two slots with one default), `decor-data.ts` (`where` text per slot; barn and gold abstract now fit both the table and desk walls), `activities/swap-decor.ts` (place text on rows, a note line above the keys, E refused stays open, plant reset for every slot changed), `game.ts` (task offered via `canChange`), `docs/decor.md`.
  - **Decision to confirm:** the swap task is offered when the slot has a fitting item in the inventory (not merely when two paintings could trade), so a fresh game still shows no new prompts. Once a list is open it also lists items shown elsewhere. Barn and abstract had to be allowed on both walls for Marc's walk (new painting over the barn, barn over the abstract).
  - **Old saves with duplicates:** first slot in table order keeps the item; a later slot gets its default if free, else the first free owned fitting item; else all defaults (documented).
  - **Checks:** `src/game/decor-inventory.test.ts` (new: inventory, Marc's walk, swap, refusal incl. the list staying open, preview of both slots, save round trip, duplicates, deliveries refuse owned, and a 10-seed fuzz over the real Game of random swaps, own, saves, reloads, hand-edited saves with duplicates/junk and Escape asserting nothing is shown twice (placed and previewed), owned set unchanged by swapping, Escape restores the room, inventory = owned minus shown). Old tests updated where the barn/abstract now fit both walls. 1969 tests pass, `npm run build` passes, golden main-room frames unchanged (not re-recorded).
  - **Rendered** at 1x in headless Chrome with `?own=test` and a temporary window hook (not committed): the desk list with the new painting shown on the table wall (`ON THE TABLE WALL`, `SWAPS WITH GOLD ABSTRACT`), the inventory barn drawing (`GOLD ABSTRACT GOES TO THE INVENTORY`), preview in the room, Escape restores.
  - **Not checked:** how it feels with a keyboard in a normal browser; no real refusal exists in today's data (only in tests), so the refusal text was not seen on screen.
