# Asset review (issue 096, survey step)

A pass over every sprite in `art/src/` (and what `public/sprites/` carries, which is the same set rendered), for **perspective** and **consistency**. This is the survey only: nothing in sprites, maps or code was changed. Marc's answers are recorded at the end once the planner has asked him.

## How it was done
- Read: `docs/art-style.md`, `docs/floor-plan.md`, `src/game/apartment.ts` (`MAIN_MAP`, `KITCHEN_MAP`, `BATH_MAP`, their legends and props), `src/game/decor-data.ts`, `src/game/poses.ts`, `scripts/sprites.mjs` and `scripts/sprite-lib.mjs`.
- Rendered (outside the repo, in the session scratchpad, never committed) and **viewed**: furniture of the main room (table, desk, chair, bookshelf, nightstand, radiator, mic stand, sofa, lamp table, record stand, guitar variants, stool, front door, delivery box, rug); the beds and the two sleeping poses; kitchen and bath pieces; decor (lamps, plants, paintings, the ten art prints, the gallery wall strip); windows, doorways, floors and all wall tiles; the HUD icons; the doing poses and held items; the four outfits (idle and both walk frames, four directions each); the five `view-*` pictures. Also the repo's own room mockups (`scripts/main-room-mockup.mjs`, `scripts/room-mockup-kitchen-bath.mjs`, `scripts/walk-preview.mjs`, output in git-ignored `art/`) to see each piece in its room.
- Measured with a small script: size, colours used, and how much of each sprite's outer edge is ink (`1`). The pipeline already rejects colours outside the 22-colour palette, so palette use is clean everywhere; the real question is outline weight.
- **Not checked:** how it looks in the running game at 1.0x to 1.67x on a phone (judged from 4x to 12x sheets and from the small-feature sizes), and light direction on every sprite (judged on a sample: furniture, sofa, counter, bed, lamps, plants; the wall tiles and floors are flat patterns).

## Marc's rule against the written rule
**Marc's rule (2026-10-27):** pieces against the **south wall** (the bottom wall on screen) are best drawn **nearly top-down** (the sofa, the kitchen counter, the stove). **Everything else** is drawn **diagonally from the top and front** (a front face with a good band of the top surface).

**The written rule** (`docs/art-style.md`, Perspective): all furniture is "front-on with a visible top slice", with the sofa the only mention of "from behind and above". It does not tell the artist what to do on the south wall, on side walls, for floor-standing pieces in the middle, or for things that sit on top of other pieces.

**What the sprites actually do:** the maps and sprites already follow Marc's rule in the best-looking places (sofa, counter, stove) and break it in a handful of small pieces. Also, the real drawings use **three** classes, not two: near top-down, diagonal (top and front), and front-on (fridge, vanity, mic stand, radiator, pantry). Several large pieces on **non-south** walls are near top-down (bed, bookshelf, tub, toilet, desk chair), and the written rule would have called them wrong.

**Recommendation for `docs/art-style.md` (Perspective section):**
1. Replace "furniture is front-on with a visible top slice" with the two-part rule: **south-wall pieces (the wall at the bottom of the screen, the one the viewer looks at from behind) are near top-down, seen as if from behind and above; every other piece is diagonal from the top and front**, with the top surface taking roughly a third to a half of the height and the front face the rest.
2. Name the allowed exceptions: very large flat things (bed, rug, tub) and things stood on end as dividers (the bookshelf) may stay near top-down because that is how they read at 1x; wall hangings and things fixed flat to a wall (windows, radiator, front door, paintings, hood) are drawn face-on; the player and anything held keeps the "slight downward tilt" rule.
3. Say how to decide a piece's class: **by the wall it stands against in the map** (south wall means the `#` row directly below the piece), not by what it is; a piece at the end of a south-wall run, like the lamp table, follows the run unless noted. A piece that can be swapped into a south-wall slot (a decor lamp for the lamp table) must be drawn for that slot.
4. Say that things placed **on** a piece take the piece's class (a plant on the top-down bookshelf, a mug on the diagonal table).
5. Add a short "south wall" and "diagonal" example sprite for each, naming `sofa-td`, `counter`, `stove` and, for diagonal, `table` and `desk`.
6. Correct the stale lines in the reuse table (see "Doc housekeeping" below).

