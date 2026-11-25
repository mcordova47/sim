---
id: "181"
title: "Build the OUTFITS pause page"
short: "OUTFITS page build"
status: review
owner: marc + claude
depends_on: ["180"]
summary: "A pause page for choosing what goes in each outfit slot, with a larger character preview."
kind: build
unverified:
  - "Feel and tap size on a real phone: tested only in desktop Chrome with phone emulation (touch events, ?touch=1), where taps on a slot, a row (twice to equip), the preview and BACK worked; rows are 10 game pixels tall."
  - "The CHOICE button's long press (Shift+Tab, turning backwards) reaching the page with shiftKey set: unit-tested for the page, not tried on the touch layer."
  - "The 224 x 208 layout in the running game: it never appears there (the pause view is 320 x 192, see d1); it was rendered and looked at from a script and unit-tested."
needs:
  - who: marc
    kind: try
    why: "Try the OUTFITS page on a phone (and answer d1 and d2) before it is merged."
    since: 2026-11-24
decisions:
  - id: d1
    who: marc
    q: "On a real phone the pause screen is drawn at 320 x 192, not 224 x 208 (issue 090: pause pages are full pictures), so the phone layout the design and the mockups showed (slots as rows, the preview beside the list) is built and tested but never appears. Keep it, or remove it?"
    options:
      - "keep it (it costs nothing at run time, THINGS does the same, and it is ready if the pause screen ever stays narrow)"
      - "remove the narrow layout and draw the page only at 320 x 192"
    recommendation: "keep it (it costs nothing at run time, THINGS does the same, and it is ready if the pause screen ever stays narrow)"
    status: open
  - id: d2
    who: marc
    q: "At 320 x 192 on a phone the list rows are 10 game pixels tall (about 11 screen points), small for a finger; the slots are 32 tall and fine, and the pad with A also works. Leave the rows as they are until you have tried it, or give touch a taller row (12) with a four-row list?"
    options:
      - "leave them and try it on the phone first (the pad and A are the main controls; a tap on a row only highlights it, a second tap equips)"
      - "touch gets 12 pixel rows and a four-row list"
    recommendation: "leave them and try it on the phone first (the pad and A are the main controls; a tap on a row only highlights it, a second tap equips)"
    status: open
changelog: "A new OUTFITS page on the pause screen lets you choose what goes in each outfit slot and preview it."
---

## Goal
Build what `docs/outfit-equip-screen-design.md` (issue 176, merged) designs, following Marc's answers in `issues/176-outfit-equip-screen.md` (d1 to d8): OUTFITS is a new pause page that takes PHOTOS' place (issue 180 removes photos first); the four slots on the left with WORN on the one you have on; the owned outfits that fit the picked slot on the right; a top bar that shows only the highlighted outfit's own deadpan note (no other help text); below the list the existing 16x16 character drawn at 4x (crisp pixels) with the four facings small beside it, turned with Tab or Q (a tap on touch); on the phone the preview sits beside the list; E equips (nothing is written until then, and equipping into the slot you are wearing changes your clothes on the spot, as the bookshelf does); no wear-now key (wearing stays at the cube bookshelf); F opens the page from the pause list on desktop; all equipping goes through the issue 175 `Decor` calls (`slotChoices`, `equippedIn`, `equip`, `wornSlot`), no new state and no new art; the bookshelf list stays as built.

## Acceptance criteria
- The page per the design's mockups at 320x192 and 224x208 (`docs/outfit-equip-screen-mockups/`), in the pause list and the touch buttons (PHOTOS' cell), with the hint line still readable (the design found five hints run together at 1.8 px gaps: make the desktop hint line work with the new entry; see also issue 178 about the hint line at 27 achievements, and do not make it worse), keys and touch, the game's pointer and border language (nothing copied from any other game).
- Tests: the page's cursor, the slot list, the right-hand list per slot, equip through `Decor`, the preview facings and turn, the phone layout, the touch targets, a fresh game, an old save, a save from the sync; golden frames unchanged.
- Look at the page in the running game yourself (dev server, `?own=` several outfit item ids; see docs/decor.md) at desktop and phone size and say what you saw; the reviewer must too.
- New strings into docs/text-review.md; docs/decor.md 'What issue 181 built'; a `changelog:` line (at most 140 characters); standard checks pass.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main).
- 2026-11-24 (agent): started in the worktree on branch issue/181-outfits-page. Plan: a cursor class on Decor (outfits-page.ts), the drawing and layout (outfits-draw.ts), the pause list wiring (button in PHOTOS' cell, F, fourth hint), tests, docs, then look at the page in the dev server at both sizes.
- 2026-11-24 (agent): built and checked, status review. What exists: the OUTFITS pause page (F on the desktop pause list; an OUTFITS button in PHOTOS' touch cell, row 3 right; a fourth hint `F: OUTFITS` on the desktop hint line). `achievements/outfits-page.ts` is the cursor (focus, slot, row, facing; all reading and writing through `Decor`: `slotChoices`, `equippedIn`, `equip`, `wornSlot`, `resolveOutfit`; no new state, no save change, no art). `achievements/outfits-draw.ts` is the layout and drawing for 320 x 192 and 224 x 208: top bar with only the highlighted outfit's own note, four slots with WORN and a dash for an empty one, the owned outfits the slot takes (five rows, scrolls, a small arrow, no count), the character at 4x with crisp pixels and the four facings beside it, the bookshelf's pointer, the game's borders. Tab or Q turns (Shift backwards; taps on the preview turn); E equips (equipping the slot you are wearing changes your clothes at once, the game applies it on its next frame even while paused); no wear-now key; the bookshelf list is untouched. Files: src/game/achievements/{outfits-page,outfits-draw,feature,draw}.ts, config.ts (`outfitsKey` KeyF), tests outfits-page.test.ts (33 tests) plus the two pause tests that counted seven buttons (now eight), docs/decor.md ('What issue 181 built'), docs/text-review.md. Real-browser finding fixed: the real `Sprites.draw` ignores a size, so the 4x character first showed at 1x; it now draws through `drawRegion` like THINGS, with a test that fails if `draw` is used.
- Hint line (issue 178, not touched): the desktop hint line has four hints now (SYNC, THINGS, OUTFITS, TRANSFER SAVE) with 20 px gaps (it had three with 33 px; the design's 22 px was for four with PHOTOS). It is drawn only while the achievement rows leave the line free; with 26 achievements it shows (confirmed in the running game); the 27th still hides it, exactly as before. My change only adds one entry to the `hints` array in `drawList`, so a later fix of the condition or layout (for example a second line) is not in its way. A test pins the four hints and their gaps.
- Checks run: `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npx vitest run` (174 files, 4143 tests pass; the golden frame test passes unchanged), `npm run sprites` (git clean: no art touched). Looked at in the running game (vite dev server, `?own=` with nine outfit ids, headless Chrome): desktop 1000 x 640 (pause list with the fourth hint, the page on the slots, in the list, turned, after E, PAJAMAS picked) and a 390 x 844 phone emulation with `?touch=1` (the OUTFITS button, the page at 320 x 192, taps on a slot, a row twice, the preview, BACK). What I saw: the page reads as the mockups do; the hoodie turns through all four facings; the equipped square and WORN follow E; the OUTFITS button sits in the cell PHOTOS left with nothing moved.
- Found: on a real phone the pause screen is drawn at 320 x 192, not 224 x 208 (issue 090: pause pages are full pictures), so the design's phone layout is built and tested but never shown; recorded as d1 with a recommendation. Rows are small for a finger at that size: d2. Both are open decisions on this file.
