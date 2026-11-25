---
id: "176"
title: "A pause-screen outfit equip screen, and a character preview"
short: "Outfit equip screen"
status: in-progress
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
    status: answered
    answer: "as recommended"
    by: marc
    on: 2026-11-24
  - id: d3
    who: marc
    q: "Where does the equip screen live?"
    options:
      - "a new pause page (for example OUTFITS) next to THINGS"
      - "inside the THINGS page as a second tab"
      - "somewhere else"
    recommendation: "a new pause page (for example OUTFITS) next to THINGS"
    status: answered
    answer: "as recommended"
    by: marc
    on: 2026-11-24
  - id: d4
    who: marc
    q: "What is the bookshelf's Change clothes list for once the pause screen can equip?"
    options:
      - "keep it as built: wear a slot now and also pick the outfit in each slot"
      - "the bookshelf only wears a slot now; picking outfits for slots is only on the pause screen"
    recommendation: "keep it as built: wear a slot now and also pick the outfit in each slot"
    status: answered
    answer: "as recommended"
    by: marc
    on: 2026-11-24
  - id: d5
    who: marc
    q: "On the OUTFITS page, equipping an outfit into the slot you are wearing changes your clothes on the spot (this is what Decor.equip already does and what the bookshelf does). Keep that?"
    options:
      - "yes, the page uses equip as it is"
      - "no, the page only edits the slots and your clothes change at the bookshelf or on an occasion"
    recommendation: "yes, the page uses equip as it is"
    status: open
  - id: d6
    who: marc
    q: "Does the OUTFITS page also have a key to wear a slot now?"
    options:
      - "no, wearing a slot stays at the cube bookshelf (the page is for choosing what goes in the slots)"
      - "yes, a key on the page wears the highlighted slot"
    recommendation: "no, wearing a slot stays at the cube bookshelf (the page is for choosing what goes in the slots)"
    status: open
  - id: d7
    who: marc
    q: "Which keys: F opens OUTFITS from the pause list on desktop, and Tab or Q turns the character (the game's cycle keys; the touch layer's CHOICE button sends Tab)?"
    options:
      - "F to open, Tab or Q to turn"
      - "other keys (say which)"
    recommendation: "F to open, Tab or Q to turn"
    status: open
  - id: d8
    who: marc
    q: "If PHOTOS is removed later: what happens to the pictures already stored in the browser?"
    options:
      - "one quiet clean-up deletes the stored pictures and the look setting on the next load, so nothing invisible is left on a device"
      - "leave them where they are"
    recommendation: "one quiet clean-up deletes the stored pictures and the look setting on the next load, so nothing invisible is left on a device"
    status: open
unverified:
  - "Everything was drawn with the game's own soft canvas in a script outside the repo and looked at as PNGs; nothing was run in a browser (feel, spacing and tap size on a real phone, the CHOICE button on the pause screen)."
  - "How the load treats a saved task id that no longer exists (scroll-photos), which a later PHOTOS removal would need to test."
  - "Whether the legend running into the achievement count and the voice button overflowing at 224 wide (seen in the render of the existing pause screen) also happens in the real game."
  - "Reviewer (2026-11-24): the mockups and layout numbers were checked against the code and by reading the PNGs; nothing was run in a browser by the reviewer either (the touch layer's CHOICE reaching the pause screen, tap size and feel on a phone are still open)."
  - "Reviewer round 2 (2026-11-24): still nothing run in a browser: tap size and feel on a phone, the CHOICE button reaching the pause screen, an old save with scroll-photos, and whether the 224-wide legend and voice-button overlap exists in the real game are unverified, not passed."
  - "Reviewer round 3 (2026-11-24): nothing run in a browser; tap size and feel on a phone, the CHOICE button on the pause screen, an old save with scroll-photos and the 224-wide legend overlap in the real game remain unverified."
needs:
  - who: marc
    kind: decide
    why: "Look at the mockups in docs/outfit-equip-screen-mockups/ and answer d5 to d8, and say whether PHOTOS is removed now or later (d1 left that to the mockups)."
    since: "2026-11-24"
---

