# Art style guide

Rules for every sprite in the game. The palette lives in [art/palette.json](../art/palette.json) and is the single source of truth; the table below mirrors it.

> **Top-down rewrite, 2026-10-22.** The side-view rules (front elevations, 1 tile = 1 ft, jump-height scale) are in git history and the tag `side-view-prototype`. Everything below is for the top-down game.

## Room orientation
Marc's decision (2026-10-23): the main room is seen from the sofa side, looking toward the table, desk, bookshelf and bed wall. Pieces on the far (top) wall are drawn front-on with a visible top slice. The sofa sits on the near (bottom) wall and is drawn from behind and above. The sample `sofa-td` and `bed-made` are placeholders, to be redrawn from new photos in the furniture batches.

## Perspective
Early Game Boy Pokemon: the camera looks at the room from slightly above and in front.
- **Furniture is drawn front-on with a visible top slice.** You see the front face of a piece (a fridge's doors, a sofa's seat) and a thin band of its top surface above it. Pieces against the back wall look like they are standing against it.
- **Floors are flat patterns** seen from above. **The back wall** is front-on: a lit top slice, the wall face and a baseboard. **Side walls** are seen edge-on: an ink outline, a lit top face about 3 px wide and a shadow strip on the floor.
- **Characters are front-on** (down), back-on (up) or in profile (left, right) with the same slight downward tilt: you see the top of the head a little.
- **Overhang:** a sprite is `footprint rows + overhang rows`. The footprint is the tiles the piece blocks; the overhang is extra rows above it (a tall fridge, a sofa back) drawn over the tile behind. The sofa is 2x2 tiles with a 2x1 footprint. Draw order is by the bottom edge of the footprint: lower on screen is in front.
- **Scale:** how many tiles a piece covers is decided by the floor plan (issue 020). Until then, draw to the footprints in the reuse table below; one tile is a bit more than one person wide, not a real-world foot.

## Grid
- **Tile size: 16x16 px** (`TILE` in `src/game/config.ts`).
- Every sprite's width and height is a multiple of 16. The pipeline rejects anything else.
- **The player is 16x16, one tile** (decided with Marc, 2026-10-22). No pipeline change was needed.
- The screen shows whole numbers of tiles and is only ever scaled by whole numbers, so pixels stay crisp.

## Palette (20 colors)
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

Only these colors may be used. To add one, edit `palette.json` and this table in the same change.

## Materials
Use the same palette keys for the same material everywhere, so sprites drawn by different people match. One light and one dark tone per material, plus the `1` outline.

