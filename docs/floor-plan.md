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
| Radiator | 1 x 4 at col 16, row 0 | east wall, in front of the upper window | (decor) |
| Windows | east wall, rows 2-3 (behind the radiator) and rows 5-6 | | open blinds (the lower one) |
| Sofa | 6 x 2 at col 1, row 4 | south wall | doomscroll, work |
| Guitar | 1 x 2 at col 0, rows 4-5 | by the sofa's west end | guitar |
| Lamp table | 1 at col 7, row 5 | by the sofa's east end | (decor) |
| Record stand | 1 at col 8, row 6 | | flip record |
| Front door | 2, in the south wall at cols 9-10 | | (decoration) |
| Paintings | north wall over the table, desk and nightstand | | (decor) |

The south wall steps down toward the front door: it is at row 6 along the sofa, row 7 at cols 7-8, and row 8 from col 9 east. There is **one lane** to walk around the bed: down its west side (col 10) and along its foot (row 7). The player starts at col 4, row 3, facing the sofa.

### Kitchen
The bar runs along the top (11 x 4): the sink and counter (3 wide) and the stove (3 wide), both 2 deep against the south wall of the bar (the wall above the bath), the window in the west wall, the recycling, bin and box stack/pantry in the north-east corner, and the tote bag beside them. The leg drops down the east side (4 x 4) with the fridge (2 x 2) against the east wall. The bath is the solid block at the bottom left.

### Bath
The tub (2 x 4) down the west wall, the toilet and the vanity sink (each 2 x 2) against the north wall, a walkway across the south, and the door in the east wall.

## Doing the same task from different places
A task is placed on an object by id, so the same task can be on several objects. **Work** is on the desk, the sofa and the bed; **doomscroll** is on the sofa and the bed. They share one cooldown and repeat penalty (they are the same task), so working from the couch after working at the desk counts as a repeat. When an object has several tasks (the table has three), the interact key starts the first one that is off cooldown, so they rotate until the choice menu (issue 023).

## Spots
A spot is a walkable tile to stand on and the direction to face. `taskSpots` in `plan-checks.ts` works them out from the map: every walkable tile next to a tile of the object. A test walks from the start, through the doorways, and fails if any task has no reachable spot. For example, coffee at the table is done from the four tiles south of it, facing up; the guitar from the tile north of it, facing down; and the blinds from the east-wall lane, facing east.

## L-shaped objects
A task's zones are one rectangle per tile of the object, not the box around it, so an L-shaped counter or sofa has no usable gap in its corner. No piece in the apartment is an L right now (the L is the kitchen); the rule is tested on small maps in `tilemap.test.ts` and `game.test.ts`.

## Choices to review
- **Bookshelf** is 1 x 4 and stands out from the wall, as in the sketch.
- **Bed** 5 x 6, the sketch's size; the queen is about 5 x 6.7 ft.
- **The sofa** is a plain 6 x 2 block; the sketch shows an arm and a seat cushion, left for the art.
- **Kitchen sizes** follow the measurement (11 x 8 bounding box). The sketch's kitchen is a little tighter.
- **Left out:** the dark wooden bench in the middle of the main room (in the photos), the mirror on the kitchen door, and the "painting" in the corridor north of the kitchen. Only furniture and fixtures are in the data.
- **Doors** are open tiles (no animation or fade).
- **Placeholder drawing:** each tile of furniture is a coloured rectangle. `sprite` names follow `docs/art-style.md` (`bed-made` and `sofa-td` exist; the rest are the names the furniture batches should use).

## Privacy
Descriptions list furniture type, size and layout only. No address and no belongings beyond furniture and fixtures. Photos stay in `reference-photos/`, which is gitignored.
