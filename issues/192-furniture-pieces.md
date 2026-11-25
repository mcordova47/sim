---
id: "192"
title: "Furniture: replacements for the nightstand, desk, sofa and bookshelf"
short: "Furniture pieces"
status: todo
owner: marc + claude
depends_on: ["172"]
summary: "Replacement sprites for four single-sprite furniture pieces, as items in furniture slots like the record stand."
kind: build
changelog: "New nightstands, desks, sofas and bookshelves can turn up and replace the old ones."
---

## Goal
Step N of `docs/decor-expansion-design.md` (section 8), with Marc's answer (furniture only through the delivery pipe and the item pool, one piece at a time) and the pattern issue 172 built for the record stand (a `furniture` slot on the piece, the piece keeps its sprite name and object name, the old piece goes to the inventory): nightstand (48x16 at (224, 16): keep the phone prop at local x 18, the painting above, the top strip free in the middle, the swap task for the bed painting), standing desk (64x32 at (96, 16): keep the laptop where the typing pose is (local x 32-47) and the two free corners (the trinket slot and clutter)), sofa (96x32 at (32, 80): keep the cushions where the poses are (`sit-sofa` local x 61, `read-sofa` local x 45), the north side stays the standing edge), cube bookshelf (16x64 at (160, 16): keep the plant pots and their props, the bare oak where the pots sit and no baked items there; it now has three pot slots and the cubbies: check issues 182 and 187). Poses that draw their own piece (typing at the desk, sitting on the sofa) must still look right with a replacement: say how each pose finds its piece and what you did.

## Acceptance criteria
- Per piece: a `furniture-<piece>` slot with the current piece as the owned default, a swap task ('Change nightstand', 'Change desk', 'Change sofa', 'Change bookshelf': no 'the'), 2 to 4 replacement designs each as items (Marc picks designs like for the record stand: put candidates on the options page first (`npm run tools -- options`) and ship only after Marc picks; ask via an open decision), the viewpoint rule (the south-wall pieces are drawn from behind: the sofa is, and the front faces north: remember the orientation lesson of issue 172: look at the original as the template), the THINGS cell for big things (crop or reduce: decide and say), the new items are in the item pool and the ladder (a furniture shop exists from issue 172), no gift days; tests (the poses, task spots, solids unchanged, the golden frames for a fresh game unchanged); Look at all art and the result in the running game yourself (dev server with `?own=` ids; see docs/decor.md) at 1x and 8x on desktop and phone size and say what you saw; the reviewer must too; give Marc exact commands with absolute `~/...` paths.
- Stage the work if it is too big for one review: the nightstand first, then desk, sofa, bookshelf, each independently releasable.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean; golden frames for a fresh game unchanged unless the issue says which change; new strings into docs/text-review.md; docs/decor.md 'What issue NNN built' (use this issue's number); a `changelog:` line (at most 140 characters) stays.

## Progress log
- 2026-11-25 (planner): filed on main from the merged designs; not started (Marc asked to file the remaining build issues without starting them).
