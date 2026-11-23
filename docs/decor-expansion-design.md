# Decor expansion: ten ideas, where they go and what they cost (design, issue 148)

Status: design for Marc to confirm (2026-11-23). Nothing is built; `src/` and `art/` are untouched. It follows [decor.md](decor.md) (the slot model, the swap task, deliveries, the quiet-collecting rule), [inventory-design.md](inventory-design.md) (the THINGS page), [art-style.md](art-style.md) and [floor-plan.md](floor-plan.md).

Not designed here: more houseplants and dried arrangements in the existing plant-shelf slot. That is issue 147, being built at the same time. This note only says what a second plant slot needs (section 9) and where it must wait for 147.

How the checks were made: every pixel position below was worked out from the room maps in `src/game/apartment.ts` (one character per 16 px tile, the map includes the wall ring) and from the sprite files in `art/src`. The main room is 19 x 10 tiles, so 304 x 160 px. "Local" means a position inside a sprite; "abs" means pixels in the room. The engine claims come from `decor-data.ts`, `decor.ts`, `deliveries.ts`, `tasks.ts` and `game.ts` (draw order). Marc's private reference photos were not read, copied or described; items are designed from the kinds of things.

## The rules every idea is held to
- Collecting is a quiet side effect: no price, no scarcity, no timer that costs you something, no "you are missing one", nothing required. Items are never lost or broken (decor.md, "Rules that keep it calm"). Swapping is always free and undoable.
- Sprites hold no readable text (the 5x7 font draws names in the UI). Palette only, 1 px ink outline, light from the top left, no dithering (art-style.md).
- Things placed on a piece take that piece's drawing class (art-style.md): on the diagonal desk and table, small things are drawn diagonally.
- No real brands in names, notes or art. Say "pod machine", "finger skateboard", "twisty cube", never the trademark. Item names are capitals, digits and basic punctuation (`unsupportedChars` in `font.ts` checks them at startup).
- Every new item is a line in `decor-data.ts` plus a sprite and a one-line deadpan `note` (at most 80 characters), as issue 109a asks. Gifts come from `delivery-checkpoints.ts` or the ad encounters, as today.

## What exists, in six lines (the facts the rest leans on)
1. A slot has one `area` (x, y, w, h). An item fits only if its kind is in the slot's `kinds`, its sprite size equals the area size, and (if the item names slots) the slot is one of them (`fits` in `decor.ts`). So **one slot means one size**.
2. Every slot always shows an item: `default` is required, `Decor.starting()` owns every default, `parseDecor` and `validateDecorData` all assume it. The `empty` option in decor.md is **not built**.
3. A slot is drawn either as a map piece with a `slot` in its legend entry (paintings, lamp table, pantry) or as a `Prop` laid over a piece (`MAIN_PROPS`: snake plant, mug, phone). Props are sorted with everything else by the bottom edge of the piece they sit on (`drawWorld` in `game.ts`), so they draw over their piece and in step with the player. There is no layer for something that lies on the floor under the player.
4. The swap task is `swap-<slot id>`, only offered when `Decor.canChange(slot)` (a spare owned item that fits), so a fresh game shows no new prompt. Its prompt comes from `SWAP_PROMPT` in `tasks.ts`, which has art, plant and lamp; any other kind says "Change it". The slot's `object` must be a piece name in the room (`swapProblems` tests it).
5. A package can only carry a **decor item** you do not own: `Deliveries.deliver` refuses an unknown or owned id. One box sits on the floor tile at col 10, row 8 (abs 160,128); opening it adds everything waiting to `owned` and sets `boxes` back to 1.
6. Poses find their piece by its **sprite name** (`piece.sprite !== def.on` in `game.ts`), and a slot piece "keeps its sprite name", so poses keep working when the picture changes. Their offsets do not move, so a replacement must keep what the pose overlaps.

## The room, as measured
Main room (abs pixels, x then y). Bold = the free places this note uses.

| Thing | Map | Abs area (x, y, w, h) | What is free on it |
|---|---|---|---|
| Dining table | cols 1-4, rows 1-2 | 16, 16, 64x32 | nothing visible: microwave and mail (local x 3-12), jars and a grinder, a dark kettle-like item (x 41-49), the white dripper on its scale (x 52-59, y 3-16), all baked in. The mug prop (abs 54, 27, 16x16; its pixels x 58-66) sits in front of them. A 4 px band of bare oak at local y 13-16 |
| Mic stand | col 5, rows 1-2 | 80, 16, 16x32 | not a surface |
| Standing desk | cols 6-9, rows 1-2 | 96, 16, 64x32 | **two bare tan corners**: local x 3-18 and x 44-59, y 2-14 (checked: every pixel is tan, `9`). The laptop and monitor fill x 22-42. The typing pose covers local x 32-47, y 16-47 (below the top) |
| Desk chair | col 8, row 3 | 128, 48, 16x16 | none |
| Bookshelf | col 10, rows 1-4 | 160, 16, 16x64 | none: the top is full (a vase, a bowl, books baked in, then the plant prop at abs 160, 52); the south end shows 14 px of tan front |
| Nightstand | cols 14-16, row 1 | 224, 16, 48x16 | none: the top is a 4 px strip (rows 1-4), already holding two small objects and the phone prop (abs 242, 16, 16x16) |
| Paintings | row 0 | table 32,0 (32x16); desk 112,0 (32x16); bed 224,0 (48x16) | wall, taken |
| Bare wall, row 0 | cols 4-6, 9-13 | 64-112 and 144-224, y 0 | **x 160-208 is free** (cols 10-12; above the bookshelf and two floor tiles) |
| Bed | cols 12-16, rows 2-7 | 192, 32, 80x96 | the one lane runs down col 11 and along row 8 |
| Radiator | col 17, rows 1-3 | 272, 16, 16x48 | none |
| Windows | col 18; upper rows 3-4, lower rows 6-7 | 288, 48, 16x32 and 288, 96, 16x32 | the sprite is drawn edge-on: only its east 6 px (local x 10-15) are glass; x 0-9 is the wall tile showing |
| Sofa | cols 2-7, rows 5-6 | 32, 80, 96x32 | the cushions are patterned fabric; poses overlay local x 45-76 |
| Guitar | col 1, row 6 | 16, 96, 16x16 | none |
| Lamp table | col 8, row 6 | 128, 96, 16x16 | the lamp slot |
| Record stand | col 9, row 7 | 144, 112, 16x16 | none (turntable and spines fill it) |
| Package spot | col 10, row 8 | 160, 128, 16x16 | floor |
| South wall at col 9 | col 9, row 8 | 144, 128, 16x16 | **bare wall face**, next to the package spot and under the record stand |
| Open floor | rows 3-4, cols 1-9 | the aisle: 16-160, 48-80 | **free**, except the chair at col 8 row 3 |

