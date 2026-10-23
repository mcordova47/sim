# Floor plan

The apartment as three top-down rooms. Data lives in `src/game/apartment.ts` (the maps, as pictures drawn in text), `src/game/tasks.ts` (task content) and is turned into levels by `src/game/tilemap.ts`. `src/game/plan-checks.ts` and `src/game/apartment.test.ts` check it. This replaces the side-view plan (git tag `side-view-prototype`).

## Decisions (Marc, 2026-10-23)
- **Rooms are separate screens** joined by doorways, the Pokemon way. Walking onto a doorway tile moves the player to the next room, standing just inside its doorway and facing away from it. Score, combos, cooldowns, popups and events carry over.
- **1 tile = 1 foot, furniture to scale.** The character is one tile, so it is chunky next to a 7-foot bed, but the real arrangement survives. Every room fits the 20x12-tile view, so the camera never scrolls; a smaller room is centred sideways and sits at the bottom of the view (the HUD lives in the strip above it).
- **Orientation:** from Marc's corrections to the first sketch: the main room is mirrored left to right (kitchen door at the west end, bed at the east end), the kitchen is turned 180 degrees, and the bath is turned 90 degrees clockwise and sits south of the kitchen. The top of each map is the far wall, which matches the art guide: the main room is seen from the sofa side.

## Rooms
Sizes are inside the walls; each map adds a one-tile wall all round.

| Room | Inside | Map |
|---|---|---|
| main | 17 x 8 | 19 x 10 tiles |
| kitchen | 11 x 8 | 13 x 10 |
| bath | 4 x 7 | 6 x 9 |

Doorways (each pairs with one back; a test checks it): main west wall <-> kitchen east wall; kitchen south wall <-> bath north wall.

### Main room (columns and rows counted inside the walls, from the top left)
| Piece | Tiles | Where | Tasks |
|---|---|---|---|
| Dining table | 4 x 2 at col 0, row 0 | far wall, by the kitchen door | coffee, reheat, eat dinner |
| Standing desk | 4 x 2 at col 4, row 0 | far wall | work, journal |
| Mic stand and key light | 1 at col 7, row 2 | below the desk's east end | (decor) |
| Cube bookshelf | 1 x 3 at col 8, row 0 | far wall, a divider before the bed | water plant, sort records |
| Window and blinds | 1, in the far wall at col 9 | above the walkway | open blinds |
| Queen bed | 7 x 5 at col 10, row 0 | east end, head against the far wall | make bed, work, doomscroll |
| Sofa | 6 x 2 at col 3, row 6, plus its arm at col 8, row 5 (an L) | near wall | doomscroll, work |
| Guitar | 1 at col 2, row 7 | by the sofa's west end | guitar |
| Record stand | 1 at col 9, row 7 | by the sofa's east end | flip record |
| Gallery wall | 4, in the near wall | above the sofa | (decor) |

The player starts at col 5, row 5, facing the sofa.

### Kitchen
Fridge 2x2 (fridge stare, refill humidifier) with the side rack beside it, bin and tote bag in the north-east corner by the door, the box stack (1x2) in the south-east corner, the L-shaped counter with the sink (dishes) and the stove 3x2 (cook) along the south wall under the range hood, and the curtained window in the west wall. Doors: east wall to the main room, south wall (west end) to the bath.

### Bath
A 2-wide walkway along the west side; vanity (brush teeth), toilet (take a moment) and tub (shower) stacked along the east wall. Door in the north wall.

## Doing the same task from different places
A task is placed on an object by id, so the same task can be on several objects. **Work** is on the desk, the sofa and the bed; **doomscroll** is on the sofa and the bed. They share one cooldown and repeat penalty (they are the same task), so working from the couch after working at the desk counts as a repeat. When an object has several tasks (the table has three), the interact key starts the first one that is off cooldown, so they rotate until the choice menu (issue 023).

## Spots
A spot is a walkable tile to stand on and the direction to face. `taskSpots` in `plan-checks.ts` works them out from the map: every walkable tile next to a tile of the object. A test walks from the start, through the doorways, and fails if any task has no reachable spot. Examples: coffee at the table is done from the four tiles under it, facing up; the guitar from the tile above it (facing down) or the one to its east (facing west); work on the sofa from the whole row above it and the east side; the sink counter from its inner corner too, but never by facing the empty corner of its L.

## L-shaped objects
A task's zones are one rectangle per tile of the object, not the box around it. The sofa (with its arm) and the counter are L-shaped, and a test checks that facing the empty corner does nothing.

## Choices to review
- **Bookshelf as a divider.** 1 wide and 3 deep, sticking out from the far wall beside the bed (as in the photos), not 3 wide against the wall as in the side view.
- **Bed** 7 x 5, head against the far wall. The queen is about 6.7 x 5 ft.
- **Window** is a tile in the far wall above the walkway beside the bed; the real window position was not checked.
- **Kitchen** reads the first sketch Marc turned 180 degrees (fridge in the north-west, stove and counter on the south wall). The photos show a narrow galley; the 11 x 8 size is the earlier measurement.
- **Left out:** the dark wooden bench in the middle of the main room (in the photos) and the mirror on the kitchen door. The photos show a lot of loose stuff; only furniture and fixtures are in the data.
- **Doors** are one tile wide and open (no animation or fade).
- **Placeholder drawing:** each tile of furniture is a coloured rectangle. `sprite` names follow `docs/art-style.md` (`bed-made`, `sofa-td` exist; the rest are the names the furniture batches should use).

## Privacy
Descriptions list furniture type, size and layout only. No address and no belongings beyond furniture and fixtures. Photos stay in `reference-photos/`, which is gitignored.
