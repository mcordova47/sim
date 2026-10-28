# Art style guide

Rules for every sprite in the game. The palette lives in [art/palette.json](../art/palette.json) and is the single source of truth; the table below mirrors it.

> **Top-down rewrite, 2026-10-22.** The side-view rules (front elevations, 1 tile = 1 ft, jump-height scale) are in git history and the tag `side-view-prototype`. Everything below is for the top-down game.

## Room orientation
Marc's decision (2026-10-23): the main room is seen from the sofa side, looking toward the table, desk, bookshelf and bed wall. Pieces on the far (top) wall are drawn diagonally (the bookshelf and bed are the exceptions), with a band of top surface above the front face (see Perspective). The sofa sits on the near (bottom) wall and is drawn from behind and above. `sofa-td` was redrawn from the sofa photos in issue 047; `bed-made` and `bed-unmade` (80x96) are the real bed, not a placeholder.

## Perspective
Early Game Boy Pokemon: the camera looks at the room from slightly above and in front.
- **The rule (Marc, 2026-10-27, adopted 2026-10-28; the survey is `docs/asset-review.md`):** pieces that stand against a **south wall** (the wall at the bottom of the screen) are drawn **nearly top-down**, as if seen from behind and above: the top surface fills most of the sprite and the front shows only as a thin slice or not at all. **Every other piece is drawn diagonally from the top and front**: a front face with a good band of top surface, roughly a third to a half of the height. Old rule "all furniture is front-on with a top slice" no longer applies.
- **How to tell the class: by the wall the piece stands against in the room map, not by what it is.** A piece is on the south wall when the `#` wall row sits directly below its footprint (except long pieces on a side wall, like the tub, which take their long wall) (the sofa and the record stand in the main room, and the lamp table by the step; the counter and stove on the kitchen bar (the hood above the stove is a wall-line piece and stays face-on); the fridge in the kitchen leg). "South" is relative to the screen: the main room's bottom wall, the kitchen bar's bottom wall (the wall above the bath), the kitchen leg's bottom wall. In the bath only the tub's south end touches the south wall; it runs down the west wall and is an exception (below).
- **The lamp slot counts as south wall.** The lamp table (and every lamp that can be swapped into its slot, `lamp-sofa`) stands at the sofa's east end where the south wall steps down, so there is floor directly below it; it is part of the sofa group and is drawn near top-down like the sofa. A piece that can be swapped into a slot is drawn for that slot, so the four lamps share one view.
- **Things placed on a piece take that piece's class**: a plant on the near top-down bookshelf is drawn from above, a mug or kettle on the diagonal table is drawn diagonally.
- **The four classes, with the sprites that show them:**
  - **Near top-down (TD):** south-wall pieces. Models: `sofa-td` (96x32; the back rail on the near edge, two seat cushions beyond it), `counter` (48x32, the sink counter; a strip of wood cabinet fronts along the top edge and the worktop filling the rest, under `dishes-0..3`), and `stove` (48x32; a control strip with a row of knobs and a small display along the top, then a black cooktop with four burners in a 2 x 2 layout filling the rest; no oven door face and no hood are drawn). Counter and stove are the same size and sit side by side. They are the model pieces to copy.
  - **Diagonal (DG):** everything else that is not an exception below. Models: `table` (64x32; the top surface with the microwave, grinder, kettle and dripper on it, then the apron and legs) and `desk` (64x32; a wide oak top with the laptop and monitor, then two steel legs). Also `nightstand`, `bin`, `boxes`.
  - **Face-on (FO):** wall fixtures on side walls and things fixed flat to a wall: `radiator` (16x48), `pantry` (16x32, clear bins seen from the front), the windows (`window-blinds-open`, `window-blinds-closed`, `window-curtain`), paintings and gallery pieces, `front-door`, `hood`. Thin free-standing things where the class barely shows, such as `mic-stand` (a pole and tripod), are also drawn face-on. The `vanity` (mirror and cabinet doors) is face-on with no top band; it is accepted as is.
  - **Flat (FL):** floors, wall tiles, doorways, icons and the `view-*` pictures.
