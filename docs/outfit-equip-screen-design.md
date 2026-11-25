# A pause-screen outfit equip screen, and a character preview (design note, issue 176)

Status: a design for Marc to read and decide on. Nothing is built and nothing is removed. Marc's idea (2026-11-24, after trying the slots of issue 175): a page on the pause screen for equipping the four outfit slots, in the spirit of a classic equipment screen (a list of slots on the left, what can go in the selected slot on the right, a description bar on top, a pointer), plus a bigger look at the character wearing it. It is inspiration for the structure only: the screens here use the game's own pixel font, palette, borders and pointer, and nothing from any other game is copied. Builds on issues 152 (worn outfit), 156/158/159 (outfits and the generator), 164/175 (slots; [outfit-slots-design.md](outfit-slots-design.md), 'What issue 175 built' in [decor.md](decor.md)), 109b (THINGS) and 113c/117 (PHOTOS).

Marc answered d1 to d4 on 2026-11-24 (in the issue file): **photos are going** (remove now or later, depending on these mockups; not keep), the character is the existing 16x16 art drawn larger with the four facings (a higher-resolution set is a later step), OUTFITS is a new pause page next to THINGS, and the bookshelf list stays as built. This note is built on those answers. New questions are d5 to d8 at the end, each with a recommended default.

## In short
- **OUTFITS is a new pause page** (d3's recommended default). Left: the four slots (EVERYDAY, PAJAMAS, ROBE, GOING OUT), each with the outfit equipped in it and WORN on the one you have on. Right, top: the owned outfits the selected slot takes. Right, bottom: the character wearing the highlighted outfit at 4x (crisp pixels), with the four facings shown small beside it; Tab (or Q, the game's cycle key) turns it. Top: a bar showing the highlighted outfit's own deadpan note, and nothing else; no help text.
- **No new state and no new rules.** The page keeps only its cursor (which column, which slot, which row, which facing). Everything else is the issue 175 `Decor` API: `slotChoices`, `equippedIn`, `equip`, `item`, `wornSlot`. The preview is a pure draw of an existing sprite; nothing is written until E.
- **The pause screen is crowded, but only until PHOTOS goes.** Today it has eight buttons filling exactly the four rows there is room for; a ninth button lands on top of the page control and the first achievement. On desktop five key hints squeeze to a gap of about 2 px (they read as one run: unreadable). With PHOTOS removed OUTFITS takes its place and nothing else changes: the primary mockups are the pause screen without PHOTOS. Details and numbers in section 3.
- **Photos (d1, answered: they are going):** section 4 lists every place PHOTOS touches; section 3 recommends removing it **now**, as its own issue that lands before the OUTFITS build, so the page never has to ship around a ninth button. Nothing is removed in this issue.
- **Preview at higher resolution:** possible and not recommended now (section 6): 52 new sprites, 4 new hand-drawn bases, ten torso rules rewritten for a finer grid, and a different pixel density from the room.
- **Build:** one issue of about the size of the THINGS page (section 9), art-free.

## 1. What the screen looks like

The mockups are rendered with the game's own `SoftCanvas`, `drawText`, `drawButton`, `hintLine`, palette and the real `.sprite` files (the pause screens use the real `drawList` and `pauseButtons`), at 3x. They are in [outfit-equip-screen-mockups/](outfit-equip-screen-mockups/).

| File | Size | Shows |
|---|---|---|
| `equip-1-desktop-slots.png` | 320x192 | Focus on the slots: EVERYDAY picked, the grey hoodie on the character, facing down |
| `equip-2-desktop-list-turned.png` | 320x192 | Focus in the list on the longest name (DENIM JACKET AND TEE, 119 px), turned to the left |
| `equip-3-desktop-goingout-back.png` | 320x192 | GOING OUT, the blazer, seen from behind; PAJAMAS is the slot worn |
| `equip-4-phone-list.png` | 224x208 | The phone layout, list focus |
| `equip-5-phone-slots.png` | 224x208 | The phone layout, ROBE picked, facing right |
| `equip-6-desktop-early.png` | 320x192 | Early game: three outfits owned, ROBE and GOING OUT show a dash and nothing else |
| `equip-7-phone-early.png` | 224x208 | The same on the phone |

