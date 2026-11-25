# Decor: things you collect and arrange (design note, issue 062)

Status: Marc picked (2026-10-23, see issue 062). **Stages 1, 2 and 3a are built** (data and drawing from state; the swap task; the delivery mechanism); stages 3b (the triggers: issue 043 encounters, real gifts) and 4 are not. "What stage 1 built" below says exactly what exists and where it differs from the first draft of this note. The rest is the design the later stages follow.

More decor (an empty pot, cut flowers, trinkets, instruments, clothes, coffee apparatus, a rug, replacement furniture, a second plant slot, takeout): [decor-expansion-design.md](decor-expansion-design.md) (issue 148, a design for Marc to confirm).

## Inventory: an item is shown in one place (issue 073)
Marc (2026-10-26): the same painting in several places makes no sense. Things you own and are not showing are the **inventory**; you place them again.
- **Derived, not saved.** Inventory = owned (known) items that no slot shows. `Decor.inventory()`, `Decor.displayedAt(item)`. The save is unchanged (`owned`, and `placed` for slots that differ from their default).
- **Swap rule** (`Decor.plan(slot, item)`, used by `place` and `preview`). An item from the inventory goes in and the item it replaces goes to the inventory. An item shown in another slot swaps with what this slot shows. If that item does not fit the other slot, the placement is refused with a plain reason (`GOLD ABSTRACT DOES NOT FIT ON THE DESK WALL`); the list stays open, nothing changes.
- **A default is only what a fresh game shows.** It is an owned item like any other: if the barn drawing is on the desk wall or in the inventory, the table's default is not "always available".
- **Swapping plants** puts the stage, growth and dry count back to 0 only when one live plant (a family with stages or that droops) replaces another. A still item (dried flowers, `plant-test-grown`) standing in, or leaving, keeps the live plant's state (issue 105).
- **Old saves.** An older save may place one item in two slots. On load (`parseDecor`) the slots are read in the order of the slots table; a placement is kept if the item is known, owned, fits and no earlier slot shows it. A later slot that loses its item shows its default if that is free, else the first free owned item that fits it (the rest are in the inventory); if even that fails, every slot shows its default. Two slots may not share a default (the tables check it).
- **Deliveries** never give an item you own (`Deliveries.deliver` refuses an owned id), so a package is always new to the inventory.


