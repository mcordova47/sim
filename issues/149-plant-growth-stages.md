---
id: "149"
title: "More growth stages for some plants (a pothos that trails over the bookshelf)"
short: "More plant stages"
status: review
owner: marc + claude
depends_on: ["147"]
summary: "Some plants get more stages; the pothos eventually trails down over the bookshelf."
kind: design
unverified:
  - "How the tall stages feel when played for real (the 1x frame was looked at, not a long play session)."
  - "Whether the watering pace to reach the last stages feels right; the thresholds are a proposal."
  - "Art judgement calls (reviewer): the pothos vines climb up over the books rather than hang down; the tall wilted pothos is faint specks."
needs:
  - who: marc
    kind: decide
    why: "Optional: d3, whether the swap list should warn that a grown plant restarts small (default: no)."
    since: 2026-11-24
decisions:
  - id: d1
    who: marc
    q: "Which plants get extra stages beyond the four they have now (sprout, small, full, flowering)?"
    options:
      - "pothos and monstera only (they have somewhere to go: trailing, bigger leaves); snake and spider plants stay at four"
      - "every live plant gets a fifth stage, shaped to the plant"
      - "only the pothos, as the first experiment"
    recommendation: "pothos and monstera only: the others look finished at four, and a stage costs a sprite per plant"
    status: answered
    answer: "pothos and monstera only (they have somewhere to go: trailing, bigger leaves); snake and spider plants stay at four"
    by: marc
    on: 2026-11-23
  - id: d2
    who: marc
    q: "How does the trailing pothos draw over the bookshelf, given the plant slot is 16x16 on the shelf's top?"
    options:
      - "a taller overlay sprite for the late stages, drawn over the bookshelf's top cubes (the plant is already an overlay piece), not hiding any task spot"
      - "keep it inside 16x16 and only show a longer trailing vine within the pot"
    recommendation: "a taller overlay for the late stages: that is the point of the idea, and the bookshelf's top cubes are decorative"
    status: answered
    answer: "a taller overlay sprite for the late stages, drawn over the bookshelf's top cubes (the plant is already an overlay piece), not hiding any task spot"
    by: marc
    on: 2026-11-23
  - id: d3
    who: marc
    q: "A swapped-in live plant starts small, so a fully grown pothos is lost if you swap it out and back in. Should the swap list or the item's note say so?"
    options:
      - "no change: the swap list stays as it is (a swapped-in plant has always started small, and nothing is punished)"
      - "add a short warning line to the swap list for a plant that has grown past stage 3"
    recommendation: "no change: it matches the existing rule, and a warning would add the pressure the quiet-collecting rule avoids"
    status: open
---

## Goal
Marc (2026-11-23): after seeing the six new plants (issue 147), some plants should have more growth stages, for example a pothos that eventually flows over the bookshelf.

## Notes (planner)
- Builds on issue 147 (the new plant families `plant-pothos`, `plant-monstera`, `plant-spider`); FAMILIES allows a different number of stages per family, but the slot is 16x16 and an item must equal the slot size, so a taller sprite needs a decision (d2) and probably a small engine change (an overhang drawn over the bookshelf).
- Growth timing is `growthVar` waiting for waterings; a fifth or sixth stage needs its thresholds chosen and tested so the plant does not outgrow the day-33 and day-36 gift pacing in a way that feels like a chore (quiet-collecting rule: no pressure).
- A swapped-in live plant starts small (existing rule), so a fully grown trailing pothos is lost on swap; consider whether the swap list should say so (the inventory notes, issue 109a).