| Material | Base | Light | Dark | Notes |
|----------|------|-------|------|-------|
| Light wood (oak, bamboo) | `9` | `a` | `8` | bookshelf, desk top, counter cabinets |
| Dark wood (walnut, red-brown) | `8` | `9` | `7` | dining table, sofa frame, record stand |
| White (appliance, porcelain, sheets) | `6` | `6` | `5` | toilet, vanity top, tub, pillows |
| Steel (fridge, stove, sink) | `5` | `6` | `4` | brushed metal; keep highlights on the top-left |
| Black plastic and metal | `3` | `4` | `2` | bin, tote bag, stove burners, rods |
| Cardboard | `9` | `a` | `8` | boxes |
| Plants | `f` | `d` | `e` | leaves; pots use wood or `c` |
| Teal appliance, fabric accents | `g` | `i` | `4` | microwave, sofa geometric pattern |
| Red accents | `b` | `k` | `7` | sofa pattern, duvet stripes |
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
- **Character frames:** `<character>-<state>-<direction>[-<frame>]` with direction `down`, `up`, `left`, `right`: `player-idle-down`, `player-walk-down-1`, `player-walk-down-2`. A walk cycle is two frames (left foot, right foot) alternating with idle. Left is generated as a mirror of right (and walk-2 of walk-1 for down and up), so every file exists and the game needs no flip.
- **Doing poses** (drawn as small scenes where the character sits or lies, so they are bigger than 16x16 and show the furniture too): `player-sit-sofa` (16x16), `player-type-desk` (16x32), `player-guitar` (32x16), `player-read-sofa` (32x16), `player-sleep-bed` (a lump under the duvet on `bed-made`'s footprint, 32x48), `player-eat-table` (16x16). Sizes are proposals; the activity issue (022) confirms them.
- **Tiles:** `floor-<material>`, `wall-<kind>`, `rug`, `doorway`.

## Reuse audit of the 24 side-view sprites
Sorted for the top-down view. **Reuse:** use as-is (wall-mounted or flat). **Adapt:** the front face is good; add a top slice and trim the height to the planned footprint. **Redraw:** the side-view drawing does not work from above.

| Sprite | Size | Verdict | Why |
|--------|------|---------|-----|
| bed | 64x32 | Redraw | Side profile. Replaced by `bed-made` (32x48, new). |
| bin | 16x32 | Adapt | Front-facing; add a lid top, trim to 16x16 plus a few rows. |
| bookshelf | 48x80 | Adapt | Front-facing against the wall; crop to about 3x3 tiles and add a top slice. |
| boxes | 16x80 | Redraw | A stack seen from the side; draw as a 16x16 box with a top face. |
| counter | 32x48 | Adapt | Front cabinets are right; add a counter top slice. |
| desk | 48x48 | Redraw | Table on legs; from above the top surface matters. |
| fridge | 32x96 | Adapt | Front doors are right; too tall, trim to about 2x4 and add a top slice. |
| gallery-wall | 48x48 | Reuse | Flat frames on the wall. |
| guitar | 16x48 | Adapt | Leaning against the wall is fine; trim. |
| hood | 48x32 | Reuse | Wall-mounted. |
| mic-stand | 16x112 | Redraw | Far too tall; a short stand about 1x2 tiles. |
| player-idle, -walk-1..4, -jump, -fall, -task | 16x16 | Redraw | Side-view poses. Replaced by the `player-<state>-<direction>` set (issue 030); the old files are removed. |
| record-stand | 16x48 | Adapt | Front-facing; trim and add a top. |
| sofa-arm | 16x32 | Adapt | Armchair side; give it a backrest slice like `sofa-td`. |
| sofa | 32x16 | Adapt | Done: `sofa-td` (32x32). |
| spice-rack | 16x64 | Reuse | Wall-mounted. |
| stove | 48x48 | Adapt | Front-facing; add a top slice with burners. |
| table | 48x32 | Redraw | Draw the tabletop from above with the mug and kettle on it. |
| toilet | 32x32 | Redraw | Front elevation; needs the lid and seat seen from above and in front. |
| tote | 16x16 | Reuse | Small floor item, reads fine. |
| tub | 48x32 | Redraw | Side view; draw the long edge facing the player. |
| vanity | 32x48 | Adapt | Front-facing; add a top slice. |
| window-blinds, window-curtain | 32x64 | Reuse | Hang on the back wall; trim height to fit the wall band. |

Verdict totals: 6 reuse, 10 adapt, 7 redraw (plus the 8 player poses, all redraw).

## Samples in the repo (for approval)
`floor-wood`, `floor-tile`, `rug`, `wall-back`, `wall-side-left`, `wall-side-right`, `doorway` (the tileset); `sofa-td` (adapted) and `bed-made` (new); `player-idle-down` and `player-walk-down-1` (the character, 16x16). Run `npm run sprites -- --sheet=floor-,rug,wall-,doorway,bed-,sofa-td,player-idle-down,player-walk-down` and `node scripts/room-mockup.mjs`, then open `art/contact-sheet.png` and `art/room-mockup.png`. Left-over rules from the side view (outline, palette) are unchanged. Furniture batches are not drawn until Marc approves this look.

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
`player-idle-<dir>`, `player-walk-<dir>-1`, `-2` for `down`, `up`, `left`, `right`, all 16x16, plus the doing poses `player-sit-sofa`, `player-type-desk`, `player-guitar`, `player-read-sofa`, `player-sleep-bed`, `player-eat-table` at the sizes listed under Naming. Colors: hair `8` with `9` and `7`, skin `a`, t-shirt `h` with `i`, sweatpants `4`, outline `1`. A walk frame differs from idle by the whole figure dipping one row, the legs spreading with one foot lifted, and the arms swinging, so it reads at 1x. Play the cycle idle, 1, idle, 2. `node scripts/walk-preview.mjs` writes `art/walk-preview.png` (the cycle at 1x and 6x, all directions). The other outfits in `docs/character-brief.md` (casual, out, pajamas) are drawn later as `player-<outfit>-...`.