## What stage 1 built
- `src/game/decor-data.ts`: the slots table (main room: `art-table`, `art-desk`, `art-bed`, `plant-shelf`, `lamp-sofa`), the items table (today's three paintings, the snake plant and the lamp) and the per-family sprite rules (`FAMILIES`). Limits for saved data are `DECOR` in `config.ts`.
- `src/game/decor.ts`: the `Decor` store (`owned` ids, `placed` slot to item), `parseDecor`, `validateDecorData` and `Decor.look(slot, state)`. `Game.decor` holds the store; the game draws from it every frame.
- Drawing goes through the existing appearance path. A map legend entry with `slot: "art-table"` makes an `Appearance` with a `slot`; its look is the item in that slot. A `Prop` already had a `slot` and now draws the same way. The piece keeps its sprite name, so the lamp glow still finds it. A slot object is drawn where its piece was, so draw order on a tie is unchanged.
- Saving: `ProgressStore` writes an optional `decor` field (no version bump). `AchievementsFeature` loads it into `game.decor` and saves it with the rest. Resetting progress resets the decor.
- **Ids start with their kind** (`art-barn`, `plant-snake`, `lamp-table`), as the owned-list rule below says, not the sprite name (so the barn drawing is `art-barn`, and the sprite `painting` is only what it draws).
- **Paintings and walls** (changed in issue 073): the barn drawing and the gold abstract both fit the table and the desk wall (`slots: ["art-table", "art-desk"]`) so they can trade places; the silkscreen is 48 wide and fits only the bed wall.
- **Empty slots** (issue 151, see "What issue 151 built"): a slot without a `default` starts empty. The slots in the real room all have a default.
- Validation: at startup `Decor` checks its tables (repeated ids, id starts with kind, defaults exist and fit, known families, names the font can draw, slot names on items), and `Game` checks that each slot object in the rooms is the slot's size and place. A hand-edited save is cut down (`parseDecor`), never an error.
- Proof that nothing changed: `src/game/main-room-frames.golden.test.ts` renders the main room headless over the recorded states (start, the plant at each stage and drooping, night with the lamp glow, dusk with the blinds open, morning) for four frames each, and compares every drawing call, in order, with a record made on `main` before the change.

## What stage 2 built
- **The swap task.** One task per slot that names an `object` (`swap-art-table`, `swap-art-desk`, `swap-art-bed`, `swap-plant-shelf`, `swap-lamp-sofa`, and `swap-worn` since issue 159), on the dining table, standing desk, nightstand, cube bookshelf and lamp table. The prompts are "Change painting", "Change plant" and "Change lamp". It is last in the choice cycle (Tab or Q). `DecorSlot.object` is the map piece's name; `Decor.swapProblems(level)` (checked by a test) says if the task is not on exactly that object.
- **Only offered when there is something spare.** `Interactable.decorSlot` marks the task and `InteractionSystem.hidden` (set by `Game`) hides it, with no prompt and no cycle entry, unless `Decor.canChange(slot)`: an owned item that fits the slot is in the inventory. So a fresh game (everything owned is on show) shows nothing new.
- **The list** (`activities/swap-decor.ts`, kind `swap-decor`): a box at 320x192 in the pixel font, slot name and `2/3` on top, up to 4 rows (it scrolls and wraps), `(IN PLACE)` beside the item that is there, the place in small text (`ON THE DESK WALL`) beside an item shown in another slot, a line above the keys saying what E does (`SWAPS WITH <ITEM>`, `<ITEM> GOES TO THE INVENTORY`, or why it is refused), and the keys at the bottom. Up and Down move and show that item in the room, E puts it up, Escape (or X) leaves. The box is at the bottom, or at the top for the lamp slot (so it never covers the thing being changed). The usual "ESC TO STOP" and the task label are not drawn for it.
- **The preview is only a view.** `Decor.preview(slot, item)` shows an owned item that fits without placing it; `toJSON` never contains it, it is not a change (`onChange` does not fire), and `clearPreview`, `place`, `reset`, `load` and the game (on the next frame, if no task is running) all clear it. So Escape, a thrown error, a reset or any other way out leaves the room as it was. For a swap the preview shows both slots.
- **What it pays: nothing.** Following this note: no points, no mood, no cooldown. Both ways out (E and Escape) are the quiet end of issue 059 (`completed: false, quiet: true`): no payout, no `taskCancelled`, no `taskComplete`, no cooldown, and the E press is not remembered. Because it never completes, it is left out of the "every task" achievement. No clock runs while the list is open (`holdsClock`).
- **A swapped-in live plant starts small, a still item changes nothing (issue 105).** A live item has a family with `stages > 0` or `droops` (`Decor.isLive`). Putting a live plant over another live plant sets the slot's stage, growth and dry count back to 0. A still item such as the dried flowers hides the plant tasks (`liveSlot` on `water-plant`, `water-plant-droop`, `check-plant`: no prompt, not in the cycle) and freezes the slot's `stageVar`, `growthVar` and `dryVar` (they cannot rise: `ApartmentState.frozen`, so time, a nap and sleep leave the dryness alone). The snake plant comes back as it was left, then dries again.
- **Not built:** the item's one-line `note` after choosing (real items have one since issue 109a, shown on the THINGS page of the pause screen (issue 109b: button or `I`, read-only, `achievements/inventory-draw.ts`), from `Decor.entries()`; add one with each new gift), the gallery wall.
- **TEST items** (`TEST_ITEMS` in `decor-data.ts`, ids with `-test-`, names starting `TEST`, tag `test`): two paintings that fit the table and desk (they use the other two paintings' sprites), a grown plant that never droops, the stool (`lamp-test-stool`, no light) and the stool with a small lamp (`lamp-test-stool-lamp`, sprite `stool-lamp`, glows). Nobody owns them. **Stage 4 deletes `TEST_ITEMS`, `isTestItem`, `decor-dev.ts` and the `?own=` lines in `main.ts`.**
- **`?own=` (dev server only).** `?own=test` owns every TEST item, or list ids: `?own=art-test-barn,lamp-test-stool`. It runs only when `import.meta.env.DEV` is true, so a built game has none of the code. Like the other dev shortcut `?set=plantStage:3`, the owned items are saved with the rest of the progress, so they stay in that browser's save until it is reset.

## What stage 3a built: the delivery mechanism
No trigger is chosen yet; this is the pipe that triggers plug into.
- **One entry point:** `game.deliveries.deliver(itemId, delayHours)` (`src/game/deliveries.ts`). It returns false, and changes nothing, for an unknown item, one you already own, one already queued or waiting, or a full queue (`DELIVERIES.maxQueued`, 20). A negative or NaN delay counts as 0 and a long one is cut to `maxDelayHours` (14 days). Issue 043's pacing options (the ad "buy" and random-on-screens) just call this.
- **The queue and the game clock.** `Deliveries` keeps a running total of game hours (`hours`) and a list of `{ id, at }` sorted by arrival (ties in the order queued). The total moves in `Game.tickClock`, the same place the clock ticks, so it **pauses with the game** (a dialog, the track editor) and, being saved, **resumes after a reload**. Sleeping and napping add hours to the clock by an effect, so `State` now has an `onClockSkip` hook (only for effects that move the clock forward; `set`, negative adds and the dev bracket keys going back do not count) and the game feeds that into the same total: **a delivery due during skipped time arrives at wake.**
- **Where it arrives: a box by the front door.** The tile in front of the door (main room col 10, row 8, legend `x`) is floor. While a package waits, a small box is drawn there (sprite `delivery-box`, art/src, palette only) and the task "Open package" is offered; otherwise there is no box and no prompt, so a fresh game is drawn exactly as before (the golden frame test passes unchanged). While a package waits the box is **solid** (`blockedWhen` on `parcel`, the existing mechanism): you cannot walk onto it, you face it from a neighbouring tile (the tile east of it, or the one north of it) and press E. Once opened the tile is floor again. With nothing waiting it is plain floor. The other tile in front of the door (col 11) and the rest of the room stay reachable in both states (tested). **A package never arrives onto the player:** if you are standing on the tile, or stepping onto it, the arrival is held (the item stays queued) and arrives the moment you are off it. The box follows a derived state variable `parcel` (0 or 1) that `Game` keeps in step with the queue every frame; no task sets it.
- **The item is added on opening, not on arrival.** Arrival shows one plain line over the player, `A PACKAGE HAS ARRIVED.`, wherever you are; arrivals in the same frame (a sleep skip, `?days=`) share that one line (`Game.arrivalNoted`, said once at the end of `update`). Pressing E on the box (task `collect-delivery`, activity `collect-delivery`) adds everything waiting to `owned` **up front** and then opens one dialog with a page per item, `OPENED: <ITEM NAME>`, in arrival order (issue 079). E reads a page and moves on; one item is one page and one press, as before. The activity lasts while the dialog is open and ends quietly when it closes; Escape (the usual action Escape) skips the rest and loses nothing, since everything is already owned. If another dialog is somehow open, one plain line names all of them instead. It pays nothing, changes no mood, has no cooldown, ends quietly (not a completion, not a cancel) and is left out of the "every task" achievement. **Finding an item again later:** the swap lists show every owned item that fits the slot, in table order; an item in the inventory (shown nowhere) has no `(IN PLACE)` and no place line, so it is the one without a marker. No separate screen was added. It never expires: a package waits until you open it.
- **A meal in the pipe (issue 153, takeout).** The queue also holds one meal, which is not a decor item: `Pending.kind: "meal"` (id `meal`, `MEAL_ID`), ordered with `deliverMeal(delayHours)` (`DELIVERIES.mealDelayHours`, 2). One at a time (`mealOrdered` covers on its way and waiting in the box), it counts toward `maxQueued`, it arrives at the same box tile and blocks it the same way (`parcel` stays 0 or 1), and the arrival line is `THE TAKEOUT HAS ARRIVED.` (a package arriving in the same frame makes it `A PACKAGE HAS ARRIVED.`). `collect()` leaves the meal alone; `open(takeMeal)` returns `{ items, meal }`. The game opens the box with `takeMeal` true only when no plate is on the table (`plate` 0): then it sets `takeout` and `plate` to 1 (the table shows `table-plate`; no new art) and says `OPENED: TAKEOUT. IT IS ON THE TABLE.`; otherwise the meal stays in the box and the page says THERE IS A PLATE ON THE TABLE. THE TAKEOUT CAN WAIT. Saved: the pending meal is `{ id: "meal", kind: "meal", at }` and a waiting one is `meal: true` on the `deliveries` field (left out when there is none, so an old save loads unchanged); a damaged value is cut down by `parseDeliveries` (one meal at most, finite time, within the cap). **The bag (issue 154):** the takeout is drawn as a paper bag (`takeout-bag`, art/src), not the package box, at the same tile. A derived variable `takeoutBag` (1 only while the meal waits and no package does; `Game.syncParcel` keeps it, no task sets it) picks the first variant of the door appearance; `parcel` still drives the solid, the task and the box. If a package and the meal wait at once the **box** is drawn (opening takes both); once the packages are opened the bag shows alone if the meal is still waiting. Golden frames are unchanged (a fresh game draws nothing there). The tasks are in [tasks.md](tasks.md).
- **Saved** as the optional `deliveries` field of the progress save (no version bump): `{ hours, pending, waiting, fired }`. An old save has none (nothing queued). `parseDeliveries` is tolerant: bad shapes, non-finite numbers, repeats and `__proto__`-style ids are dropped, and everything is capped (`DELIVERIES` in config.ts). Queued things you already own are dropped on load. A change saves at once.
- **Checkpoints** (`src/game/delivery-checkpoints.ts`): a data list of milestones `{ id, stat, atLeast, item, delayHours }` with stat `points` (lifetime), `days` (game days played, 24 game hours each, sleeping included) or `tasks` (lifetime tasks done). The achievements feature checks them whenever stats change (and every few seconds); each fires once, is remembered in the save (even if the delivery was refused, so it never retries) and calls `deliver`. **Stage A of issue 043 filled the production list** with the first ten gifts (days 1, 3, 5, 8, 10, 13 and 16, plus the Green Thumb, Desk Job and Record Keeper achievements, each arriving 2 game hours later). A milestone is now `{ id, stat | achievement, atLeast, item: string | string[], delayHours }`: a list gives the first item you do not own, an owned item gives nothing (the milestone is still marked fired), and a full delivery queue retries later instead of burning the milestone. The real items are `GIFT_ITEMS` in `decor-data.ts`; the candle has `glow.flicker` (a quick seeded wander that ticks about twelve times a second, never a strobe; it holds steady when the browser asks for reduced motion, issue 162b). Dev only: `?days=N` skips N game days so the gifts arrive quickly. Nothing is shown or counted; nothing is missable forever.
- **Dev shortcut, `?deliver=` (dev server only, `import.meta.env.DEV`, like `?own=`):** `?deliver=test` switches on `DEV_CHECKPOINTS` (TEST items at 20 points, 3 tasks done and 1 game day); `?deliver=art-test-barn,lamp-test-stool` queues those items to arrive in half a game hour (about 15 seconds of play). Fired checkpoints are saved, so reset progress (from the achievements list) to see them again. Stage 4 removes this with the TEST items.
- **Ad encounters (issue 043 stage B)** are the other source: an ad purchase calls `deliver(ad.item, ad.delayHours)`; see `docs/random-encounters.md` section 13.
- **Not built:** a nicer arrival (a knock, a sound); the arrival waiting for a calm moment. A package that arrives during a task shows its line at once (a popup, it does not interrupt the task; several in one frame make one line).

## What issue 069 built: items decide whether they give light
- `DecorItem.glow?: { radius, alpha }` (in `decor-data.ts`). The night glow is drawn from the item in each decor slot (`time-of-day/feature.ts`), not from the slot or the sprite name. An item without `glow` gives no light. The default lamp has `{ radius: 40, alpha: 0.2 }`, the numbers the old `TIME_OF_DAY.glows` entry had, so the room at night is drawn exactly as before (golden frames unchanged). `TIME_OF_DAY.glows` still lists the things that glow but are not decor (the desk).
- The glow follows a preview too, so you see the light (or none) while the swap list is open.
- TEST pair for the lamp slot: the bare stool gives no light, the stool with a lamp (smaller glow, radius 24) does. **Stage 4 (the art pass)** makes the real stool, which Marc also wants usable as a stool for guitar playing or recording, and its lamp pairing real items.

## What issue 147 built: more plants for the shelf

Six more items for the `plant-shelf` slot, with no new engine: the slot, the swap, `FAMILIES`, `Decor.isLive` and `frozenVars` already did everything. All six are gifts (`GIFT_ITEMS`, `from: "A PACKAGE"`), listed after the first ten in `delivery-checkpoints.ts`.
- **Live** (new families in `FAMILIES`, each `{ stages: 4, droops: true }` like the snake plant, so `<family>-0..3` and `<family>-wilted` are the five sprites): `plant-pothos` (family `pothos`, trailing vines over a terracotta pot), `plant-monstera` (`monstera`, big split leaves, white pot) and `plant-spider` (`spider`, arching blades and spiderettes, teal pot). Fewer stages are allowed (`stages` can be 1 to 4 and `look` clamps to the last), but four costs only two more sprites per plant and keeps the growth the same as the snake plant's, so the stage and droop rules are untouched. A swapped-in live plant starts small (stage, growth and dry count to 0), as before.
- **Still** (no family, one sprite each, like `plant-dried`): `plant-pampas` (plumes in a tall vase), `plant-lavender` (a bundle in a small jug) and `plant-eucalyptus` (stems in a glass jar). They hide the watering tasks and freeze the slot's variables while on the shelf (issue 105).
- **When they arrive** (a default chosen by the planner; Marc can change any number in `delivery-checkpoints.ts`): pothos day 21, pampas day 24, monstera day 27, lavender day 30, spider plant day 33, eucalyptus day 36, each two game hours after the day starts. Nothing is required or missable and nothing is announced.
- **Not changed (but see issue 149):** the task names said "snake plant" whatever was on the shelf; since issue 149 they follow the plant. The object's name in `apartment.ts` and the state variable meanings too. Making them say "plant" was issue 161: the Green Thumb achievement now says "Water plant three times."; the object name in `apartment.ts` is never shown (it is only an id slug for tests and the side-project room), so it stays; the state variable meanings are developer text only (not in the game), so they stay.
- Tests: `src/game/decor-plants-147.test.ts`. The golden frames of the main room are unchanged (nobody owns the new items at the start).

## What issue 149 built: more growth stages for the pothos and monstera

Marc's decisions (2026-11-23): only the pothos and monstera get more stages (snake plant and spider plant stay at four), and the late stages are taller sprites drawn over the bookshelf's top.
- **Stages per family.** `FamilyRules` (`decor-data.ts`) got two optional fields. `wateringsToGrow` is the waterings that count for each step out of stage 0, 1, 2 and so on (one fewer than `stages`); left out, the family uses `PLANT.wateringsToGrow`, the snake plant's `[2, 3, 4]`. `Decor.growth(slotId)` gives the held plant's last stage and thresholds, and `settlePlant(state, rules)` uses them (the default is still the snake plant's). `plantStage`'s maximum is 5, the longest family. A stage above a family's last (a hand-edited save) is drawn as the last and cut down at the next watering, never an error.
- **Counts and thresholds (the agent's proposal; Marc can change any number in `FAMILIES`).** Pothos: 6 stages (`pothos-0` to `pothos-5`), thresholds `[2, 3, 4, 6, 8]`, so 23 waterings in all (the old 9 to the flowering look, then 6 and 8 more). Monstera: 5 stages, thresholds `[2, 3, 4, 7]`, 16 waterings. A watering needs the soil dry for 6 game hours, so the fastest possible pothos is nearly six game days of waterings (about 70 minutes of play) and a relaxed player takes weeks; the pothos arrives on day 21 and nothing is lost, punished or required by waiting. The first stages are exactly the snake plant's, so nothing earlier changes.
- **Bigger sprites.** `overhang` is `{ stage: { up?, down? } }`, pixels the sprite reaches above and below the slot. The sprite is `up + 16 + down` high and its middle 16 rows are the slot (`DecorLook.up` and `.down`; `game.ts` draws a prop at `y - up`, so `down` is just a taller sprite). Sprites are whole tiles, so each is a multiple of 16. Pothos stage 4 is `{ down: 16 }`: the vines hang down over the bookshelf's south face. Stage 5 is `{ up: 16, down: 16 }` (16x48): the same hanging curtain, and one thin vine also crawls across the shelf's top over the books (Marc asked to try both). Hanging reads as a trailing plant; the crawling vine alone had read as a tall plant, so it is only an addition. The monstera stage 4 is `{ up: 16 }`: a taller crown over the shelf's top. Each such stage also has its own drooping sprite, `<family>-wilted-<stage>`, the same size. The slot, `fits` and the swap still use the 16x16 footprint. A later plant (or stage) uses the same field.
- **What the pothos's vines cover (checked on the real map and sprites).** The shelf is column 10, rows 1 to 4 of the main map (16x64 at x 160, y 16); the plant slot is y 52 to 67, so its pot ends at y 67 and the shelf's south face (three drawer fronts, local rows 53 to 62, bottom outline at 63) is y 69 to 79. The hanging vines fill 12 of the 16 rows below the slot, so the last four stay empty and nothing is drawn past y 79. South of the shelf is open floor (column 10, row 5): the tile where the player stands to water the plant, change it or sort records. Nothing reaches it, so no vine covers the player, and the plant is sorted by the shelf's bottom edge like before, so the player standing there is drawn after it anyway. West and east of the shelf nothing changes. No cube opening or other prop is on the south face. A test checks every visible pixel of the tall sprites is inside the bookshelf's own bounds and not on any tile where a task is done from, that no other prop is under them, and that the player is drawn after the plant wherever their tile touches the sprite's box.
- **The pothos's crawling vine** (stage 5, up 16) lies over y 36 to 51 of the shelf's top (local rows 20 to 35): the lower half of the bowl and the book tray, which are only drawn and have no task zone. It is one thin winding strand with a few leaves, so the books still show. Compared in the room at 1x and 8x against hanging only (the curtain alone, kept in the commit before this one): the crawling strand is faint at 1x but gives the plant its vine look from the top as well, so the pair was kept.
- **The monstera's crown** (stage 4, up 16) covers the shelf's rows 36 to 51 and the 16 above, the book tray and the edge of the bowl, which are only drawn and have no task zone.
- **Art.** `pothos-4` (the first vines hang over the south face), `pothos-5` (they hang most of the way down, with one vine crawling across the shelf top), `monstera-4` (a bigger crown of split leaves), and the three drooping ones (limp yellow vines, shorter); palette only, top-front view. First drawn as vines climbing up over the shelf top; Marc found that hard to tell from a tall plant, so the pothos was redrawn hanging down.
- **Swap.** A swapped-in live plant still starts small, so a grown pothos is lost on swap, as before. No note or swap-list text changed (see decision d3 in the issue file).
- Tests: `src/game/decor-plants-149.test.ts`. The golden frames are unchanged.

## What issue 168 built: two coffee stations and the first coffee gear

Marc's answers (issue 148, d5 and d13): the apparatus changes the task name and prompt, not the pay or the held mug; there are two stations, a table slot and a stove slot, each apparatus fits one, and the task is offered where its apparatus sits. Working assumptions for the open decisions (issue 168, d1 to d4, not answered): AIR PRESS for the plunger-like air press, the first batch below, equal duration, gifts from day 85.
- **Slots.** `coffee-table` (main, abs 62, 18, 16x16, a prop on the dining table at local 46, 2, default `coffee-pourover`, so a fresh game looks the same) and `coffee-stove` (kitchen, abs 93, 56, 16x16, a prop on the stove's top-right burner at local 29, 8, no default: it starts empty). Both are kind `coffee`, changed at their own object (`swap-coffee-table`, `swap-coffee-stove`, "Change coffee gear"); the stove's swap list has NOTHING, so a pot can be taken off again.
- **Items.** Each fits one slot only (`slots`). Table: the pour-over cone (default, owned from the start, `taskName` "pour-over"), french press, drip machine, pod machine. Stove: percolator, moka pot, briki. Their `taskName`s are "french press", "drip", "pod", "percolator", "moka", "briki". The espresso machine, siphon and air press are a second batch and are not built.
- **Art.** `table` and `table-plate` were redrawn without the dripper (the pixels x 50 to 61 of the top are bare oak); the dripper became `coffee-pourover` (16x16, the same pixels). The table items are diagonal like the table, the stove items near top-down like the stove. The mug prop is unchanged and still sits in front. Nothing is wider than the slot, so no stylized espresso machine yet.
- **Task text.** `Interactable.heldSlot` (like `liveSlot`, but only "the slot holds something") makes the task hidden while the slot is empty, and `itemWord` is replaced by the item's `taskName` in the name (`Decor.taskName`) and now also in the prompt (`Decor.taskPrompt`, drawn from `game.ts`). `coffee` is "Make pour-over coffee" (its prompt used to be "Make coffee"; it now says the same as its name) and `coffee-stove` is "Make stovetop coffee". Both use one rule set (`COFFEE` in `tasks.ts`): same points, time, mug, dish, energy and mood; they share the one `mug`, so coffee made at either station is drunk at the table. `coffee-stove` is a task of its own, so it has its own repeat count and cooldown record; the achievement Regular Order counts either (`anyOf`), and "every task" leaves it out, since it only exists with a pot on the stove.
- **Gifts.** Day 85 french press, 88 drip machine, 91 pod machine, 94 percolator, 97 moka pot, 100 briki (after the outfits at 72, the rugs 75 and 78 and the trinkets from 81). The random-encounter pool joins when issue 163 lands.
- **Tests.** `src/game/decor-coffee-168.test.ts`. The golden frames were recorded again: every frame gains one draw call, the `coffee-pourover` prop. Several tests that pinned the starting items (eight now, the cone counts), the gift count (37) and the slot list were updated.
- **Try it (dev server).** `?own=coffee-french-press,coffee-moka-pot,coffee-briki` owns items so the swap list shows them.

## The rule that shapes everything
Marc's decision (2026-10-23, in PLAN.md Decisions): collecting is a **quiet side effect**, a zen garden. It is not a goal, a ladder or a shop you grind for. So:

- No currency, no price, no scarcity, no timers, no "you are missing one".
- Nothing is ever required. No task, score or achievement needs a decor item.
- Things turn up. You arrange them when you feel like it. Putting the old one back is always free.
- It may become a goal later. So the data model only records **what exists, what you own and what is placed**. How you came to own something is a separate, optional field. A goal (a collection count, a "set" of items, a price) can be added on top without changing the model.

Plants (063) and track-editor plugins (064) use the same idea, see "Other owned things".

## What can change
| Kind | Examples | Change how |
|---|---|---|
| `art` | the three paintings on the north wall, the robin print, the gallery wall pieces | swap the picture in a wall slot |
| `plant` | the snake plant on the bookshelf, a windowsill plant | swap the plant in a plant slot |
| `prop` | a small thing on the nightstand, the desk or the table | swap the small item in a surface slot |
| `lamp` | the lamp on the lamp table | swap its look |
| `rug` | a rug on the open floor | choose none or one |
| `instrument` | the guitar by the sofa (the nylon-string one is already drawn) | swap its look |

**Big furniture (sofa, bed, desk) is left out of the first sets.** A new sofa means new art at 96x32 plus new task spots and hit boxes. Cheaper later: sofa *covers* (a throw or a colour), which are a different sprite of the same size, so they are a normal slot.

## The slot model
A slot is a place that holds one item.

```ts
interface DecorSlot {
  id: string;            // "art-table", "plant-shelf", "lamp-sofa"
  room: string;          // "main"
  name: string;          // what the prompt says: "ART OVER THE TABLE"
  area: Rect;            // pixel position and size in the room (the item's sprite is drawn here)
  kinds: DecorKind[];    // which kinds fit: ["art"]
  default: string;       // item id shown on a fresh game, and the fallback if a saved one is gone
  empty?: boolean;       // (not in stage 1) true if "nothing" is allowed (rug, props); art and lamps always show something
  object?: string;       // the map piece you stand at to change it (where the swap task is)
}
```

An item fits a slot if its kind is in the slot's `kinds` and its sprite size equals the slot's area size. (One check at load, in a test. This is why the first item set lists sizes.)

### First slots (main room, pixels from the top left; one tile is 16)
| Slot id | Area (x, y, w, h) | Kind | Default (today) | Changed at |
|---|---|---|---|---|
| `art-table` | 32, 0, 32x16 | art | `art-barn` (sprite `painting`, barn drawing) | dining table |
| `art-desk` | 112, 0, 32x16 | art | `art-abstract` (sprite `painting-desk`) | standing desk |
| `art-bed` | 224, 0, 48x16 | art | `art-silkscreen` (sprite `painting-wide`) | nightstand |
| `plant-shelf` | 160, 52, 16x16 (the overlay piece 063 built, on the bookshelf) | plant | `plant-snake` (family `plant`) | bookshelf |
| `lamp-sofa` | 128, 96, 16x16 (the lamp table) | lamp | `lamp-table` | lamp table |
| `pantry` | kitchen, 176, 16, 16x32 (the pantry, issue 072) | pantry | `pantry-bins` (sprite `pantry`; the id starts with the kind) | nowhere yet: no `object`, one item, so no swap task. Stage 4 adds upgrade items (and sets `object`). |
(The five rows above are what stage 1 has. The rows after are later.)
| `rug-floor` | open floor, 64x32, drawn under the player, no solid | rug | none | sofa |
| `prop-nightstand` | a 16x16 corner of the nightstand | prop | none | nightstand |
| `prop-desk` | a 16x16 corner of the desk top | prop | none | standing desk |
| `guitar-wall` | the guitar tile, 16x16 | instrument | `guitar` | guitar |

Later: the gallery wall (ten pieces, seen in the admire-art view, issue 040), a windowsill plant, a kitchen wall art slot. The model does not care how many slots there are; they are a list in a data file like the map legends.

`area` positions marked "corner" are guesses until the art shows where a prop fits without hiding something; stage 4 settles them. A slot that does not fit the current art is a data edit.

**Slots live in `src/game/decor-data.ts`** (new), next to `state-vars.ts`, so tuning and content stay out of the engine, as the working rules say.

## Items
```ts
interface DecorItem {
  id: string;            // starts with its kind: "art-robin"
  name: string;          // shown in the list: "ROBIN PRINT" (capitals, digits, basic punctuation only: the font)
  kind: DecorKind;
  sprite: string;        // sprite name; a family name for growing plants (see below)
  w: number; h: number;  // pixels; must equal the slot's area size to fit
  note?: string;         // one deadpan line shown when you pick it up or put it up
  // Optional, for later and for source tracking. Nothing reads these in stages 1 to 3 except `how`.
  how?: "start" | "gift" | "find" | "delivery" | "browse";
  slots?: string[];      // if set, fits only these slots (today's paintings: their own wall)
  family?: string;       // sprites chosen by rules from state (plants), see FAMILIES
  tags?: string[];       // "set:gallery", "warm": room for a goal or a theme later
}
```

Items are a list in `decor-data.ts`. Adding an item is a data line plus a sprite.

## State variables vs a decor store
Two ways to save which item is in which slot.

### Option A: a state variable per slot (the existing variant system)
`artTable` holds a number (0, 1, 2...) and the object's `variants` pick the sprite with `when: [{ var: "artTable", min: 1, max: 1 }]`. The save already stores state vars, so there is no new save code.

Good: nothing new in the engine. Same pattern as `dishes`, `bedMade`.
Bad:
- State vars are numbers with `min` and `max` set at load. An item is a string id; you would store an **index** into a list. Reorder, remove or insert an item and every old save points at the wrong thing.
- The owned list has no home. A number cannot be a list. A bit mask works but is unreadable and caps at about 30 items.
- Every item needs a variant line per slot (item count times slot count), generated by hand or by a helper.
- State vars reset to `initial` when the id is unknown or a value is out of range, so a removed item silently becomes item 0 or clamps to the last: that looks like a bug.

### Option B: a separate decor store (recommended)
```ts
interface DecorSave {
  owned: string[];                  // item ids you have
  placed: Record<string, string>;   // slot id -> item id (only slots that differ from the default are needed)
  seen?: string[];                  // optional (issue 109c): items an ad showed you and you did not take; never an owned id; capped; shown as a silhouette on the THINGS page. Sync: union of both sides minus anything owned.
}
```
A small `Decor` class (like `ApartmentState`) holds it: `itemIn(slot)`, `place(slot, item)`, `own(item)`, `owns(item)`, `choices(slot)` (owned items that fit; see the inventory section for what is shown elsewhere), and an `onChange` the renderer listens to.

Good: ids not indexes, so removing or renaming an item is safe; the owned list is a real list; a goal can add fields (`since`, `cost`) without touching what exists.
Cost: one new saved structure and a small piece of renderer code.

### How the two meet (this keeps the benefit of A)
The renderer already draws a piece through `Appearance { area, variants }`, picked each frame. For a decor slot the engine builds the appearance **from the store**: an `Appearance` gets an optional `slot` id, and when set, the variant is "the sprite of the item in that slot" instead of the first `when` that holds. The painter, the night tint, the draw order and the placeholder fallback (`label`, `color`) are all unchanged. A missing sprite still draws a labelled box, so items can be added before their art.

Two small links back to state, both optional:
- A **derived check** so tasks can ask "is there a plant on the shelf": `Check` gets an optional `decor: { slot, item }`. Not needed in stage 1.
- Plant stage and the like stay state vars (063), because they change by the clock.

Recommendation: **Option B**, drawn through the existing appearance path.

## Swapping: a task at the object, with the choice cycle
Changing decor is an ordinary task, so it uses what exists: it is placed on an object by id, and an object with several tasks becomes a choice (Tab or Q cycles, E starts, issue 039).

- Task ids: `swap-art-table`, `swap-art-desk`, `swap-art-bed`, `swap-plant`, `swap-lamp`, `swap-rug`, `swap-prop-nightstand`, `swap-prop-desk`, `swap-guitar`. Or one generic `swap-decor` per object whose slots are listed in the data (recommended: fewer tasks, and the object lists its slots).
- **It is only offered when there is something to choose.** If a slot has no owned item besides the one in it, the task is not in the cycle (as unavailable tasks are not). So a fresh game looks exactly as today, with no new prompts.
- It has **no points and no cooldown**, no mood change on its own. (The admire-art task already pays for looking; a nicer wall could add a very small amount, see open questions.) It takes a moment (about 1 second of game time) and nothing else.
- Choosing: starting the task opens a **list** over the room. Up and Down move, E or Enter puts the item up, Esc cancels with nothing changed. The item changes in the room behind the list as you move the highlight, so you see it before you commit (Esc puts the old one back).

### Mockup 1: the prompt at the object
At the dining table with two choices. Same box as the existing choice prompt (`<1/3>` after the verb). One line, 320 px wide is 53 characters of the 5x7 font (6 px advance).

```
320 x 192 (53 characters across)
+-----------------------------------------------------+
|######## room, the wall art over the table ##########|
|                                                     |
|        [ the table, you standing south of it ]      |
|                                                     |
|  +-----------------------------------------------+  |
|  | E  CHANGE THE ART <2/3>                       |  |
|  +-----------------------------------------------+  |
+-----------------------------------------------------+
```
(Tab: COFFEE <1/3>, CHANGE THE ART <2/3>, REHEAT <3/3>.)

### Mockup 2: the browse/choose list
A box at the bottom, 3 rows of items with the picture beside it. Names are capitals, so they fit the font. Row height 9 px; box 17 px from the sides.

```
+-----------------------------------------------------+
|                                                     |
|    (the room; the wall art above the table shows    |
|     the highlighted item as you move)               |
|                                                     |
|  +-----------------------------------------------+  |
|  | ART OVER THE TABLE                       2/4  |  |
|  |                                               |  |
|  |   BARN DRAWING             (on the wall now)  |  |
|  | > ROBIN PRINT                                 |  |
|  |   SWAMP                                       |  |
|  |   INSECT PAINTING                             |  |
|  |                                               |  |
|  | UP DOWN: LOOK   E: PUT UP   ESC: BACK         |  |
|  +-----------------------------------------------+  |
+-----------------------------------------------------+
```
- The `>` row is the highlighted one. The thing on the wall now is marked in plain words.
- At most 4 rows show; more scroll with `2/9`-style counts (no letters beyond the font).
- An item that does not fit the slot is **not listed** (not greyed). Nothing is locked or "not owned" in this list; unowned things never appear. No counts of how many exist.
- After E: one deadpan line in the dialog box from the item's `note` ("The robin looks over the table.") if it has one, then the room again. Keep these short; Marc reviews text in issue 037.

If the slot allows `empty` (rug, props), the first row is `NOTHING`.

## Where items come from, without pressure
The data model says only that an item id is in `owned`. These are the sources, all optional. Pick one to build first (the question list has my recommendation).

| Source | How it works | Pressure? |
|---|---|---|
| **Start** | A few items are owned from the first run (the three paintings the room has, the snake plant). Defaults are owned, so "put it back" always works. | none |
| **Gifts** | Quiet moments hand one item over: a text from a friend, a first time doing something (the first track made, the first long record session), a calm real-life date. A line in the dialog box, the item shows up in the list. Not tied to score. | none: it just happens; no meter |
| **Finds** | A quiet random encounter (issue 043 thrift finds): while walking or after a task there is a small chance of a "found" line and an item. Duplicates are never given. Once you own it all, the encounter does not fire. | none: no "rare", no pity timer |
| **Delivery** | A package at the door some evenings, opened with a task at the front door (it is decoration for now). One item. | none: you may leave it, it does not expire |
| **Laptop browse** | A task "browse" at the desk or the sofa: look at a few things on the screen, you may "add" one to your things. It **never gates anything**, never shows a price, never runs out, and it is not the only source. At most a deadpan line about window shopping. | none |

My recommendation to build first: **gifts and finds**, because they need no new screen (a dialog line and a list entry). The laptop browse is the most "shop-like" and the one most likely to read as a goal, so it comes last, if Marc wants it.

An item's `how` field records the source, so a later goal could count them, but nothing reads it.

### Rules that keep it calm
- Items cannot be lost, sold or broken. "Put away" just empties the slot or restores the default.
- Duplicates are not given. Nothing is given twice.
- No list that shows what you do not own. No "5 of 12".
- No notification that interrupts a task. An arrival is one dialog line at a calm moment (between tasks, not during a typing game).
- Arrivals respect the same quiet-hours as other gifts: not at 3 AM during sleep.

## First item set and art budget
Drawn from real things in the apartment first (the Photos rule: photos stay in `reference-photos/`, never copied into the repo, sprites are impressions). Sizes follow the slot; every item is **one sprite** unless noted. Sprites are drawn the same way as the current ones (`art/src/*.sprite`, palette only, `npm run sprites`).

### Art (3 slot sizes)
| Item | Slot size | From |
|---|---|---|
| Barn drawing `painting` (exists) | 32x16 | barn painting photo |
| `painting-desk` (exists) | 32x16 | the gold and orange abstract |
| `painting-wide` (exists) | 48x16 | the silkscreen over the bed |
| `art-robin` (the old 16x16 sprite `painting-robin` was deleted in issue 101) | 16x16: needs a 32x16 mat version, 1 new | the robin print |
| Swamp | 32x16 | gallery wall |
| Italy architecture | 32x16 | gallery wall |
| Insect painting (two of them) | 32x16, 2 new | gallery wall |
| Coyote print | 32x16 | gallery wall |
| Concert poster | 32x16 | the poster on the desk |
| Puppet show / New Mexico abstract | 32x16, 2 new | gallery wall |
| Paris still life | 32x16 | gallery wall |
Art is the biggest group and the cheapest per item: **about 10 new sprites**, one size per wall slot (32x16 fits two of the three slots; the wide 48x16 slot would need 3 or 4 wide ones, or letting the 32x16 items sit centred in it with the mat).

### Plants (16x16)
Per 063 a plant is a **family of stage sprites**. The existing plant: `plant-0..3` and `plant-wilted` (063 draws them).
| Item | Sprites |
|---|---|
| Snake plant (the real one, 063) | `plant-0..3`, `plant-wilted` (5, drawn in 063) |
| Dried flowers (from the dried flowers photo on the bookshelf) | 1, never grows (dried: a plant that needs nothing) |
| A trailing plant for the windowsill (second slot, later) | 5 if it grows, 1 if not |
First set: the snake plant plus dried flowers (1 new sprite). More growing plants are 5 sprites each, so add them slowly.

### Lamp, rug, guitar, props
| Item | Size | Notes |
|---|---|---|
| `lamp-table` (exists) | 16x16 | |
| Second lamp (a warm shade) | 16x16 | 1 new; the glow is the time-of-day system's, see below |
| Rug: a plain wool rug (2 colours) | 64x32 | 2 new; drawn under the player |
| `guitar` (exists), `guitar-nylon` (exists, drawn in 047, not placed) | 16x16 | 0 new |
| `stool` (exists, drawn, not placed) | 16x16 | could be a prop beside the guitar; 0 new |
| Mug of pens, a small plant cutting, a stack of mail (from the table photo) | 16x16 | 3 new, props |

### The budget
- **Exists today and just becomes items:** 3 paintings, robin print (re-matted), lamp, guitar, nylon guitar, stool, snake plant stages (063). About 9 sprites already drawn.
- **New in the first set:** about 10 art, 1 plant, 1 lamp, 2 rugs, 3 props = **about 17 new sprites**, mostly 32x16 or 16x16. A rug is the largest.
- Stage 4 is that art. Stages 1 to 3 run on the placeholder boxes (a labelled colour) so the system is tested before any art.

## How it touches other systems
- **Mood:** the `admire-art` task could add a very small mood bump when the wall has something other than the default. Recommendation: **no**, not in the first stages. It would make decor a "do it for the number" thing, against the zen rule. A later, tiny version is a one-line tuning value.
- **Lighting:** the lamp glow is from the time-of-day system. A lamp item may have an optional `glow` (color and radius); the default lamp keeps today's. Not in stage 1.
- **Photos rule:** items come from real things first; made-up items are added only after Marc agrees.
- **Cutscenes and the gallery view:** `view-gallery-wall` (060, 061) shows the real ten pieces and stays as it is. If the wall pieces become slots later, the picture needs a variant per set. Not planned.
- **Reading state:** nothing in tasks, scoring or achievements reads decor in stages 1 to 3.

## Other owned things: plants (063) and plugins (064)
The same pattern, one `owned` set with kinds, so the player has one idea: "my things".

- **Plants (063).** A plant item is a decor item of kind `plant`, placed in a `plant` slot. **What the plant is** (item, species) is decor: owned, placed, swapped. **How the plant is doing** (stage, wilted, days since watering) is state, the `plantStage` variable, which changes with the clock. 063 builds one plant first (the snake plant on the shelf). So that 062 can later swap it:
  - 063 should draw the plant as **its own overlay piece** (not inside the bookshelf sprite), so it can be a decor slot (`plant-shelf`). 063's note says it will pick: bookshelf variant per stage or overlay. This note asks for the overlay. If 063 ships a bookshelf variant per stage instead, the plant slot just is that variant, and stage 1 here adapts; either works.
  - **Built in 063 and stage 1:** the plant is its own overlay piece (a `Prop`, slot `plant-shelf`). Its sprite names are `plant-0..3` and `plant-wilted`. For other plants the item has a `family`, and `FAMILIES` says how many stages the family has and whether it droops: `<family>-0..` for the stage, `<family>-wilted` when drooping. A plant that never grows (dried flowers: `stages: 0, droops: false`) always shows the item's own `sprite`, so it never droops. A family with fewer stages than the shelf's stage uses its last stage. The snake plant draws exactly as 063 made it.
  - **Stage belongs to the slot, not the item** (the slot names its variables, `stageVar` and `dryVar`: `plantStage` and `plantDry` for the shelf; another plant slot gets its own). When you swap plants, the new one starts at a small stage. This is a choice to confirm (open questions).
  - A plant arrives as a normal item. It is not a pet: it never dies (063), and not watering it never takes it away.
- **Track editor plugins (064; now a parked idea in [ideas.md](ideas.md), the issue was removed).** A plugin is an item with kind `plugin` in the **same owned list**, with the same sources (gifts, finds, a calm reward for making a track, a delivery). The difference is the **place**: a plugin has no slot in the room; it appears in the editor's plugin menu. So `DecorKind` gets `"plugin"` and a plugin item has `slot: none`. `owned` gives the editor its list. One thing to decide with 064: one list for everything or a second list named `plugins` in the same save. Recommendation: **one `owned` list**, ids prefixed by kind (`plugin-echo`), because the sources, the arrival line and the save tolerance are all the same. Plugin behaviour and format details are in `docs/plugins.md` (064), not here.

If both turn out to be a different shape, the owned list stays a list of ids and each kind gets its own `placed`-like structure. That is a data change.

## Save format
Saved in the existing progress JSON (`life.progress.v1`, `ProgressStore`) as a new optional field, **no version bump**:
```json
{ "version": 1, "unlocked": [], "stats": {}, "world": {},
  "decor": { "owned": ["art-barn", "art-robin"], "placed": { "art-table": "art-robin" } } }
```
Why there and not a new key: it is one player's progress, saved with the rest (009c), and the store is already tolerant. (Tracks stay in `life.tracks.v1`; plugins would be in `owned` here and **referenced** by the editor.)

### Tolerance rules (a function `parseDecor(raw, data)`, like `parseWorld`, with tests)
Built in stage 1 (`parseDecor` in `decor.ts`, tests in `decor.test.ts` including fuzzed data). Limits for hand-edited data are in `DECOR` in `config.ts`: at most 500 owned ids, ids up to 64 characters, 200 placement entries read; anything beyond is cut.
- Missing `decor` (old save): `owned` = the starting set, `placed` = `{}`. The room looks exactly as today.
- Not an object, or the wrong shape: ignore it and use the defaults (never throw).
- `owned`: keep only strings; remove duplicates. **An id the game no longer has is kept in the saved list but ignored** (it is not offered, not drawn), so a build that brings an item back restores it. A removed item is never an error.
- `placed`: keep a slot only if the slot exists, the item is a known item that fits the slot, **and it is owned** (or is the default). Anything else falls back to the slot's default. (So a removed item on the wall shows the default painting, not a hole.)
- Starting items are always considered owned, even if a damaged save lacks them.
- `ProgressStore.save` gets a `decor` argument; `load` returns it. Stats and unlock saves are untouched.
- A second tab or a blocked store behaves as today (try/catch around everything).

## Staged build plan
Each stage is its own issue, small, and leaves the game working. Stages 1 and 2 are testable without art.

**Stage 1: data and rendering from state (default = today). Built; see "What stage 1 built".**
- `decor-data.ts` (slots, items, starting set), a `Decor` class, `parseDecor`, `ProgressStore` field.
- The three paintings become decor slots drawn through `Appearance.slot`; the game looks **exactly** as today (compare rendered frames).
- Tests: defaults, `place` rejects a wrong kind or size, saves round trip, old save, removed item, duplicates, unknown slot, damaged data; a data check that each item's size equals its slots'.
- No new tasks, no prompts. Art: none.

**Stage 2: the swap task.**
- A generic `swap-decor` task per object, only offered with a choice; the list UI (mockups above) with live preview and Esc to cancel; keys and text in the font. Items for testing: the placeholder boxes plus the existing sprites (robin, nylon guitar, stool).
- Tests: task not offered with one item, offered with two; cancel restores; the choice cycle shows it; the list scrolls; the dialog line.

**Stage 3: acquisition.**
- Gifts and finds first (events and the 043 encounters), the start set, the arrival line. Then, if Marc wants, delivery and the laptop browse as separate small issues.
- Tests: no duplicates, never during a task, never fires when everything is owned, saves.

**Stage 4: art.**
- The first set (about 17 sprites) in batches by kind, from the photos. Plants follow 063's sprite batch.

**After:** the plugin issue (064) adds `plugin` kind items to the same `owned`; plants (063) share `plant-shelf`.

## Open questions for Marc (with my recommendation)
1. **Option A (state variable per slot) or B (decor store)?** Recommend **B**: ids not indexes, a real owned list, safe when items are removed, and a later goal can add fields without changing it. It still draws through the existing appearance path.
2. **Which source first?** Recommend **gifts and finds**, no new screen, nothing to buy. The laptop browse last, or never.
3. **Should anything cost anything?** Recommend **no**: no prices at all in the first build. If it ever becomes a goal, a `cost` field on items and a small currency state var are the addition; the current model does not need to change.
4. **Does decor affect mood or points?** Recommend **no** for now (it would turn arranging into doing it for the number).
5. **Which slots in the first cut?** Recommend the three paintings, the plant, the lamp and the rug. Props and the guitar slot after. The sofa and bed stay as they are (covers later).
6. **One owned list for decor, plants and plugins, or separate?** Recommend one list, ids by kind.
7. **When you swap plants, does the new plant start small?** Recommend yes. The alternative is that a plant keeps its stage somewhere while it is "in storage", which is more to remember and runs against a quiet game. Check with 063.
8. **Are invented items allowed (a plant or painting that is not in the real apartment), or real things only?** Recommend **real first**, then Marc OKs a few made-up ones, each in the deadpan voice.
9. **Rug: yes?** There is no rug in the real main room as far as the map shows. It is the one item class that is not a real thing yet. Recommend asking whether it belongs.
10. **Is it fine that the starting game looks identical to today, with nothing visible until the first gift?** Recommend yes: the first arrival is the quiet surprise.

## What issue 151 built
Step A of [decor-expansion-design.md](decor-expansion-design.md) (engine pieces P1 and P2). No item or slot in the real room changed; the golden frames are as they were.
- **Empty slots.** `DecorSlot.default` is optional. A slot without one starts empty, draws nothing (no placeholder box) and is the only kind of slot that can be emptied; a slot with a default never is (`place(slot, null)` and a swap that would leave one empty are refused with a plain reason). `place(slot, null)` and `plan`/`preview` with `null` mean NOTHING; the item goes to the inventory and stays owned. `starting()`, `parseDecor` and `validateDecorData` skip a missing default; the save keeps `placed` only for slots with an item, and a hand-edited save is cut down (an empty slot stays empty), never an error.
- **Reading an empty slot.** `Decor.shownIn(slot)` (what the room shows, preview included), `heldIn(slot)` (what is really there) and `lookAt(slot, state)` return nothing for an empty slot. The older `itemIn`, `placedIn` and `look` keep their non-null types and throw for an empty slot, so code that only meets slots with a default is unchanged. `Decor.canBeEmpty(slot)` says whether a slot may be empty. The night glow and the guitar sound already use the nullable readers.
- **The swap list** (`activities/swap-decor.ts`): for an emptiable slot the first row is `NOTHING`; the list opens on it when the slot is empty. The line above the keys says `<ITEM> GOES TO THE INVENTORY` for it. `Decor.canChange` (which offers the swap task) is true when an owned item that fits is in the inventory, or when the slot is emptiable and holds something (so a lone trinket can always be taken down again). A fresh game is unchanged.
- **A map object for an empty slot** names no sprite: write `{ name: "shelf", slot: "shelf-1" }` in the legend (no `sprite`). `tilemap.ts` then makes the appearance with no variants and the object is drawn only when an item is in the slot. A legend entry with a `sprite` works as before (the default item's sprite). A `Prop` on an empty slot draws nothing.
- **New kinds.** `DecorKind` gains `trinket`, `coffee`, `outfit` and `furniture`, with the swap prompts "Change trinket", "Change coffee gear", "Change clothes" and "Change furniture" (`SWAP_PROMPT` in `tasks.ts`, now exported). No item or slot uses them yet.
- **Proof.** `src/game/decor-empty.test.ts` builds a test-only empty slot (not in the real room) and checks swap in, swap out, NOTHING, preview, save and load, junk saves, the inventory and the map legend. The old test that said a slot object without a sprite throws was changed: that is now an empty slot.

## What issue 152 built
Step B of [decor-expansion-design.md](decor-expansion-design.md) (engine piece P6): worn outfits.
- **The slot.** `worn` (room main, kind `outfit`, default `outfit-home`, area 16x16, object `cube bookshelf`, moved there from the nightstand at Marc's instruction in issue 159) has `DecorSlot.offMap: true`: it is not a place on the map, nothing is drawn at its area, and the area is only the size items must match. `checkLevel` already ignores slots no map object names; the real-room test in `decor.test.ts` now skips `offMap` slots (and pins the slot list with `worn` last).
- **The items.** `outfit-home` (a starting thing, FROM: ALREADY HERE), and the gifts `outfit-casual`, `outfit-out`, `outfit-pajamas` (FROM: A PACKAGE). Each is 16x16 and shown by its `idle-down` sprite (`player-idle-down`, `player-casual-idle-down`, ...), so the THINGS page needs no new art (a fresh game now lists seven things, the everyday clothes among them). Ids are `outfit-<id>` for each id in `outfits.ts`; `outfitFromItem` turns the item into the `outfit` number.
- **Derived state.** `Game.syncOutfit` sets `outfit` from `decor.shownIn("worn")` every frame, like `parcel` and `guitarOut`. No task writes it (a test checks); a stray write is put back next frame; sleeping does not change clothes. It reads what the room shows, so while the clothes list is open the highlighted outfit is on you. A game with no `worn` slot (a test's own decor) leaves `outfit` alone.
- **The task.** `swap-worn`, "Change clothes", on the cube bookshelf beside `swap-plant-shelf` (it was on the nightstand until issue 159, Marc's instruction). Like every swap it is offered only when an owned outfit is not already worn, so a fresh game is unchanged.
- **The gifts.** Delivery checkpoints at day 39 (casual), day 42 (out) and day 45 (pajamas), after the plants (day 36). They are the planner's default days; change the number in `delivery-checkpoints.ts` to move one.
- **Known and not fixed here.** The doing poses (sitting, typing, eating, sleeping) were drawn in the everyday clothes, so another outfit flipped to the home look during them. Fixed in issue 150 (see below).

## What issue 156 built
Many outfits, each with a style (Marc, 2026-11-23: "you should be able to have multiple casual/going out/pajama outfits").
- **Outfits are data.** `OUTFITS` in `outfits.ts` is a list of `{ id, name, style, prefix }`. `style` is `home`, `casual`, `out` or `pajamas`, and several outfits may share one. It is only an attribute: nothing reads it to decide what is worn, offered or shown, and no outfit is better than another. The first four keep their places (home 0, casual 1, out 2, pajamas 3), so a saved `outfit` number and the `worn` slot still mean what they did. New outfits go at the end. The `outfit` state variable's `max` is `OUTFITS.length - 1`.
- **Adding an outfit** is a line in `OUTFITS`, its 12 sprites (`<prefix>-idle-<dir>`, `<prefix>-walk-<dir>-1`, `-2`), and its item in `decor-data.ts` (`outfit-<id>`, the same `name`, shown by `<prefix>-idle-down`, a gift with a checkpoint). `decor-worn.test.ts` pins that the items and the list agree. Keep names neutral (no outfit is for one gender). The helpers (`outfitFromItem`, `outfitPrefix`, `outfitStyle`) take an optional list, which the tests use to try ten made-up outfits.
- **The list and THINGS** already scroll (four rows and a cursor in the Change clothes list; pages in THINGS), so many outfits need no new code; `outfits.test.ts` drives the real swap activity over ten outfits (wrap, preview, choose, save).
- **No outfit was added here.** The planned ones (casual A, B, D; going out A, B, D, E; pajamas A, C) wait for the art route (issue 156's d2 test, `art/options/route-test/`) and a later art issue. The robe (d1) is, by the recommended default, an ordinary outfit changed by hand; no shower hook.

## What issue 150 built
The doing poses wear the outfit you are wearing (Marc, issue 148 d3: the flip was a bug).
- **How.** The pose sprites are generated per outfit from `art/outfits.json` by `scripts/outfits.mjs` (see 'Generated outfits' in [art-style.md](art-style.md)): for every outfit, including the three hand-drawn ones, `<prefix>-sit-sofa`, `-read-sofa`, `-type-desk`, `-eat-table` and `-guitar`, the same size as the everyday pose. 60 small files, none hand drawn.
- **In the game.** When a task with a pose starts, `Game` picks the pose sprite with `outfitPoseSprite(base, prefix, has)` (`outfits.ts`) from the outfit worn at that moment (the worn outfit cannot change while a task runs). A missing outfit sprite falls back to the everyday pose. `player-sprite.ts` lists every outfit's pose sprites so the loader fetches them.
- **Sleeping.** The sleep pose has `clothed: false`: the sleeper is under the covers with only the face showing, so there are no clothes to draw and the picture is the same for every outfit. The player does not change into pajamas to sleep; that stays a later idea (outfit slots that change by occasion, [ideas.md](ideas.md)).
- **Tests.** `poses.test.ts`: every pose has a sprite, of the same size, for every outfit in `OUTFITS` (it fails for a new outfit that lacks them), the loader lists them, and each outfit's poses draw its own sprite in the game. `scripts/outfits.test.mjs`: generated pose files are checked in, palette keys only, and only top and arm pixels differ from the everyday picture. The fresh-game golden frames are unchanged.

## What issue 166 built
Step E of [decor-expansion-design.md](decor-expansion-design.md) (engine piece P5): rugs on the floor, in two places and two sizes (Marc's picks from the options page: layouts C and D, decision d3). A fresh game has no rug and looks the same (the golden frames are unchanged).
- **The floor layer.** `PropDef.on` is optional. A prop with no `on` is a floor prop: `at` is in the room (not on a piece), `parseTileMap` puts it in `Level.floorProps` (type `FloorProp`, a `Prop` without `on`) and not in `props`. `Game.drawFloorProps` draws them right after `drawFloorAndWalls` and before everything that is sorted, so the player and every piece (and the bed's pictures, the made and unmade bed and both sleeping poses) draw over a rug. A floor prop has no tiles and is never a solid (`activeSolids` does not see it), and an empty slot draws nothing. `Decor.checkLevel`, the level's state-check and the sprite loader read `floorProps` too. The side project room (`composeSideProject`) only knows `props` and so does not show a rug.
- **Two slots, because an item fits only a slot of its own size.**
  - `rug-floor` (kind `rug`, name RUG, `where` ON THE FLOOR): the living-area rug, 128x64 at abs (32, 48), tile cols 2-9, rows 3-6. It runs under the front of the sofa, the desk chair and the lamp table; the aisle between the table and the sofa shows (the sofa hides the south half). Swap task `swap-rug-floor`, "Change rug", at the sofa.
  - `rug-bed` (kind `rug`, name BED RUG, `where` UNDER THE BED): the bed rug, 112x48 at abs (176, 96), cols 11-17, rows 6-8. The bed covers most of it, so a band at the bed's foot and strips beside it show; the bed's pictures are fully opaque, so the rug never shows through them (a test checks it). Swap task `swap-rug-bed`, "Change bed rug" (`SWAP_PROMPT_SLOT` in `tasks.ts`, so the bed's list is not two tasks called the same), at the queen bed beside make the bed, sleep, work and doomscroll.
  - Neither has a default and both can be emptied (the NOTHING row). Each swap is offered only when a rug is owned and not shown (or one is shown and can be taken down). Neither covers a wall, the package and takeout tile (col 10, row 8), the front door, a radiator, the bookshelf, the nightstand or the record stand (a test). Rugs lie under the player and the sofa's and bed's standing tiles without hiding a prompt (the prompts and the list are drawn over the room), and walking is the same with or without them (tested; floor props are not solids).
- **The items (10), different designs in the two sets** (Marc: a rug design is an item for one slot only, so the living-area and the bed rugs are never the same design; a design that moved from one layout to the other needs its own sprite at that layout's size, nothing is stretched). Each is a final sprite in `art/src`, palette only, flat from above with an ink outline, no text, and a deadpan note and FROM: A PACKAGE (texts in [text-review.md](text-review.md)).
  - Living area (128x64): `rug-striped` STRIPED RUG (denim and cream), `rug-kilim` KILIM RUG (zigzag bands), `rug-shag` SHAG RUG (tangerine pile, cream edge, no fringe), `rug-jute` JUTE RUG (natural oat, a visible basket weave, a plain tan border, no fringe), `rug-medallion` MEDALLION RUG (a walnut-brown field with a diamond medallion in tan, cream, walnut and tangerine, mirrored on both axes).
  - Bed (112x48): `rug-bed-field` GREEN BED RUG (fern green, leaf border), `rug-bed-braid` BRAIDED BED RUG (a rounded braided rug), `rug-bed-geometric` DIAMOND BED RUG (mustard and brick diamonds), `rug-bed-cotton` COTTON BED RUG (cream pinstripes, a rope-twist border), `rug-bed-vintage` VINTAGE BED RUG (putty, a row of worn diamonds along the long sides, mirrored on both axes). The bed set is designed for what shows (a border and a slice of pattern), so it is not the main set at another size. Each set keeps one fairly neutral rug (jute for the living area, cotton for the bed).
  - The medallion and the vintage rug are exactly symmetrical (a test), fringe tufts included.
  - Notes avoid the words the item-line test forbids (counts, totals, "all", "of", "more", "set").
- **How they arrive (decision d4's default; Marc can change it).** Only a starter pair is a checkpoint gift: `rug-striped` on day 75 and `rug-bed-field` on day 78, both after the last outfit (day 72) and two game hours after the day starts. The other eight rugs are items with **no checkpoint yet**: nothing gives them today, so nobody owns them, and they come through the random-encounter pool when issue 163 is built (`?own=` owns them in the dev server). An item with no source breaks nothing: it is never owned, never listed on the THINGS page (which lists what you own or have seen), and a save naming one is cut down like any unowned item (tested).
- **The THINGS page.** A thing wider than its cell is drawn reduced by whole halvings, the whole of it, instead of cropped: both rugs come out at a quarter size (32x16 and 28x12, in the 57x20 usable area of a cell on the wide view and the 49x20 one on the narrow view). Detail like fringe is lost at that size; the colours and the pattern are not. A taller thing (the pantry) is still cropped to the cell's rows. In the entry box a thing over 96 wide is drawn at half size (64x32 and 56x24), one over 48 at its own size and the rest at 2x, so the text beside it keeps room on the narrow view (the page test at 224 x 208 checks it).
- **Tests.** `src/game/decor-rug.test.ts` (slots, items, sizes, sources and checkpoints, a fresh game, draw order, walls and the package tile, walking, standing tiles, swap and NOTHING, save and load, the THINGS cell and entry). The existing decor tests skip empty slots (the first empty slots in the real room).
- **Options page.** `npm run tools -- options` shows the rug layouts and designs over the real room (`scripts/room-compose.mjs`); the designs marked IN THE GAME are the ten above; the others (and the designs that moved between the two sets) are candidates and are not in the game.

## Ideas backlog (Marc, 2026-10-28)
Not planned work: things Marc would like to find as decor over time, under the quiet-collecting rule (no pressure, scarcity or grinding; see "Where items come from, without pressure"). Each needs a slot kind, a size and art (the art budget, "First item set and art budget"), and the asset rules (`docs/art-style.md`) apply.
- **Furniture and rooms:** different pantries, desk chairs, sofas, rugs, beds, desks, dining tables, bookshelves, curtains.
- **Things on shelves and tables:** books, records, a recycling bin, fidget toys (a tech deck, a Rubik's cube), clothes.
- **Tech and music:** a new laptop, microphones, recording equipment, instruments.
- **Plants and the plant slot:** the shelf slot may hold things that are not live plants (dried flowers today; see issue 105); a live plant offers watering, other items do not.
- **Desk clutter** is the clutter-states issue 042 (desk, clothes, mail): Marc wants some clutter on the desk.
- **Added 2026-10-28:** a canned raccoon (photo in reference-photos/toys); other coffee apparatuses (french press, syphon, aeropress, moka pot, percolator, espresso machine); meaningless stats affected by things like clothes; equippable things in the spirit of materia that do nothing (a cool rock); coasters that get more and more extravagant but look almost the same (the better-armour treadmill, as a joke). The browsable inventory, like a pokedex, and a new guitar note timbre are separate ideas (see PLAN.md notes).
When an idea is picked, it becomes an item line in `decor-data.ts` plus a sprite, and a checkpoint or a delivery source if it is a gift (`docs/random-encounters.md`).


## What issue 158 built
The first generated outfit: CARDIGAN AND TEE (`outfit-casual-cardigan`, style casual, fern cardigan with walnut shading as Marc chose). Its 12 sprites come from `art/outfits.json` through `scripts/outfits.mjs` (see 'Generated outfits' in [art-style.md](art-style.md)). It is the fifth line of `OUTFITS` (index 4), a gift on day 48 (`gift-day-48`) with the note "IT DOES UP. YOU HAVE DECIDED IT DOESN'T." The hand-drawn casual, out and pajamas outfits are unchanged.

## What issue 159 built
Eight more generated outfits, all from `art/outfits.json` (see 'Generated outfits' in [art-style.md](art-style.md)), each an item `outfit-<id>` that arrives as a gift (the planner's default days; change the number in `delivery-checkpoints.ts` to move one). Names are plain, notes deadpan, and no outfit is for one gender. The list is a spread of casual, going out and pajamas, so no one look is the default.

| Day | Item | Name | Style |
|---|---|---|---|
| 51 | `outfit-casual-hoodie` | GREY HOODIE | casual |
| 54 | `outfit-casual-denim-jacket` | DENIM JACKET AND TEE | casual |
| 57 | `outfit-out-jacket-scarf` | JACKET AND SCARF | out |
| 60 | `outfit-out-button-up` | BUTTON-UP SHIRT | out |
| 63 | `outfit-out-blazer` | BLAZER AND TEE | out |
| 66 | `outfit-out-peacoat` | PEACOAT | out |
| 69 | `outfit-pajamas-striped` | STRIPED PAJAMAS | pajamas |
| 72 | `outfit-pajamas-robe` | BATHROBE | robe (issue 175; was pajamas) |

Colours were chosen to separate from the brown hair (tan and oak) and from each other: the blazer is taupe (a camel one merged with the hair and the wooden floor), and the blazer's back has a paper collar line at the neck. The robe's shower hook is still a later idea ([ideas.md](ideas.md)). Not drawn: the dress and the red jacket (ideas).

## What issue 167 built
Steps C and H of [decor-expansion-design.md](decor-expansion-design.md), then redrawn as stage A of the trinket display design (issue 173, `trinket-display-design.md`): trinkets and display instruments on the desk's right corner.
- **The slot.** `trinket-desk` (room main, area abs (140, 17, 16x16), kinds `trinket` and `instrument`, object `standing desk`) has no default, so it starts empty and a fresh game looks the same (golden frames unchanged). Its map piece is a `PropDef` on the desk `D` at local (44, 1) with no sprite, so nothing is drawn until an item is in it. The swap task `swap-trinket-desk`, "Display trinket" (Marc, issue 174 d2: for adding and for changing), is on the desk's tasks; like every swap it is offered only when there is something to put there or something to take down (the list has a NOTHING row). The left corner stays free for desk clutter (issue 042).
- **The size policy.** In the room a trinket is small: its drawing, ink outline included, is inside cell columns 3 to 12 and rows 5 to 12 (at most 10 wide by 8 tall) and its lowest row is row 12, so every item looks right in any slot that puts its cell where the foot should land. The room is 16 px to a foot, so honest sizes are small (the worry doll is 5x5, the jaw harp 6x7, the owl 8x7, the egg with its stand 8x8; the telescope is 9 by 7). `decor-trinkets.test.ts` fails on any pixel outside the box, on a foot that is not row 12, and on a side shorter than 5. Rows 13 to 15 are empty, so the art never reaches the typing pose (`type-desk` at desk-local (32, 16)); no task spot's tile is under the slot.
- **The items** (16x16, palette only, no text; FROM: A PACKAGE): kind `trinket`: ALEBRIJE OWL (a small dark owl with a flower, 8x7) and ALEBRIJE CAT (a sitting tangerine cat with a green-masked face, a pink flower and a ringed tail, 9x8; Marc, d7: both for now, the hybrids on the options page (`npm run tools -- options`) can come later), LITTLE TELESCOPE, FINGER SKATEBOARD (a charcoal deck, 9x5), PAINTED GOOSE EGG (on a small metal stand, 8x8), WORRY DOLL, RACCOON IN A CAN (a front view, 6x8; a side view was tried and read worse, see issue 167 d6); kind `instrument` (display only, ids `instrument-*`): HARMONICA, KALIMBA and JAW HARP. There is no mini keyboard (Marc: too big next to the others). Nothing is played, counted or needed; there is no set and no total. The art was first drawn at the cell's full size and then redrawn small under the same file names.
- **Gifts.** Checkpoints `gift-day-81` to `gift-day-108`, every third day, in the order above (the instruments on days 99, 102 and 105, the cat alebrije on day 108). Both alebrijes can be displayed one at a time in the one desk-corner slot for now (the nightstand and shelf slots are later stages). The rugs take days 75 and 78 (issue 166) and the coffee gear days 85 to 100 (issue 168); these days are multiples of 3 and the coffee gear's are not, so they never meet. Marc (d4): keep these days but do not tighten them; he wants to think separately about how things are spaced, so that nothing arrives too quickly. The days are a default to move, not a decision about spacing. They may also come through the random-encounter pool (issue 163): the kinds `trinket` and `instrument` are sold by the Odds and Ends Shop and Reedbed Music lines, and the ad card shows the small picture at the room's scale.
- **Not built here (later stages of issue 173):** Examine close-ups (the 48x48 `-close` art), the nightstand and shelf slots and the bookshelf cubby scene.
- **Tests that assumed every real slot has an item** skip the empty slot (`decor.test.ts`, `decor-inventory.test.ts`); the gift counts moved (`deliveries.test.ts`, `checkpoints-stage-a.test.ts`).

## What issue 175 built
Outfit slots, from [outfit-slots-design.md](outfit-slots-design.md) and Marc's answers d1 to d9 in issue 164.
- **Slots are a preference list over `worn`.** Four slots in `OUTFIT_SLOTS` (`outfits.ts`): EVERYDAY (styles home, casual), PAJAMAS (pajamas), ROBE (the new style `robe`, only the bathrobe) and GOING OUT (out), strict by style (`SLOT_STYLES`; a test fails if a style has no slot). What you wear is still the decor slot `worn`; `outfit` is still derived each frame by `syncOutfit` and nothing else writes it.
- **Pure helpers** are in `outfit-slots.ts` (`resolveSlot`, `slotChoices`, `autoFill`, `parseEquipped`); the store is `Decor` (`equippedIn`, `equip`, `wearSlot`, `wornSlot`, `slotChoices`). An empty slot falls back to the EVERYDAY outfit, then the home clothes. Auto-fill gives each empty slot the first owned outfit of its styles in `OUTFITS` order, after a load and whenever something is owned; it never replaces anything. Equipping the slot you have on moves `worn` with it.
- **Save.** `decor.outfits.equipped` (slot to item id), optional and left out while it is only what auto-fill would pick, so a fresh game saves exactly what it did. `parseDecor` keeps only known slots with an owned outfit of the slot's style. A save with no `outfits` field seeds EVERYDAY with the outfit worn when its style fits. The device sync keeps it in all three places in `sync/merge.ts` (`normaliseProgress`, `worldText`, `mergeSaves`: the winner's, limited to what the union owns), with a round-trip test.
- **The list** (`activities/outfit-slots.ts`, the activity of the `swap-worn` task; every other swap still uses `swap-decor`): up and down choose a slot, left and right change its equipped outfit (shown on you at once), E wears the slot, Escape leaves what you wear (equipment changes stay). All four slots always show; WORN marks the slot you have on; an empty slot shows a dash. There is no help text (Marc, after trying it): only the slot names, the outfits, WORN and the keys line. On the phone view each slot takes two rows and the box goes to the top when the player is low on the screen.
- **Occasions** (`OUTFIT_OCCASIONS` in `config.ts`): finishing `sleep` puts you in PAJAMAS and finishing `shower` in ROBE, with no text or sound. `Game.occasion` only sets a pending slot; `applyOccasion` wears it when no task, dialog or input lock is active. There is no timer; a nap, Escape out of a task and a manual change fire nothing. GOING OUT has no occasion yet.
- **Try it (dev server).** `?own=outfit-casual-hoodie,outfit-casual-cardigan,outfit-pajamas,outfit-pajamas-striped,outfit-pajamas-robe,outfit-out` owns a spread; the cube bookshelf's Change clothes (Tab cycles the choice at the shelf). `?set=energy:10` makes Go to sleep available at the bed.

## What issue 181 built
The OUTFITS pause page, from [outfit-equip-screen-design.md](outfit-equip-screen-design.md) and Marc's answers d1 to d8 in issue 176 (answers win over older wording). It adds no state, no save field and no art.
- **Where.** A fourth pause page next to THINGS (`page === "outfits"` in `achievements/feature.ts`). Desktop: F on the pause list (`ACHIEVEMENTS_UI.outfitsKey`), and F or Escape (on the slots) come back; the hint line has a fourth hint, `F: OUTFITS`, between THINGS and TRANSFER SAVE (20 px gaps, from 22). Touch: an OUTFITS button in the cell PHOTOS left free (row 3, right); nothing else moved.
- **Cursor and rules** (`achievements/outfits-page.ts`, `OutfitsPage`): which column has the focus, which slot, which row, which facing. It reads and writes only through `Decor`: `slotChoices` (the right-hand list: owned outfits the slot takes, in `OUTFITS` order), `equippedIn`, `equip` (E; equipping the slot you are wearing changes your clothes at once, as the bookshelf does), `wornSlot` (WORN) and `resolveOutfit` (what an empty slot would put on you, shown in the preview). Nothing is written until E. There is no wear-now key: wearing a slot stays at the cube bookshelf, whose list is unchanged.
- **Drawing** (`achievements/outfits-draw.ts`): `outfitsLayout()` gives every rectangle for the 320 x 192 and 224 x 208 views, and the same ones are drawn and tapped. Top bar: only the highlighted outfit's own note (on the slots, the equipped one's). Slots left (a box each on desktop, one 14 px row each on the phone), the list of five rows that scrolls with a small arrow and no count, then the preview: the existing 16x16 sprite `<prefix>-idle-<dir>` at 4x (64 px, crisp) and the four facings small beside it (2x pictures on desktop, four squares on the phone). Pointer: the bookshelf list's 3x5 triangle, butter in the column with the focus, mist in the other; the equipped outfit has a small butter square; WORN in butter.
- **Keys.** Arrows or W, A, S, D move (up and down pick a slot or a row; right or E go into the list; left or Escape go back; Escape on the slots leaves); E equips in the list; Tab or Q turn the character down, left, up, right (Shift backwards; the facing is a view and resets each time the page opens). Touch: the pad, A, B and CHOICE send the same keys; a tap on a slot picks it, a tap on a row highlights it and a second tap equips it, a tap on the preview turns the character, BACK leaves.
- **The phone's pause view is 320 x 192.** A pause page is a full picture, and the phone's narrow 224 x 208 view switches to 320 x 192 while one is open (issue 090), so on a real phone the page is drawn at 320 x 192 with the touch buttons, taps and keys line. The 224 x 208 layout (slots as rows, the preview beside the list) is built and tested like THINGS' but is not shown today; the design's phone mockups assumed it was.
- **Tests:** `achievements/outfits-page.test.ts` (cursor, lists per slot, equip through `Decor`, worn-slot equip, the preview and turn, both layouts, text, taps, hint line, fresh game, old save, a synced save). The pause tests now expect eight buttons.
- **Try it (dev server).** `?own=outfit-casual-hoodie,outfit-casual-cardigan,outfit-casual-denim-jacket,outfit-pajamas,outfit-pajamas-striped,outfit-pajamas-robe,outfit-out,outfit-out-blazer,outfit-out-peacoat` owns a spread; press L, then F.

## What issue 172 built
Stage one of the first replacement furniture (the record stand, section 8 of [decor-expansion-design.md](decor-expansion-design.md)): the slot and the swap. No new stand is in the game yet; a fresh game looks and plays the same (the golden frames are unchanged).
- **The `furniture` slot.** `furniture-record-stand` (kind `furniture`, name RECORD STAND, `where` NEXT TO THE SOFA): 16x16 at abs (144, 112), on the legend piece `R` (`record stand`), which now has `slot: "furniture-record-stand"`. The piece keeps its name and its sprite name `record-stand`, which is what the `record-play` task, its task spot and the notes emitter in `config.ts` (`PARTICLES.ambientEmitters`, found by `piece.sprite`) look up; the solids are the level's and do not change with a swap. Default `furniture-record-stand-old`, the stand the room has always had (`how: "start"`, FROM: ALREADY HERE), so it is owned from the first run and a slot with a default is never empty.
- **The swap.** Task `swap-furniture-record-stand`, "Change record stand" (no "the"; `SWAP_PROMPT_SLOT`), at the stand beside Choose a record. It uses the same list as every other swap and is offered only when an owned stand that fits is in the inventory, so it does not appear today. A replacement is an item of kind `furniture` with `slots: ["furniture-record-stand"]`; the old stand goes to the inventory.
- **The six stands (Marc picked all of them, d3; the gramophone was dropped).** `FURNITURE_ITEMS` in `decor-data.ts`, each 16x16 with its final sprite in `art/src/record-stand-<name>.sprite` (the options-page candidates stay in `art/options/record-stand/`): `furniture-record-stand-crate` RECORD CRATE (candidate A), `-wire` WIRE RECORD RACK (B), `-cabinet` RECORD CABINET (C), `-lidded` LIDDED RECORD CABINET (D), `-suitcase-pink` PINK SUITCASE PLAYER (E), `-suitcase-teal` TEAL SUITCASE PLAYER (E2). **Orientation:** like the stand now, the front (records, doors, latches) faces north, the top of the sprite, where the player stands; the back toward the wall is plain; the suitcases' lids are hinged at the wall side and open toward the wall. The gramophone (candidates F to F6, still on the options page) did not read at 16x16 in this viewpoint and does not ship. Each is FROM: A PACKAGE, has no checkpoint (gift days unchanged, `GIFT_ITEMS` still 57), and arrives through the random-encounter pool: `furniture` is in `ENCOUNTERS.pool.kinds` and `line-furniture` (Corner Post Furniture, invented) is the shop. Suggested ladder tiers for issue 183 are in [random-encounters.md](random-encounters.md) section 16. `?own=furniture-record-stand-crate,furniture-record-stand-wire,furniture-record-stand-cabinet,furniture-record-stand-lidded,furniture-record-stand-suitcase-pink,furniture-record-stand-suitcase-teal` in the dev server owns them all; Change record stand at the stand swaps.
- **The placeholder.** `furniture-test-stand` (TEST RECORD STAND, borrows the stool's sprite, tag `test`) exists only so the swap can be exercised in tests and with `?own=test` in the dev server. Nobody is given it; the real stands are the seven above (the options page, `npm run tools -- options`, group "Record stand", still shows the candidates).
- **THINGS.** The starting stand is a ninth starting thing (the page tests say nine).
- **Gift days:** none yet. A replacement arrives as a delivery after Marc picks (issue 172 d2), and the starting stand goes to the inventory then.
- **Tests:** `src/game/decor-record-stand-172.test.ts`.
