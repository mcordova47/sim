---
id: 073
title: Decor: an item is displayed in one place at a time (swap, inventory)
status: todo
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