Kitchen: the counter (abs 16, 48, 48x32) has a free worktop right of the sink, but the dish piles (`dishes-1..3`, local x 4-44, y 10-18) cover the middle, leaving a strip about 24 x 10 px. The north wall row, pantry and boxes are full. Nothing in the kitchen is proposed below except where it is the better home (it is not, for any of the ten).

## 1. An empty pot that can later be filled

**Where.** In the existing plant-shelf slot (abs 160, 52, 16x16), as an ordinary still plant item `plant-pot-empty`. No new slot.

**Engine.**
- As a still item it already works: it hides the three plant tasks and freezes the slot's stage, growth and dryness (issue 105, `Decor.isLive`, `frozenVars`).
- "A plant arrives into it": small. A `DecorItem.into?: string` on a plant gift (the item id it goes in, `plant-pot-empty`). When `collect-delivery` opens the box and the slot shows that pot, it calls `Decor.plan` and `place` for the plant, so the pot goes to the inventory and the plant stands in the pot's place. If the pot is not on show, the plant simply goes to the inventory, as today. Size S.
- "A task fills it": a new task effect kind that puts an owned item in a slot (`{ decor: { slot, item } }`), plus a task `plant-seeds` at the bookshelf offered only while the pot is on show and a seedling is owned. This is the bigger version, M; not needed first.
- **A catch to settle.** Today the new plant starts small only when a live plant replaces a live plant. A live plant going into the pot keeps whatever stage the old snake plant left (the vars are frozen, not reset). With 147's extra plants that already happens for any plant that follows dried flowers. Recommended: save which live item the slot's vars belong to (one small field in `DecorSave`), and reset them when a different live item arrives. It touches the same code as 147, so it needs agreeing with that issue.

**Art.** 1 sprite, `plant-pot-empty`, 16x16, the same pot and rim as `plant-0..3` (art-style.md: "same pot and rim in every one"), soil only.

**Quiet-collecting risks.** An empty pot is an invitation, not a gap; it must never nag ("you could plant something"). Never lost: the plant that goes out goes to the inventory. A plant that arrives in the pot must not be a surprise reset of something you were enjoying (hence the "only if the pot is on show" rule).

**Size.** S (arrive-into), M (task fills it). Depends on 147 for the plants. **Question:** which way to fill it? Recommended: the plant arrives (S) first; the planting task only if Marc misses it.

## 2. Live cut flowers that die after a few game days

**Idea.** A vase on the plant shelf. Fresh flowers wilt, then dry into a lasting arrangement. A free task freshens them. Nothing is lost.

**Where.** The plant slot again (`plant-shelf`, abs 160, 52, 16x16), item `plant-flowers` with a new family `flowers`. It can later live on a second plant slot (section 9).

