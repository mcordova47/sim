# A browsable inventory, like a pokedex (design, issue 109)

Status: design for Marc to confirm. Nothing is built. `src/` is untouched.

## Summary
A quiet page on the pause screen (key L, or the touch menu) called THINGS: a grid of everything you own, one sprite each, in the order you got them. Pick one and the box underneath gives its name, a deadpan line, where it came from and where it is now (`ON THE DESK WALL`, `IN THE INVENTORY`). It is read-only at first: it never counts, never shows a total, never scolds. Placing stays at the object in the room (the swap list from issue 073), and the entry says which object. Unowned things are not shown, except (if Marc agrees) a plain silhouette for something you have seen in an ad and not taken.

## 1. What exists today (from the code)
- `Decor` (`src/game/decor.ts`) knows `owned`, `placed`, `inventory()` (owned and shown nowhere), `displayedAt(item)` and `plan/place/preview` (the swap rule).
- `DecorItem` (`decor-data.ts`) already has `name`, `sprite`, `how` (`start | gift | find | delivery | browse`) and an unused `note` (the deadpan line). `DecorSlot` has `where` text. So an entry is mostly data that is already there.
- The pause screen is the achievements list (`achievements/feature.ts`, `draw.ts`): it holds the clock, draws full picture, and has second pages (TRANSFER SAVE, SYNC) that are one view each, with one list of rects used both for drawing and tapping (`pauseButtons`). THINGS is one more page of the same kind.
- Gifts come from `delivery-checkpoints.ts` and ad encounters; both only deliver new things (073 and 043), so the owned list is a calm log.

## 2. The recommended design

### Where it lives
The pause screen. A THINGS button beside TRANSFER SAVE and SYNC (touch), key `I` on the keyboard (free today), `Esc` or `L` closes back to the list. No new screen system, no new button on the world HUD. The clock stays held, as it is for the rest of the pause screen.

### The grid
- One cell per owned item, drawn at its real size (16x16 plant or lamp, 32x16 painting, 48x16 silkscreen, 16x32 pantry), centred in a cell of 52x24. 5 columns at 320 wide, 4 at 224 wide, so no scaling and no blur.
- **Order: the order you got them** (the saved `owned` order, starting items first). No kind tabs, no sort modes. It reads like a shelf that fills slowly; new things simply appear at the end, so no "NEW" badge is needed (a badge is a chore to clear).
- Paged like the achievements list on touch (`PAGE 1/2`), scrolling rows with the cursor on desktop. The page number says nothing about what exists.
- An item shown in the room has a small dot in its cell corner? **No.** Placement is in the detail line only, to keep the grid plain.

### The entry (the box below the grid)
```
 SNOW WAGON                     [sprite at 2x]
 A WAGON. IT HAS SEEN SOME SNOW.        (deadpan line)
 FROM: A GIFT                           (source)
 ON THE TABLE WALL                      (where now)
 CHANGE IT AT THE DINING TABLE          (only if in a slot or the inventory)
```
- Name: `DecorItem.name`.
- Deadpan line: `DecorItem.note` (exists, unused). Written in the text pass (issue 037); until then the line is omitted, not filled with filler. Max 2 lines of the 5x7 font.
- Source: new optional `DecorItem.from?: string`, else a fallback from `how` (`FROM: THE START`, `A GIFT`, `A DELIVERY`). Authored lines can be specific and silly (`FROM: A PACKAGE, AFTER AN ADVERT`). It records where it came from, never a hint at how to get others.
- Where now: `Decor.displayedAt(item)?.where` or `IN THE INVENTORY`.
- Last line: the object that changes it (from `DecorSlot.object`), so the page points you back into the room.

### Silhouettes
Default recommendation: **no silhouettes for things you have never met.** A pokedex shows the gap, and this game has a rule against being told what you are missing. A middle path keeps the pokedex feel without a hunt: an item you have **seen but not taken** (an ad item you ignored or unsubscribed from, issue 043) shows as a dark flat shape with `???` and `YOU HAVE SEEN ONE OF THESE.` It needs a new optional saved `seen: string[]` (the decor save has room, no version bump). Nothing says how to get it. If it later arrives, the silhouette simply becomes the item. No counts, no "3 more".

### Placing from there
Not in v1. Placing stays a physical task at the object (a swap list with a live preview in the room), which keeps "mundane is the joke" and means no new rule: the entry just tells you where to go. A later option is a PUT UP button that calls the same `Decor.plan` and `place` (the swap rule is already one function) and shows its plan text (`SWAPS WITH GOLD ABSTRACT`); it is stage 4 below, and optional.

### Keyboard and touch
- Keyboard: arrows move the cursor over the grid (left and right by cell, up and down by row, wrapping within the page), `I` or `L` or `Esc` close. Hint line at the foot, as the other pause pages do (`hintLine`).
- Touch: tap a cell to select it (the box fills in), tap it again does nothing (no accidental action), a PAGE button when more than one page, a BACK button. Cells are at least 24 px tall in game pixels so a thumb lands (the pause screen already scales buttons by the same rule). The drawn rects are the tap list (as `pause.test.ts` checks).
- Narrow view (224x208): 4 columns, more rows; the box below uses the extra height.