## Acceptance criteria
Decided by Marc (d1 and d2, 2026-11-23): only the pothos and monstera get extra stages (the snake plant and spider plant stay at four); the late stages are a taller overlay sprite drawn over the bookshelf's top cubes, not hiding any task spot.
- **Stages are per family.** Today every live family has four stages (`FAMILIES`: `stages: 4`) and the watering thresholds (`PLANT.wateringsToGrow`) and the `plantStage` variable's maximum are shared. Make the stage count and the thresholds per family (the snake plant and spider plant behave exactly as before, with the same thresholds and saves), and let the pothos and monstera have more (the agent proposes how many and the thresholds, with a short rationale; the pothos reaches the trailing stage only after a good while and nothing is lost or punished by waiting; quiet-collecting rule: no pressure, nothing required).
- **A taller sprite for the late stages.** An item's sprite may be taller than its 16x16 slot for the late stages, drawn as an overlay over the bookshelf's top cubes (check the real sprite of the bookshelf and the map: it covers no task spot, no other prop, and does not hide the bookshelf's cube contents that matter; the plant overlay is already drawn over the shelf's top rows 36 to 51). Say how the rule is expressed in data (for example an item or family field giving the extra height) so a later plant can use it; the size check for the swap still compares the slot's 16x16 footprint.
- **Art.** New sprites for the extra stages, palette only, no text, drawn from the shelf's viewpoint (see docs/art-style.md, plants: the plants keep the top-front view); the pothos's last stage flows over the shelf; the monstera's extra stages are bigger leaves. Look at each stage in the room at 1x and at 8x, and in the wilted state, and say what you saw; the reviewer must too. The art could use the outfit generator's approach if useful, but this is hand-drawn work.
- **Swap behaviour.** A swapped-in live plant starts small (existing rule): a fully grown trailing pothos is lost on swap. Decide whether the swap list or the item's note should say so (the inventory notes are one line, 80 characters), and if a note change is needed add it to docs/text-review.md. Open question for Marc, if it comes up: record it as a `decisions` entry with a recommendation rather than guessing.
- **Saves.** An old save with a stage in the old range loads unchanged; a hand-edited stage above a family's maximum is cut down, never an error. The `plantStage` maximum follows the longest family.
- **Tests.** Per-family stage counts and thresholds; the pothos and monstera reach each new stage and the wilted look at each stage; the snake plant and spider plant are unchanged; the overlay is drawn at the right position and size; the golden frames for a fresh game do not change (nobody has the pothos or monstera at the start).
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git status clean; docs/decor.md ('What issue 149 built') and docs/art-style.md updated.