### Structure (desktop, 320x192)
- **Title** OUTFITS in butter at the top left (the pause pages' own title style, as THINGS and PHOTOS).
- **Note bar** (y 14 to 29, ink border and slate fill, the box style of THINGS' entry box): the highlighted outfit's own note from `decor-data.ts` (`GREY HOODIE`: A POCKET FOR EVERYTHING EXCEPT THE KEYS.). One line; the longest note is 45 characters (269 px, the button-up shirt's) and fits the 308 px bar. When the focus is on the slots it shows the note of the outfit equipped in that slot; an empty slot shows an empty bar. This is the only text beyond names, WORN and the keys line, which keeps Marc's rule for the bookshelf list ('no explanatory text beyond the outfit's own note').
- **Left column, the slots** (x 6, 130 wide, four boxes of 32 with 4 between): slot name (butter when picked, mist otherwise), WORN in butter at the right of the one you have on, and below it the equipped outfit's name (paper) or a mist dash for an empty slot. 130 px is what the longest outfit name needs (`DENIM JACKET AND TEE`, 119 px) with no truncation.
- **Right, top: the list** (x 140, 174 wide): five rows of 10 px, one per owned outfit the picked slot takes (`Decor.slotChoices`, in `OUTFITS` order). The equipped one has a small butter square before its name. More than five rows: the list scrolls and a small arrow shows at the foot; **there is no count** (no 3/5, no page number).
- **Right, bottom: the preview** (y 96 to 176): the character at 4x (64x64) on a strip of floor, and the four facings at 2x in a 2x2 grid, the shown one in a butter border (down, left, up, right).
- **Keys line** at the foot, the same style as every pause page: `ARROWS: PICK   E: EQUIP   TAB: TURN   ESC: BACK` (281 px of 320).

### The pointer and the highlight (the game's own cursor language)
- The pointer is the 3x5 triangle the bookshelf list draws (`activities/outfit-slots.ts`); it is butter in the column that has the focus and mist in the other, so you can see both where you are and where you will return to.
- The focused column gets a butter border (THINGS' picked cell); the focused row in the list is a darker (night) bar with butter text. The slot you leave stays marked with a dusk border and a mist pointer.
- No hand, no sparkles, no animation: nothing moves, so reduced motion has nothing to do ([reduced-motion.md](reduced-motion.md) row 48 covers the pause pages as instant).

### Phone, 224x208
The same parts, stacked: note bar (two lines, 24 px), the four slots as single rows of 14 px (slot name, outfit name, WORN at the right; the longest case just fits with 3 px to spare), then the list (five rows of 14 px) on the left with the preview on the right (70 wide, the character at 4x, four small squares under it for the facing). BACK is a button at the top right (as THINGS). Rows are 14 px so they are taps: on a phone at roughly 1.7 screen pixels per game pixel that is about 24 points, smaller than the 44 point guidance, so the build should also support the pad and A (below) and I list it as unverified. The preview box is a tap target that turns the character.

### Honest cost of the layout
- The three-column idea (slots, list, preview side by side) does not fit at 320: the list needs 119 px for the longest name plus the pointer and the square, the slots need the same, and a 4x character needs 64 px. That is why the preview sits under the list on desktop and beside it on the phone.
- A 6x character (96 px) does not fit under the list at 192 px tall, and on the phone the beside-the-list column is only 70 px. 4x (64 px) is the largest scale that fits both layouts without dropping the list or the slots. 5x (80 px) would fit the desktop box only with a taller preview and a one-row-shorter list. So d2's recommended default (4x) is also what fits.

## 2. How you use it

Desktop:
- Pause (L), then **F** opens OUTFITS (from the pause list; the key is d7's question). Escape or F returns to the pause list; L closes the pause screen as on every page.
- Focus starts on the slot you are wearing. **Up and down** pick a slot. **Right** (or **E**) moves into the list, with the highlight on the outfit equipped there. **Up and down** move the highlight and the preview follows at once (the outfit is applied live to the character as you move). **E** equips the highlighted outfit in the slot and keeps the focus there. **Left** or **Escape** goes back to the slots; **Escape** on the slots leaves the page.
- **Tab or Q** turns the character through down, left, up, right (the game's cycle keys, `CYCLE_KEYS` in `interaction.ts`; Shift goes backwards as in the game). The turn is only a view: nothing is saved and it resets to facing down each time the page opens.
- On the slots, **E** is also "go into the list"; there is no wear-now key on this page (d6).

Touch (the layer sends the same keys; the page also takes taps):
- PAD picks, A equips, B goes back, the CHOICE button (a quick tap is Tab) turns the character. A tap on a slot picks it, a tap on a list row highlights it (a second tap equips), a tap on the preview turns the character, BACK is a button. The keys line on touch reads `PAD: PICK  A: EQUIP  CHOICE: TURN` (197 px of 224; on the slots A goes into the list rather than equipping, so the line is the list focus's; the full line with BACK is 251 px, which does not fit, and BACK is a button anyway).

## 3. How it fits in the pause screen

### The pages today (counted from the code)
The pause screen is one home screen plus **four pages**: TRANSFER SAVE, SYNC, THINGS and PHOTOS (`page` in `achievements/feature.ts` is `"list" | "transfer" | "sync" | "things" | "photos"`). FLASHCARDS is not a pause page (it is the computer's task). The GOOD HOUR line at the top is a legend on the home screen, not a page.
- **Desktop:** L opens the home screen, then one key per page: T, P, I, O (and B, D, Shift+R for settings). The keys are shown in one hint line above the footer, `P: SYNC   I: THINGS   O: PHOTOS   T: TRANSFER SAVE` (four hints, 22 px gaps). That line is drawn only while the achievement rows leave the line free (`rowsBottom <= footerTop - 9` in `drawList`). With 26 achievements it fits (the rows end at y 148, the limit is 155); **the 27th achievement would hide the line** (rows end at 158), taking the only on-screen route to every page with it. That is a latent problem whatever this issue decides, and I did not check whether another achievement is planned.
- **Touch:** the PAUSE button opens the home screen, where eight buttons are in two columns (AD BLOCKER, DIALOG VOICE, TRANSFER SAVE, SYNC, THINGS, PHOTOS, RESET PROGRESS, CLOSE). They fill exactly the four rows there is room for (`PAUSE_TOUCH`: buttons from y 17, 16 high with 2 between, so four rows end at y 89, which is `pageTop`). The achievements are in pages below them: 12 per page on 320x192 (3 pages for 26), 14 per page on 224x208 (2 pages).

### What makes it crowded
Only the touch layout. There is a fixed budget of eight buttons, and two of them are settings, two are leave/reset, and four are pages. A fifth page has nowhere to go: a ninth button goes in the first free cell and lands on the PAGE n/m control and the first achievement row (`pause-touch-2-...` and `pause-phone-2-...`). On the desktop a fifth hint fits only by shrinking the gaps from 22 px to under 2 px, which reads as one run and is not readable (`pause-desktop-2-...`).

### Mockups: the page list without PHOTOS (primary) and with it
Since photos are going, the primary pictures are the third row (OUTFITS in place of PHOTOS); the others show what it would cost to keep PHOTOS and are here for the reasoning.
The pause screens are drawn by the real `drawList` and `pauseButtons`; the new button and hint are added on top by the mockup script (so the overlap is what would happen with no layout change).

| | Desktop 320x192 | Touch 320x192 | Phone 224x208 |
|---|---|---|---|
| Today | `pause-desktop-1-today.png` | `pause-touch-1-today.png` | `pause-phone-1-today.png` |
| OUTFITS added, PHOTOS kept | `pause-desktop-2-with-outfits-and-photos.png` | `pause-touch-2-with-outfits-and-photos.png` | `pause-phone-2-with-outfits-and-photos.png` |
| OUTFITS in place of PHOTOS | `pause-desktop-3-outfits-in-place-of-photos.png` | `pause-touch-3-outfits-in-place-of-photos.png` | `pause-phone-3-outfits-in-place-of-photos.png` |

(In my render of the 224-wide view the legend runs into the achievement count and DIALOG VOICE: BEEP is wider than its button. This is from the existing `drawList`; I did not check whether the real game shows the same at that width, and it is not part of this issue.)

### What each costs
**With PHOTOS (nine things):**
- Desktop: five hints on the line with 1.8 px gaps; in `pause-desktop-2-...` they run together (`SYNCI: THINGSO: PHOTOSF: OUTFITST:`) and are not readable, and the same latent 27th-achievement problem remains.
- Touch: a fifth row of buttons, which moves the achievement list down 18 px and cuts it from 12 to 8 per page on 320x192 (3 pages become 4) and from 14 to 10 on 224x208 (2 pages become 3). That is arithmetic from `touchPageSize`, not a rendered screen. Or fold something into something else (for example the two settings buttons into one SETTINGS page), which is a design of its own.
- OUTFITS and PHOTOS both exist; the pause screen has five pages.

**Without PHOTOS (OUTFITS in its place):**
- Desktop and touch layouts are exactly as today: eight buttons, four hints, 12 and 14 achievements per page. THINGS and OUTFITS sit next to each other, which suits them (THINGS shows what you own, OUTFITS arranges the clothes among it).
- Four pages. Costs what removing PHOTOS costs (section 4): a separate, deliberate issue.

**A third way (d3's other option), neither removing nor adding:** a second tab inside THINGS. It adds no button and keeps PHOTOS, but THINGS is today read-only by design ('changes nothing and saves nothing', `thingsKey` in `feature.ts`, and [inventory-design.md](inventory-design.md)); an equipping tab would be the first editing there and the equip function would be hidden one page deeper. I do not recommend it, but it is the cheapest way to keep everything.

### Recommendation on d1 (photos are going: now or later)
**Remove it now, as its own issue that lands before the OUTFITS build.** Reasons: (1) the touch pause screen cannot hold the ninth button, so building OUTFITS first would either overlap the page control or need the fifth row (which costs the achievement list a page on each layout) and then be undone; removing first gives OUTFITS PHOTOS' cell with no layout change at all; (2) the desktop line with five hints is unreadable, with four it is as today; (3) removal is mostly deletion and has a known list (section 4), while the OUTFITS page is new code, so the smaller, riskier-to-forget job goes first and the page then lands on a clean screen; (4) it keeps main releasable: no state where the page exists but the screen is broken. The one reason to wait is if Marc wants to try the sofa scene once more before it goes; nothing here depends on that. The removal issue should confirm exactly what goes with Marc first (section 4 is the list), decide d8, and test an old save with `scroll-photos`.

## 4. If PHOTOS were removed: every place it touches (checked by search, nothing removed)

Counts are lines in the files on `main` at 131547e.

**The pause page and its pieces**
- `src/game/achievements/photos-draw.ts` (388 lines): the page, its layout, buttons and strings.
- `src/game/achievements/gallery-draw.ts` (99): the gallery's drawing.
- `src/game/achievements/feature.ts` (1,144 lines, about 105 lines mention photos, reel or gallery): the imports, the `reel`/`photoIO`/`lookStorage` options, the `page` union, `openPhotos`, `photosKey`, `photosTargets`, the gallery handling, the `hasPhotos` exclusion when saving (`feature.ts:389-390`) and the every-task exclusion of `scroll-photos` (`feature.ts:150`).
- `src/game/achievements/draw.ts`: `PHOTOS_HINT`, the `"photos"` button id and its list entry, the hint list in `drawList`, the comment that counts eight buttons.
- `src/game/config.ts`: `ACHIEVEMENTS_UI.photosKey` (`KeyO`), the `REEL` block (the sofa scene's tuning, with its comment at `config.ts:486`) and the ads' `interrupts: ["scroll-photos"]` (`config.ts:164`).

**The reel store (the pictures)**
- `src/game/reel/` (9 source files, 1,036 lines): `reel-store.ts` (IndexedDB), `photo-add.ts`, `photo-io.ts` (the file picker and decode), `pixelate.ts`, `palette.ts`, `looks.ts`, `look-settings.ts` (its own localStorage key `life.reel.look.v1`), `gallery.ts`, `synthetic-pic.ts`.
- Stored data on devices: the IndexedDB database of pictures and the `life.reel.look.v1` key. They are not in the save or the sync (`hasPhotos` is derived and never saved or synced), so removal cannot touch a save, but it leaves the data in the browser unless something deletes it (d8).

**The sofa photo scene**
- `src/game/activities/reel.ts` (207 lines), registered in `activities/index.ts`; the `reelPictures?()` hook in `activity.ts:94`.
- The task `scroll-photos` ('Scroll through photos', `tasks.ts:71`, its `requires` on `hasPhotos` at `tasks.ts:72`, the activity at `tasks.ts:267`, the pose at `tasks.ts:309`) and the sofa's task list (`apartment.ts:142`).
- State: the derived variable `hasPhotos` (`state-vars.ts:36`) and `Game.syncPhotos`/`loadReel`/`reel` in `game.ts` (about 27 lines mention it, for example `game.ts:512`).
- The ad that can interrupt the close-up (issue 117f): `ENCOUNTERS.interrupts`, `interruptWithAd` in the reel activity.

**The THINGS neighbour**
- In the pause list THINGS and PHOTOS are neighbours: touch row 3 (THINGS | PHOTOS), the desktop hint line (`I: THINGS`, `O: PHOTOS`) and the key routing (`feature.ts:492-493`). OUTFITS would take PHOTOS' cell and hint; nothing in THINGS itself reads photos.

**Tests** (about 3,000 lines): `src/game/reel/*.test.ts` (5 files, 1,166 lines), `activities/reel.test.ts`, `achievements/photos-page.test.ts`, `photos-manage.test.ts`, `photos-look.test.ts`, `gallery-draw.test.ts`, `src/game/reel-ad.test.ts`, `reel-game.test.ts` (1,846 lines together); plus single assertions in `achievements/transfer-draw.test.ts:63` (the eight button ids) and `game-activities.test.ts:273` (the list of activity types includes `"reel"`).

**Docs and text**: [photo-reel-design.md](photo-reel-design.md), [photo-gallery-design.md](photo-gallery-design.md), [text-review.md](text-review.md) (the PHOTOS page section and its sofa strings), `scripts/fixtures/text-review-snapshot.md` and one fixture line in `scripts/text-review.test.mjs`, [reduced-motion.md](reduced-motion.md) rows 47, 48 and 55, [real-world.md](real-world.md) (idea 2), `docs/learn/05-state-and-sprites.md` (it mentions `hasPhotos` as the exception to 'state is saved'), **`docs/learn/02-words.md` (lesson 02 is built on `REEL.phoneLines`, `REEL.closeupLines` and `activities/reel.test.ts`, so removal breaks a lesson Marc uses; the removal issue must settle lesson 02 first)**, `docs/learn/reference-repo-map.md` (lines 18, 25 and 31), `docs/activities.md` (line 72) and `docs/contributing.md` (line 30), and the issue files 113 to 113e and 117 to 117g, which are history and would stay. There is no art: the reel draws generated pictures from the player's own files, so no `.sprite` goes.

**Not touched by removal**: `art/` (nothing), the save format and the sync (`hasPhotos` is never in either), achievements (no achievement names photos).

**One thing to check before such an issue**: saved progress records which tasks were done by id. I did not check how the load treats a task id that no longer exists (`scroll-photos`), so a removal issue should test an old save that has one.

## 5. The preview: how the engine draws it (checked)

- The player is 16x16 (`TILE`), shown from the side or back in the room (the idle and walk sprites, `<prefix>-idle-<dir>` and `-walk-<dir>-1/-2`).
- **The sprites already exist for every outfit and every facing.** `OUTFIT_SPRITES` in `render/player-sprite.ts` lists `<prefix>-idle-<dir>` and both walk frames in all four directions for each outfit after the first (and `PLAYER_SPRITES` for the everyday one), so the loader already fetches them; the preview needs no new art, no new loading and no new state.
- **How it is drawn:** `outfitByItem(itemId).prefix` plus `-idle-<facing>`, through `SpriteDrawer.draw` with a `{ width: 64, height: 64 }` size (the same nearest-neighbour path the THINGS entry box uses at 2x with `entryScale`, so pixels stay crisp). The mockup draws it exactly this way with the soft canvas.
- **It does not use `Decor.preview`.** The bookshelf list uses `decor.preview("worn", id)` to show the outfit on the player in the room behind the list. The pause screen is a full-screen panel (`fullPictureWhen`), so there is nothing to preview in the room, and a `previewing` flag left set would leak into the room. The page draws the sprite directly from the highlighted item and writes nothing until E.
- **The turn** is a view value (down, left, up, right); the order differs from `DIRECTIONS` (up, down, left, right) on purpose so that the first turn from facing down shows the side.
- A walk-in-place animation (the two walk frames, a step every half second) would cost no art either. I would leave it out: it adds motion to a page that is otherwise still, needs a reduced-motion rule, and the four facings already show the outfit. It is not a decision; it is a later polish.

## 6. What a higher-resolution step would cost (not recommended now)

Today (counted in `art/src` and the code on `main`): 13 outfits in `OUTFITS`; each has 12 walking/idle sprites (156 files) and, apart from the everyday clothes, 5 doing poses (60 files); `art/src` holds 223 files named `player-*` in all. Of the 13, four are hand-drawn bases (`player`, `player-casual`, `player-out`, `player-pajamas`: the last three are 'poseOnly' entries in `art/outfits.json`) and nine are generated by `scripts/outfits.mjs` from `art/outfits.json`, **all nine from the same hand-drawn template `player-casual`**, by repainting its torso rows (the `e` and `f` letters, rows 7 to 11) with one of ten rules in `RULES` (open-front, solid, hoodie, scarf, scarf-tail, placket, buttoned, robe, check, stripes-v), plus sleeves, collar, hem and a few hand-drawn overlay rows.

What a preview-only higher-resolution set (say 32x32, drawn at 2x or 3x on this screen) would need:
1. **52 sprites** (13 outfits x 4 facings, idle only; the preview never walks), 4 times the pixels of a 16x16. A walking preview would be 156.
2. **New hand-drawn bases.** The generator recolours a template; it cannot enlarge one. At least four new 32x32 bases (one facing each of the casual template, hand-drawn with the face, hair and hands at the finer grid) are needed, and honestly the home, casual, out and pajamas bases (four more by hand, or re-expressed as generator entries on one base).
3. **The generator re-done for a finer grid.** The rules take 16x16 row and column positions (`x`, `x0`, `x1`, `k`, `r`, `n`); a collar, a hem or a scarf end are specified in those units. Ten rules and the options would be rewritten, and the 16-letter overlay rows would be 32 wide. `scripts/outfits.test.mjs` asserts 16x16 per file and would change.
4. **The pipeline around it:** a name scheme (for example `<prefix>-preview-<dir>`), `OUTFIT_SPRITES` and the loader, the sprite-name check, a contact sheet, `art/outfits.json` growing a section, and a test that every outfit has a preview.
5. **Every future outfit** would then cost 4 more generated files besides its 12 and 5 (so more than today's).
6. **A look decision, not just work:** at 32x32 the character would have more face and detail than the 16x16 person in the room and in the THINGS grid; the same person at two pixel densities on neighbouring screens may read as two games. That is a call for Marc and the art direction, and it is the main reason I would not do it yet.

Order of magnitude: the first working set (bases, rewritten rules, 52 sprites, checks) is roughly as much art work as issue 159 (drawing the outfits) plus a generator change, not an afternoon. It is a later, separate step, as d2's recommended default says; it needs no change to the page, which only names a sprite.

## 7. How it shares the equip logic of issue 175 (no duplicate state)

The page owns only view state: `focus` (slots or list), `slot` (index into `OUTFIT_SLOTS`), `row`, `facing`. It reads and writes through `Decor`:

| The page needs | It calls (in `decor.ts`) |
|---|---|
| The slot rows | `OUTFIT_SLOTS` (`outfits.ts`) |
| The outfit equipped in a slot | `equippedIn(slot)` then `item(id)` for its name and note |
| What the list shows | `slotChoices(slot)` (owned, of the slot's styles, in `OUTFITS` order) |
| WORN | `wornSlot()` |
| E | `equip(slot, itemId)` (refuses an unowned item or one of the wrong style; when the slot is the one worn, `worn` follows) |

There is no copy of the list, no second `equipped` and nothing saved by the page itself: `equip` calls `onChange`, which the achievements feature already turns into an immediate save (`feature.ts:189`), and the sync already carries `decor.outfits.equipped` (issue 175). What the bookshelf list does (`OutfitSlotsActivity`: left and right cycle an outfit with `equip`, E calls `wearSlot`) and what this page does (E calls `equip` on the highlighted row) are two callers of the same two functions. `Game.update` runs `syncOutfit` before its paused branch (`game.ts:776-783`, `:819`), so if the equipped slot is the one worn, your clothes are already changed when you close the pause screen. A test can drive the page through the keys with a `Decor` and no canvas, as `outfit-slots.test.ts` does for the list.

**Where it would differ from the bookshelf:** the bookshelf equips on the left/right cycle, which commits at once; this page highlights first and commits on E, which is what makes the live preview honest (nothing changes until you mean it). Escape from the page leaves everything equipped so far, like the bookshelf.

## 8. Quiet-collecting rules ([decor.md](decor.md), 'Rules that keep it calm')
- Only what you own is listed: no locked or greyed-out entries, no silhouettes (THINGS shows silhouettes for what an ad showed; this page never does), no 'x of y', no count anywhere, no 'NEW' mark.
- A slot with nothing owned shows a dash and an empty list box; nothing says what is missing.
- Equipping pays nothing: no points, no mood, no cooldown, no toast, no sound beyond what the menu already uses. It is the same quiet change as the bookshelf's.
- The page cannot lose, sell or break anything; equipping replaces only the slot's preference and the previous outfit stays owned and in the list.
- Nothing about the page is a goal: the outfits are listed in `OUTFITS` order with no ranking, and no outfit is marked as better for a slot or an hour (the issue 156 rule). Outfits are a spread: nothing in the page, the names or the mockups takes a gender as the default.

## 9. Size and a staged build plan
- **Stage A, the page (one issue, no art; after stage 0):** `achievements/outfits-draw.ts` (layout, draw, tap rectangles; about the size of `inventory-draw.ts`, 224 lines), the page in `feature.ts` (state, `openOutfits`, key routing, `outfitsTargets`, about 80 lines), a key in `ACHIEVEMENTS_UI`, one button and one hint in `draw.ts`, and tests: layout at both views (nothing off screen, the longest name fits), key walkthrough with a `Decor` (focus moves, E equips, Escape keeps, a wrong-style item is refused by `equip`), the preview names `<prefix>-idle-<facing>` for every outfit and facing that exists, taps, no count or silhouette drawn. Roughly 600 lines with tests; the same order as the THINGS page (109b).
- **Stage 0, the room (recommended first):** the PHOTOS removal issue (section 4). Mostly deletion, about 1,700 source lines and 3,000 test lines go; OUTFITS then takes PHOTOS' touch cell and desktop hint.
- **Stage C (later, optional):** walk-in-place; the higher-resolution set (section 6).
- **Order:** stage 0, then A, then C if ever. If A were built before 0 it would have to stay on a feature branch (main must stay releasable; the ninth-button overlap is not shippable).

## 10. What I could not check
- Everything on the page was drawn with the soft canvas in a script outside the repo and looked at as PNGs; none of it runs in a browser. Feel, spacing on a real phone, tap size and how the CHOICE button behaves on the pause screen are unverified.
- That the touch layer's A, B and CHOICE send E, Escape and Tab to the pause screen (they do in `touch.test.ts`, and the achievements feature reads key events) was read, not tried on a phone.
- The 224-wide pause screen's legend and voice-button overlap noted in section 3 is from the existing code in my render.
- That an old save with `scroll-photos` loads after a removal (section 4).

## 11. New questions (also in the issue file, each with a recommended default)
- **d5.** Equipping into the slot you are wearing changes your clothes on the spot (this is what `Decor.equip` does today and what the bookshelf already does). Recommended: yes, the page uses it as it is.
- **d6.** Does the OUTFITS page also have a wear-now key? Recommended: no; wearing a slot stays at the cube bookshelf (d4's default keeps it there), and the page is for choosing what goes in the slots.
- **d7.** Keys: F opens the page from the pause list on desktop and Tab or Q turns the character. Recommended: yes (F is free on the pause list; it is the save-file key only on the TRANSFER page, a different page, so there is no clash; Tab/Q is the game's cycle key).
- **d8.** If PHOTOS is later removed: what happens to the pictures already stored in the browser? Recommended: one quiet clean-up that deletes the stored pictures and the look key on the next load, so nothing invisible is left on a device; the alternative is to leave them where they are.
