> **Superseded (2026-10-22).** This is the floor plan for the side-view version of the game (git tag `side-view-prototype`). The game is now top-down; issue 020 replaces this with top-down maps. It is kept for the inventory of pieces, their real sizes and colours, and the reasoning about the real layout.

# Floor plan

The apartment as a side-on cutaway. Data lives in `src/game/room.ts` and `src/game/tasks.ts`; `src/game/reach.ts` checks reachability. This doc explains the choices. Everything here is a first proposal for Marc to review.

## Scale and size
- **1 tile = 1 foot.** Real measurements carry over directly, which keeps the data easy to check.
- The level is **35 x 12 tiles**: main room 17 + kitchen 11 + bath 7 wide, a 10 ft ceiling, and 2 rows above it for the HUD. That is wider than the 20 x 12 view issue 001 set up, so the view (or the tile size) needs to change. See follow-ups.
- Walls between rooms are drawn but do not block movement, so the whole apartment stays on one screen.

## Left to right

| Zone | Piece | x | Width | Height | Collision |
|---|---|---|---|---|---|
| main | Queen bed | 0 | 4 | 2 ft | solid |
| main | Cube bookshelf | 4 | 3 | 5 ft | solid |
| main | Standing desk | 7 | 3 | 3 ft | oneWay |
| main | Dining table | 10 | 3 | 2 ft | oneWay |
| main | Record player stand | 13 | 1 | 3 ft | solid |
| main | Sofa armrest | 14 | 1 | 2 ft | solid |
| main | Sofa | 15 | 2 | 1 ft | solid |
| kitchen | Tote bag and shoes | 17 | 1 | 1 ft | solid |
| kitchen | Trash bin | 18 | 1 | 2 ft | solid |
| kitchen | Stove | 19 | 3 | 3 ft | solid |
| kitchen | Counter and sink | 22 | 2 | 3 ft | solid |
| kitchen | Box stack | 24 | 1 | 5 ft | solid |
| kitchen | Fridge | 25 | 2 | 6 ft | solid |
| kitchen | Side rack | 27 | 1 | 4 ft | oneWay |
| bath | Vanity sink | 28 | 2 | 3 ft | solid |
| bath | Toilet | 30 | 2 | 2 ft | solid |
| bath | Tub and curtain | 32 | 3 | 2 ft | solid |

## Choices to review
- **Squeezed main room.** In the real room the sofa is on one wall and the table, desk, shelf and bed are on the opposite one. A side-on view has one lane, so five pieces that total about 24 ft share 17 ft. Bed, desk, table and sofa are scaled down by roughly a quarter to a third. Heights are real.
- **Little open floor.** Furniture touches end to end, so most travel is along the tops. The only bare floor is under the desk and table (x 7 to 13), because the 14 px player fits under their 2 to 3 ft slabs. The desk is 3 ft, not the real 2.5, because it is a standing desk and the extra foot makes the bookshelf reachable. For more visible floor, shrink pieces further or widen the level.
- **Kitchen reordered.** In real life the fridge is next to the door. Here the tote bag (1 ft), then bin (2), stove (3), counter (3), box stack (5) and fridge (6) form a staircase up to the fridge top. The side rack is the end of the line.
- **Bath is a staircase too:** vanity 3, toilet 2, tub 2.
- **Guitar on the wall** hangs above the sofa, but the task is done sitting on the sofa seat: the engine only starts a task for a player standing on something, and nothing stands at guitar height. The sofa seat is split between the two sofa tasks (doomscroll on the left tile, guitar on the right). The mic and key light stand is decor only.
- **Bed tasks** split the bed too: make the bed on the left two tiles, open the blinds on the right two, so the zones don't overlap.
- **Dimensions assumed.** I took "17x8" as 17 ft along the side-on axis and 8 ft deep, and the same for the kitchen and bath. I took the bed as 4 tiles wide of its 6.7 ft length. Correct me if any of that is backwards.

## Platforms, interactables, decor
- **Platforms only:** sofa armrest, tote bag (solid blocks used as steps).
- **Interactable (and also platform):** every other piece, because you stand on it to use it.
- **Decor:** window blinds, gallery wall, guitar, mic stand, kitchen curtain, range hood, shower curtain.
- Collision is derived from the pieces (`SOLIDS`). Desk, table and side rack are one-way: jump up through them from below.

