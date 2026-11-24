---
id: "173"
title: "Trinkets: how small things are shown and examined"
short: "Trinket display design"
status: review
owner: marc + claude
depends_on: ["151"]
summary: "Design how small things are shown in the room and examined up close: sizes, places, and a bookshelf cubby view."
kind: design
decisions:
  - id: d1
    who: marc
    q: "How are small things shown in the room?"
    options:
      - "a small version in the room (about 8x8 to 10x10 pixels, as big as the real object would be next to the furniture) with an Examine action that opens a large, detailed close-up"
      - "the room shows only a small marker for each thing, all the detail is in the close-up"
      - "keep 16x16 sprites but redraw them smaller inside the cell"
    recommendation: "a small version in the room (about 8x8 to 10x10 pixels, as big as the real object would be next to the furniture) with an Examine action that opens a large, detailed close-up"
    status: open
  - id: d2
    who: marc
    q: "Where can trinkets live besides the desk corner?"
    options:
      - "several small places, each examinable: the desk's right corner, the nightstand, the lamp table next to the lamp, the window sill by the bed, and a bookshelf cubby"
      - "only the desk corner and a bookshelf cubby"
      - "only the bookshelf"
    recommendation: "several small places, each examinable: the desk's right corner, the nightstand, the lamp table next to the lamp, the window sill by the bed, and a bookshelf cubby"
    status: open
  - id: d3
    who: marc
    q: "How does the bookshelf examine work?"
    options:
      - "Examine the bookshelf opens a composed close-up (like the sofa and side-project scenes) showing its four cubbies with books, each able to hold a trinket; you move between cubbies and can place or take one there"
      - "Examine the bookshelf shows one cubby at a time with books and an optional trinket"
      - "no bookshelf scene for now"
    recommendation: "Examine the bookshelf opens a composed close-up showing its four cubbies with books, each able to hold a trinket; you move between cubbies and can place or take one there"
    status: open
  - id: d4
    who: marc
    q: "Should every displayed trinket have an Examine action?"
    options:
      - "yes: one generic Examine at any place that holds a trinket opens its close-up card with the large sprite and its deadpan note"
      - "only on the bookshelf scene"
      - "no examine at all"
    recommendation: "yes: one generic Examine at any place that holds a trinket opens its close-up card with the large sprite and its deadpan note"
    status: open
  - id: d5
    who: marc
    q: "Reference photos for the real objects (alebrije, telescope, finger skateboard, goose egg, worry doll, raccoon in a can)?"
    options:
      - "yes, I will add photos to reference-photos/ before the art pass; the agent looks read-only and draws its own stylized sprites"
      - "no photos: draw from the kind of thing"
    recommendation: "yes, I will add photos to reference-photos/ before the art pass; the agent looks read-only and draws its own stylized sprites"
    status: open
  - id: d6
    who: marc
    q: "Should a place's prompts (Examine, Display trinket) appear only where the item is, not from every tile of the piece?"
    options:
      - "yes: a slot task's zone is the piece tile that contains the item (the desk's col 9, the nightstand's col 14, each shelf slot's own column)"
      - "no: keep every tile of the piece (Examine shows anywhere along the 4-tile desk)"
    recommendation: "yes: a slot task's zone is the piece tile that contains the item"
    status: open
  - id: d7
    who: marc
    q: "The window sill: the east windows are drawn edge-on with no ledge, so small things only sit on it if the lower window is redrawn with a ledge. Build it?"
    options:
      - "later and optional: build the desk, nightstand, shelf and cubbies first, then decide the sill (needs 2 new window sprites)"
      - "now, with the window redraw"
      - "drop the sill"
    recommendation: "later and optional: build the desk, nightstand, shelf and cubbies first, then decide the sill"
    status: open
  - id: d8
    who: marc
    q: "The lamp table has no free pixel (the lamp fills it). Drop it from the places?"
    options:
      - "drop it; the cubbies, desk, nightstand and shelf are enough"
      - "redraw the four lamps with a smaller lamp to leave a corner (large)"
      - "widen the lamp table to two tiles (large; every lamp is redrawn)"
    recommendation: "drop it; the cubbies, desk, nightstand and shelf are enough"
    status: open
  - id: d9
    who: marc
    q: "Issue 169's wall shelf: its first slot (x 160) is above the bookshelf, where nobody can stand to face it. Move the three slots one tile east, to x 176, 192 and 208?"
    options:
      - "yes: the three slots at x 176, 192 and 208, each with a standing tile (11, 1), (12, 1) and (13, 1)"
      - "no: keep x 160, 176 and 192 (the first slot can only be reached through a list)"
    recommendation: "yes: the three slots at x 176, 192 and 208"
    status: open
  - id: d10
    who: marc
    q: "How large is the examine close-up?"
    options:
      - "48x48 art shown at 3x (144x144) on both views, the same pixel size as the zoomed art"
      - "32x32 art shown at 4x (less detail, the same screen size)"
      - "64x64 art shown at 2x (more detail, the same screen size, more to draw)"
    recommendation: "48x48 art shown at 3x (144x144) on both views"
    status: open
  - id: d11
    who: marc
    q: "How are the real bookshelf's four cubbies arranged? The mockups assume a row of four."
    options:
      - "a row of four (as the floor plan's 1 tile by 4 suggests)"
      - "two by two"
      - "a column of four"
    recommendation: "a row of four"
    status: open
  - id: d12
    who: marc
    q: "What happens to the unmerged issue 167 branch, whose ten pictures are too big?"
    options:
      - "build stage A from it: keep its slot, swap task, items, notes and gifts, swap in the small pictures, and merge it only after that, so the big art never reaches main"
      - "merge 167 now and replace the pictures later (the big art would be live meanwhile)"
      - "drop 167 and start the slot again"
    recommendation: "build stage A from it: keep its data and swap in the small pictures before it is merged"
    status: open