## Where each piece stands (the map facts)
- **Main room** (`MAIN_MAP`): north wall (top): table, mic stand, desk (and its chair just south of it), bookshelf (stands out from the wall, 1x4), nightstand, three paintings. East wall: radiator, two windows, bed's east edge. West wall: the doorway pair, guitar. **South wall** (stepped): sofa (rows 5-6), lamp table (at the east end of the sofa, where the wall steps down: the tile directly below it is floor, so it is on the sofa's run but not directly against the wall), record stand (wall directly below), front door (decoration, in the wall), and the package spot `x` in front of the door. The bed fills the east end.
- **Kitchen** (`KITCHEN_MAP`): the bar's **south wall** (the wall above the bath) carries the counter with sink, the stove and the hood. North wall: bin, boxes, pantry (east end). West wall: curtain window. The leg's **south wall** has the **fridge** (rows 7-8, wall directly below).
- **Bath** (`BATH_MAP`): north wall: toilet, vanity. West wall: tub. East wall: door. Nothing stands against the bath's south wall.

## Perspective classes used below
**TD** near top-down (surface from above, a thin front slice); **DG** diagonal, top and front (the target for everything off the south wall); **FO** front-on (face with little or no top); **PR** profile or edge-on (side view, as the player's left and right); **FL** flat (wall tiles, floors, wall art, icons, view pictures).

## Furniture and fixtures
| Sprite | Size | Where | Footprint | Class | Matches the rule? | Verdict | Reason and other findings | Effort |
|---|---|---|---|---|---|---|---|---|
| `sofa-td` | 96x32 | main, south wall | 6x2 | TD (from behind, back rail near, cushions far) | Yes, the model piece | Keep | Outline complete; light from top-left on the oak arms. The sit and read poses are person-only overlays on it and fit | none |
| `lamp-table` | 16x16 | main, at the sofa's east end, beside the south-wall step (floor below it); decor slot `lamp-sofa` | 1 | DG leaning FO (shade seen from the side, table top a sliver) | **Borderline.** Not directly against the wall, but it sits in the sofa's row beside the south wall, and the written rule has no answer for it. Marc has flagged it | **Redraw** (with the other lamps) | Marc already noticed. Redraw near top-down so it sits with the sofa (decision 4). Outline only 71 % closed; shade and base read well at 1x | S, a few lamps |
| `record-stand` | 16x16 | main, south wall | 1 | DG (turntable top from above, crate front) | Partly (needs more top) | Adjust | Crate is front-on, deck is from above; looks fine at 1x. The style doc says 16x48, the file is 16x16 | S |
| `guitar` | 16x16 | main, south wall, col 1 row 6 (issue 107) | 1 | DG | Diagonal, no stand | Keep | Profile like the player facing right; 90 % ink edge. Variants `guitar-nylon`, `guitar-tall`, `guitar-nylon-tall` are unused | none |
| `front-door` | 32x16 | main, south wall | 2x1 (wall piece) | FO / FL | Yes (a wall face is face-on) | Keep | Layers of paint, no text. From this camera the south wall's face is rarely seen, so check it reads as a door at 1x | none |
| `delivery-box` | 16x16 | main, floor in front of the front door (south wall) | 1 | DG | **No** (south wall) and it has **no ink outline at all** (0 % of its edge is `1`) | **Redraw** | Only sprite among the pieces that breaks the outline rule | S |
| `desk-chair` | 16x16 | main, just south of the desk (middle of the room) | 1 | TD (flat striped seat, a frame) | **No** (not on the south wall, should be DG) | **Redraw** | Marc already noticed. It is also as big as the player; only 54 % ink edge. `player-type-desk` draws the chair from above too, so it must be redone with it | S |
| `table` | 64x32 | main, north wall | 4x2 | DG (items on top seen from above, apron and legs front) | Yes | Keep | Good model for DG. Microwave, grinder, kettle, dripper readable | none |
| `table-plate` | 64x32 | main, north wall (variant) | 4x2 | DG | Yes | Keep | Same frame as `table`; check the plate is the only change | none |
| `mug-table` | 16x16 | prop on the table | 1 (37 px) | DG | Yes | Keep | Small: at 1.0x it is a few orange pixels; fine as a detail | none |
| `desk` | 64x32 | main, north wall | 4x2 | DG | Yes | Keep | Laptop and monitor read; steel legs | none |
| `mic-stand` | 16x32 | main, north wall gap | 1x2 | FO (pole, tripod) | Acceptable (thin object, class barely shows) | Keep | Only about half of its edge is ink (a pole; natural). `mic-stand-vintage` is an unused variant | none |
| `bookshelf` | 16x64 | main, stands out from the north wall | 1x4 | TD (oak top, items on it, south end as the front slice) | Not DG, but an exception (a tall column seen end-on) | Keep, document the exception | The face-on version is `view-bookshelf`, unused. The plant on top is drawn front-on (see Plants) | none |
| `nightstand` | 48x16 | main, north wall | 3x1 | DG leaning FO | Yes | Keep | `phone-charger` prop (16x16, 48 px, 54 % ink) is a tiny overlay at x 18, y 0 | none |
| `bed-made` / `bed-unmade` | 80x96 | main, east end | 5x6 | TD (headboard at top, pillows, duvet from above) | Not DG; large flat object, exception | Keep, document the exception | Unmade is 94 % ink edge. The duvet's folds and stripes are clear. If the bed were redrawn DG it would need a front slice and a new pair of sleeping sprites | L if ever |
| `radiator` | 16x48 | main, east wall, in front of the upper window | 1x3 | FO (a front face, narrow) | Exception: wall fixture. On a side wall a face-on drawing is not what the camera would see | Keep, decide | Decision 2 below | S |
| `window-blinds`, `-open`, `-closed`, `window` | 16x32 | main, east wall (two windows) | 1x2 | FL / edge-on | Yes | Keep the open and closed; `window-blinds` is only the object's default and is never drawn (the closed variant has no condition); `window` is unused | Remove or keep as fallback | none |
| `window-curtain` | 16x32 | kitchen, west wall | 1x2 | FL | Yes | Keep | 46 % ink edge, soft by design | none |
| `counter`, `dishes-0..3` | 48x32 | kitchen, south wall of the bar | 3x2 | TD | **Yes, the model piece** | Keep | The four dishes states share the frame; each edge is fully ink | none |
| `stove` | 48x32 | kitchen, south wall of the bar | 3x2 | TD (burners above, oven doors below) | Yes | Keep | Oven face is front-on in the lower half; reads well | none |
| `hood` | 48x16 | kitchen, on the south wall under the stove | 3x1 | FL / FO | Yes | Keep | A wall piece | none |
| `fridge` | 32x32 | kitchen leg, **south wall** | 2x2 | FO (doors front-on, a thin top with the humidifier) | **No** (south wall, should be TD) | **Redraw** | The only large south-wall piece still front-on. It should show its top (humidifier, items) and the doors small | M |
| `bin` | 16x16 | kitchen, north wall | 1 | DG leaning FO | Yes | Keep | 95 % ink edge | none |
| `boxes`, `boxes-flat`, `boxes-gone` | 16x16 | kitchen, north wall | 1 | DG | Yes | Keep | `boxes-gone` is empty on purpose | none |
| `pantry` | 16x32 | kitchen, east wall | 1x2 | FO (clear bins, front) | Close; reads as a front view on a side wall | Keep, decide | Decision 2 | S |
| `toilet` | 32x32 | bath, north wall | 2x2 | TD (tank at the top, bowl from above) | Not DG | Adjust, low priority | Reads well; tank is front-on, bowl from above (a mix). 100 % ink edge | S |
| `vanity` | 32x32 | bath, north wall | 2x2 | FO (mirror, cabinet doors) | Roughly DG; has no top slice | Adjust, low priority | Adding a counter top band would make it match | S |
| `tub` | 32x64 | bath, west wall | 2x4 | TD (long edge facing the player) | Exception: large flat object | Keep | 65 % ink edge on the side that meets the wall; fine | none |
| `stool`, `stool-lamp` | 16x16 | decor only (`stool-lamp` is a gift lamp; `stool` is a test item) | 1 | TD (round seat from above) | Depends on the slot (same as the lamps) | Decide with the lamps | If the stool-lamp goes in the south-wall lamp slot, TD is right; the other lamps should match it | S |
| `rug` | 16x16 | not used (only `scripts/room-mockup.mjs`) | n/a | FL | n/a | Delete or keep unused | Duplicate of an old mockup idea; no map uses it | none |

## Wall art and decor items
| Sprite | Size | Where | Class | Matches? | Verdict | Findings |
|---|---|---|---|---|---|---|
| `painting`, `painting-desk`, `painting-wide` | 32x16, 32x16, 48x16 | main, north wall (three decor slots) | FL (face-on on the wall) | Yes | Keep | Full ink edge; no text |
| `art-robin`, `art-concert-poster`, `art-snow-wagon`, `art-serenity-now`, `art-canoes`, `art-great-wave`, `art-starry-night`, `art-water-lilies`, `art-sunflowers` | 32x16 | gifts for the three wall slots | FL | Yes | Keep | All impressions; **no readable text or signatures** in the sheet. Sunflowers is narrow in its slot (centred), as decided in 076. Edge ink 97 to 100 % |
| `painting-robin` | 16x16 | unused (kept for a possible cutscene) | FL | n/a | Delete or keep unused | The robin print is `art-robin` now |
| `gallery-wall` | 96x16 | not placed (south wall face is never visible) | FL | n/a | Keep unused, or delete | Same ten pieces as `view-gallery-wall`. 87 % ink edge |
| `lamp-warm`, `lamp-candle` | 16x16 | gifts for slot `lamp-sofa` | DG leaning FO (shade side, candle side-on) | Borderline (the slot is at the sofa's east end, see `lamp-table`) | **Redraw** with `lamp-table` | Shade tones and candle fine; 64 to 66 % ink |
| `plant-0..3`, `plant-wilted`, `plant-dried` | 16x16 | prop on the bookshelf top (`plant-shelf`) | DG to FO (pot front, leaves upright) | **Clash:** the shelf top is TD, the plant is seen from the front | Adjust | Same pot and rim across stages (good). Leaves are only 25 to 53 % ink-edged: the outline rule is not followed here. At 1x they are readable. Lower priority |

## Characters and poses
| Group | Sprites | Class | Matches? | Verdict | Findings |
|---|---|---|---|---|---|
| Walking, four outfits | `player-<outfit>-idle/walk-<dir>[-n]` (home has no outfit word), 16x16 x 4 sets of 12 | front/back/profile with a slight downward tilt | Yes | Keep | The four outfits share silhouette and head; only clothes differ. Edge ink 91 to 96 %, walk frames within 6 px of idle. Left/right are mirrors, walk-2 mirrors walk-1 for down and up by design, so every file exists. Frames are consistent; no gaps found. Flannel check is busy at 1x but readable |
| Doing poses | `player-sit-sofa` 16x32, `player-read-sofa` 32x32, `player-type-desk` 16x32, `player-eat-table` 16x32, `player-guitar` 32x48 | from behind or above, drawn over their furniture | Yes for the sofa; type and eat show the chair and stool from above | Keep | `type-desk` and `eat-table` draw the chair and stool TD. If `desk-chair` is redrawn DG, `player-type-desk` must be redone; if `stool` changes, `player-eat-table` too |
| Sleeping | `player-sleep-bed`, `player-sleep-bed-unmade` | TD, full bed | Follows the bed | Keep | Must be redone if either bed is redrawn |
| Held items | `held-mug/laptop/book/guitar-<dir>`, 16x16 | small overlays in the player's cell | Yes | Keep | Tiny (a handful of pixels) but only meant as an overlay. `held-guitar-*` are drawn by `heldSprite`, but the guitar task uses the `player-guitar` pose, so they are likely never seen: confirm |

## Tiles
| Group | Sprites | Class | Verdict | Findings |
|---|---|---|---|---|
| Floors | `floor-wood`, `floor-kitchen`, `floor-bath` | FL | Keep | Palette use is warm and consistent with the walls. `floor-tile` is unused (the bath uses `floor-bath`) |
| Walls | `wall-back/front/side-left/side-right` x main, `-kitchen`, `-bath` | FL; side walls edge-on, lit top face about 3 px | Keep | Light from top-left shows on the back and left faces. The shadow strip is on the side tiles, as written. Wall tile edges are 30 to 57 % ink; that is part of the design |
| Doorways | `doorway`, `-left-kitchen`, `-right-kitchen`, `-right-bath` | FL, open passages | Keep | Zero ink, intentionally, so the gap reads |

## Icons and views
| Sprite | Size | Where | Verdict | Findings |
|---|---|---|---|---|
| `icon-star/sun/dusk/moon/bolt/bolt-low/face-*` | 7x7 | HUD ribbon | Keep | Flat, no ink outlines (by design); legible at 1x when drawn at 2x or more in the HUD |
| `icon-good-hour` | 9x9 | popups | Keep | Has an ink outline; the others do not (inconsistent, but harmless) |
| `icon-phone`, `icon-plug` | 7x7 | **not drawn** (the battery indicator replaced them) | Delete or keep unused | Listed in the issue; confirmed unused in `src` |
| `view-gallery-wall` | 320x192 | admire art | Keep | No text; ten pieces; the room's gallery |
| `view-side-project` | 320x192 | side-project view | **Adjust** | It contains a tiny picture of the game with the **readable HUD words** "COMBO X1.0" and others, and an older layout of the room. It is the game's own text, not names, but the rule says no readable text. Redraw the screen as plain shapes, or accept it as a joke |
| `view-ad-email/-social/-text` | 320x192 | encounter templates | Keep | Palette-only templates with grey lines for text (no words) |
| `view-bookshelf` | 16x64 | not drawn | Keep unused or delete | Reserved for "face the bookshelf" |

## Mismatch list (short)
| Piece | Place | What is wrong | Proposed fix |
|---|---|---|---|
| `lamp-table`, `lamp-warm`, `lamp-candle` (and `stool-lamp`) | sofa's east end by the south-wall step, slot `lamp-sofa` (not directly on the wall) | Drawn front/top-side; Marc flagged it; the sofa row is near top-down | Redraw as a set, near top-down, same table |
| `desk-chair` | under the desk (middle of the room) | Drawn top-down, should be diagonal; as big as the player | Redraw diagonal; redo `player-type-desk` |
| `fridge` | kitchen leg, south wall | Front-on, should be near top-down | Redraw with a top slice that dominates |
| `delivery-box` | south wall, in front of the door | Diagonal and has no outline | Redraw near top-down with an ink outline |
| `record-stand` | south wall | Mixed diagonal | Adjust (more top) |
| `plant-*` on `bookshelf` | north wall | Plant is front-on on a top-down shelf | Adjust so the pot is seen from above, or accept |
| `bed-*`, `bookshelf`, `tub`, `toilet` | non-south walls | Top-down, not diagonal | Decide: write them as exceptions (recommended) |
| `radiator`, `pantry` | side walls | Face-on | Decide: wall-fixture exception |
| `view-side-project` | view | Readable HUD text | Replace with plain shapes |
| plants, `phone-charger`, `lamp-*` | many | Less than 75 % of the outer edge is ink | Outline pass |

## Other findings, across all pieces
- **Palette:** every sprite uses only the 22 palette keys (the pipeline checks it). The materials table is followed: oak on desk and shelf, walnut on the table and sofa frame, steel on stove and fridge.
- **Outline weight:** furniture and art are 1 px ink all round except those listed above. Walls, floors, doorways and icons are not outlined, on purpose.
- **Light and shadow:** highlights on top and left throughout the sampled sprites; no cast shadows except the side-wall strip, as the style guide says.
- **Scale:** one tile is about the player's width, so `desk-chair`, lamps and the stool are as big as the player; they read as chunky, which is the game's look.
- **Readability at 1.0x to 1.67x:** the smallest details are the mug, the charger, the mic pole, the HUD icons and the leaves. They survive because they are single tones with a dark edge; the 7x7 icons are the limit.
- **Text and signatures:** none in the sprite sheets, except the HUD words in `view-side-project`.
- **Animation frames:** walk cycles and variants are consistent in size and silhouette; `dishes-0..3`, the beds and the plant stages share one frame.
- **Unused or duplicate:** `window`, `window-blinds` (default only), `floor-tile`, `rug`, `painting-robin`, `gallery-wall`, `guitar-nylon`, `guitar-tall`, `guitar-nylon-tall`, `mic-stand-vintage`, `view-bookshelf`, `icon-phone`, `icon-plug`, `stool` (test item only), and probably `held-guitar-*`.
- **Doc housekeeping:** `docs/art-style.md` still says `bed-made` is a placeholder, lists `record-stand` as 16x48 and the fridge as 32x96 to trim, and says everything is front-on. Fix when the perspective rule is rewritten.

Coverage note: rows give groups for runs of names (`dishes-0..3`, `plant-0..3`, `player-<outfit>-...`, `held-*`, `wall-*`, `icon-*`, `view-ad-email/-social/-text`).

## Overall verdict
**Adjust, with a short redraw list.** The art is consistent in palette, outline, lighting, scale and animation; the main inconsistency is perspective, and it is concentrated in about a dozen small or medium pieces (lamps, chair, fridge, delivery box, record stand, plants). The big pieces already follow Marc's rule or can be written as exceptions. Nothing needs a wholesale redraw.

## Decisions for Marc (ordered; the planner asks one at a time)
**A. The rule**
1. Adopt the rule "south wall near top-down; everything else diagonal from the top and front" in `docs/art-style.md`, with the exceptions for large flat things and wall fixtures? Recommend yes.
2. Wall fixtures on a side wall (radiator, pantry, windows): face-on, or edge-on? Recommend face-on, written as an exception.
3. Big flat pieces off the south wall (bed, tub, toilet, bookshelf): keep near top-down and write them as exceptions? Recommend yes; redrawing the bed also means redoing both sleeping sprites.

**B. South wall (redraw to near top-down)**
4. The lamp slot sits at the sofa's east end, beside the south-wall step but with floor below it. Should it count as a south-wall piece (near top-down, like the sofa) so the lamps are redrawn as one set? Recommend yes: it reads as part of the sofa group.
5. Redraw the `fridge` near top-down? Recommend yes.
6. Redraw the `delivery-box` near top-down with an outline, and give `record-stand` more top? Recommend yes.

**C. Diagonal pieces**
7. Redraw `desk-chair` diagonal, and redo `player-type-desk` to match? Recommend yes.
8. Make plants seen from above-front on the bookshelf (the pot from above)? Recommend adjust, low priority; accept as is otherwise.
9. Add a top band to the `vanity`, and a front-leaning `toilet`? Recommend skip.

**D. Consistency**
10. Outline pass on plants, lamps and the phone charger? Recommend yes, folded into the redraws.
11. `view-side-project`: replace the readable HUD words with plain shapes, or keep the joke? Recommend replace.
12. Delete the unused sprites (list above), or keep them? Recommend delete `window`, `floor-tile`, `rug`, `painting-robin`, `icon-phone`, `icon-plug` and `guitar-tall`/`guitar-nylon-tall`; keep `view-bookshelf`, `gallery-wall`, `guitar-nylon`, `mic-stand-vintage` as reserved.

**E. Follow-up issues (after the answers)**
Group the fixes as: rule and doc (A); south-wall pieces (B); chair and pose (C7); outline pass and cleanup (D). Each re-records the golden frames deliberately.

## Marc's answers
Asked one group at a time (2026-10-27 and 28):
1. **The rule (decisions 1 to 3): adopt it, with exceptions.** South wall pieces near top-down; everything else diagonal from the top and front. Exceptions: the big flat pieces off the south wall (bed, tub, toilet, bookshelf stay near top-down, so the sleeping sprites are not redone) and wall fixtures on side walls (radiator, pantry, windows stay face-on).
2. **South wall pieces (4 to 6): redraw all of them.** The four lamps as one near top-down set, the fridge near top-down, the delivery box near top-down with an ink outline, and the record stand with more top.
3. **Desk chair (7): yes, chair and pose.** Redraw the chair diagonal (a little smaller than the player) and redo the typing-at-the-desk player pose to match. Marc's note: he had never seen the chair pose, because the typing prompt covers it; the typing prompt's placement should be fixed so the pose can be seen (part of the chair issue).
4. **Cleanup (8 to 12): all of it.** The outline pass on plants, lamps and the phone charger (folded into the redraws), the plant pots seen from above (low priority), the side-project picture without readable HUD words, and deleting the unused sprites (window, floor-tile, rug, painting-robin, icon-phone, icon-plug, guitar-tall, guitar-nylon-tall; keep view-bookshelf, gallery-wall, guitar-nylon and mic-stand-vintage as reserved). Toilet and vanity: skip.
5. **The stove: leave it.** The planner re-rendered the stove and the counter at 8x: the stove is near top-down (a control panel strip with a row of knobs and a small display along the top, then a black cooktop with four burners in a 2 x 2 layout filling the rest; no oven door face and no hood are drawn), the same 3 x 2 size as the counter, whose matching strip is the wood cabinet fronts. The survey's note that the stove was 'a front-on oven face' was a misreading; the stove is a model piece for the rule.

Follow-up issues: the rule and doc (A), south wall pieces (B), chair, pose and typing prompt (C), cleanup (D).