**Time mechanism (all game time; a game hour is 30 s, a day is 12 min).** Reuse the slot's existing dry-hours variable (`plantDry`, which `ApartmentState.tick` already advances, and which a nap advances by a fixed `NAP.hours` and a sleep by the real hours skipped, `addSkipped`). The "live replaces live" rule resets the count only when the item leaving was live too (`swap-decor.ts` checks `wasLive && isLive`); a new bunch replacing a dried one would **not** reset and would arrive already dried. So the reset rule must also cover a live item replacing a dried one of its own family (the same fix as the pot in section 1). Thresholds are data in `FAMILIES`: wilting at 72 game hours (3 days, 36 minutes of play), dried at 120 (5 days, one hour). The snake plant today droops at 96 (`PLANT.droopAfterHours`).
- `FamilyRules` gets an optional `driesAfter` and the sprite `<family>-dried`; `Decor.look` picks it (it already picks `-wilted` and `-<stage>`). Once dried, the item should count as not live, so the plant tasks hide and the vars freeze. **`Decor.isLive` and `frozenVars` take no state today** (`decor.ts`, used at `game.ts:184` and `236`), so they must become state-aware, an engine need beyond the family field. The result is a dried arrangement that stays for ever, like `plant-dried` today. Reuse of the existing `plant-dried` sprite as the end state is an option.
- A task `fresh-flowers` ("Put in fresh flowers", at the bookshelf), offered while the flowers are wilting or dried. It cannot use `liveSlot`, which hides a task once the item is not live (`game.ts:236`), so it needs its own gate (a family that can be refreshed). It sets the count back to 0. A few points like watering (20, no cooldown beyond the state gate). It is a free act, not a purchase; no stock to run out of.
- The task text must follow the item: today the three plant tasks are named "Water the snake plant" in `tasks.ts` and `liveSlot` is hard-wired to `plant-shelf`. A small shared piece, **item-aware task text** (a `DecorItem` field giving the name and prompt for the slot's care task), is needed here, for the coffee apparatus (section 6) and for 147's plants. Build it once.

**Art.** Per flower type: `flowers-0` (fresh), `flowers-wilted`, and the dried look (reuse `plant-dried`, or 1 new). So 2 new sprites at 16x16 for the first bunch, 2 for each further kind.

**Risks.** The "dies" is the one place that touches the rule "items cannot be broken". The design keeps it by never removing the item (the vase and the arrangement stay, only the look changes) and by letting a free task bring freshness back. No countdown is ever shown, no popup says they died, no achievement needs them fresh. A player who never returns finds a dried arrangement, which is pretty.

**Size.** M. Depends on 147 (same plant code) and on the shared task-text piece. **Question:** do wilted flowers need a task at all, or do they just get replaced by a new bunch arriving as a gift? Recommended: the free task, so nothing depends on luck.

## 3. Trinkets

**What they are.** Small objects, each 16x16 (a drawing of 8 to 12 px inside), kind `trinket`: alebrijes (painted wooden animals), a small decorative telescope, a finger skateboard, a painted goose egg, a worry doll, a raccoon in a can. Real things first (decor.md question 8); each gets a deadpan `note`.

**Where. The audit, plainly.** Real free surfaces in the main room:

| Place | Result |
|---|---|
| **Desk, right corner** | Free. Slot `trinket-desk`, abs (140, 17, 16x16): desk local x 44-59 and y 2-14 are all bare tan, so a trinket drawn in the cell's rows 1-13 sits on the wood. It overlaps no task spot (the desk is used from row 3, below) and not the typing pose (local x 32-47 starts at y 16). One slot, prop on the `D` piece. Works with no new art besides the items. |
| Desk, left corner | Also bare (local x 3-18). **Keep it for clutter** (issue 042, which Marc wants on the desk, 2026-10-28). Recommended: do not use it for trinkets. |
| **Wall shelf (new piece)** | The wall strip at abs x 160-208, y 0 (cols 10-12) has nothing on it. A new fixed piece `wall-shelf` (48x16) with three 16x16 trinket slots, `trinket-shelf-1/2/3` at (160, 0), (176, 0), (192, 0). It would be a wall-line piece (new map letter added to `WALL_PIECES.main`, like the paintings). Changed from row 1 (cols 11 and 12 are floor, facing north); col 10 row 1 is the bookshelf. **Three slots on one piece would give three identical Tab entries** (`swap-<slot id>`, one task each, same prompt), so the shelf needs one swap task that opens a list across its three slots, or one slot at first. Needs 1 shelf sprite and visibly adds a new object to the room (empty at first). |
| **Lower window sill** | Slot `sill-window` at (288, 112, 16x16). The pot or object would sit over the lower half of the glass, since the window is drawn edge-on (x 0-9 of its sprite is wall). Floor lane col 17 is not touched. Needs the two windows to have different piece names (both are called "window and blinds" now; `swapProblems` finds a piece by name, so the lower one needs its own). Shared with the second plant slot (section 9). |
| Bookshelf cubes | **No good place.** The bookshelf is drawn from above; the cubes are not visible, only a 14 px tan end. The old face-on drawing `view-bookshelf` (16x64) is kept but not drawn in the room. The only way to show cubes is a full-screen look (like `view-gallery-wall`), which is L and not recommended now. |
| Nightstand top | **No good place.** A 4 px strip with two small objects and the phone already on it. The prop id `prop-nightstand` is already used for the phone as scenery; a new slot must not reuse that id or the phone would become a slot. |
| Dining table | **No good place** (full), except the table redraw in section 6. |
| Sofa, lamp table, record stand, floor | No. The sofa has the poses and fabric; the others are full or in the walking lanes. |

So the first trinket slot is the desk's right corner, the second place is the wall shelf (three slots at once), the third the sill. There is no fourth place.

**Names.** For the worry doll the font does have the capital Ñ (`font.ts`, issue 026, drawn with a two-row accent above the capital), so `MUÑECA QUITAPENAS` passes the font check. But the accent adds two rows over a 9 px list row, which has not been looked at on the swap list. Recommended: the item name is plain `WORRY DOLL`; if Marc wants the Spanish name, it goes in the note and gets looked at in the list first.

**Engine.**
- New `DecorKind` `trinket` (ids start `trinket-`). Slots accept `["trinket", "instrument"]` (instruments are section 4).
- **The `empty` option** (not built, shared by trinkets, rug, shelf, sill; see "Shared engine pieces"): none of these slots has a sensible default item, so each starts empty and draws nothing.
- Swap prompt per kind: `SWAP_PROMPT` gets "Change the trinket" ("Put something out" is friendlier).
- A prop over the desk: one `PropDef` on `D` at `{ x: 44, y: 1 }`, 16x16. Its slot id is checked by `Decor.checkLevel` against the slot's area.
- Where it is changed: the standing desk, which already has seven tasks; the swap task only appears when something spare is owned, so Tab does not grow on a fresh game.

**Art.** 16x16 each, diagonal, palette only: first set 6 (the six named examples) = 6 sprites. The shelf = 1 more (48x16). A raccoon in a can: a tin, a face, colour blocks for a label, no text. A telescope: a short brass tube on a tiny stand.

**Quiet-collecting risks.** A trinket is not a goal and has no set. Do not make them "a collection of N". An empty shelf is a mild "you have nothing here" signal; that is fine as long as nothing counts them (the THINGS page already has no totals).

**Size.** S (desk corner, with A), M (shelf), M (sill; shared with section 9). **Question:** is a new wall shelf in the room OK? Recommended: yes, after the desk corner has proved the idea.

## 4. Instruments as decor

Items: harmonica, keyboard, jaw harp, kalimba.

**Where each sits.**
| Instrument | Place |
|---|---|
| Harmonica | trinket slot (desk corner, shelf, sill): a 12 px item in a 16x16 cell |
| Jaw harp | trinket slot, same |
| Kalimba | trinket slot, a little larger, still 16x16 |
| Keyboard | a **mini keyboard** (a 25-key controller, drawn about 12 px wide) fits a trinket cell. A full-size keyboard **has no good place**: it would need 48x16 of floor, the only free floor is the aisle (rows 3-4, one lane of the main thoroughfare to the kitchen) or the bed's lane. Do not do a full-size one |
| Guitars | the existing `guitar-wall` slot (abs 16, 96, 16x16, in decor.md, the guitar piece `G`) |

**`guitar-wall` and the others.** The guitar piece is a legend entry with variants (`guitar` or `guitar-stand` while `guitarOut` is 1) and the guitar task has a pose (`player-guitar`, 32x48, drawn over the piece) and four held sprites. A slot-based piece has no variants today, so swapping guitars needs **item looks by state** (a `DecorItem` field: sprite X while a state var is at least N; also needed by the table and bed in section 8). Putting `guitar-nylon` (drawn, 16x16, unplaced) there is only art-free for the resting look; the pose and held sprites show the first guitar (5 more sprites per extra guitar; `guitar-nylon` already has a voice in `config.ts`, so no new sound is needed for it). Keep the slot for guitars only (items name `slots: ["guitar-wall"]`) so a keyboard cannot replace the guitar the task plays. Size M.

**Display only versus playable.**
- Display only (recommended first): items on trinket slots, nothing else. Size S per item, art only.
- Playable would cost, per instrument, and should be **a separate later issue each**: a task (`play-harmonica`; it needs its own `taskCounts`, and "every task" and the sync merge pick it up), a voice in the sound feature (the guitar has `SOUND.guitarVoices` and a skill model, `docs/guitar-skill-design.md`), the arrows activity (`NotesActivity`) with its notes, a pose or held sprites (4 held sprites per instrument at 16x16, optionally a pose), tests, and the rule that the task needs the item **on show** so the task follows the decor (a task that depends on a decor item is a first: today nothing reads decor, decor.md "Reading state"). M each. Suggested order if Marc wants any: kalimba (discrete notes fit the arrows), then harmonica.
- The quiet rule: playing pays like any task (guitar pays 55); the item itself must never be needed.

**Risks.** A playable instrument you do not own is a locked task, which the rule forbids showing; the task simply is not offered. Do not add "learn all four".

**Size.** S per display item; M per playable one; M for guitars. **Question:** display only for now? Recommended: yes.

## 5. Clothes

**What exists.** `outfits.ts` lists four outfits (home, casual, out, pajamas); the state var `outfit` (0 to 3) picks which player sprites draw (`outfitPrefix`, `drawPlayer` in `game.ts`); 36 sprites are already drawn (12 per non-home outfit: 4 idle, 8 walk). **Nothing sets `outfit`**: issue 045 left "a getting-dressed task (later)". Issue 042 (clutter) is about dirty clothes on the floor, chair or hamper, a state gag with sprite variants, not worn outfits.

**Recommended split, three separate things.**
1. **Worn outfits (S, no new art).** Outfits become items of a new kind `outfit` in a slot that is not drawn on the map: slot `worn`, default `outfit-home`, area 16x16 (used only for the size check), changed at the **nightstand** (it has drawers; "get dressed from the drawer"). Task `swap-worn`, "Change clothes", only offered when another outfit is owned, so a fresh game is unchanged. The three drawn outfits become the first three gifts. The `outfit` state var becomes derived from the slot (set by `Game` each frame, like `parcel` and `guitarOut`; no task writes it). Sleeping does not change clothes (pajamas after sleep is a decision for later). The THINGS page shows each outfit by its `idle-down` sprite.
   - **Known visual pop:** the doing poses (`player-sit-sofa`, `player-type-desk`, `player-eat-table`, `player-sleep-bed`...) are drawn in the everyday clothes only, so a casual outfit flips to the home look while sitting. Fixing it is 12 sprites per outfit per pose, so accept it at first.
   - Each new outfit later is 12 sprites (16x16).
2. **A hook by the front door: dropped.** The only bare wall face near the door (abs 144, 128, col 9, row 8) has one walkable neighbour, the package tile (col 10, row 8). That tile is a static solid in the grid (`blockedWhen` is ignored by `plan-checks.ts`/`grid.ts`), so a swap task there would have **no reachable standing spot** and the existing test over every task would fail. There is no other good place for a clothes hook in the main room. Clothes stay worn outfits only.
3. **Clutter (issue 042).** Separate, not decor: not collected, no slots. Leave it there. Dirty clothes there should be thought of as a state with sprite variants.

**Not recommended:** clothes with stats ("materia that do nothing", cool rocks, decor.md Ideas backlog). That needs a stats screen and a place that shows numbers, against "no number to chase".

**Quiet-collecting risks.** Outfits are a wardrobe, not a ladder; no outfit makes anything easier. Outfit gifts should not be tied to doing a task N times. Do not show "outfit 2 of 4".

**Size.** S (worn outfits). **Question:** worn outfits first, via the nightstand? Recommended: yes.

## 6. Coffee apparatus

**What exists.** The dining table already is the coffee station: a dripper over a mug on a scale at its east end, baked into the `table` and `table-plate` sprites. The tasks are `coffee` ("Make pour-over coffee", prompt "Make coffee", 6 s, 70 points, mug 0 to 1, +2 energy, +2 mood, one dish, 6 to 11 o'clock good hour) and `drink-coffee` (3 s, 30 points, mug 1 to 0, +8 energy, +4 mood). The mug on the table is its own prop `mug-table` (abs 54, 27) shown while `mug` is 0; a carried mug is the held overlay.

**Where.** A new slot `coffee-table`, kind `coffee`, at abs (62, 18, 16x16), a prop on `T` at `{ x: 46, y: 2 }`. The default item is today's drawing, so a fresh game looks the same. It means **redrawing `table` and `table-plate` without the dripper** (2 sprites, 64x32), and drawing the dripper as the default item (1 sprite). The default's visible pixels are table local x 52-59, y 3-16; other apparatus must stay within about x 50-61 (11 px wide) and y 3-17 so they cover neither the dark item at x 41-49 nor the mug (its pixels reach local x 50). An espresso machine is wider than that: it either needs a 24 px slot that takes over the dark item, or a narrow stylized one. Say so when it is drawn.

**Items (no brands).** Pour-over cone (the default), plunger-style press, stovetop percolator, a drip machine, a pod machine, a siphon, a moka pot, an espresso machine. That is up to 8 apparatus, 16x16 each, 7 new.

**What changes.**
- **Look only (first step, S plus art).** The table looks different; the tasks are unchanged. The prompt "Make coffee" and the name "Make pour-over coffee" would be wrong with another apparatus, so at least the name needs the next step.
- **Text and one more thing (second step, S, needs the shared "item-aware task text" piece).** The task name follows the item ("Make press coffee"), same for the prompt. The duration may follow too (a drip machine is quicker than a siphon). **Not** points, energy or mood: an espresso machine that pays more is the better-armour treadmill; keep them equal. No new animation: the held-mug overlay and the eat-table pose are the same.
- Dishes stay (each coffee adds one dirty dish) so the kitchen loop is the same.

**Art.** 2 table redraws, 1 default apparatus, 6 more apparatus; no new pose.

**Quiet-collecting risks.** Equal pay, so nobody "needs" the best machine. The mug prop must still sit in front without being hidden by a taller apparatus.

**Size.** M (slot, table redraw, first items), S for the text step. **Question:** does the apparatus change the task name and duration, or only the picture? Recommended: name and prompt follow the apparatus; duration and pay stay the same.

## 7. A rug

**Where.** The open aisle between the table and the sofa. Slot `rug-floor`, kind `rug`, **abs (48, 48, 64x32)**: tile cols 3-6, rows 3-4. Checked on the map: all eight tiles are floor (row 3 cols 1-7 and row 4 cols 1-4 and 6-9 are `.`, col 5 row 4 is the start tile `@`, which is floor). It touches no piece: the table and desk sprites end at y 48, the desk chair is at col 8, the mic stand is at x 80-96, y 16-48. It leaves col 1 free (the kitchen doorway arrival tiles). It sits just north of the sofa (cols 2-7), so "changed at the sofa" (decor.md) works: the sofa's north side is the standing place for its tasks and the rug lies under it. Task `swap-rug-floor` at the object `sofa`.

**Engine.**
- **Floor layer.** `drawWorld` sorts everything by bottom edge, so a rug drawn as a normal prop could draw over the player. It needs a list of floor items drawn right after `drawFloorAndWalls` and before the sorted things. `PropDef` currently requires an `on` piece, so it needs a floor variant with no `on` and no solid (it is not in `activeSolids`).
- **The `empty` option**, because the real main room has no rug today and a fresh game must look the same (decor.md question 9).
- **THINGS page.** The grid cell is 24 high and 61 wide on the 320 view (53 on the narrow one, `inventory-draw.ts`) and tall things are cropped (`drawSprite` takes `rows`); a 64x32 rug is wider than its cell. Needs a small decision when built: draw it reduced or cropped. The pantry (16x32) already needed the same.

**Art.** 2 rugs at 64x32 (decor.md; the two colours), flat top-down, palette only, no text. A non-solid floor item cannot hide a tile you need to read.

**Risks.** None to the rule. It must not look like a doormat hint at a task spot.

**Size.** M (floor layer, plus `empty` from step 1). **Question:** is a rug right in the room at all, and is the aisle the place? Recommended: yes, cols 3-6.

## 8. Replacement furniture

**What must stay the same.** Furniture is a map piece with a footprint (its tiles), solids, task zones and sometimes poses and props on it. A replacement should be only a new sprite of the same size, drawn the way the paintings are: the piece's legend entry gets a `slot`, and the piece **keeps its sprite name** (poses find it by that name). The swap task is placed on an object by name (`slot.object`), so the piece's `name` must not change either.

| Piece | Size (abs position) | What the replacement must keep | Extra cost |
|---|---|---|---|
| Desk chair | 16x16 (128, 48) | the typing pose (`poses.ts`: `type-desk`, 16x32 at desk local (32, 16), abs 128-143 x 48-63) **draws its own chair on this very tile**, so a replacement chair flips back to the old one while you type | 1 sprite plus the typing pose redrawn (`player-type-desk`); not the easiest |
| Record stand | 16x16 (144, 112) | the `record-play` task (`tasks.ts`) | 1 sprite; the stand is also found by a particle emitter in `config.ts` (checked when built) |
| Nightstand | 48x16 (224, 16) | the phone prop at local x 18; the painting above; the swap task for the bed painting | 1 sprite, the top strip stays free in the middle |
| Standing desk | 64x32 (96, 16) | the laptop where the typing pose is (local x 32-47); the two free corners (trinket slot, clutter) | 1 sprite |
| Sofa | 96x32 (32, 80) | cushions where the poses are (`sit-sofa` local x 61, `read-sofa` local x 45); the north side stays the standing edge | 1 sprite; poses mean cushion positions are fixed |
| Cube bookshelf | 16x64 (160, 16) | bare oak at local y 36-51 for the plant prop, and no baked items there | 1 sprite; the baked vase, bowl and books are part of the look |
| Dining table | 64x32 (16, 16) | the coffee slot (section 6), the mug prop and plate variant, the eating pose at local x 24-39 | **2 sprites** (`table`, `table-plate`), needs item looks by state |
| Queen bed | 80x96 (192, 32) | the made and unmade looks, and the **sleep poses**, which are full 80x96 pictures including the bed (`player-sleep-bed`, `player-sleep-bed-unmade`, drawn over the bed at 0,0) | **4 big sprites**, needs item looks by state |

**What is hard.** Item looks by state (the `table` shows a plate, the `bed` made or unmade, the guitar its empty stand): the paintings have one look. That is one shared engine piece (a `DecorItem` field), needed by the table, the bed and the guitar. Outfits and poses, as in section 5, have the same sleeping-art problem.

**Sensible order.** Record stand first (no pose, no prop), then nightstand, desk, sofa, bookshelf (all single-sprite, no variants: engine S once the furniture-slot idea exists), then the table, then the bed last. Furniture arrives as gifts or ads like everything (a "new sofa" is a delivery), never a shop.

**Quiet-collecting risks.** A new bed is a big thing to be handed; keep to one furniture piece at a time, spaced far apart, and never as a reward. Old furniture goes to the inventory (never lost), though a sofa in the inventory is an odd thing to show on the THINGS page (cell crop); decide at that point.

**Art cost.** Per replacement: 1 sprite for the chair, record stand, nightstand, desk, sofa, bookshelf; 2 for the table; 4 for the bed. Sizes in the table.

**Size.** M for the first (it adds the furniture slot concept and the first item), S for each further single-sprite piece, M each for table and bed. **Question:** only gifts, never ads? Recommended: gifts for furniture (an ad for a sofa you then get is fine, but not a ladder).

## 9. A second plant slot

**Where.** The lower window sill: slot `sill-window`, abs **(288, 112, 16x16)**, kind plant (and trinket, section 3), a prop on the window `W`. The desk's right corner is the other candidate, but it is the trinket place and the left one is reserved for clutter. The sill covers the lower half of the glass because the window is drawn edge-on (only local x 10-15 is glass; x 0-9 is wall). It touches no floor tile and no task spot; the blinds are still used from col 17, facing east.

**What it needs.**
- **Per-slot vars and tasks, if live plants go there.** Plant growth is hard-wired to `plantStage`, `plantGrowth` and `plantDry`: `ApartmentState.tick` advances `plantDry` by name, `settlePlant` in `plant.ts` and `game.ts` use those names, the `nap` effect adds `NAP.hours` and `sleep` adds the skipped hours to `plantDry`, and the three plant tasks have `liveSlot: "plant-shelf"` and the words "snake plant". A live second slot needs its own three vars, the tick and the sleep and nap effects generalised from "the plantDry var" to "each slot's dry var", the three tasks copied for the slot (or made per-slot), a golden frame for it. That is L. The slot model already has `stageVar`, `dryVar`, `growthVar` per slot (decor.md: "another plant slot gets its own").
- **A still-only second slot (S).** No vars, no tasks: it holds dried flowers, a pot with no plant, a trinket. **A rule is needed:** a live plant (family with stages or droops) must only fit a slot that has `stageVar`. Today `fits` does not check, and `Decor.look` would show a live plant in a varless slot frozen at its smallest stage for ever. Add the rule to `fits`.
- The window pieces need different names (see section 3).

**Quiet-collecting risks.** A second plant you cannot water is not a pet; stills never need anything. A live second plant doubles the care tasks on the bookshelf-and-window pair; keep it optional (nothing droops into a loss, as today).

**Size.** M (still only, as build row J), L (live). Depends on 147 for the plants. **Question:** still only? Recommended: yes, first; a live second plant only if 147's plants feel good.

## 10. Order takeout

**Idea (docs/ideas.md).** Order from the phone; a little later it arrives at the door like a package; you may eat it.

**How it uses the pipe.** The queue (`Deliveries`) stores decor item ids, refuses owned ones and never repeats: a meal is none of those, and it is repeatable. So the pipe needs one small addition: an entry that is a **meal**, not an item (a `kind` on `Pending`, `deliverMeal(delayHours)`), arriving at the same box tile (col 10, row 8) with the same one-line arrival popup ("THE TAKEOUT HAS ARRIVED."), blocking the tile the same way (`parcel` stays 0 or 1). At most one meal is pending at a time, and it counts toward the same 20-entry cap (`DELIVERIES.maxQueued`). Opening the box (`collect-delivery`) adds the item pages as today, and for a meal puts the food on the table: it sets a new saved var `takeout` to 1 and `plate` to 1, so the table shows the existing `table-plate` and **no new art is needed**. The box art `delivery-box` is reused too (a bag later, optional).

**Tasks.**
| Task | Where | Notes |
|---|---|---|
| `order-takeout` ("Order takeout") | the nightstand, next to Charge your phone (the phone sits there) | about 8 points like `charge-phone`, 3 s, a short cooldown; queues the meal in about 2 game hours (one minute of play); refused with a plain reason if one is already on the way ("THE TAKEOUT IS ON ITS WAY") |
| `eat-takeout` ("Eat the takeout") | the dining table, beside Eat dinner | needs `takeout` 1; sets `takeout` and `plate` to 0 |

**What eating changes, against the existing points table.** Cook dinner is 90 points (+5 energy, +4 mood, 2 dishes), Eat dinner 60 (+15 energy, +6 mood, 2 dishes), Reheat 25 (+8, +2, 1 dish). Recommended for `eat-takeout`: **40 points**, 5 s, **+15 energy, +5 mood, no dishes**, and it sets `boxes` back to 1, the same stack a package makes, so there is a container to flatten and recycle (issues 066, 070, 071). Ordering plus eating pays less than cooking plus eating (about 48 against 150), so it is the lazy path with no extra reward, which fits the deadpan voice. A cooked or reheated plate may already be on the table (`plate` 1; `eat-dinner` needs no plate, `tasks.ts`): a meal that arrives then waits at the box until the plate is eaten, as a package waits for a free tile. `cook`, `reheat` and `eat-dinner` get a requirement "TAKEOUT IS WAITING" (the same pattern as "COFFEE IS WAITING" on `coffee`), so a plate on the table is never two meals.

**Cold food, expiry:** none. No timer on the table; it waits as a package waits ("It never expires"). **Money:** none, nothing costs anything.

**Fake brand rule.** The restaurant and the app are invented with generic names, checked once in the text pass (037) to make sure none points at a real business, exactly like the ad brands (`docs/random-encounters.md` section 6). No real delivery app or chain, not even a giant one (the ad rule allows giant platforms by name; this idea does not, because Marc's note says no real delivery brands). Marc's text review covers the order lines and the arrival line.

**Quiet-collecting risks.** None for decor; it is a meal, not an item, so it is not on the THINGS page. The risk is farming: Order, eat, repeat. The points are low and the repeat penalty and cooldowns of every task apply. It must not reduce `dishes` pressure so much that the kitchen loop dies; at +0 dishes it is neutral, not a way to remove them.

**Size.** M. No dependencies. **Question:** order at the nightstand phone, not the sofa? Recommended: the nightstand (the phone is drawn there); the sofa and bed doomscroll stay unchanged.

## Shared engine pieces
| Piece | What | Used by |
|---|---|---|
| P1. The `empty` slot option (also: a map legend entry with a `slot` needs a default sprite, `tilemap.ts` throws without one, so an empty slot object must name one) | `default` optional; an empty slot shows nothing (no placeholder box); a `NOTHING` row at the top of the swap list; `place(slot, none)`; `starting`, `parseDecor` and `validateDecorData` skip a missing default; save keeps `placed` only for slots with an item | trinkets, rug, shelf, sill |
| P2. Kind prompts | `SWAP_PROMPT` for new kinds; new `DecorKind` values: `trinket`, `coffee`, `outfit`, `furniture` (`rug` and `instrument` exist) | everything that is not art, plant or lamp |
| P3. Item looks by state | a `DecorItem` field: show sprite X while a var is at least N | table, bed, guitar |
| P4. Item-aware task text | a `DecorItem` field giving the care or make task's name and prompt | coffee, flowers, 147's plants |
| P5. Floor layer | a list of non-solid floor items drawn under everything sorted | the rug |
| P6. Non-map slot | a slot with no piece in the room (area only for the size check) and a derived state var. `decor.test.ts` pins the exact slot list (line 47) and requires every main-room slot to match a drawn piece or prop of equal area (lines 53-58), so both tests change: non-map slots are exempt | worn outfits |
| P7. Meal in the delivery pipe | a `kind` on `Pending`, a state var `takeout`; `load` and `collect` assume decor ids (`load` drops what `decor.item` does not know, `collect` calls `decor.own`), so each needs a meal case; `parseDeliveries` only checks id shape and time | takeout only |
| P8. A live plant fits only slots with vars | one rule in `fits` | second plant slot, 147 |

## New slots (all default none unless a default is shown)
Positions are abs pixels in the main room; checked against the maps and sprites above.

| Slot id | Room | Area (x, y, w, h) | Kinds | Default | Changed at (object) | Notes |
|---|---|---|---|---|---|---|
| `trinket-desk` | main | 140, 17, 16x16 | trinket, instrument | none | standing desk | prop on `D` at local (44, 1) |
| `trinket-shelf-1` | main | 160, 0, 16x16 | trinket, instrument | none | wall shelf (new piece) | stand at row 1, col 11 or 12, facing north |
| `trinket-shelf-2` | main | 176, 0, 16x16 | trinket, instrument | none | wall shelf | |
| `trinket-shelf-3` | main | 192, 0, 16x16 | trinket, instrument | none | wall shelf | |
| `sill-window` | main | 288, 112, 16x16 | plant (still), trinket | none | lower window (needs its own piece name) | the second plant slot |
| `rug-floor` | main | 48, 48, 64x32 | rug | none | sofa | floor layer; cols 3-6, rows 3-4 |
| `coffee-table` | main | 62, 18, 16x16 | coffee | `coffee-pourover` (today's look) | dining table | prop on `T` at local (46, 2); table redrawn without the dripper |
| `worn` | main | 0, 0, 16x16 (size check only) | outfit | `outfit-home` | nightstand | no drawing in the room |
| `guitar-wall` | main | 16, 96, 16x16 | instrument (guitars only, by `slots`) | `guitar` | guitar | in decor.md; needs P3 |
| `furniture-<piece>` (later, one per piece) | main | chair 128,48,16x16; record 144,112,16x16; nightstand 224,16,48x16; desk 96,16,64x32; sofa 32,80,96x32; bookshelf 160,16,16x64; table 16,16,64x32; bed 192,32,80x96 | furniture (new kind) | today's sprite | the piece itself | piece keeps its sprite name |

The existing `plant-shelf` (160, 52) gets the empty pot and the cut flowers as items, no new slot. The old decor.md rows `prop-nightstand` and `prop-desk` are replaced by `trinket-*`; the id `prop-nightstand` stays as the phone's scenery id.

## Recommended order of build issues
Each is its own small issue, independently releasable and no worse than before on main. Most leave a fresh game unchanged (the swap task only appears when there is a spare item, and every new slot starts empty or with today's look); the column below says which steps do not (D adds a task, I adds an empty shelf). Numbers are for the planner to assign; letters are labels. S is under a day of work, M a day or two, L more.

| # | What | Size | Needs | Visible on a fresh game? |
|---|---|---|---|---|
| A | `empty` slot option (P1, P2) with a test-only slot | S | nothing | no |
| B | Worn outfits: slot `worn`, `swap-worn` at the nightstand, the three drawn outfits as gifts (P6) | S | nothing (no art) | no, until the first outfit arrives |
| C | Trinkets on the desk: kind `trinket`, `trinket-desk`, first 3 to 6 items (art issue first or alongside) | S + art | A | no |
| D | Takeout: meal in the pipe, `order-takeout`, `eat-takeout`, requirements on cook, reheat, eat dinner (P7) | M | nothing | yes (a new task on the nightstand) |
| E | The rug: floor layer (P5), `rug-floor`, 2 rugs | M + art | A | no |
| F | Empty pot and arrive-into | S + art | 147 | no |
| G | Coffee apparatus step 1: slot `coffee-table`, table redraw, only the default item (looks the same) | M + art | nothing | the table is redrawn but looks the same |
| G2 | Item-aware task text (P4), the coffee names, then the other apparatus | S + art | G (and agreed with 147) | no |
| P3 | Item looks by state (shared piece, its own small issue before N's table and bed, and Q) | S | nothing | no |
| H | Display instruments on trinket slots (art and items) | S + art | C | no |
| I | The wall shelf and three shelf slots | M + art | A, C | yes (a new, empty shelf) |
| J | Second plant slot, still only: `sill-window`, P8, renaming the lower window | M | A, C, 147 | no |
| K | Cut flowers (family, `fresh-flowers`) | M + art | 147, G2 | no |
| M | Live second plant (vars, tick, tasks per slot) | L | J, 147 | no |
| N | Furniture slots, one issue per piece (record stand first, then nightstand; the chair last of the small ones, with its typing pose); the table and the bed need P3 | M, then S each; M for the table, the bed and the chair | P3 for the table and bed | no |
| O | Playable instruments, one issue each | M each | H, a voice per instrument | the task appears only with the item on show |
| Q | Swappable guitars in `guitar-wall` | M | P3 | no |

**What shares an engine piece.** A is the base for C, E, H, I, J. P3 (item looks by state) is shared by N (the table and the bed) and Q (guitars); G does not need it. P4 (task text) is shared by G2, K and 147. B, D and F stand alone. C, then I and J, all reuse the `trinket` kind from C.

Reasoning: A, B and C are small, art-light and prove the pieces. D has no art and gives a quiet daily loop. E, G and I add visible things to the room and each needs an art pass first. F, J and K wait for 147 because they touch the same plant code. M, N, O and Q are the big ones and can wait.

## Questions for Marc (most important first, each with my recommended default)
1. **Order:** do the art-free engine work first (A, B, D) before asking an agent to draw anything? Recommended: yes.
2. **Where are things changed?** Desk right corner for the first trinket, the desk left corner kept for clutter (issue 042), a new wall shelf at the wall strip above the bookshelf later. Recommended: yes to all three.
3. **Clothes:** worn outfits first, changed at the nightstand, accept that the poses stay in everyday clothes for now? Recommended: yes.
4. **Cut flowers dying:** they become a lasting dried arrangement (nothing is lost), and a free task freshens them? Recommended: yes, wilting at 3 game days, dried at 5.
5. **Coffee:** the apparatus changes the task name and prompt, not the pay or the picture of the held mug? Recommended: yes. And duration follows only if Marc likes it.
6. **Takeout:** ordered at the nightstand phone, delivered to the same box, eaten at the table for 40 points, +15 energy, +5 mood, no dishes, and a container to recycle? No cold timer? Recommended: yes.
7. **Rug:** one size (64x32) in the aisle at cols 3-6, rows 3-4, changed at the sofa? Recommended: yes.
8. **Instruments:** display only for now; a full-size keyboard has no place, so a mini one? Recommended: yes; playable later, kalimba first.
9. **The worry doll's name:** plain `WORRY DOLL` in the list, the Spanish name in the note only after the accent is seen in the list? Recommended: yes.
10. **Second plant slot:** still items only at first (the window sill), live plants later? Recommended: yes.
11. **Furniture:** only as gifts, one piece at a time, the record stand first? Recommended: yes, and not before the others (the chair is not first: it is tied to the typing pose).
12. **Names and brands:** use generic nouns (finger skateboard, pod machine, plunger-style press) and note the real brand names only here? Recommended: yes.
