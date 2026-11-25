---
id: "176"
title: "A pause-screen outfit equip screen, and a character preview"
short: "Outfit equip screen"
status: todo
owner: marc + claude
depends_on: ["175"]
summary: "A pause-screen page for equipping outfit slots (in the spirit of a classic equipment screen) with a bigger character preview."
kind: design
decisions:
  - id: d1
    who: marc
    q: "What happens to the photo feature (the photo reel, the PHOTOS page and the sofa photo scene) now that the pause screen is crowded?"
    options:
      - "show the pause screen mockups with and without PHOTOS first, then decide"
      - "remove the photo reel and gallery (a separate issue, after Marc confirms exactly what goes)"
      - "keep photos and add the outfit page anyway"
    recommendation: "show the pause screen mockups with and without PHOTOS first, then decide"
    status: answered
    answer: "photos are going: the options are remove now or remove later, depending on the mockups (not keep); the design shows the pause screen without PHOTOS and what removal involves"
    by: marc
    on: 2026-11-24
  - id: d2
    who: marc
    q: "How is the character shown in the equip screen?"
    options:
      - "the existing 16x16 art drawn larger (for example 4x or 6x, pixels kept crisp), with the four facings you can turn through; a higher-resolution character set is a later, separate step"
      - "a higher-resolution character set for the preview (a new sprite set per outfit: much more work)"
      - "both: start with the scaled one"
    recommendation: "the existing 16x16 art drawn larger (for example 4x or 6x, pixels kept crisp), with the four facings you can turn through; a higher-resolution character set is a later, separate step"
    status: open
  - id: d3
    who: marc
    q: "Where does the equip screen live?"
    options:
      - "a new pause page (for example OUTFITS) next to THINGS"
      - "inside the THINGS page as a second tab"
      - "somewhere else"
    recommendation: "a new pause page (for example OUTFITS) next to THINGS"
    status: open
  - id: d4
    who: marc
    q: "What is the bookshelf's Change clothes list for once the pause screen can equip?"
    options:
      - "keep it as built: wear a slot now and also pick the outfit in each slot"
      - "the bookshelf only wears a slot now; picking outfits for slots is only on the pause screen"
    recommendation: "keep it as built: wear a slot now and also pick the outfit in each slot"
    status: open
---

## Goal
Marc (2026-11-24), after trying the outfit slots (issue 175), two ideas. (1) An additional screen on the pause screen to equip the outfit slots that evokes the equipment screen of a classic role-playing game (a list of the characters' slots on the left, a list of what can go in the selected slot on the right, a description bar on top, a pointer); obviously not a copy: it needs the game's own look. The pause screen is getting crowded; separately Marc has been thinking about getting rid of photos because it did not end up feeling natural and was too much friction (see d1). (2) A preview of the character wearing the outfit, since the game shows the player from the side or the back; it could be the same resolution but bigger, or a slightly higher resolution, which adds complexity and is not needed now. A screenshot of the classic screen is in Marc's session (the left column of slots with their equipped items, the right column of the items that fit, a title bar and a description line); it is only inspiration and nothing from it is copied or named in the repo.

## Acceptance criteria
A DESIGN issue: `docs/outfit-equip-screen-design.md` with mockups rendered with the game's own font, palette and sprites at 320x192 and the phone layout 224x208 (the agent looks at them itself): the screen's structure (the four slots on the left with their equipped outfit, the owned outfits that fit the selected slot on the right, a title and a description bar (keep Marc's rule for the bookshelf list: no explanatory text beyond the outfit's own note; a description bar showing the outfit's deadpan note is fine), a pointer or highlight in the game's style), how it fits in the pause screen (read `src/game/achievements` and the pause pages: THINGS, PHOTOS, legend, flashcards and so on; show the pause screen's page list with and without PHOTOS and say what the crowded part is and how many pages fit), the character preview (the player drawn larger at its four facings with a turn key, the outfit applied live as you move the highlight, and what a higher-resolution step would cost: sprite counts and the generator's role), keys and touch, how it shares the equip logic of issue 175 (the same `Decor` functions, no duplicate state), the quiet-collecting rules, a size and a staged build plan, and a recommendation on the photos. Questions beyond d1 to d4 go in this file as `decisions` with a recommended default. No code and no art in this issue; nothing is removed by it.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main).
