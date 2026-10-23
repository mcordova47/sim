# Art style guide

Rules for every sprite in the game. The palette lives in [art/palette.json](../art/palette.json) and is the single source of truth; the table below mirrors it.

## Grid
- **Tile size: 16x16 px** (`TILE` in `src/game/config.ts`).
- Every sprite's width and height is a multiple of 16 (the couch is 48x16, a standing player may be 16x32). The pipeline rejects anything else.
- The view is 20x12 tiles (320x192) and is only ever scaled by whole numbers, so pixels stay crisp.

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
- Light comes from the **top-left** (the window). Highlights go on top and left edges, shadows on bottom and right.
- Use one lighter and one darker tone per material at most; shading is flat, no dithering.

## Naming
- Lowercase kebab-case, e.g. `coffee-mug`, `loft-bed`. The filename (minus extension) is the name the game loads: `art/src/coffee-mug.sprite` becomes `public/sprites/coffee-mug.png`.
- Variants and frames: `<name>-<variant>` or `<name>-<n>`, e.g. `player-walk-1`, `kettle-on`.

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
2. `npm run sprites` validates and renders to `public/sprites/` plus `art/contact-sheet.png` (4x upscale on a checkerboard). Look at the sheet before committing.
3. `art/contact-sheet.png` is a generated review aid and is not committed (it is gitignored), so branches don't conflict on it. Don't `git add -f` it. The script prints where it wrote it.
4. The script fails, writing nothing, if a sprite has an unknown color, a wrong row width or height, or a size that is not a multiple of the tile.
5. In the game, `sprites.draw(ctx, "name", x, y)` (see `src/render/sprites.ts`). A missing file draws a red rectangle labeled with its name. To swap in hand-made art, drop a PNG of the right size at `public/sprites/<name>.png` and skip the source file (the script only overwrites PNGs that have a `.sprite` source).
