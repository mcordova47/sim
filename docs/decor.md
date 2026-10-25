# Decor: things you collect and arrange (design note, issue 062)

Status: Marc picked (2026-10-23, see issue 062). **Stages 1 and 2 are built** (data and drawing from state; the swap task); stages 3 and 4 are not. "What stage 1 built" below says exactly what exists and where it differs from the first draft of this note. The rest is the design the later stages follow.

## What stage 1 built
- `src/game/decor-data.ts`: the slots table (main room: `art-table`, `art-desk`, `art-bed`, `plant-shelf`, `lamp-sofa`), the items table (today's three paintings, the snake plant and the lamp) and the per-family sprite rules (`FAMILIES`). Limits for saved data are `DECOR` in `config.ts`.
- `src/game/decor.ts`: the `Decor` store (`owned` ids, `placed` slot to item), `parseDecor`, `validateDecorData` and `Decor.look(slot, state)`. `Game.decor` holds the store; the game draws from it every frame.
- Drawing goes through the existing appearance path. A map legend entry with `slot: "art-table"` makes an `Appearance` with a `slot`; its look is the item in that slot. A `Prop` already had a `slot` and now draws the same way. The piece keeps its sprite name, so the lamp glow still finds it. A slot object is drawn where its piece was, so draw order on a tie is unchanged.
- Saving: `ProgressStore` writes an optional `decor` field (no version bump). `AchievementsFeature` loads it into `game.decor` and saves it with the rest. Resetting progress resets the decor.
- **Ids start with their kind** (`art-barn`, `plant-snake`, `lamp-table`), as the owned-list rule below says, not the sprite name (so the barn drawing is `art-barn`, and the sprite `painting` is only what it draws).
- **Today's paintings are tied to their own wall** (`slots: [...]` on the item). All three are 32x16 or 48x16 art, so without this the table and desk could swap their paintings on the first day and the swap task (stage 2) would show up in a fresh game. Marc can loosen this when he wants the paintings to move around.
- **No `empty` slot yet** (rug and props come later). Every slot always shows an item.
- Validation: at startup `Decor` checks its tables (repeated ids, id starts with kind, defaults exist and fit, known families, names the font can draw, slot names on items), and `Game` checks that each slot object in the rooms is the slot's size and place. A hand-edited save is cut down (`parseDecor`), never an error.
- Proof that nothing changed: `src/game/main-room-frames.golden.test.ts` renders the main room headless over nine states (start, the plant at each stage and drooping, night with the lamp glow, dusk with the blinds open, morning) for four frames each, and compares every drawing call, in order, with a record made on `main` before the change.

## What stage 2 built
- **The swap task.** One task per slot that names an `object` (`swap-art-table`, `swap-art-desk`, `swap-art-bed`, `swap-plant-shelf`, `swap-lamp-sofa`), on the dining table, standing desk, nightstand, cube bookshelf and lamp table. The prompts are "Change the painting", "Change the plant" and "Change the lamp". It is last in the choice cycle (Tab or Q). `DecorSlot.object` is the map piece's name; `Decor.swapProblems(level)` (checked by a test) says if the task is not on exactly that object.
- **Only offered when there is something to swap to.** `Interactable.decorSlot` marks the task and `InteractionSystem.hidden` (set by `Game`) hides it, with no prompt and no cycle entry, while the slot has fewer than two choices. So a fresh game shows nothing new (the nightstand and lamp table still have no prompt at all).
- **The list** (`activities/swap-decor.ts`, kind `swap-decor`): a box at 320x192 in the pixel font, slot name and `2/3` on top, up to 4 rows (it scrolls and wraps), `(IN PLACE)` beside the item that is there, and the keys at the bottom. Up and Down move and show that item in the room, E puts it up, Escape (or X) leaves. The box is at the bottom, or at the top for the lamp slot (so it never covers the thing being changed). The usual "ESC TO STOP" and the task label are not drawn for it.
- **The preview is only a view.** `Decor.preview(slot, item)` shows an owned item that fits without placing it; `toJSON` never contains it, it is not a change (`onChange` does not fire), and `clearPreview`, `place`, `reset`, `load` and the game (on the next frame, if no task is running) all clear it. So Escape, a thrown error, a reset or any other way out leaves the room as it was.
- **What it pays: nothing.** Following this note: no points, no mood, no cooldown. Both ways out (E and Escape) are the quiet end of issue 059 (`completed: false, quiet: true`): no payout, no `taskCancelled`, no `taskComplete`, no cooldown, and the E press is not remembered. Because it never completes, it is left out of the "every task" achievement. No clock runs while the list is open (`holdsClock`).
- **A swapped-in plant starts small.** Putting a different plant on the shelf sets the slot's stage, growth and dry count back to 0 (the sprout). (So swapping the snake plant out and back in starts it over; confirm with Marc.)
- **Not built:** the item's one-line `note` after choosing (no real item has one yet), the `empty` slot option, the gallery wall.
- **TEST items** (`TEST_ITEMS` in `decor-data.ts`, ids with `-test-`, names starting `TEST`, tag `test`): two paintings that fit the table and desk (they use the other two paintings' sprites), a grown plant that never droops, and a lamp that uses the stool sprite. Nobody owns them. **Stage 4 deletes `TEST_ITEMS`, `isTestItem`, `decor-dev.ts` and the `?own=` lines in `main.ts`.**
- **`?own=` (dev server only).** `?own=test` owns every TEST item, or list ids: `?own=art-test-barn,lamp-test-stool`. It runs only when `import.meta.env.DEV` is true, so a built game has none of the code. Like the other dev shortcut `?set=plantStage:3`, the owned items are saved with the rest of the progress, so they stay in that browser's save until it is reset.

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
  seen?: string[];                  // optional, items you have looked at (for a quiet "new" mark later)
}
```
A small `Decor` class (like `ApartmentState`) holds it: `itemIn(slot)`, `place(slot, item)`, `own(item)`, `owns(item)`, `choices(slot)` (owned items that fit, plus the default), and an `onChange` the renderer listens to.

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
| `art-robin` (sprite `painting-robin`, exists, 16x16, drawn but off camera) | 16x16: needs a 32x16 mat version, 1 new | the robin print |
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
- **Track editor plugins (064).** A plugin is an item with kind `plugin` in the **same owned list**, with the same sources (gifts, finds, a calm reward for making a track, a delivery). The difference is the **place**: a plugin has no slot in the room; it appears in the editor's plugin menu. So `DecorKind` gets `"plugin"` and a plugin item has `slot: none`. `owned` gives the editor its list. One thing to decide with 064: one list for everything or a second list named `plugins` in the same save. Recommendation: **one `owned` list**, ids prefixed by kind (`plugin-echo`), because the sources, the arrival line and the save tolerance are all the same. Plugin behaviour and format details are in `docs/plugins.md` (064), not here.

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
