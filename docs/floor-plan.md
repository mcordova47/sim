# Floor plan

The apartment as three top-down rooms. Data lives in `src/game/apartment.ts` (the maps, as pictures drawn in text), `src/game/tasks.ts` (task content) and is turned into levels by `src/game/tilemap.ts`. `src/game/plan-checks.ts` and `src/game/apartment.test.ts` check it. This replaces the side-view plan (git tag `side-view-prototype`).

## Decisions (Marc, 2026-10-23)
- **Rooms are separate screens** joined by doorways, the Pokemon way. Walking onto a doorway tile moves the player to the next room, standing just inside its doorway and facing away from it. Score, combos, cooldowns, popups and events carry over.
- **1 tile = 1 foot, furniture to scale.** The character is one tile, so it is chunky next to a 7-foot bed, but the real arrangement and its cramped feel survive. Every room fits the 20x12-tile view, so the camera never scrolls; a smaller room is centred sideways and sits at the bottom of the view (the HUD lives in the strip above it).
- **The layout follows Marc's hand sketch** (not to scale, but the gaps between things are roughly right). The top of each map is the north wall. The main room is seen from the sofa side, as in the art guide.
- **Three screens, and the kitchen is an L.** The front door is decoration for now.

## Rooms
Sizes are inside the walls; each map adds a one-tile wall all round (plus solid filler where a room is not a rectangle).

| Room | Inside | Map |
|---|---|---|
| main | 17 x 8 | 19 x 10 tiles |
| kitchen | 11 x 8, an L | 13 x 10 |
| bath | 7 x 4 | 9 x 6 |

Doorways (each pairs with one back; a test checks it):
- **Main room west wall <-> kitchen east wall:** a two-tile passage (two door tiles side by side), in the middle of the west wall. Wall on either side: the table's side and the sofa's side.
- **Kitchen leg west wall <-> bath east wall:** one door.

### Main room
Columns and rows counted inside the walls, from the top left (col 0, row 0).

