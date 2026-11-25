---
id: "181"
title: "Build the OUTFITS pause page"
short: "OUTFITS page build"
status: todo
owner: marc + claude
depends_on: ["180"]
summary: "A pause page for choosing what goes in each outfit slot, with a larger character preview."
kind: build
changelog: "A new OUTFITS page on the pause screen lets you choose what goes in each outfit slot and preview it."
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
needs: [{who: marc, kind: try, why: "Try the OUTFITS page, ideally on your phone: cd ~/Dev/repos/mcordova47/sim-worktrees/181-outfits-page && npm run dev, open /?own=outfit-casual-hoodie,outfit-casual-cardigan,outfit-casual-denim-jacket,outfit-pajamas,outfit-pajamas-striped,outfit-pajamas-robe,outfit-out,outfit-out-blazer,outfit-out-peacoat (add &touch=1 for touch), press L to pause then F; answer d1 and d2; then say 'merge 181'", since: 2026-11-24}]
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