## Goal
Marc (2026-11-24), after trying the outfit slots (issue 175), two ideas. (1) An additional screen on the pause screen to equip the outfit slots that evokes the equipment screen of a classic role-playing game (a list of the characters' slots on the left, a list of what can go in the selected slot on the right, a description bar on top, a pointer); obviously not a copy: it needs the game's own look. The pause screen is getting crowded; separately Marc has been thinking about getting rid of photos because it did not end up feeling natural and was too much friction (see d1). (2) A preview of the character wearing the outfit, since the game shows the player from the side or the back; it could be the same resolution but bigger, or a slightly higher resolution, which adds complexity and is not needed now. A screenshot of the classic screen is in Marc's session (the left column of slots with their equipped items, the right column of the items that fit, a title bar and a description line); it is only inspiration and nothing from it is copied or named in the repo.

## Acceptance criteria
A DESIGN issue: `docs/outfit-equip-screen-design.md` with mockups rendered with the game's own font, palette and sprites at 320x192 and the phone layout 224x208 (the agent looks at them itself): the screen's structure (the four slots on the left with their equipped outfit, the owned outfits that fit the selected slot on the right, a title and a description bar (keep Marc's rule for the bookshelf list: no explanatory text beyond the outfit's own note; a description bar showing the outfit's deadpan note is fine), a pointer or highlight in the game's style), how it fits in the pause screen (read `src/game/achievements` and the pause pages: THINGS, PHOTOS, legend, flashcards and so on; show the pause screen's page list with and without PHOTOS and say what the crowded part is and how many pages fit), the character preview (the player drawn larger at its four facings with a turn key, the outfit applied live as you move the highlight, and what a higher-resolution step would cost: sprite counts and the generator's role), keys and touch, how it shares the equip logic of issue 175 (the same `Decor` functions, no duplicate state), the quiet-collecting rules, a size and a staged build plan, and a recommendation on the photos. Questions beyond d1 to d4 go in this file as `decisions` with a recommended default. No code and no art in this issue; nothing is removed by it.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main).
- 2026-11-24 (agent): status in-progress. Plan: read the code and the earlier designs, render the pause screens with the real draw functions and the new page with the game's own font, palette and sprites at 320x192 and 224x208, write docs/outfit-equip-screen-design.md.
- 2026-11-24 (agent): done, status review. Wrote docs/outfit-equip-screen-design.md and 16 mockups in docs/outfit-equip-screen-mockups/ (7 of the OUTFITS page: three desktop, two phone, two early-game; 9 of the pause screen: today, OUTFITS added with PHOTOS kept, OUTFITS in place of PHOTOS, each on desktop, touch 320x192 and phone 224x208). Rendered by a script outside the repo that uses the real drawList, pauseButtons, drawText, drawButton, hintLine, the palette and the real .sprite files; I looked at every image. Design: a new pause page OUTFITS (slots left with WORN, the owned outfits for the slot right, the highlighted outfit's own note on top, the character at 4x with the four facings, Tab or Q turns), built only on Decor.slotChoices, equippedIn, equip and wornSlot; no new state, no new art. Findings: the pause screen has one home and four pages; touch has eight buttons filling exactly four rows, so a ninth overlaps the page control; desktop fits five hints with 1.8 px gaps; the desktop hint line would vanish at the 27th achievement (a latent issue, not mine); every place PHOTOS touches is listed in section 4 with nothing removed; a higher-resolution preview is costed in section 6 and not recommended now. New decisions d5 to d8 added with recommended defaults; d1 to d4 left open and untouched. Only docs and images were added; no code, no art, nothing removed. Not checked: see `unverified`. Awaiting independent review.
- 2026-11-24 (reviewer, independent): verdict CHANGES NEEDED (small, wording only); status left at review as asked. Checked: git diff main is docs/ (the design, 16 PNGs) plus this issue file only, with no code, no art, nothing removed and reference-photos untouched; the repo text names no other game and copies none of its text (only "classic role-playing game"); d1 to d4 are unchanged and open; d5 to d8 each carry a recommendation; `npm run issues:check -- --validate` passes (212 valid, the 125-char summary is a warning only); `npm test` passes (183 files, 4381 tests). I looked at all 16 PNGs: sizes are 320x192 and 224x208 at 3x, they use the game's pixel font, palette, borders, the butter triangle pointer and the real sprites, and they match the table in section 1 (note texts match decor-data.ts for hoodie, denim, blazer, pajamas, casual, robe; worn, dash and early-game states are right). Criteria: structure of the screen pass; pause-screen fit pass except the first item below; preview with four facings and turn key pass; higher-resolution cost pass (156 walk files, 223 player-* files, 13 outfits, 9 generated from player-casual, 3 poseOnly bases, ten rules in RULES; all confirmed); keys and touch pass (CYCLE_KEYS Tab/KeyQ, touch cycle sends Tab, A is KeyE, B is Escape, PREVENT_DEFAULT has Tab); shared equip logic pass (equippedIn, slotChoices, wornSlot, equip, item exist in decor.ts, equip moves `worn` when the slot is worn, onChange saves at once, game.ts update runs syncOutfit before the paused branch); quiet-collecting pass; staged plan pass; photos recommendation pass; PHOTOS touch list (section 4) pass: every line number checked (feature.ts:150, :389 is the comment above the exclusion, config.ts:164, :492, apartment.ts:142, state-vars.ts:36, activity.ts:94, tasks.ts:71-72, :267, :309, the reel dir is 9 source files and 1,036 lines, tests 1,166 + 1,846, feature.ts 105 matching lines) and my own search found nothing missing. Arithmetic checked: footerTop 164 (touch) and 180 (phone), 12 and 14 per page, 3 and 2 pages; a fifth row gives 8 and 10 per page, 4 and 3 pages; desktop rows end at y 148 with the limit at 155 and 27 achievements would end at 158, so the 27th does hide the hint line; four hints have 22 px gaps and five have 1.75 px.
- Required changes (checklist): [ ] 1. docs/outfit-equip-screen-design.md section 3 ("With PHOTOS", first bullet) says five hints on the desktop line are "cramped, still readable", and the recommendation says "the desktop line still fits"; but pause-desktop-2-with-outfits-and-photos.png shows them touching ("SYNCI: THINGSO: PHOTOSF: OUTFITST: TRANSFER SAVE"), which is not readable, and the 'In short' paragraph already says it "reads as one run". Make the text agree with the image (the line does not work at five hints without a layout change, for example a second line or shorter hints) so d1 is not decided on a wrong claim. [ ] 2. Section 1 says the longest note is 44 characters (264 px); it is 45 (outfit-out-button-up, 269 px). It still fits the 308 px bar; fix the number. [ ] 3. Section 11 d7 and the d7 text say F and Tab/Q are "free in the pause screen"; F is the transfer page's save-file key (feature.ts:940), so say it is free on the pause list only (the pages are separate, so no clash). [ ] 4. Optional: on the slots the touch keys line says "A: EQUIP" but A there goes into the list (section 2); say so or label it. Could not verify (recorded in `unverified`): everything in a browser, feel and tap size on a phone, the CHOICE button on the pause screen, an old save with scroll-photos, whether the 224-wide legend overlap is in the real game. After these wording fixes it should be approved; the planner updates PLAN.md only on approval.
- 2026-11-24 (agent): Marc answered d1 to d4 on main (photos are going, now or later; d2 to d4 as recommended); the branch copy now matches. The design is revised: the pause screen without PHOTOS is the primary mockup, the document says what removal involves and recommends removing now, as its own issue before the OUTFITS build. Reviewer's wording fixes made (desktop five-hint line, the 45-character note, F on the pause list only, A on the slots).
- 2026-11-24 (reviewer, round 2, fresh eyes): verdict CHANGES NEEDED (one omission in the PHOTOS removal list); status left at review as asked. Checked: `git diff main...issue/176-outfit-equip-screen` is the design doc, 16 PNGs and this issue file only (plain `git diff main` also shows issue 177 because main moved on; the branch does not touch 177); no code, no art, nothing removed. d1 to d4 on the branch are answered with the same answer text, by and date as main. d5 to d8 are open and each has a recommendation. No other game's name in the new text (only "classic role-playing game"; the repo's own game name appears as before). `npm run issues:check -- --validate` passes (212 valid, summary-length warnings only); `npm test` passes (183 files, 4381 tests). Earlier review's four items: all fixed in the doc text (section 3 says five hints are unreadable and the recommendation no longer says the line fits; the longest note is 45 characters; F is free on the pause list only, with the transfer page's save-file key noted; A on the slots is explained). Mockups: I looked at the pause-desktop-3, pause-touch-3, pause-phone-3, equip-2 and equip-5 PNGs (sizes 960x576 and 672x624 = 320x192 and 224x208 at 3x); the primary pause mockups have no PHOTOS (OUTFITS in its place, eight buttons, four hints) and the equip pages use the game's font, palette, pointer and real sprites. Criteria: structure, pause-screen fit with and without PHOTOS and the page count, preview and facings, higher-resolution cost, keys and touch, shared Decor logic, quiet collecting, staged plan, photos recommendation (remove now, with reasons, and what removal involves): pass. Engine claims re-checked: decor.ts equippedIn/slotChoices/wornSlot/equip/item exist; CYCLE_KEYS is Tab and KeyQ; syncOutfit runs at game.ts:780 before the paused branch at :819; onChange saves at once (feature.ts:189); line numbers feature.ts:150, :389, :492-493, :940, config.ts:164, :486, :576-578, activity.ts:94, state-vars.ts:36, apartment.ts:142, tasks.ts:71-72, :267, :309, game.ts:512 all match; counts match (photos-draw 388, gallery-draw 99, feature.ts 1,144 lines and 105 matching lines, reel/ 9 files and 1,036 lines, reel tests 1,166, activities/reel.ts 207, 223 player-* files, game.ts 27 mentions).
- Required changes (checklist): [ ] 1. Section 4 'Docs and text' misses places that mention the reel or photos and would be stale or broken after a removal: `docs/learn/02-words.md` (lesson 02 is built on `REEL.phoneLines` and `REEL.closeupLines` in config.ts lines 473 to 492 and on `activities/reel.test.ts`, and its check runs `npm test -- ... reel.test.ts`, so removal would break a learning lesson Marc uses; it needs a replacement exercise or a rewrite, say so), `docs/learn/reference-repo-map.md` (lines 18, 25, 31: REEL, the reel activity, the reel/ folder), `docs/activities.md:72` (the photo scene row of the interruption table) and `docs/contributing.md:30` (the rule about photos from the photo reel). Add them to the list, and mention in section 3 or 9 that stage 0 must also settle lesson 02. Nothing else found missing. [ ] 2. Optional: section 4's 'feature.ts:389' is the comment line above the `hasPhotos` exclusion (the code is :390); harmless. After item 1 it should be approved; PLAN.md is the planner's.
- 2026-11-24 (reviewer, round 3, fresh eyes): verdict CHANGES NEEDED (two small gaps in the PHOTOS removal list; everything else passes); status set to in-progress. Scope: `git diff main...HEAD --name-only` is the design doc, 16 mockup PNGs and this issue file only; no code, no art, nothing removed; no other game's name or text (grep clean; only "classic role-playing game"); no paths, emails or personal details in the diff. d1 to d4 answered, d5 to d8 open with recommendations, the decide need left as it is. Round 2's fix: checked by grepping docs/ and scripts/ for photo, reel and gallery. The learn lessons are now covered (02-words.md, 05-state-and-sprites.md, reference-repo-map.md lines 18, 25, 31; activities.md:72 and contributing.md:30 too), and the 'Docs and text' list matches what I found for 02, 05, the map, activities, contributing, text-review, reduced-motion, real-world and the two photo design docs. Two omissions remain. (1) `docs/learn/11-narrow-layout.md:21` points the learner at `src/game/achievements/gallery-draw.test.ts` (lines 3 to 20) as the stuck-hint; removal deletes that file, so the link breaks (the lesson itself, the pause legend, survives; it needs a different example test). (2) The tooling that reads the two photo design docs: `scripts/issues.mjs:511-512` (`DOC_ISSUES` maps `docs/photo-gallery-design.md` to 117 and `docs/photo-reel-design.md` to 113) and `scripts/issues-decisions.test.mjs:138-140` (reads `docs/photo-gallery-design.md`), so deleting those docs (section 4 lists them) would break the issues tooling and its test unless the mapping and the test are updated; also issue 143 names photo-gallery-design.md in its log (history only). Spot checks against code, all pass: pause pages (`page` union at feature.ts:112 is list, transfer, sync, things, photos = four pages); PAUSE_TOUCH comment counts eight buttons, buttonsTop 17, 16 high, 2 gap, pageTop 89; keys KeyT, KeyP, KeyI, KeyO at config.ts:572-578; line counts photos-draw 388, gallery-draw 99, feature.ts 1,144, activities/reel.ts 207, reel/ 9 source files 1,036 lines (about 1,700 source lines holds: 388+99+1,036+207 = 1,730), reel tests 5 files 1,166 lines, the seven other test files 1,846 (total 3,012, so about 3,000 holds); Decor has equippedIn (decor.ts:165), slotChoices (:175), wornSlot (:180), equip (:186); CYCLE_KEYS is Tab and KeyQ (interaction.ts:14); inventory-draw.ts is 224 lines and uses entryScale; hint line: draw.ts:226 draws only when rowsBottom <= footerTop - 9 = 155, 26 achievements give 13 rows, ends 148, 27 give 14 rows, ends 158, so the 27th hides it, and the line has four hints (SYNC, THINGS, PHOTOS, TRANSFER) so the five-hint gap arithmetic is as stated; 4x of 16 is 64 and fits the 80 px preview box. Mockups looked at myself: equip-2 (desktop list focus, longest name, turned left), equip-5 (phone slots, ROBE), pause-touch-3 (OUTFITS in place of PHOTOS, eight buttons, no overlap, 3 pages): legible, game font and palette, WORN, dash and pointer as described, no count anywhere. Criteria: structure, pause-screen fit, preview, higher-resolution cost, keys and touch, shared Decor logic, quiet-collecting rules, staged plan, photos recommendation: pass. 'What each removal touches' (section 4 completeness): fail until the two items below are added. Required changes: [ ] 1. Add docs/learn/11-narrow-layout.md (its stuck-hint names gallery-draw.test.ts) to the Docs and text list, and say the removal issue must give it another example. [ ] 2. Add scripts/issues.mjs (`DOC_ISSUES`, lines 511-512) and scripts/issues-decisions.test.mjs (lines 138-140) to the list, with a note that they must change if the two photo design docs are deleted (or that those docs stay as history). Not run: npm test, the validator is run below.