## Tasks
21 tasks. Points and durations are first guesses and live only in `tasks.ts`.

| Piece | Task | Prompt | Duration | Points | Flavor |
|---|---|---|---|---|---|
| bed | Make the bed | Make the bed | 3s | 30 | It will be undone in eleven hours. Worth it. |
| bed | Open the blinds | Open the blinds | 1s | 10 | The outside is still there. Good to know. |
| bookshelf | Water the snake plant | Water the plant | 2s | 20 | It has survived worse owners. It has not had worse owners. |
| bookshelf | Alphabetize the records | Alphabetize records | 6s | 60 | By artist. Then by mood. Then by artist again. |
| desk | Answer emails | Work at the desk | 8s | 80 | Per my last email, you are doing great. |
| desk | Write in the journal | Write in the journal | 5s | 50 | Dear diary, I made coffee. It was a lot. |
| record-stand | Flip the record | Flip the record | 2s | 25 | Side B is the one you actually like. |
| table | Make pour-over coffee | Make coffee | 6s | 70 | Weigh, grind, bloom, wait. Peak civilization. |
| table | Reheat leftovers | Reheat leftovers | 3s | 25 | Thirty seconds more. Thirty seconds more. Cold in the middle. |
| table | Eat dinner | Eat dinner | 7s | 60 | Eaten while watching something you have already seen. |
| sofa | Doomscroll | Doomscroll | 10s | 40 | One more. Okay, one more. Where did forty minutes go. |
| sofa | Play three chords | Play guitar | 5s | 55 | Same three chords. Different, slightly worse, song. |
| spice-rack | Stare into the fridge | Open the fridge | 3s | 30 | Nothing new has appeared since the last check. |
| fridge | Refill the humidifier | Refill the humidifier | 4s | 45 | The air is now 4% less crunchy. |
| bin | Take out the trash | Take out the trash | 4s | 50 | The bag was not full. You took it out anyway, out of spite. |
| stove | Cook dinner | Cook dinner | 8s | 90 | Smoke alarm: silent, but judging. |
| counter | Do the dishes | Do the dishes | 7s | 80 | The pile regrows when you look away. |
| boxes | Flatten the boxes | Flatten boxes | 5s | 45 | You have been meaning to do this since spring. |
| vanity | Brush teeth | Brush teeth | 3s | 30 | Two full minutes. Honest. |
| toilet | Take a moment | Take a moment | 4s | 20 | Phone battery: 41%. Phone battery: 33%. |
| tub | Take a shower | Take a shower | 6s | 70 | Best ideas of the day, all forgotten by the towel. |

## Reachability
`reach.ts` builds a graph of standable surfaces (tops of pieces, plus bare floor) and links two surfaces if the gap is small enough and the step up is within the jump limit. It reports pieces and tasks that can't be reached from the spawn on the sofa, and anything with too little headroom under the 10 ft ceiling.

The integration (issue 011) now runs this check in a test with limits *measured from the real `Player`* (full-hold standing jump rise and flat standing-jump distance, rounded down to a quarter tile): a rise of **2.25 tiles** and a gap of **2 tiles**. Every piece and task is reachable with those. The older limits below are what the first draft used.

Limits come from issue 002's `PLAYER` config (1 tile = 16 px): `jumpHeight` 40 px = **2.5 tiles up**, player 14 px = 0.875 tiles tall, and a flat-ground hop covers about 3.3 tiles at `maxSpeed` (checked with a gap of 2 and of 3).

Result with those limits: **every piece and task is reachable and nothing hits the ceiling.** The first run failed the bookshelf (a 3 ft step up from the 2 ft desk) and the guitar (zone too high to jump to from the sofa seat). Raising the desk to 3 ft and lowering the guitar zone to 3 ft fixed both. The tightest steps are now 2.5 tiles or less everywhere.

**Scale:** at 1 tile = 1 ft the player is about 10 inches tall and jumps about 2.3 ft. Marc decided to keep this for now. The level is 560 px wide against a 320 px view, which the scrolling camera (issue 010) handles.

## Privacy
Descriptions list furniture type, size and color only. No address, no belongings beyond furniture and fixtures. Marc deletes `reference-photos/` when this issue closes.
