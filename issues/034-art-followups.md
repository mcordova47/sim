---
id: 034
title: Art follow-ups from 028 to 030
status: done
owner: agent
depends_on: []
---

## Goal
The art that is left, and the small fixes the reviews noted. Do these after 031 so they are judged in the game at 1x.

## Acceptance criteria
- Judge the dish stages (`dishes-1..3`), the east window slivers and the other small pieces at true 1x in the running game; redraw whatever does not read.
- `dishes-1..3` leave transparent pixels at the rounded corners of the plates, mugs and pot inside the counter (8, 17 and 31 pixels); fill them with the counter-top color.
- Pieces from the floor plan that have no top-down sprite yet and the old side-view ones still in `art/src` (`sofa-arm`, `mic-stand`, `gallery-wall`, `spice-rack`): keep, redraw or delete each, with the reuse table updated.
- Doing poses on the real furniture, which now has the final sizes: `player-eat-table` (the floor plan has the table on the north wall and the player on its south side, so a back view may be right), `player-guitar` (the guitar is 1x2 vertical), and the sofa, bed and desk poses against the 6x2 sofa, 5x6 bed and 4x2 desk. Redraw to fit; the sleep lump is plain.
- Character: down-facing eyes, and the side-profile nose that reads as a beak in a couple of frames (Marc's taste call).
- Other outfits (casual, out, pajamas) as `player-<outfit>-...`, and held-item overlays (mug, laptop, guitar, book) as separate sprites.
- `npm run sprites`, `npm test` and `npm run build` pass.

- **Marc's notes from playing the sprite build (2026-10-23)**, to be judged in the running game at 1x:
  1. `lamp-table`: the lamp reads more side-on than everything else; redraw to the same top-down angle (Marc may send a reference photo of the lamp).
  2. Close-up labeled photos of the paintings and other art: Marc offered; list which ones to ask for (desk print, barn drawing, gallery wall, robin linocut).
  3. `guitar`: fine as is if it looks better, but try flipping it and shortening it so it hangs on the west wall (1x1 or 1x2, hanging, not leaning). Check the floor plan: the guitar tile may then be free floor or wall.
  4. Doors: Marc doesn't read them. For the main room to kitchen passage, draw an open passage (no door leaf) rather than a door: change the doorway tile for those two tiles (`doorway-*` or a new `opening-*`). Review the bath and front door doorways for the same readability problem.
  5. A reference picture of a mug and of the lamp from Marc will improve `table` (mug) and `lamp-table`.
  6. The front door is white (old, painted many times): redraw `front-door` white with layers of paint (chipped edges, a bit of an off-white or yellowed tint), not tangerine.
  7. Clutter piles on the desk: this is issue 042 (waits on this issue's art). Draw the piles as separate variants when 042 starts.

- **Reference photos (Marc renamed and completed them, 2026-10-23):** `ls /Users/marccordova/Dev/repos/mcordova47/life/reference-photos/` and read what is relevant by absolute path; the names say what each shows (art close-ups, gallery wall by piece, the mics, stool, chairs, books and records, coffee station, mail on the table, desk clutter, kitchen and bath, overhead chair, silkscreen over the bed, and so on). Never copy a photo, caption or readable text into the repo (poster, book and record titles stay unreadable; no names).
- Redo the paintings (`painting`, `painting-desk`, `painting-wide`) and the `gallery-wall` strip from the new close-ups so they are better impressions of the real pieces; add `painting-robin` and a piece for the silkscreen over the bed if there is a wall slot (check the floor plan; propose a slot if not, do not edit the map).
- Use the new references to improve whatever else they show: mic stand, stool, chair and desk-chair (overhead), books and records on the shelf, coffee station and mug on the table, nightstand, fridge, kitchen counter, microwave and mail on the table, desk clutter (for 042), made and unmade bed.

- `view-gallery-wall` (320x192, same name): a straight-on view of the whole south gallery wall for the admire-art scene (issue 040). Keep key content in the top 140 px or so, because the dialog box covers the bottom. It is a labelled placeholder now.

## Progress log

### 2026-10-23, agent: plan
Art plus small data only. Rendered real frames of each room in headless Chrome (a throwaway harness page that builds the real `Game` from `APARTMENT` with chosen state, screenshots at 1x and 4x), looked at each, and iterated.

### 2026-10-23, agent: done, ready for review
**What changed (all in `art/src` plus the regenerated `public/sprites`; no map or engine change):**
- **Doors (note 4):** `doorway`, `doorway-right-kitchen`, `doorway-left-kitchen` and `doorway-right-bath` are now open passages: the room's floor runs through the wall tile and the next room's floor shows in the wall's thickness. The main room's `doorway` was a back-wall sprite (frame, dark opening, doormat) being drawn into a side wall, which is why it did not read. Names are unchanged, so no code or test changed. This covers the bath door too.
- **Front door (note 6):** white, layers of paint, a few yellowed patches, chips to old wood at the edges, raised panels softened by paint, brass knob, peephole.
- **Paintings and the wall (036 follow-up):** `painting` (barn), `painting-desk`, `painting-wide` (the silkscreen over the bed: honey pine frame, wide mat, small green print with maples and blue sky) and `gallery-wall` (all ten pieces in their real arrangement) redrawn from the new close-ups. New `painting-robin` (16x16).
- **Lamp (notes 1, 5):** `lamp-table` redrawn with a visible top, drum shade, glass and brass base, small dark table, from the lamp photo. **Guitar (note 3):** flipped and shortened to hang by its headstock on a wooden hanger, 16x32.
- **Dishes:** `dishes-1..3` corners filled (8, 17, 31 pixels, counter-top white, and the sink blue where inside the basin). No transparent pixel is left inside the counter.
- **Other references used:** `table` (dripper on its scale, bean jar, walnut box, grinder, kettle, the teal microwave with its pile of mail, the mug), `desk-chair` (wooden armchair with striped cushions), `bookshelf` (cubes, spines, records, drawers, plant), `fridge` (steel doors, humidifier, tote, basket). New `stool`. `mic-stand` redrawn 16x112 to 16x32. Made and unmade bed, nightstand, record stand, kitchen counter, stove: compared with the photos and left as they were (they already match well enough at 1x).
- **Unused side-view leftovers:** deleted `sofa-arm` and `spice-rack`. Reuse table in `docs/art-style.md` updated, with a new Doorways section.
- **Poses:** all six redrawn against the real furniture and sizes (`player-sit-sofa` 16x32, `player-read-sofa` 32x32, `player-type-desk` 16x32, `player-eat-table` 16x32 on a stool, seen from behind since the table is on the north wall, `player-guitar` 16x48, `player-sleep-bed` 80x96 with a plain lump). The pose sizes changed, so `scripts/sprite-lib.test.mjs` was updated to the new documented sizes. See `docs/art-style.md` for where each is anchored.
- **Character:** flattened the side-profile nose that read as a beak (right and left, idle and both walk frames). Down-facing eyes: tried a 2-tall eye, it read as startled and could not be matched in the walk frames (one row shorter), so the original 1-pixel eyes stay. **That one is Marc's taste call.**
- **Outfits and overlays:** `player-casual-`, `player-out-` (two-colour flannel check) and `player-pajamas-` (with a hair tuft) for every idle and walk frame (36 sprites), and `held-<mug|laptop|book|guitar>-<dir>` overlays (16 sprites).

**Acceptance criteria, how checked:**
1. Judged at true 1x in the running game: rendered main (bed made and unmade, blinds open and closed, dishes 0 to 3), kitchen and bath through the real `Game` and looked at 1x and 4x frames; the pose and overlay sprites were composed on the real furniture sprites and looked at 8x. Redrew what did not read (doorways, front door, lamp, fridge contrast after a first grey version vanished against the stone floor). The east window slivers are unchanged and still read as window edges.
2. Dishes corners: counted 8, 17, 31 `.` pixels replaced; grepped that none remain in the pixel rows.
3. Pieces with no sprite: none are missing from the floor plan (the `sprite-names` test passes). Decided `sofa-arm` deleted, `spice-rack` deleted, `mic-stand` redrawn (unplaced), `gallery-wall` kept and redrawn (unplaced). Reuse table updated.
4. Poses: done as above, composed on the furniture and viewed. NOT checked in the game, because nothing draws poses yet.
5. Character: nose fixed, eyes left (above).
6. Outfits and overlays: done, viewed composed over the player. Overlays are small, rough icons (mug, laptop, book and the guitar sling are legible; they have not been judged in motion).
7. `npm run sprites`, `npm test` (628 pass) and `npm run build` pass.

**Marc's notes:** 1 lamp done; 2 close-ups supplied, all four used (desk print, barn, gallery wall, robin); 3 guitar redrawn hanging, but see below; 4 doors done; 5 mug and lamp done; 6 front door done; 7 clutter piles for 042 NOT drawn (they wait for 042).

**Left for the planner and 042 (not done, needs outside this issue):**
- **Guitar tiles:** the floor plan still blocks the two tiles (col 1, rows 5 to 6) the guitar occupies. Hanging on the wall would free them, but then the interact spot and the wall tile change. Not trivial, so no map edit; the sprite hangs inside its two blocked tiles.
- **Slots to propose (no map edit):** `painting-robin` on the north wall at col 5 (between the table and desk paintings, 1 tile); `gallery-wall` is still not in the data (6x1 on the sofa wall face); `mic-stand` at col 5, row 1; `stool` by the bookshelf's foot.
- **Poses and overlays are not wired in:** the game needs to draw `player-<outfit>-...`, the six poses (each replaces the furniture pixels where it is drawn; `player-guitar` also replaces the `guitar` sprite) and `held-...`. That is wiring, not art.
- Desk clutter variants (042) not drawn; `desk` is unchanged.

**Could not check:** how any of it feels in a browser as you walk around; poses and outfits in motion; whether the open passages read for Marc himself at his window size. The second pass on eyes and overlays is a taste call.

**Play it:** `cd /Users/marccordova/Dev/repos/mcordova47/life-worktrees/034-art-followups && npm run dev`, walk through the kitchen passage and the bath door, look at the front door, lamp, guitar, table and fridge.


### 2026-10-23, agent: independent review (verdict: approve)
Checked in the worktree, branch `issue/034-art-followups`.
- **Build and tests:** `npm run sprites` (127 sprites; regenerating left the tree clean, so `public/sprites` matches `art/src`), `npm test` (628 pass) and `npm run build` pass. Pass.
- **Own sprite checks (all clean):** every `.sprite` parses with the right row widths; no colour outside the palette; every source has a PNG and no orphan PNGs; `dishes-1..3` have 0 transparent pixels; the four `doorway*` have 0 transparent pixels; `sofa-arm` and `spice-rack` are gone from `art/src` and `public/sprites` and nothing in `src` names them; all 36 outfit frames (casual, out, pajamas x 4 directions x idle, walk-1, walk-2) and all 16 `held-*` overlays exist at 16x16; the outfit silhouettes differ from the home outfit by 6 pixels or fewer per frame; pose sizes match `docs/art-style.md` (sit-sofa 16x32, read-sofa 32x32, type-desk 16x32, eat-table 16x32, guitar 16x48, sleep-bed 80x96).
- **Criterion 1 (judge at 1x in game):** rendered the real `Game` from `APARTMENT` (main, kitchen, bath) in headless Chrome and looked at 3x to 8x frames. Open passages read as gaps in the wall; front door reads white; lamp reads top-down; guitar hangs; fridge, table and bookshelf read. Pass for what a still frame shows.
- **Criterion 2 (dishes corners):** pass (0 transparent pixels).
- **Criterion 3 (leftover pieces, reuse table):** pass (`sofa-arm`, `spice-rack` deleted; `mic-stand`, `gallery-wall` redrawn; table updated).
- **Criterion 4 (poses):** sizes correct and the contact sheet looks sane; **can't verify in the game** because nothing draws poses.
- **Criterion 5 (character):** nose fixed; down-facing eyes deliberately left as is. **Marc's taste call, not decided here.**
- **Criterion 6 (outfits and overlays):** present for every frame and direction. **Can't verify in motion** (nothing draws them yet).
- **Criterion 7:** pass.
- **Marc's notes:** 1, 3 (guitar redrawn but its two tiles are still blocked in the map), 4, 5, 6 done; 2 supplied; 7 deferred to 042.
- **Scope:** changed files are `art/src`, `public/sprites`, `docs/art-style.md`, the issue file and `scripts/sprite-lib.test.mjs` (pose sizes updated and outfit and overlay tests added, justified). No `PLAN.md`, map, engine or other issue changes. Privacy: no photo content or readable text in the repo.
- **Unverified, for Marc:** how it feels in a browser in motion; poses, outfits and held items in motion; whether the open passages read for Marc at his own window size; whether the redrawn paintings and `gallery-wall` are good impressions of the real pieces (not compared against the photos here); down-facing eyes; the guitar hung on a floor tile instead of the wall; overlays are small rough icons (taste).
- **Follow-ups for the planner (not blockers):** wiring for outfits, poses and overlays; map slots proposed in the 2026-10-23 log (`painting-robin` at north col 5, `gallery-wall`, `mic-stand` at col 5 row 1, `stool`); guitar tiles; desk clutter for 042.