## Progress log
- 2026-11-23 (planner): filed on main with its open decisions (the issue file is born on main).
- 2026-11-24 (claude): started on branch issue/149-plant-stages (worktree ../sim-worktrees/149-plant-stages). Plan: per-family `wateringsToGrow` and `overhang` (extra pixels above the slot, per stage) in `FamilyRules`; pothos 6 stages (two new, the last two taller, 24 and 32 px high), monstera 5 (one new, 24 px high); a tall wilted sprite for each tall stage; `settlePlant` takes the held family's rules; stage var max 5; art in art/src.
- 2026-11-24 (claude): built. `FamilyRules` gained `wateringsToGrow` and `overhang`; `Decor.growth`, `DecorLook.up`, `settlePlant(state, rules)`; game.ts draws a prop at `y - up`. Pothos 6 stages, thresholds [2,3,4,6,8]; monstera 5, [2,3,4,7]; snake and spider unchanged. New sprites (all 16x32, the top 16 rows reach over the shelf; sprites must be whole tiles): pothos-4, pothos-5, monstera-4 and wilted versions pothos-wilted-4/5, monstera-wilted-4. `plantStage` max 3 to 5. Tests: decor-plants-149.test.ts (13) and decor-plants-147.test.ts adjusted for the new families. Golden frames unchanged (no re-record). Docs: decor.md 'What issue 149 built', art-style.md. Looked at every stage in the real room (dev server, Chrome, save seeded with the plant placed): pothos 0 to 5 and monstera 0 to 4 at 6x crops and 1x full frame, wilted at pothos 2 to 5 and monstera 2 to 4. Seen: 0 to 3 as before; pothos 4 shows a few vines starting over the books, pothos 5 a green trail up over the books and the bowl's edge, monstera 4 a bigger dense crown over the books; wilted: yellow-tan limp leaves, and for the tall stages a few faint tan vines lying over the shelf top. Decision d3 added (swap note, default no change).
- 2026-11-24 (reviewer): independent review. Verdict: approve. Checks: npm test (176 files, 4000 passed), tsc, build, check:dist, issues:check --validate, `npm run sprites` leaves git status clean. My own script (outside the repo) watered each family one at a time: snake and spider change stage at waterings 2, 5, 9 (as before); pothos at 2, 5, 9, 15, 23; monstera at 2, 5, 9, 16; stage vars -1..7 clamp to 0 and to each family's last sprite, wilted and not, with `up` 16 only for pothos 4 and 5 and monstera 4 (the wilted tall ones use their own sprite, `<family>-wilted-<stage>`); snake and spider never have `up`. Hand-edited stage above the max draws the last stage and is cut at the next watering. Pass: stages per family, taller sprite (data field `overhang`, drawn at y - up after the bookshelf; the covered rows are books and bowl only, no task zone), saves, tests, standard checks, docs (note: docs/decor.md line 60, the issue 147 section, still says every live family is `{ stages: 4 }`; superseded by the 149 section, harmless). Swap behaviour: no change, d3 is open with a default of no change and is optional. Saw in the real room (dev server, Chrome, 1x full frame and 8x crops): pothos 0 to 3 as before; pothos 4 a few vines over the book tray above the pot; pothos 5 a denser green trail over the books and the bowl's lower edge, so it reads as vines climbing up the shelf's top rather than hanging down over its edge (judgement call, it does read as a plant overgrowing the shelf); monstera 4 a clearly bigger dense crown of split leaves that covers the books tray, reads as bigger leaves; wilted pothos 2/3 yellow-tan limp as before; wilted pothos 4 and 5 look almost the same as each other, a few faint tan specks floating above the pot, which are only loosely connected to it (judgement call, a little weak but nothing looks broken); wilted monstera 4 a yellow-gold mass over the books above the white pot, connected and clearly wilted. Snake and spider plant unchanged (stages 2 and 3, wilted and not). Not verified: a long real play session and the watering pace (left in `unverified`).
- 2026-11-24 (claude, round 2, after Marc tried it): two changes. (1) Item-aware task text: `DecorItem.taskName` (snake plant, pothos, monstera, spider plant) and `Interactable.itemWord`; the three plant tasks' names now follow the plant on the shelf ("Water the pothos", "Water the drooping monstera"); the snake plant's names read exactly as before; prompts say "the plant" generically and are unchanged; `validateDecorData` and a test over every plant item check the font can draw every task name; documented in decor.md and as built in decor-expansion-design.md (P4). The Green Thumb achievement text ("Water the snake plant three times.") is not a task name and was left alone. docs/text-review.md and the snapshot were not touched (no existing line changed wording). (2) The pothos now hangs down over the bookshelf's south face instead of climbing up: `overhang` is `{ up?, down? }` per stage (pothos 4 and 5 `{ down: 16 }`, monstera 4 `{ up: 16 }`); pothos-4, pothos-5 and the two wilted ones redrawn (16x32, slot rows on top, 12 rows of hanging vines below, last 4 rows clear). Checked on the real map: the shelf is column 10, rows 1 to 4; its south face is local rows 53 to 62 (drawer fronts); the tile south (column 10, row 5) is open floor where the player stands for the plant tasks and nothing is drawn past the shelf's own last row, so no vine covers the player or a task spot; draw order is unchanged (by the shelf's bottom edge) and a test checks the player is drawn after the plant. Looked at in the room (dev server, Chrome): pothos 3, 4, 5 at 8x and 1x; wilted 2 to 5; monstera 3 and 4 unchanged; the player standing south of the shelf at 1x; the progress label reads 'Water the pothos' while watering. Saw: stage 4 a few green strands dangling over the first drawer front, stage 5 a thicker curtain down most of the face; wilted 4 two short limp yellow strands, wilted 5 more of them, hanging and drooping; it reads as hanging, not climbing. Golden frames unchanged.