### How it stays calm
- No total, no "owned of", no percentage, no progress bar, no NEW badge, no sort, no filter that implies a set.
- Nothing is locked, missed or time-limited; nothing here pays points or changes mood; it is not an achievement and no achievement needs it.
- Opening it costs nothing and has no sound beyond the existing menu one.
- Silhouettes (if any) only for things the game itself put in front of you.
- It works with zero extra items: a fresh game shows the six starting things (3 paintings, plant, lamp, pantry bins) and reads fine.

## 3. Files and data shapes
- `decor-data.ts`: `DecorItem.from?: string`; `note` filled for real items. Test items stay hidden (`isTestItem`).
- `decor.ts`: `entries(): InventoryEntry[]` where `InventoryEntry = { item: DecorItem; where: string; changeAt?: string; silhouette?: boolean }`. Pure, built from `owned`, `placed`, optional `seen`. `markSeen(id)`; `DecorSave.seen?: string[]` through `parseDecor` (tolerant, capped, never lists an owned item).
- `achievements/inventory-draw.ts` (new): layout constants, `thingsCells(view)` (rects used for both draw and tap), `drawThings`.
- `achievements/feature.ts`: page `"things"` next to `"transfer"` and `"sync"`; the I key and the button; reads `game.decor.entries()`.
- `docs/decor.md`: a short section pointing here.

## 4. Staged build plan (small issues)
1. **109a Entry data.** `from` and `note` on the real items (deadpan, text pass), `Decor.entries()` with order, where-now and change-at. Tests: order follows owned order, where text for placed and inventory items, test items never listed, pantry and plants included.
2. **109b THINGS page (read-only).** Draw, keyboard, touch, both views, hint lines, pause-screen button. Tests: tap list equals drawn list, cursor wraps, paging, 224 and 320 renders, clock stays held, golden room frames unchanged. Render at 1x on both sizes and look.
3. **109c Seen and silhouettes** (only if Marc says yes). `seen` in the save and tolerant parse, ad encounters call `markSeen` for an item shown and not added, silhouette cell and line. Tests: never shows an owned item as a silhouette, hand-edited saves, no count anywhere.
4. **109d Put up from here** (optional, later). PUT UP using `Decor.plan` text; refusal shown in plain words; Escape leaves nothing changed.

## 5. Risks
- **The deadpan lines are a writing job** (about 20 now, more with each gift). Fine to ship 109b with some lines missing; a blank is better than filler.
- **Cell size vs the 48-wide silkscreen and 32-tall pantry.** 52x24 clips the pantry (16x32); draw it at 16x24 crop or give that kind a taller cell. Decide during 109b with a render.
- **A silhouette can still feel like a checklist** even with no count. Keeping it to seen-in-an-ad items and no hint is the mitigation; easy to drop (109c is separable).
- **Future kinds** (plugins, rugs, props) show up in the same grid; plugins have no slot, so their "where now" line is `IN THE EDITOR`. Handle when 064 lands.
- **Save order.** The grid relies on `owned` keeping insertion order through save and load (it does today via an array); a test pins it.

## 6. What I decided myself, and why
- Lives on the pause screen, not a new menu or a world object: that screen already holds the clock, has two page precedents and a touch layer.
- Key `I`, not new HUD: nothing else uses it.
- Order of getting, no tabs or sorting: simplest, diary-like, makes a NEW badge unnecessary.
- No totals and no "owned" count anywhere: the collecting rule in `decor.md`.
- Test items never appear; starting items appear (they are yours).
- Source text is data (`from`) with a fallback from `how`, so a later goal can count `how` without changing anything.
- Deadpan line reuses the existing `note` field, so there is one place for item text.
- Read-only first, so the pause screen does not become a second way to change the room before Marc says so.

## 7. Open questions for Marc (most important first)
1. **Silhouettes?** (a) None: only what you own (simplest, calmest). (b) **Recommended:** only things the game showed you and you did not take (ads you ignored), with `???` and no hint, no count. (c) A shape for every item that exists (the real pokedex, which breaks the "no one is missing anything" rule).
2. **Placing from the page?** (a) **Recommended:** no; it points to the object and you place it there. (b) A PUT UP button on the entry that swaps like the list does, with its plan text and no room preview. (c) PUT UP, then the page closes so you see the room.
3. **Where does the page open from?** (a) **Recommended:** the pause screen only (button and `I`). (b) Also from the swap list, as a "look at everything" link. (c) A thing in the room (a shelf or box) you walk up to instead.
4. **Deadpan lines: when?** (a) **Recommended:** write them in 109a as a small batch, then add a line with each new gift. (b) Leave them to the text pass (issue 037) and ship without. (c) No lines, name and source only.
5. **Show the sprite larger in the entry box?** (a) **Recommended:** 2x beside the text. (b) Real size only (crisper pixel look). (c) A zoom like the admire-art view.