- **Exceptions (decided with Marc, 2026-10-28):** the big flat pieces that are not south-wall furniture keep their near top-down drawing (the tub is long along the west wall, so it counts as a west-wall piece): `bed-made` / `bed-unmade` (80x96; pillows on the north end, the duvet filling the rest), `tub` (32x64), `toilet` (32x32; a tank strip at the top, the bowl and seat below) and the `bookshelf` (16x64; stands out from the north wall as a divider, shown with its top and its south end). The sleeping poses follow the bed, so they are not redone. Wall fixtures on side walls (radiator, pantry, windows) stay face-on. These stay as they are; do not redraw them diagonal.
- **Not covered by the rule:** the player and anything held keep the slight downward tilt below. The unplaced `stool` and `rug` follow the nearest class and are not a target. The placed `guitar` hangs on the west wall and is drawn in profile (like the player facing right); it is a wall hanging, so it is left as is. `delivery-box` (on the floor in front of the front door) is a south-wall piece: near top-down.
- **Floors are flat patterns** seen from above. **The back wall** is front-on: a lit top slice, the wall face and a baseboard. **Side walls** are seen edge-on: an ink outline, a lit top face about 3 px wide and a shadow strip on the floor.
- **Characters are front-on** (down), back-on (up) or in profile (left, right) with the same slight downward tilt: you see the top of the head a little.
- **Overhang:** a sprite is `footprint rows + overhang rows`. The footprint is the tiles the piece blocks; the overhang is extra rows above it drawn over the tile behind. (`sofa-td` is 6x2 tiles with no overhang rows.) Draw order is by the bottom edge of the footprint: lower on screen is in front.
- **Scale:** how many tiles a piece covers is decided by the floor plan (issue 020). Until then, draw to the footprints in the reuse table below; one tile is a bit more than one person wide, not a real-world foot.

## Grid
- **Tile size: 16x16 px** (`TILE` in `src/game/config.ts`).
- Every sprite's width and height is a multiple of 16. The pipeline rejects anything else, except small UI icons named `icon-*` (such as `icon-good-hour`, 9x9), which are drawn at their own size in the HUD and popups, never on the grid.
- **The player is 16x16, one tile** (decided with Marc, 2026-10-22). No pipeline change was needed.
- The screen shows whole numbers of tiles and is only ever scaled by whole numbers, so pixels stay crisp.

## Palette (22 colors)
Characters are what you type in a `.sprite` file. `.` is transparent.

| Key | Name | Hex | Typical use |
|-----|------|-----|-------------|
| 1 | ink | #1a1a2e | outlines |
| 2 | night | #2b2d42 | background, deepest shadow |
| 3 | slate | #3b3e5c | background tiles, shadow |
| 4 | dusk | #6b6f94 | mid-tone grey/blue |
| 5 | mist | #a9adc9 | light grey, shading on white |
| 6 | paper | #edf2f4 | white, highlights |
| 7 | walnut | #4a2c2a | dark wood, shadow brown |
| 8 | oak | #7a4a35 | wood |
| 9 | tan | #b5835a | light wood, cardboard |
| a | cream | #e8c9a0 | skin, linen |
| b | brick | #d64550 | red accents |
| c | tangerine | #f08a4b | orange, coffee |
| d | butter | #f7d154 | yellow, light glow |
| e | fern | #2f6b4f | dark plants |
| f | leaf | #5fae6b | plants |
| g | teal | #3a9ca6 | water, appliances |
| h | denim | #4a78c2 | blue fabric |
| i | sky | #9fd3f0 | light blue, highlights on blue |
| j | plum | #7b5ea7 | purple accents |
| k | blush | #f2a7c0 | pink accents |
| l | putty | #cdc7b9 | warm light grey, plaster and drywall face |
| m | taupe | #a29b8c | warm mid grey, plaster shade and wall base band |

Only these colors may be used. To add one, edit `palette.json` and this table in the same change.

## Materials
Use the same palette keys for the same material everywhere, so sprites drawn by different people match. One light and one dark tone per material, plus the `1` outline.

| Material | Base | Light | Dark | Notes |
|----------|------|-------|------|-------|
| Light wood (oak, bamboo) | `9` | `a` | `8` | bookshelf, desk top, counter cabinets |
| Dark wood (walnut, red-brown) | `8` | `9` | `7` | dining table, sofa frame, record stand |
| White (appliance, porcelain, sheets) | `6` | `6` | `5` | toilet, vanity top, tub, pillows |
| Steel (fridge, stove, sink) | `5` | `6` | `4` | brushed metal; keep highlights on the top-left |
| Black plastic and metal | `3` | `4` | `2` | bin, stove burners, rods |
| Cardboard | `9` | `a` | `8` | boxes |
| Plants | `f` | `d` | `e` | leaves; pots use wood or `c` |
| Teal appliance, fabric accents | `g` | `i` | `4` | microwave, sofa geometric pattern |
| Red accents | `b` | `k` | `7` | sofa pattern, duvet stripes |
| Plaster and drywall (main room, kitchen) | `l` | `6` | `m` | stipple bumps use `6`; kitchen drywall is smooth |
| Wall and window light | `i` | `6` | `h` | window glass, curtains use `5` and `4` |