| Piece | Tiles | Where | Tasks |
|---|---|---|---|
| Dining table | 4 x 2 at col 0, row 0 | north wall, west end | coffee, reheat, eat dinner |
| Standing desk | 4 x 2 at col 5, row 0 | north wall | work, journal |
| Desk chair | 1 at col 7, row 2 | under the desk | (decor) |
| Cube bookshelf | 1 x 4 at col 9, row 0 | stands out from the north wall, a divider | water plant, sort records |
| Queen bed | 5 x 6 at col 11, row 1 | east end | make bed, work, doomscroll |
| Nightstand | 3 x 1 at col 13, row 0 | north wall, above the bed | (decor) |
| Radiator | 1 x 3 at col 16, row 0 | east wall, in front of the upper window (16x48 sprite; was 1 x 4, issue 044) | (decor) |
| Windows | east wall, rows 2-3 (the upper one, its lower half past the radiator's end) and rows 5-6 | | open and close blinds (both windows; the upper one is reached from row 4 only, the radiator is west of its top tile) |
| Sofa | 6 x 2 at col 1, row 4 | south wall | doomscroll, work |
| Guitar | 1 x 1 at col 0, row 4 | hangs on the west wall by the sofa's west end (16x16 sprite). The tile south of it (col 0, row 5) is floor, but sealed in by the wall, the sofa and the guitar, so nobody can reach it | guitar |
| Lamp table | 1 at col 7, row 5 | by the sofa's east end | (decor) |
| Record stand | 1 at col 8, row 6 | | flip record |
| Front door | 2, in the south wall at cols 9-10 | | (decoration) |
| Mic stand | 1 x 2 at col 4, rows 0-1 | the gap between the table and the desk (16x32 sprite). Leaves col 4, row 2 open to walk through | (decor) |
| Paintings | north wall over the table, desk and nightstand. (The robin print hangs above the table on the **west** wall, which this camera does not show, so it is not on the map.) | | (decor) |

The south wall steps down toward the front door: it is at row 6 along the sofa, row 7 at cols 7-8, and row 8 from col 9 east. There is **one lane** to walk around the bed: down its west side (col 10) and along its foot (row 7). The player starts at col 4, row 3, facing the sofa.

### Kitchen
The bar runs along the top (11 x 4): the sink and counter (3 wide) and the stove (3 wide), both 2 deep against the south wall of the bar (the wall above the bath), the window in the west wall, the recycling, bin and box stack/pantry in the north-east corner, and the tote bag beside them. The leg drops down the east side (4 x 4) with the fridge (2 x 2) in the south-east corner, against the south and east walls, facing north (Marc, 2026-10-23). The bath is the solid block at the bottom left.

### Bath
The tub (2 x 4) down the west wall, the toilet and the vanity sink (each 2 x 2) against the north wall, a walkway across the south, and the door in the east wall.

## Wall tiles
`wallKind(map, wallPieces, col, row)` in `src/game/wall-tiles.ts` is the rule; issue 031 draws with it, and `wall-tiles.test.ts` pins the result for every tile of the three maps. `wallTileName(kind, room)` gives the sprite name.

A tile is in a **wall line** if it is `#` or a wall piece: a character that sits in a wall rather than on the floor (`WALL_PIECES` in `apartment.ts`). Main room: paintings `p q u`, windows `w W`, front door `f`, doors `1 2`. Kitchen: curtain `c`, doors `1 2 3`, range hood `h`. Bath: door `1`. A tile is **open** if it is anything else (floor, furniture). Wall pieces and doors are never open, so a door beside a wall tile does not change what that wall tile is.

Every wall-line tile, pieces included, gets the tile below, drawn under the piece. First match wins:

| Kind | Tile | When |
|---|---|---|
| back | `wall-back` | open tile directly south (the north walls, under the paintings too) |
| front | `wall-front` | open tile directly north (south walls: sofa wall, front-door steps, the kitchen bar's south wall under the sink, stove and hood including the tiles at both ends, the bath's and the leg's south walls) |
| left | `wall-side-left` | open tile directly east (west walls, and the west faces of the kitchen leg's wall and bath door) |
| right | `wall-side-right` | open tile directly west (east walls) |
| none | not drawn | no open orthogonal neighbour: the outer corners, the solid block that is the bath seen from the kitchen, other filler. The ink background shows, so there are no grey bands |

Per room, all four kinds take the room's own tiles (issue 054, from Marc's answer on the real materials): the main room's are the base names (`wall-back`, `wall-front`, `wall-side-left`, `wall-side-right`; stippled plaster), the kitchen's add `-kitchen` (smooth painted drywall, white baseboard) and the bath's add `-bath` (white glossy tile with grout every 8 px). Floors are `floor-wood` (main), `floor-kitchen`, `floor-bath`. Doors draw their doorway sprite over the wall tile: `doorway` (main), `doorway-left-kitchen`, `doorway-right-kitchen`, `doorway-right-bath`.

Resulting pictures (b back, f front, l left, r right, x none):

```
main
xbbbbbbbbbbbbbbbbbx
l.................r
l.................r
l.................r
l.................r
l.................r
l.................r
xfffffff..........r
xxxxxxxxff........r
xxxxxxxxxxffffffffx

kitchen
xbbbbbbbbbbbx
l...........r
l...........r
l...........r
l...........r
xfffffff....r
xxxxxxxl....r
xxxxxxxl....r
xxxxxxxl....r
xxxxxxxxffffx

bath
xbbbbbbbx
l.......r
l.......r
l.......r
l.......r
xfffffffx
```
The `.` tiles are not wall lines. Where the sofa wall steps down, a wall tile with an open tile to its north is front even if one is also to its east (the step's end).

## Doing the same task from different places
A task is placed on an object by id, so the same task can be on several objects. **Work** is on the desk, the sofa and the bed; **doomscroll** is on the sofa and the bed. They share one cooldown and repeat penalty (they are the same task), so working from the couch after working at the desk counts as a repeat. When an object has several tasks (the table has three), the interact key starts the one shown in the prompt: the first that can start, or the one the player cycled to with Tab (issue 039, `docs/tasks.md`).

## Spots
A spot is a walkable tile to stand on and the direction to face. `taskSpots` in `plan-checks.ts` works them out from the map: every walkable tile next to a tile of the object. A test walks from the start, through the doorways, and fails if any task has no reachable spot. For example, coffee at the table is done from the four tiles south of it, facing up; the guitar from the tile north of it, facing down; and the blinds from the east-wall lane, facing east.

## L-shaped objects
A task's zones are one rectangle per tile of the object, not the box around it, so an L-shaped counter or sofa has no usable gap in its corner. No piece in the apartment is an L right now (the L is the kitchen); the rule is tested on small maps in `tilemap.test.ts` and `game.test.ts`.

## Choices to review
- **Bookshelf** is 1 x 4 and stands out from the wall, as in the sketch.
- **Bed** 5 x 6, the sketch's size; the queen is about 5 x 6.7 ft.
- **The sofa** is a plain 6 x 2 block; the sketch shows an arm and a seat cushion, left for the art.
- **Kitchen sizes** follow the measurement (11 x 8 bounding box). The sketch's kitchen is a little tighter.
- **Not on the map yet (issue 044, Marc):** the `stool` (it could appear only with the guitar or recording tasks) and the `gallery-wall` (seen in the admire-art view, issue 040).
- **Left out:** the dark wooden bench in the middle of the main room (in the photos), the mirror on the kitchen door, and the "painting" in the corridor north of the kitchen. Only furniture and fixtures are in the data.
- **Doors** are open tiles (no animation or fade).
- **Placeholder drawing:** each tile of furniture is a coloured rectangle. `sprite` names follow `docs/art-style.md` (`bed-made` and `sofa-td` exist; the rest are the names the furniture batches should use).

## Privacy
Descriptions list furniture type, size and layout only. No address and no belongings beyond furniture and fixtures. Photos stay in `reference-photos/`, which is gitignored.