unverified:
  - "Nothing was seen in a real browser: the mockups come from a headless harness that runs the real game code with the real sprites and font on a software canvas (all at 12:00, no lighting or animation)."
  - "All new art in the mockups (small trinkets, 48x48 close-ups, cubbies, shelf plank, sill ledge) is stand-in art made for the mockups, not final drawings."
  - "The examine card and the cubby scene were laid out and rendered but not played, and their touch behaviour was not tried on a phone."
  - "The real objects' sizes are typical sizes for each kind of thing, not measured; the real bookshelf's cubby arrangement (a row of four) is assumed."
needs:
  - who: marc
    kind: decide
    why: "Answer d1 to d12 (d6 to d12 were added by the design) so the staged build issues can be filed, and look at the mockups in docs/trinket-display-mockups/."
    since: 2026-11-24
---

## Goal
Marc (2026-11-24), after trying the first trinkets (issue 167, ten 16x16 things on the desk's right corner): they look too big, some do not look right, and small things need a different way to be displayed. His ideas: show a small version with an option to examine; on the bookshelf, an option to examine the bookshelf with a cutscene that shows one of the cubbies with some books and optionally a trinket; trinkets in various places such as the window sills by the bed, the nightstand or next to the lamp, all able to be examined. He can provide photos. Issue 167's branch (issue/167-trinkets, worktree ~/Dev/repos/mcordova47/sim-worktrees/167-trinkets) has a working slot, swap task and ten items to learn from; it stays unmerged until this design says what to keep.

## Acceptance criteria
A DESIGN issue: `docs/trinket-display-design.md` (plus mockups, rendered with the game's own font, palette and sprites at 320x192 and the phone layout 224x208, that the agent looks at itself) covering: a size policy (how many pixels each kind of object should be in the room next to the furniture and the player, with the real objects' relative sizes; the player is 16x16 and about a foot per tile), the Examine action and its close-up card (the large sprite, the note, how it closes, quiet and calm, no points) and where it appears; an audit of every candidate place against the real maps and sprites (the desk's right corner, the nightstand top, the lamp table beside the lamp, the window sills by the bed on the east wall, the cube bookshelf's cubbies, the new wall shelf of issue 169) with pixel positions that overlap nothing, block no task spot and fit the draw order, saying plainly where there is no good place; the bookshelf cubby scene as a composed view (how it opens, what it shows, how you move between cubbies, how a trinket is placed and taken, books drawn, the phone layout), reusing the composed-view precedents (issues 111 and 117); how the existing slot, swap task and ten items of 167 are reused or changed (`DecorSlot`, `trinket` kind, the empty-slot option of 151), the engine each piece needs, art counts and sizes, the text ('Display trinket' for adding or changing, see issue 174), the quiet-collecting risks, and a size and staged build plan with each stage independently releasable. Open questions beyond d1 to d5 go in this file as `decisions` with a recommended default. No code and no art in this issue. If Marc has added photos to `reference-photos/` the agent may look at them read-only to judge the real objects' proportions, but must never copy, trace, name a file from, or describe a photo in the repo.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
- 2026-11-24: started in ~/Dev/repos/mcordova47/sim-worktrees/173-trinket-display. Plan: read 167 (read only), decor-expansion-design sections 3 and 4, the maps, poses and draw order, the composed-view precedents (111, 117) and the examine/zoom precedents; render the real room headless with the real sprites and font; write docs/trinket-display-design.md with mockups at 320x192 and 224x208.
- 2026-11-24: done, in review. Design: in-room trinkets are small (a centred box of at most 10 wide by 8 tall inside the 16x16 cell, foot on cell row 12, three size steps), so any item fits any slot and a slot only positions its cell; Examine is a quiet task with a close-up card (48x48 art at 3x, name, FROM line, note, closes with E, Esc or a tap); places: desk right corner (good, 167's slot kept), nightstand (good, one small item in a 10 px gap, slot cell (230, 8)), wall shelf of 169 (very good, move to x 176 to 208), window sill (poor, needs window art), lamp table (no place); the bookshelf gets a cubby scene (row of four, 4x on 320x192, 3x on 224x208, a dedicated activity like the 117 sofa scene with the swap list and card as children); 167's slot, swap task, items, notes and gifts are kept and only the ten pictures are redrawn; six stages A to F. Files: docs/trinket-display-design.md and eleven PNGs in docs/trinket-display-mockups/ (the harness that made them is not committed). Decisions d6 to d12 added above (d1 to d5 not answered). Nothing under src/ or art/ was touched; the 167 worktree and main were not touched. Note for the planner: PLAN.md says later questions go into the issue file on main; d6 to d12 are here on the branch because this task asked for them in this file, so copy them to main's file before asking Marc. Could not check: see `unverified`.