If a piece needs a colour that isn't here, pick the nearest palette key and say so in the issue's progress log instead of adding to this table; the planner folds additions in afterwards.

## Outlines
- 1 px outline in **ink** (`1`) around the outside of every object. No outline between two parts of the same object; use a shade change instead.
- No anti-aliasing, no semi-transparent pixels. Every pixel is a palette color or fully transparent.

## Lighting
- Light comes from the **top-left** (the window). Highlights go on top and left edges, shadows on bottom and right. The top slice of a piece is its lightest tone.
- **Shadows:** no cast shadows on the floor except the side-wall strip. A piece sits on the floor with its bottom outline; if it needs grounding, add one row of the darker material tone above the outline.
- Use one lighter and one darker tone per material at most; shading is flat, no dithering.

## Naming
- Lowercase kebab-case, enforced by the pipeline: `coffee-mug`, `loft-bed`. The filename (minus extension) is the name the game loads: `art/src/coffee-mug.sprite` becomes `public/sprites/coffee-mug.png`.
- **Variants:** `<name>-<variant>`: `bed-made`, `bed-unmade`, `kettle-on`.
- **Counts and stages:** `<name>-<n>`: `dishes-1`, `dishes-2`, `dishes-3` (a pile growing).
- **Plants (issue 063):** the snake plant on the bookshelf is its own 16x16 piece (a `Prop` in the `plant-shelf` slot, drawn at x 0, y 36 on the bookshelf, so it covers the bookshelf's top rows 36 to 51, south end) and not part of the `bookshelf` sprite, which shows bare oak there. Stages `plant-0` (sprout), `plant-1` (small), `plant-2` (full), `plant-3` (flowering) and `plant-wilted` (drooping, any stage): same pot and rim in every one, only the leaves change. Another plant is `<family>-0..3` and `<family>-wilted` at the same size.
- **Character frames:** `<character>-<state>-<direction>[-<frame>]` with direction `down`, `up`, `left`, `right`: `player-idle-down`, `player-walk-down-1`, `player-walk-down-2`. A walk cycle is two frames (left foot, right foot) alternating with idle. Left is generated as a mirror of right (and walk-2 of walk-1 for down and up), so every file exists and the game needs no flip.
- **Doing poses** (small scenes where the character sits, lies or plays, so they are bigger than 16x16): `player-sit-sofa` (16x32), `player-read-sofa` (32x32), `player-type-desk` (16x32), `player-eat-table` (16x32), `player-guitar` (32x48), `player-sleep-bed` and `player-sleep-bed-unmade` (both 80x96). Each is drawn over the real furniture, so it replaces the furniture's own pixels where it is drawn. Since issues 052 and 053 the sofa poses are **person-only overlays**: `player-sit-sofa` is one 16x32 column placed on the sofa's right-hand seat cushion (`at` x 61, so the person is centred on x 69 of `sofa-td`; the sofa's back rail and cushions show through; it is 32 tall, with an empty lower half, only so it draws in front of the sofa) and `player-read-sofa` is 32 wide with the book on its left half (`at` x 45). `player-type-desk` is the desk's lower row at x 32..47 (desk y 16) plus the chair tile (issue 100: the `desk-chair` drawn diagonal, 12 wide and 13 tall, a little smaller than the player, seen from behind and above with its striped back cushion and two legs, and the player's hair and shoulders over its top edge; the typing prompt keeps clear of this 16x32 picture); `player-eat-table` is the table's lower row at x 24..39 (table y 16) plus the stool tile south of it, the player seen from behind; `player-guitar` is the player standing north of the guitar, holding the hanging `guitar` drawing mirrored (dark oak body, ink outline, sound hole, headstock; neck east, right-handed) diagonally in the lap, a hand on the neck, the neck running out east over the tile beside them (col 2, row 4; issue 057), placed at x 0, y -16 from the guitar piece (it replaces both the player and the `guitar` sprite). **The sleeping poses are not overlays:** the covers are drawn over the whole bed, so each is the full 5x6 bed with the sleeper in it (hair and closed eyes on the west pillow, covers pulled up over connected shoulders and a body-shaped bulge down to the feet): `player-sleep-bed` is `bed-made` plus the sleeper and `player-sleep-bed-unmade` is `bed-unmade` plus the same sleeper. The pose names a `variants` list in `poses.ts` and the one for the `bedMade` state when the task starts is drawn. If you redraw `bed-made` or `bed-unmade`, redo the matching sleeping sprite.
- **Tiles:** `floor-<material>`, `wall-<kind>`, `rug`, `doorway`. Walls come in a set per room (issue 054): the main room's plaster is `wall-back`, `wall-front`, `wall-side-left`, `wall-side-right`; the kitchen's drywall and the bath's tile add `-kitchen` / `-bath`.

## Reuse audit of the 24 side-view sprites
Sorted for the top-down view. **Reuse:** use as-is (wall-mounted or flat). **Adapt:** the front face is good; add a top slice and trim the height to the planned footprint. **Redraw:** the side-view drawing does not work from above.

| Sprite | Size | Verdict | Why |
|--------|------|---------|-----|
| bed | 64x32 | Redraw | Side profile. Replaced by `bed-made` and `bed-unmade` (80x96, 5x6 tiles, near top-down; an exception to the rule, see Perspective). |
| bin | 16x16 | Done | Diagonal with a lid top; 1x1 tile. |
| bookshelf | 16x64 | Redraw | Issue 047: top-down, the oak top with the plant, books, bowl and vase on it and the shelf's south end as the front slice (1x4 tiles). The face-on drawing with the book spines is kept as `view-bookshelf` (see below). |
| boxes | 16x16 | Redraw | A stack seen from the side; drawn as a 16x16 box with a top face. Three states (stack, flat, gone = empty). Issue 072: no pantry tub in it any more. |
| pantry | 16x32 | New (issue 072) | Clear bins with navy lids and a yellow lid on the lowest, pantry food piled on top, from the photo. No labels. |
| counter | 48x32 | Done | Near top-down (3x2 tiles, the south-wall model with `stove`): wood cabinet fronts along the top edge, the worktop and sink below. `dishes-0..3` share the frame. |
| desk | 64x32 | Done | Diagonal (4x2 tiles): the top surface with the laptop and monitor, steel legs below. |
| fridge | 32x32 | Redrawn near top-down (issue 099) | 2x2 tiles on the kitchen leg's south wall. Today: a thin top strip (humidifier, items) over front-on steel doors, so it breaks the rule; to be redrawn near top-down. |
| gallery-wall | 96x16 | Redraw | Issue 036, redone in 034 from the close-ups: the ten pieces in their real arrangement as a 6x1 strip on the south wall face (`wall-front` colours). Not placed on the map: from this camera the south wall's face is never visible; it is shown by the admire-art view (`view-gallery-wall`, issue 040). |
| guitar | 16x16 | Redraw | Issue 047, redone after the playtest: 1x1 tile, in profile like the player facing right (headstock west on a wall hanger, neck east, body east with its face skewed up and its side below). Placed as a single `G` tile at col 1, row 5 of the main room (issue 044). |
| hood | 48x16 | Reuse | Wall-mounted, 3x1 tiles, face-on. |
| mic-stand | 16x32 | Redraw | Issue 056: bluebird-style mic (about 9 px) on a thin pole and tripod, to real proportions; `mic-stand-vintage` is an unplaced variant with the vintage slatted mic. 1x2 tiles. Placed at col 5, rows 1-2 of the main room, between the table and the desk (issue 044). |
| player-idle, -walk-1..4, -jump, -fall, -task | 16x16 | Redraw | Side-view poses. Replaced by the `player-<state>-<direction>` set (issue 030); the old files are removed. |
| record-stand | 16x16 | Redrawn near top-down (issue 099) | 1x1 tile on the main room's south wall: turntable deck from above over a front-on crate. Gets more top. |
| sofa-arm | | Deleted | Issue 034: `sofa-td` already has its arms, and the floor plan has a plain 6x2 sofa. |
| sofa | 96x32 | Done | `sofa-td` (6x2 tiles), the south-wall model. |
| spice-rack | | Deleted | Issue 034: a side-view piece the floor plan never uses. If a wall rack by the hood is wanted later, draw it new from the kitchen photos. |
| stove | 48x32 | Done | Near top-down (3x2 tiles, a model piece): control strip with knobs and display, four burners filling the rest. No oven face. |
| table | 64x32 | Done | Diagonal (4x2 tiles): the tabletop with the coffee items on it, apron and legs below. `table-plate` is the variant with the dinner plate. |
| toilet | 32x32 | Done | Tank strip over a bowl seen from above; an exception (near top-down off the south wall). |
| tote | | Removed (issue 072) | The kitchen tote bag was taken out. |
| tub | 32x64 | Done | 2x4 tiles, seen from above down the west wall; an exception. |
| vanity | 32x32 | Done | Mirror over cabinet doors, face-on; accepted without a top band. |
| window-blinds, window-curtain | 16x32 | Reuse | 1x2 tiles; face-on fixtures. `window-curtain` is the kitchen's west wall; `window-blinds` is the object default (the open and closed variants below are what is drawn). |
| window-blinds-open, window-blinds-closed | 16x32 | New | Issue 036: the two states of `window-blinds` (raised, showing glass; lowered, tan slats edge to edge). Same size and frame, so either can replace it. |
| icon-phone, icon-plug, phone-charger | 7x7, 7x7, 16x16 | New | Issue 088: the phone (a phone, never a battery shape) and plug icons for the HUD ribbon, and a small phone-on-charger prop drawn over the nightstand at x 18, y 0. |
| painting, painting-desk, painting-wide | 32x16, 32x16, 48x16 | Redraw | Issue 036: abstract impressions of the real prints over the table (barn drawing, cream frame), the desk (gold and orange abstract, walnut frame) and the nightstand (small green print in a wide white mat). |

Also redrawn or added in issue 034, from the new reference photos: `painting` (the barn drawing), `painting-desk`, `painting-wide` (the silkscreen over the bed), **`painting-robin`** (new, 16x16, not placed: in the real room it hangs on the west wall, off camera, so it is kept in `art/src` only for a possible future cutscene; removed from the map in issue 056), `front-door` (white, many layers of paint, chipped), `lamp-table` (drawn with a visible top, not side-on), `table` (coffee station, the teal microwave with its pile of mail, the mug), `desk-chair` (the wooden armchair with striped cushions), `bookshelf` (cubes, book spines, records, drawers, a plant on top), `fridge` (steel doors, a humidifier and a tote on top) and **`stool`** (new, 16x16, not placed on purpose: it could appear only for guitar playing or recording). The four `doorway*` sprites are now open passages, not doors (see Doorways).

Added in issue 047: **`guitar-nylon`** (16x16, the same profile as `guitar`, drawn from the nylon-string photo: pale top, reddish sides, slotted headstock; not placed, a possible alternate or second guitar) and **`view-bookshelf`** (16x64, the old face-on cube shelf with its book spines, for a possible future "face the bookshelf" view where you pick out a book; not drawn into the room). `radiator` is now drawn three tiles long in the first three tiles of its 1x4 footprint (the fourth tile is empty); a 1x3 map footprint and a 16x48 sprite are proposed in the 047 log. `table` has the microwave at the west end and the dripper on its scale at the east end, as in the photos. `sofa-td` has two seat cushions, an oak back rail and oak arms, drawn from behind: the back rail and its fabric panel are on the near (bottom) side and the cushions lie farther away. `painting` (the barn) is reduced to a few shapes, and the picture in `painting-wide` is centred in its frame.

Added in issue 074 (art for the first gifts of issue 043; not registered or placed yet, stage A does that): **`art-robin`** (32x16, Marc's robin print), **`art-concert-poster`** (see below), **`lamp-warm`** (a conical tangerine shade on a brick ceramic base) and **`lamp-candle`** (a candle in a green votive), both 16x16 on the same small table as `lamp-table`, and **`plant-dried`** (dried flowers in a turned wooden vase, 16x16, the same cell and base line as `plant-0..3`). The gallery-wall copies drawn in 074 (silver landscape, green still life, dark animal, white building and the six small gallery pieces) were deleted in issue 076: those pieces already hang on the gallery wall, and a painting must not be in two places.

Issue 076 (Marc's rule: every additional artwork is real, either his own piece or a famous public-domain work): **`art-concert-poster`** redrawn (unframed paper, a dark gig-poster impression with no text, from poster examples 1 to 7), and **`art-snow-wagon`**, **`art-serenity-now`** and **`art-canoes`** from Marc's own unhung pieces (no text, loose impressions), and **`art-great-wave`** (Hokusai), **`art-starry-night`** (Van Gogh), **`art-water-lilies`** (Monet) and **`art-sunflowers`** (Van Gogh), impressions of public-domain works. All 32x16, for the table and desk wall slots (the paintings in tall frames are centred in the slot, the rest fill it). Look at them with `npm run sprites -- --sheet=art-,lamp-,plant-dried` and `node scripts/gifts-mockup.mjs` (writes `art/mockup-gifts.png` at 4x and `art/mockup-gifts-1x.png`).

Issue 034 deleted `sofa-arm` and `spice-rack`. The verdicts above are from the side-view audit; the sizes and notes were brought up to date for the current sprites in issue 098.

## Doorways
Marc does not read door leaves at this size, so every doorway is an **open passage** (issue 034): the floor of the room you are in carries through the wall tile, and the floor of the next room shows in the thickness of the wall. `doorway` is the main room's west wall (wood, with the kitchen's stone in the wall), `doorway-right-kitchen` is the kitchen's east wall, `doorway-left-kitchen` is the kitchen leg's west wall (bath tile in the wall) and `doorway-right-bath` is the bath's east wall. The wall tiles above and below end flat, so the gap reads at 1x. The front door is decoration and is drawn white, painted over many times.

## Samples in the repo (for approval)
`floor-wood`, `floor-tile`, `rug`, `wall-back`, `wall-side-left`, `wall-side-right`, `doorway` (the tileset); `sofa-td` and `bed-made`; `player-idle-down` and `player-walk-down-1` (the character, 16x16). Run `npm run sprites -- --sheet=floor-,rug,wall-,doorway,bed-,sofa-td,player-idle-down,player-walk-down` and `node scripts/room-mockup.mjs`, then open `art/contact-sheet.png` and `art/room-mockup.png`. Left-over rules from the side view (outline, palette) are unchanged. Furniture batches are not drawn until Marc approves this look.

## Source format
Plain text, one file per sprite in `art/src/`:

```
# optional comment lines start with #
size: 16x16
................
...111111111....
```

The first non-comment line is `size: WxH`, followed by exactly H rows of exactly W characters.

## Workflow
1. Edit or add `art/src/<name>.sprite`.
2. `npm run sprites` validates and renders to `public/sprites/` plus `art/contact-sheet.png` (4x upscale on a checkerboard). Add `-- --sheet=prefix,prefix` to put only matching names on the sheet. `node scripts/room-mockup.mjs` composes a sample room into `art/room-mockup.png` (also not committed). Look at both before committing.
3. `art/contact-sheet.png` is a generated review aid and is not committed (it is gitignored), so branches don't conflict on it. Don't `git add -f` it. The script prints where it wrote it.
4. The script fails, writing nothing, if a sprite has an unknown color, a wrong row width or height, or a size that is not a multiple of the tile, or a name that is not lowercase kebab-case.
5. In the game, `sprites.draw(ctx, "name", x, y)` (see `src/render/sprites.ts`). A missing file draws a red rectangle labeled with its name. To swap in hand-made art, drop a PNG of the right size at `public/sprites/<name>.png` and skip the source file (the script only overwrites PNGs that have a `.sprite` source).

## The player (issue 030, home outfit)
`player-idle-<dir>`, `player-walk-<dir>-1`, `-2` for `down`, `up`, `left`, `right`, all 16x16, plus the doing poses `player-sit-sofa`, `player-type-desk`, `player-guitar`, `player-read-sofa`, `player-sleep-bed`, `player-sleep-bed-unmade`, `player-eat-table` at the sizes listed under Naming. Colors: hair `8` with `9` and `7`, skin `a`, t-shirt `h` with `i`, sweatpants `4`, outline `1`. A walk frame differs from idle by the whole figure dipping one row, the legs spreading with one foot lifted, and the arms swinging, so it reads at 1x. Play the cycle idle, 1, idle, 2. `node scripts/walk-preview.mjs` writes `art/walk-preview.png` (the cycle at 1x and 6x, all directions). The other outfits in `docs/character-brief.md` are drawn (issue 034) as `player-casual-...` (fern-green sweater, jeans), `player-out-...` (red flannel with a two-colour check, corduroy) and `player-pajamas-...` (teal top, plum bottoms, a hair tuft or two), for all idle and walk frames and all four directions (36 sprites). Held items are separate 16x16 overlays drawn over the player in the same cell: `held-<mug|laptop|book|guitar>-<down|up|left|right>`. In the side profile the nose that read as a beak was flattened (the face front is now a straight edge). Judge the poses and overlays in the game at 1x once something draws them.
