# Photo gallery: browse, delete one, a close-up scene (design, issue 117)

Status: design for Marc to confirm. Nothing is built. `src/` is untouched. Read first: `docs/photo-reel-design.md` (the store, the look, the PHOTOS page, 113), `issues/117-photo-gallery.md` (all of Marc's answers and the planner decisions). Code read: `src/game/activities/reel.ts` (the 113d slideshow), `src/game/achievements/photos-draw.ts` and `feature.ts` (the PHOTOS page), `src/game/reel/*.ts` (store, pixelate, palette, add flow), `src/game/interaction.ts`, `game.ts`, `encounters.ts`, `activities/encounter.ts` (how an ad starts), `docs/activities.md`, `docs/random-encounters.md`, `docs/mobile.md` section 13, `docs/inventory-design.md` (the page this one copies the style of).

## 1. Summary
One shared **gallery** (a 3 x 2 grid of pictures, six to a page, and a close-up of one) with two entry points.
- **Pause menu = manage mode.** Plain, no phone chrome. Move a highlight over the grid, open a close-up, **delete one** from the close-up (DELETE, then "SURE? DELETE", any other key cancels), ADD PHOTOS, REMOVE ALL, and a **LOOK** switch of three presets for new pictures. No captions, no points, no ad. Esc leaves.
- **Sofa = scene mode.** The task "Scroll through photos" becomes a short scene: a **phone view** (phone chrome around the grid, one fixed line under it for the whole session), E continues to a **close-up** of the highlighted picture with its own generic caption, look as long as you like, E leaves. It pays a little once a close-up has been opened. An ad encounter may interrupt the close-up and then returns to it. No add, delete or settings.

The store, `pixelate` and the add flow stay. The store changes in two small ways: it accepts the preset sizes (today only 48 x 36 or 36 x 48), and a record may carry its look. The 113d slideshow is removed, replaced by the scene.

**Recommendation in two lines:** build the gallery drawing and layout once as pure code that both entry points call, then ship manage mode first (it is the safer, higher-value half: delete one picture), then the scene, then the ad interruption last. Seven small issues, each safe to merge alone (section 12).

## 2. What exists today (from the code)
- **Store** (`reel/reel-store.ts`): IndexedDB `life.reel.v1`, record `{ id, w, h, px, palette: 1 }`. `isValidPic` accepts only `REEL_SIZES` = 48 x 36 or 36 x 48. Cap 60, dedupe by pixels. `ReelStore` already has **`remove(id)`**, so deleting one needs no store method, only a UI and a test. `list()` is oldest first.
- **Pixelate** (`reel/pixelate.ts`): the output size is hard-coded to `LANDSCAPE` 48 x 36 or `PORTRAIT` 36 x 48 (portrait when the source is taller than wide); dither is an option (default 20); the palette is the game's 22 colours, order fixed by `art/palette.json` (`REEL_PALETTE_VERSION` 1).
- **Add flow** (`reel/photo-add.ts`): one file at a time, `pixelate(image.rgba, width, height)` with no options, `store.add` at the end. Only indices reach the store.
- **PHOTOS page** (`achievements/photos-draw.ts`, `feature.ts`): `photosLayout(view)` is the one function both the picture and the taps read. Buttons ADD PHOTOS (A), REMOVE ALL (R, then R or Y; Esc or any other button cancels), BACK, and a row of 48 x 48 thumbnails at 1x, newest first, not selectable. Text lines: intro, status ("12 pictures on this device"), message. `drawPic(ctx, pic, box, scale)` draws a picture at a whole scale and is the only place a picture is drawn.
- **The sofa task** (`tasks.ts`, `activities/reel.ts`): `scroll-photos`, 5 points, `requires hasPhotos`, activity `reel`. `ReelActivity` is a slideshow of up to `REEL.pass` (6) shuffled pictures at `REEL.scale` (3x), 4 seconds each, one caption line on the first picture, Right or tap goes on, Esc or tap outside leaves paying nothing, the end of the pass pays. `holdsClock`, `readsKeys`, `cancellable`. `hasPhotos` is a derived state variable set by `game.photosChanged(pics)`, never saved or synced. The activity gets pictures from `host.reelPictures()`.
- **Scenes** (`docs/activities.md`): `admire-art` is a cutscene (`view`, `zoom`, `say`, `unview`) over a 320 x 192 sprite; a cutscene cannot draw a grid or a highlight, so the gallery is a dedicated activity like `make-track` and `encounter`. The view size: 320 x 192 on desktop, 224 x 208 on the phone (`NARROW_VIEW`); an activity that sets `showsPicture` makes the phone switch to 320 x 192 while it runs (`docs/mobile.md` 13.3), scaled by `fitFill` to a non-whole number.
- **Ad encounters** (`encounters.ts`, `game.ts`, `activities/encounter.ts`): after a *completed* `doomscroll` or `work` task the game rolls (22 percent, gates: blocker off, game day 2, 3 game hours since the last, two a day, nothing else open). A hit starts `EncounterActivity` through `InteractionSystem.begin`, which **refuses if anything is already running** (`active` holds exactly one activity). An encounter pays nothing, always ends quietly, holds the clock, and Escape ends it at once. Nothing today can interrupt a running activity.
- **Touch** (`docs/mobile.md`): the pad and A/B buttons raise the same key codes; an activity can also publish `tapTargets(screen)`, and "the drawn list is the tap list". The pause screen's touch buttons are 16 px high with a 2 px gap (`PAUSE_TOUCH`).

## 3. The recommended design

### 3.1 One gallery, two modes
A `Gallery` is pure state plus a layout, with no drawing and no game: `{ pics, page, cursor, view: "grid" | "closeup" }`. Both entry points hold one and ask it for rectangles; the pause page draws it plain, the scene draws it inside a phone. Same paging, same highlight, same close-up scale rule, so the two cannot drift.

| | Manage (pause menu, key O) | Scene (sofa task) |
|---|---|---|
| Chrome | none: the page's dark panel | a phone: bezel, a status strip, the fixed line |
| Order | newest first (as the thumbnails are today) | the whole reel in a session-stable shuffled order |
| Open a close-up | E, or tap a highlighted cell | E, or tap a highlighted cell |
| Leave the close-up | Esc, back to the grid | E: leaves the scene and pays; Esc leaves and pays nothing |
| Left or Right in a close-up | the previous or next picture | nothing (the player chose this one) |
| Captions | none | the fixed phone line; the close-up caption |
| Add, delete, settings | yes (ADD, DELETE, LOOK, REMOVE ALL) | no |
| Points | none | a small fixed amount once a close-up has been opened |
| Ad encounter | never | may interrupt the close-up |
| Clock | held, as on the whole pause screen | held (`holdsClock`) |

### 3.2 The grid
- **3 x 2, six a page** (Marc). Cells are 96 x 72 on the wide view (a 48 x 36 picture at 2x fills one exactly) and 64 x 48 on the narrow view (a 48 x 36 picture at 1x). Each picture is drawn at **the largest whole-number scale that fits its cell**: 64 x 48 at 1x, 48 x 36 at 2x (wide) or 1x (narrow), 32 x 24 at 3x (wide) or 2x (narrow). A portrait picture that cannot fit whole at a useful scale (36 x 48 in a 72-tall cell is 1x only) is shown as the **middle square slice** at 2x (36 x 36 becomes 72 x 72) on the wide view; the narrow view shows it whole at 1x (48 tall fits 48). The close-up always shows the whole picture.
- **The highlight** is a 2 px `butter` frame around the cell (the pause screen's accent colour). It starts on the first cell of the page; in scene mode on a random cell of the first page so the first close-up is a small surprise (decided, section 13).
- **Paging.** Left and Right move one cell; Up and Down one row (3 cells). Moving past the last cell of a page turns to the next page, and past the first to the previous; at either end of the reel it stops (no wrap, the player sees the end). Pages are of six, so the last may be short. **Manage mode** shows "PAGE 2 OF 10" in its status line (the count already lives on that page, `photo-reel-design.md` section 5). **Scene mode shows no number and no total** (nothing in the world counts photos): just a small `<` and `>` in the status strip when there is a previous or next page. With six or fewer pictures there is one page and no arrows.
- Empty cells on a short page are drawn as a dark `ink` cell, not selectable.
- **Touch.** Tap a cell: the highlight moves there; tap the highlighted cell again: it opens. A CONTINUE button (scene) or OPEN button (manage) opens the highlighted one. Cells are 64 x 48 game pixels at least, so a thumb lands. `<` and `>` are buttons (24 px wide) on the status strip; swiping is not needed.

### 3.3 The close-up
- Picture size is **the largest whole-number scale that fits the box**, and each picture has its own scale because records may differ in size (section 4). Today's 48 x 36 at 4x is 192 x 144 (fits the 192 px height); at 5x it is 240 x 180, which also fits 320 x 192.
- **Manage mode, no caption:** the box is the whole view. Wide (320 x 192): 48 x 36 at 5x = 240 x 180; 36 x 48 at 4x = 144 x 192; 64 x 48 at 4x = 256 x 192; 32 x 24 at 8x = 256 x 192. Narrow (224 x 208): 48 x 36 at 4x = 192 x 144; 36 x 48 at 4x = 144 x 192; 64 x 48 at 3x = 192 x 144; 32 x 24 at 7x = 224 x 168.
- **Scene mode** reserves a 12 px band at the foot for the caption and the key hint, so the box is 192 - 12 = 180 tall on the wide view. 48 x 36 stays 5x (180 tall). A portrait 36 x 48 drops to 3x (108 x 144) because 4x is 192. That is the one visible cost of a caption under the picture; the fallback (a caption laid in the side margin of a portrait, 176 px free at 320 wide) is a later nicety, see risks. Narrow: the box is 224 x 196: 48 x 36 at 4x, 36 x 48 at 4x (196 >= 192).
- The picture sits on an `ink` field, centred. Scene mode draws a thin phone bezel around the whole close-up (the phone is still in your hand); manage mode draws none.
- **Nothing moves, nothing animates, no timer.** The picture stays as long as the player looks. (Only the ad roll uses time: section 6.)

### 3.4 Manage mode (the PHOTOS page)
Same entry: key O or the PHOTOS button on the pause screen. Esc or BACK from the grid returns to the pause list (as today).

**Grid at 320 x 192** (one character is about 8 x 12 px; schematic):
```
PHOTOS                                  <- y 5
+--------+ +--------+ +--------+       y 16..88   (cells 96 x 72, gap 4)
|        | |        | |        |
|  pic   | |  pic   | |  pic   |
+--------+ +--------+ +--------+
+--------+ +--------+ +--------+       y 92..164
| #####  | |        | |        |       (# = the highlight frame)
+--------+ +--------+ +--------+
12 PICTURES ON THIS DEVICE  PAGE 1 OF 2    y 167
A ADD   S LOOK: SOFT   R REMOVE ALL        y 176
NEW PICTURES ONLY.  ESC BACK  E OPEN       y 185 (hint line)
```
The three bottom lines are 9 px each (the existing font and `hintLine`): status and page, the buttons as hint parts, and a line that says the look applies to new pictures only plus the keys. Result messages (added, could not be read, deleted) replace the status line for a moment, as they do now.

**Grid at 224 x 208** (touch; one character about 6 x 12 px):
```
PHOTOS
+------+ +------+ +------+     cells 64 x 48, gap 4, centred
| pic  | | pic  | | pic  |     (3 * 64 + 2 * 4 = 200 of 224)
+------+ +------+ +------+
+------+ +------+ +------+
|######| |      | |      |
+------+ +------+ +------+
12 PICTURES ON THIS DEVICE
PAGE 1 OF 2    < PAGE  PAGE >
[ ADD PHOTOS ]  [ LOOK: SOFT ]    16 px touch buttons, 2 x 2
[ OPEN       ]  [ REMOVE ALL  ]
[ BACK ]
New pictures only.
```
There is spare height (about 40 px) on the narrow view, kept as air.

**Close-up in manage mode** (320 x 192, 48 x 36 at 5x; `[..]` is the picture):
```
                                       (no caption, no chrome)
        +------------------------+
        |                        |
        |        picture         |  240 x 180, centred, ink field around
        |                        |
        +------------------------+
 DEL DELETE   <  >  OTHERS   ESC BACK       foot, hint line over the ink
```
After DELETE: the foot becomes "SURE? DELETE   ANY OTHER KEY CANCELS" in `tangerine`. The second DELETE press (or Y, as REMOVE ALL accepts) deletes that one record, goes back to the grid with the highlight on the same cell number (or the last, if that was the last), and the status line says "Picture deleted. The original was never here." Any other key, or Esc, only puts the question away. Esc with no question asked goes back to the grid.

**Keys** (grid): Arrows move; E opens; A add; S switches LOOK; R remove all (R or Y confirms); Esc back. (Close-up): Left/Right other picture; Delete (or Backspace) asks; E or Esc back. Hint line follows the keys, as the pause pages do (`hintLine`). **Touch** (close-up): an OPEN/DELETE/BACK button row (16 px high) and a tap on the picture goes back; the DELETE button turns into SURE? DELETE on the first tap and any other tap cancels. There is no delete in the grid (Marc).

**LOOK** is a small switch. S, or the LOOK button, cycles Crisp, Soft, Chunky. The page shows `LOOK: SOFT` and the line "New pictures only. The ones you have keep their look." The choice is kept on this device (section 4.4). While a picture is being made the switch is hidden (as ADD and REMOVE are).

### 3.5 Scene mode (the sofa)
Same task, same prompt, same pose (`sit-sofa`). Activity type stays `reel`, the class becomes the scene.

**Phone view at 320 x 192** (the phone is held sideways, a 306 x 177 panel; `paper` bezel, `ink` screen):
```
 +----------------------------------------------+
 |  .  PHOTOS                              <  >  |   status strip 9 px (the arrows only if there is another page)
 | +----------+ +----------+ +----------+        |
 | |   pic    | |   pic    | |   pic    |        |   cells 96 x 72, gap 3
 | +----------+ +----------+ +----------+        |
 | +----------+ +----------+ +----------+        |
 | |  ####### | |   pic    | |   pic    |        |   # = the highlight
 | +----------+ +----------+ +----------+        |
 |   You scroll for a while, because why not.     |   the fixed line, one line, centred
 +----------------------------------------------+
```
Panel height: bezel 4 + strip 9 + 2 + 147 + 2 + line 9 + bezel 4 = 177, centred with 7 px above and below. The world is dimmed behind it (night at 70 percent, as the slideshow does now).

**Phone view at 224 x 208** (portrait phone, 208 x 196):
```
 +------------------------+
 | .  PHOTOS        <  >  |
 |   +------+ +------+ +------+   cells 64 x 48
 |   | pic  | | pic  | | pic  |   (3 * 64 + 2 * 4 = 200)
 |   +------+ +------+ +------+
 |   +------+ +------+ +------+
 |   | #### | | pic  | | pic  |
 |   +------+ +------+ +------+
 |                        |
 | You scroll for a while,|   the fixed line wraps to two lines
 | because why not.       |
 |                        |
 | [ CONTINUE ]  [ LEAVE ]|   touch only
 +------------------------+
```
The narrow view has spare height, so the line wraps to two lines and the touch buttons sit inside the phone's lower bezel. Keyboard players see a hint line instead of buttons: `E CONTINUE   ESC LEAVE`.

**Close-up at 320 x 192** (48 x 36 at 5x, 240 x 180 plus the 12 px band):
```
 +----------------------------------------------+
 |             +----------------+               |
 |             |                |               |
 |             |    picture     |               |   240 x 180 (a portrait: 108 x 144)
 |             |                |               |
 |             +----------------+               |
 | Ah, memories.                    E  DONE     |   caption left, key hint right (band 12 px)
 +----------------------------------------------+
```
At 224 x 208 the close-up is 192 x 144 at 4x with the caption wrapped to two lines below it and the touch DONE button under that.

**Flow.** Start: phone view, highlight on a random cell of page 1. Arrows move/page, E (or tap-again, or CONTINUE) opens the highlighted one. The close-up shows the picture and the caption; E (or tap on the picture, or DONE) **completes the scene** (pays the task's points, the cooldown starts, the clock was held). Esc from the phone view or the close-up cancels quietly: no points, no cooldown (the existing Escape table: "cancels, pays nothing"). The scene cannot end any other way, and a session where the player only browses and then presses Esc pays nothing (Marc: "not for leaving at the phone view").

**Why E pays and Esc does not.** Escape is the universal back-out (`docs/activities.md` "Escape"): no points, no cooldown, no matter what screen. The scene keeps that rule, so the paid exit must be a different key. E reads naturally as "done".

**Points.** The task's `points: 5` is unchanged and still paid by the interaction system on a completed finish. No quality value, no mood change, not an achievement source (the 113 rule). Nothing counts how many close-ups were opened.

## 4. Data shapes and what changes in the store

### 4.1 Look presets
A new small data file `src/game/reel/looks.ts`:
```ts
export interface ReelLook { id: string; name: string; w: number; h: number; dither: number }
export const REEL_LOOKS: readonly ReelLook[] = [
  { id: "crisp",  name: "Crisp",  w: 64, h: 48, dither: 10 },
  { id: "soft",   name: "Soft",   w: 48, h: 36, dither: 20 },   // Marc's 113 pick: the default
  { id: "chunky", name: "Chunky", w: 32, h: 24, dither: 30 },
];
export const DEFAULT_LOOK_ID = "soft";
```
`w x h` is the landscape size; portrait is `h x w`. All use the **full 22-colour palette** (Marc's pick; no preset changes the palette). Proposed values and why:
- **Soft** equals today's look exactly (48 x 36, dither 20). A picture added after this ships with the default is byte-for-byte what 113 made (a test pins it).
- **Crisp** 64 x 48 (3,072 bytes): more detail, a lighter dither (10) because finer cells need less to break up banding. 64 x 48 fits the 192 px height at 4x (256 x 192), the earlier proposal 113 set aside.
- **Chunky** 32 x 24 (768 bytes): big blocks, a stronger dither (30) so flat areas do not become two-colour posters. 32 x 24 at 8x is 256 x 192.
The three sizes were chosen so that, in a 96 x 72 grid cell, each is a clean whole scale (1x, 2x, 3x: 64x48 only 1x, so Crisp thumbnails look smaller in the grid; accepted, see risks). **Dither values and the exact sizes are proposals to be eyeballed in `art/tools/pixel-looks.html` before issue 117a closes**; they cost nothing to change before anything is stored. Sixty Crisp pictures are about 184 KB, Soft 104 KB, Chunky 46 KB.

### 4.2 The record
`ReelPic` today: `{ id, w, h, px, palette: 1 }`. New: one **optional** field `look?: string` (a preset id, `"soft"` when absent). `w` and `h` stay and are the truth for drawing (a close-up never needs the preset to draw). `look` is informational and for the future ("show the look in the manage close-up" is not planned). A record without `look` is read as `"soft"`, so every stored picture from 113 stays valid with no migration. No IndexedDB version bump (the store is schemaless apart from the key path; `onupgradeneeded` is not needed). `palette` stays 1.

### 4.3 What changes in `reel-store.ts`
- `REEL_SIZES` is **derived from the presets** (each look's size and its portrait twin) instead of a literal two-item list. `isValidPic` still checks: `px` is a `Uint8Array`, `(w, h)` is one of those sizes, `px.length === w * h`, every index 0..21. A hand-made record of any other size is still invalid (the close-up layout is therefore bounded to 64 pixels on a side).
- `ReelPicInput` gains `look?: string`; `add` copies it through and ignores an unknown id (valid sizes decide validity, an unknown `look` is dropped to absent, never an error). `backend.put`, `all()` in both backends and the IndexedDB `put` carry the field.
- Dedupe (`samePixels`) already compares `w`, `h` and pixels, so the same photo added at two looks is two pictures (it is a different picture). The cap of 60 counts records, whatever their size.
- **Deleting one**: `remove(id)` exists; add tests; the page already re-lists after a change (`refreshPhotos`), which also calls `game.photosChanged`, so `hasPhotos` clears itself when the last one goes.
- No change to `clear()`, the cap, the sync document or reset.

### 4.4 The chosen look and `pixelate`
- `pixelate(rgba, width, height, opts)` gains `opts.size?: { w, h }` (landscape; portrait is the swap) defaulting to 48 x 36, so every existing call and test is unchanged. The internal `LANDSCAPE`/`PORTRAIT` constants become the default.
- `addPhotos(files, io, store, onProgress, look = default)` passes the look's size and dither to `pixelate` and its id to `store.add`.
- **Where the choice is kept:** a new localStorage key `life.reel.look.v1` holding `{ look: "soft" }`, read tolerantly (unknown or missing means `soft`), written when the switch changes. It is a device setting like the pictures: **not in the progress save, not in the sync document, not touched by RESET PROGRESS** (a test asserts the sync document has no look field, as it has no reel field). It is not in IndexedDB so the settings survive a REMOVE ALL, which is the player's expectation.

### 4.5 The gallery state (pure, tested in node)
```ts
export type GalleryView = "grid" | "closeup";
export interface Gallery {
  pics: readonly ReelPic[];   // in display order
  page: number;               // 0-based
  cursor: number;             // 0..5, a cell of the page (may point at an empty cell only transiently)
  view: GalleryView;
}
// pure helpers
gridCells(box, cellSize, gap): Rect[]           // 6 rects; the drawn list is the tap list
pageCount(n): number; indexAt(g): number | null; move(g, dir): Gallery; open(g): Gallery
closeupScale(pic, box): number                  // largest whole scale that fits
thumbWindow(pic, cell): { scale, src?: Rect }   // whole, or the middle square slice
```

## 5. Files
- `reel/looks.ts` (new): the presets. `reel/look-settings.ts` (new): read/write `life.reel.look.v1`. `reel/pixelate.ts`: `opts.size`. `reel/reel-store.ts`: derived sizes, optional `look`. `reel/photo-add.ts`: the `look` argument.
- `reel/gallery.ts` (new, pure): the `Gallery` state and layout helpers of section 4.5, with a `mode` that only changes the geometry (manage: full view, no band; scene: phone panel and caption band; `wide` or `narrow` by `screen`).
- `achievements/gallery-draw.ts` (new): drawing of a grid and a close-up and the phone chrome, using `drawPic` (moved here, or kept in `photos-draw.ts`, whichever is smaller). `photos-draw.ts` keeps the PHOTOS page's lines and buttons and gains the grid in place of its thumbnail row; the buttons are still one `photosLayout`-style list read by draw and tap.
- `achievements/feature.ts`: the page holds a `Gallery` and the pending DELETE question; adds the keys (arrows, E, S, Delete) and the new tap targets.
- `activities/reel.ts`: replaced by the scene (still type `reel`). `reel.test.ts` is rewritten. `config.ts`: `REEL` loses `pass`, `seconds`, `scale` and gains the scene's numbers (section 6) and the new captions.
- `game.ts`, `activity.ts`: the ad hook (section 6).
- Docs: `docs/activities.md` (a `reel` row in the table and the Escape table), `docs/tasks.md`, `docs/photo-reel-design.md` (a pointer), `docs/text-review.md` (the lines).

## 6. How an ad interruption works
Today an encounter cannot start while anything runs (`InteractionSystem.begin` refuses), and it rolls only after a completed `doomscroll` or `work`. Marc wants one to be able to interrupt the close-up.

**Recommended: the scene hosts the encounter itself**, as a child activity, so `InteractionSystem` (one active at a time, used by every task) does not change at all.
- **When.** Once per session, a fixed look time after the close-up opens (`REEL.adAfter`, proposed **8 seconds** of close-up time; a player who leaves sooner gets no ad). The timer runs only while the close-up is up and no child is running. It rolls through the existing gates and odds: the new `Encounters.roll` call takes the taskId `"scroll-photos"`, and `ENCOUNTERS` gets a second list, `interrupts: ["scroll-photos"]`, beside `tasks`; the completion roll (`maybeEncounter`) ignores `interrupts`, so the scene never rolls twice. Same blocker, game day 2, 3-hour cooldown, two a day, and 22 percent. A hit records itself in the encounter save exactly as any ad does. The `busy` gate is `dialog.open || inputLocked` (the scene is itself the active task, so `interaction.busy` must not count).
- **Starting it.** `startEncounter` is split in two: `buildEncounter(ad)` makes the started-ready `EncounterActivity` with all its deps (the existing code), and `startEncounter` calls it then `interaction.begin(...)`. A new optional host method `ActivityHost.interruptWithAd?(): Activity | null` rolls and returns a built encounter or null. The scene stores it as `child` and calls its `start()`.
- **While it runs.** The scene forwards `update(dt, controls)`, `draw(ctx, screen)` and `tapTargets(screen)` to the child, and its own timer, keys and taps are off. `showsPicture` is true while the child runs (so a phone view flips to 320 x 192 for the card, as for any ad) and false after. The HUD's "ESC TO STOP" is hidden while the child runs (`hidesStopHint`, an existing property).
- **Escape.** The interaction system calls the scene's `cancel()` on Escape. If a child is running, `cancel()` cancels **the child only** (an ad's Escape "ends it at once", `docs/random-encounters.md` section 13) and the close-up comes back; a second Escape leaves the scene as usual. The Escape table gets one row for it.
- **Returning.** When the child is done the scene keeps its exact state (the same page, highlight, close-up and caption). The press that finished the ad is consumed by the child's update, so it cannot also close the close-up. The ad roll is not made again this session. The clock stayed held throughout (the scene `holdsClock`, and the encounter holds it).
- **What an ad can do meanwhile:** the same as anywhere (ignore, unsubscribe, add to cart queues a delivery, mood). Nothing it does touches the pictures. Ending the scene afterwards pays the usual points.
- **Alternative rejected:** a suspend-and-resume stack in `InteractionSystem` (push the scene, run the encounter, pop). More general, but it changes the one piece every task depends on, and the cooldown, award and `lastCompletion` paths all assume one active. Revisit if a second activity ever wants to be interrupted.

## 7. What replaces the 113d slideshow
The scene replaces `ReelActivity` completely in one issue (117e); there is no flag and no two modes. Gone: the 4 second auto-advance, the shuffled pass of six, the first-picture caption, "Right goes on early", the payment at the end of a pass. Kept: the task `scroll-photos`, its prompt, 5 points, `requires hasPhotos`, the pose, `holdsClock`, `readsKeys`, `cancellable`, the dimmed world behind it, the use of `host.reelPictures()` and `host.random()`. `shuffledPass` becomes `sessionOrder(pics, random)`: the whole reel shuffled once at the start (the existing algorithm without the slice), so paging is stable within a session and fresh the next.

## 8. Text proposals (candidates only: Marc reviews them; none may be about resolution, size or pixels)
**The fixed phone-view line** (one chosen when the scene starts from `REEL.phoneLines`, shown for the whole session under the grid):
- "You scroll for a while, because why not."
- "There is a lot of it, and it is all yours."
- "Mostly the same few places."
- "You have taken a lot of pictures of this."
- "You were there for most of these."
- "Nothing here needs an answer."

**The close-up caption** (one chosen when the close-up opens, from `REEL.closeupLines`; the game never knows what is in a picture, so none claims anything about it):
- "Ah, memories."
- "You remember this. Mostly."
- "Look at that."
- "Good times, probably."
- "You were there."
- "Was it always like that?"
- "You could look at this all day. You do not."

**Manage mode** (the PHOTOS page, in the style of 113):
- LOOK line: "New pictures only. The ones you have keep their look."
- Delete: "SURE? DELETE" ; result "Picture deleted. The original was never here."
- Empty grid: "No pictures yet. The sofa has nothing to scroll." (as today)
- Add summary lines are unchanged (`summaryLines`).
Texts go through `docs/text-review.md` as every line does. The old five `REEL.captions` are removed with the slideshow.

## 9. Tests
All in node unless noted, synthetic pictures only (no real photo, name or EXIF anywhere in a fixture).
- **looks and store:** every preset's size and its portrait twin validate; any other size is refused; a 113-era record (no `look`) lists and validates; `look` is kept through add/list on both backends; an unknown `look` is dropped; the three sizes mix in one store; the cap counts all; the same pixels at two looks are two pictures; **`pixelate` with the default size equals the old output** (a pinned golden over a synthetic image); each preset gives its size and the portrait twin for a tall source.
- **add flow:** `addPhotos` with each look stores that size and id; only indices reach the store (the existing check); the default call is unchanged.
- **look settings:** read tolerates junk, write round-trips, a reset does not touch it, the sync document has no look and no reel field.
- **gallery (pure):** 6 cells, no overlap, inside the box at 320 x 192 and 224 x 208; paging across the edges, no wrap at the ends, short last page, one page means no arrows; the highlight never rests on an empty cell; `closeupScale` for every preset and orientation in both views and both modes (the table in 3.3 is the test); the thumbnail slice rule; delete of the last picture on a page moves the page back.
- **manage page:** the drawn buttons equal the tap list (both views); DELETE asks, a second DELETE or Y deletes exactly that record (others untouched), Esc or any other key cancels, no delete key works in the grid; deleting the last picture clears `hasPhotos`; REMOVE ALL and ADD still behave as in 113c (the old photos-page tests stay green); the LOOK switch cycles, shows the "new pictures only" line, and changes only what the next add makes; Esc leaves the page; nothing here pays points or can be interrupted by an ad.
- **scene:** with an empty reel the task is absent and the activity ends quietly; E opens the highlighted close-up; E in the close-up completes and pays the task's points; Esc in either view pays nothing and starts no cooldown; leaving at the phone view pays nothing; no delete, add or settings key does anything; the phone line is the same on every page of a session and the close-up caption is from the pool; no number or count is ever drawn; both views lay out inside 320 x 192 and 224 x 208 and the highlight is visible; touch targets equal the drawn list.
- **ad interruption:** with a fake host whose roll hits, an encounter starts after `adAfter` seconds of close-up time and only once; the close-up timer does not run during the ad; Escape cancels the child and returns to the same close-up (same page and cursor), a second Escape leaves paying nothing; the ad's finishing key does not close the close-up; with the blocker on, before game day 2, or on cooldown nothing starts; with the scene left sooner than `adAfter` nothing starts; `maybeEncounter` is not called twice for one scene (the completion roll ignores `interrupts`); the clock is held throughout; `ENCOUNTER_TASK` encounters after doomscroll still work (the existing encounter tests stay green).
- **game level:** a golden room frame with an empty reel is unchanged; `check:dist` unchanged and passing (no image files added).
- **By hand (117g, on a phone):** thumb feel on the 3 x 2 grid and the highlight, both views at 1x, a portrait picture in the close-up, the Crisp look in a small cell, the view flip when an ad arrives (`?encounter=` can force one but not from inside the scene; `adAfter` can be set low in a dev flag), the look of each preset on real pictures.

## 10. Risks
- **Mixed sizes in one reel.** Different looks give different grid thumbnail scales and close-up scales. Mitigation: only three sizes are valid; every drawing goes through `closeupScale`/`thumbWindow` with tests for all of them. Crisp thumbnails (64 x 48 at 1x in a 96 x 72 cell) look small and Chunky (3x) fills the cell: the cell shape could grow, but then the grid no longer fits 192 px.
- **Portrait pictures in the scene's close-up are smaller** (3x) than landscape (5x) because of the caption band. If that bothers Marc, the caption moves into the margin beside a portrait picture. Cheap to change, since it is one layout function.
- **The phone view on the narrow view uses 1x thumbnails of 48 x 36** inside a 64 x 48 cell, so small on the 224 px view (the canvas is scaled up 1.3x to 1.67x on a phone, so a thumbnail is about 80 to 100 css px wide). Acceptable on a phone; a hand check in 117g.
- **The view flips size mid-scene** when an ad arrives (224 x 208 to 320 x 192 and back). It is the same flip as any ad or cutscene `view`; the scene draws from the `screen` it is given each frame so it must not cache a size.
- **Nothing today can interrupt a running activity**, so the nested child is new ground: `update`, `draw`, `tapTargets`, `cancel` and the stray-key window must all forward correctly. It is isolated in its own issue (117f) so it can be dropped without touching the rest.
- **Two exits with different pay (E and Esc).** Consistent with the Escape rule but a player might expect Esc to pay. The hint line shows `E DONE` and no points are announced as a reward.
- **Looks cannot be re-applied.** Originals are not kept, so a look change affects only new pictures (stated on the page; the 113 limit).
- **Privacy slip.** A picture, a file name, EXIF or a pixel dump reaching the repo, a log, a test fixture, the sync document or a screenshot. Mitigation as in 113: tests use synthetic pictures only, nothing is read from a file beyond its pixels, the sync-document test, the look setting is a preset id and nothing else, manual checks are done on a device and no screenshot of a real picture is committed or attached.
- **Delete by accident.** The two-step confirm, in a close-up only, with the cancel-on-any-other-key rule; there is no undo (the originals are on the phone).
- **Keys.** `S` and `Delete` are new on the PHOTOS page only; the page already owns A and R; `O` and Esc are unchanged.

## 11. What changes and what does not
Changes: the PHOTOS page (thumbnails become a selectable grid, close-up, delete one, LOOK), the stored size rule, the add flow's look, the sofa task's activity, and the encounter hook. Does not change: the 60 cap, dedupe, REMOVE ALL, the palette, `palette: 1`, the picker flow, `hasPhotos`, the sync document, RESET PROGRESS, the 22 percent encounter odds and their gates, and `InteractionSystem`.

## 12. Staged build plan (small issues)
Each issue merges alone and leaves main no worse than today. "No worse" is checked by the tests listed and a game with no photos being byte-identical in behaviour.

| Stage | Issue | What | Safe alone because |
|---|---|---|---|
| A | 117a | Looks: `looks.ts`, derived sizes, optional `look` on records, `pixelate` `opts.size`, `addPhotos` look argument, `look-settings.ts`, tests | Nothing in the UI changes and the default look is today's exactly (a golden test pins that); old records are valid; no preset is reachable by a player yet |
| B | 117b | Gallery core: pure `gallery.ts` (state, paging, cells, `closeupScale`, thumbnail rule) and `gallery-draw.ts` (grid, close-up, phone chrome) with tests, not wired | Not called by the game at all; only new files and tests |
| C | 117c | Manage mode: the PHOTOS page shows the grid, opens a close-up, **delete one**, keeps ADD and REMOVE ALL; both views; touch | Replaces a thumbnail row with a superset (the same pictures, newest first, now selectable); ADD, REMOVE ALL and BACK keep their tests; the sofa task is untouched, so the slideshow still works |
| D | 117d | The LOOK switch on the PHOTOS page (needs A and C), the "new pictures only" line | Defaults to Soft = today's look, so someone who never touches the switch sees no difference |
| E | 117e | Scene mode: the phone view and the close-up replace the slideshow, the caption lines, pay on leaving from a close-up (needs B; independent of C, D) | The task id, prompt, requirement and points are unchanged and the slideshow is removed in the same commit (never two versions); no ad interruption yet, so the ad rules are exactly today's; revertable as one commit |
| F | 117f | Ad interruption in the close-up: `ENCOUNTERS.interrupts`, `buildEncounter`, `interruptWithAd`, the child in the scene, the Escape row (needs E) | Separable: without it the scene works as in E; the completion roll for doomscroll and work is untouched and its tests stay green; a bug here cannot touch the gallery |
| G | 117g | Text review of the lines, an on-device pass (touch, both views, looks on real pictures), docs: `activities.md`, `tasks.md`, `photo-reel-design.md` pointer, PLAN.md | Docs and tuning only |

Order: A and B in parallel, then C, then D and E (independent), then F, then G. Manage mode (A to D) can ship before the scene, which matches Marc's first want (delete one picture). Each is one agent session. Mark half-finished stages on a feature branch until safe to push, per the main-must-be-releasable rule: C needs B merged first, and D needs A and C, so nothing half-wired ever reaches main.

## 13. What I decided myself, and why
- **One pure gallery, two skins**: the two entry points cannot disagree about paging, the highlight or the close-up scale, and nearly all of the logic is testable without a canvas.
- **Close-up = largest whole-number scale that fits** (the planner decision, kept). A 192 px height gives 48 x 36 at 5x (240 x 180) and not the 4x (192 x 144) the issue first mentioned; 4x is what the narrow view gets. Whole scales only, so every source pixel stays a crisp block (no `fitFill` blur).
- **Scene mode draws natively in both views**, and does not set `showsPicture`, so the phone gets a 224 x 208 layout with whole scales (not a 320 x 192 picture scaled to 3.5x). Only the ad card flips the view.
- **Esc pays nothing, E pays** (the Escape table is a project rule); leaving at the phone view never pays (Marc/planner).
- **Scene order: the whole reel shuffled once per session**, six a page, paged by the arrows with no count. The 113d pass of six random pictures is gone; a player can reach any picture, and the close-up is the player's pick (Marc's decision), not random.
- **The highlight starts on a random cell in scene mode**, on the first cell in manage mode.
- **No Left/Right flipping in the scene close-up** (Marc picked one picture; flipping would turn the scene into a gallery again); manage mode flips, so several pictures can be deleted without returning to the grid each time.
- **After a delete, back to the grid** with the highlight on the same cell number: simplest and never leaves the close-up on a picture that no longer exists.
- **No delete in the grid, no points, captions or ads in manage mode** (Marc), and no counts in scene mode (nothing in the world counts photos).
- **A portrait thumbnail in the wide grid shows the middle square slice** at 2x rather than the whole picture at 1x, so it is not tiny; the close-up shows the whole picture.
- **Presets store sizes through the existing `w` and `h`**, plus an optional `look` id; the valid sizes are an explicit whitelist from the presets, not "any size", so the layout is bounded.
- **The look choice lives in its own localStorage key**, not the progress save, the sync document or IndexedDB: the photos never reach the sync blob, and a REMOVE ALL should not forget the player's setting.
- **The ad is hosted by the scene** as a child activity, not by a suspend stack in `InteractionSystem`: no change to the core every task uses. It is a **once-per-session roll after 8 seconds of close-up time**, through the existing gates and 22 percent, so ads stay as rare as everywhere else and a short look never gets one.
- **The slideshow is replaced, not kept as a mode**: Marc's request, and two modes of one task would double the tests.
- **Seven issues, with the ad interruption last** because it is the only stage that touches the encounter path.

## 14. Open questions for Marc (real ones only, most important first)
1. **The three looks and their values.** Crisp (64 x 48, dither 10), Soft (48 x 36, dither 20, the default), Chunky (32 x 24, dither 30): are the names and numbers right? Recommend yes as proposed, then a look at real pictures in `art/tools/pixel-looks.html` before 117a closes.
2. **Which pictures the phone view shows.** All of them, paged six at a time in a shuffled order, with no count. Recommend this over "a random six only", so you can pick any picture. (Or: newest first, like the PHOTOS page?)
3. **After an ad, should the close-up come back as it was, or should the scene end?** Recommend it comes back (your planner decision), with no second ad this session.
4. **Does E in the close-up pay while Esc does not?** Recommend yes (Esc is the project-wide "back out, no points" key). The alternative is that both pay, which breaks the Escape table.
5. **The words.** Pick a few of the phone-view lines and close-up captions in section 8, or say none fit.
