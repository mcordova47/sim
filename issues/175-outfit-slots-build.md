---
id: "175"
title: "Build the outfit slots"
short: "Outfit slots build"
status: review
owner: marc + claude
depends_on: ["164"]
summary: "Build the equip slots (everyday, pajamas, robe, going out), the slot list at the bookshelf, and the two automatic occasions."
kind: build
unverified:
  - "Feel on a real phone with the touch pad (only a headless Chrome at phone size with keys was used)."
  - "The shower occasion in the running game (the bathroom was not walked to); covered by a unit test."
needs:
  - who: marc
    kind: try
    why: "Try the Change clothes list and wake up in pajamas; say if the list reads well."
    since: "2026-11-24"
changelog: "Outfit slots: wear pajamas after waking and a robe after a shower, and pick what goes in each slot at the bookshelf."
---

## Goal
Build what `docs/outfit-slots-design.md` (issue 164, merged) designs, following Marc's answers recorded in `issues/164-outfit-slots.md` (d1 to d9): four slots (EVERYDAY, PAJAMAS, ROBE, GOING OUT; the list always shows all four); strict by style via a `SLOT_STYLES` table (EVERYDAY takes home and casual, PAJAMAS takes pajamas, ROBE takes the new `robe` style, GOING OUT takes out); an empty slot falls back to everyday and the first owned outfit that suits a slot fills it; waking up (finishing the sleep task) puts you in PAJAMAS and a shower (finishing the shower task) puts you in ROBE, both automatically, with no text or sound; there is no timer: you stay in what you wear until you change by hand at the bookshelf; a manual change sticks; a nap changes nothing; the occasion is deferred until no task, dialog or pose is active; Escape in the sleep scene fires nothing. The Change clothes list (at the cube bookshelf) becomes a list of slots: up and down choose a slot, left and right change the equipped outfit (you see it on yourself at once), E wears that slot now; the phone layout is two rows per slot. The shower scene (issue 165) is a later build that uses the same occasion.

## Acceptance criteria
- Stage 1a: data and save: `SLOT_STYLES`, the `robe` style for the bathrobe (the two pajamas outfits stay `pajamas`), `decor.outfits.equipped` in the decor save (optional; old saves load unchanged and EVERYDAY is seeded from what is worn now), `parseDecor` tolerant of junk, and the device-sync merge updated in all three places in `sync/merge.ts` that copy decor fields by hand (the design's main trap), with a test that a sync round trip keeps the equipped slots.
- Stage 1b: the list activity (the two-level behaviour above, the desktop 320x192 and phone 224x208 layouts per the design's mockups, touch keys), the THINGS page unchanged, and `outfit` still derived each frame from `worn` (nothing else writes it).
- Stage 2: the two occasions through a small data table in config, applied only when nothing is active, an occasion whose slot is empty falling back to the EVERYDAY outfit, no timer, no nap change, Escape fires nothing.
- Tests for each stage (slot resolution, auto-fill, fallbacks, the occasions and the deferral, the list activity keys, the save and sync), the golden frames for a fresh game unchanged (a fresh game wears the everyday clothes), and `outfits.test.ts`'s allowed styles updated.
- Look at the list and an occasion in the running game yourself (dev server with `?own=` for several outfit item ids; see docs/decor.md) and say what you saw; the reviewer must too. Staged commits are fine, one review at the end.
- New strings into docs/text-review.md; docs/decor.md 'What issue 175 built'; the `changelog:` line stays (at most 140 characters); standard checks: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean.

## Progress log
- 2026-11-24 (planner): filed on main from the merged design (issue 164) and Marc's answers.
- 2026-11-24 (agent): built all stages on branch issue/175-outfit-slots-build. Files: src/game/outfits.ts (robe style, OUTFIT_SLOTS, SLOT_STYLES), src/game/outfit-slots.ts (pure helpers), decor.ts (equipped store, wearSlot, save, parseDecor seed), sync/merge.ts (the three hand-copied places), activities/outfit-slots.ts (the list), activities/index.ts, tasks.ts (swap-worn uses it), config.ts (OUTFIT_OCCASIONS), game.ts (occasion, applyOccasion), tests (outfit-slots.test.ts new; outfits, decor-swap, game-activities adjusted), docs/decor.md, docs/text-review.md. Decisions made: the equipped field is left out of the save while it equals what auto-fill would pick (so a fresh game saves as before); the preview uses `Decor.preview("worn", ...)`; phone box position from the player rectangle passed to `draw`; strings shortened to fit the 180 px phone width ("EMPTY: EVERYDAY CLOTHES", "NOTHING PUTS THESE ON: BY HAND"); the desktop adds ". E PUTS IT ON NOW." only when it fits and the slot is not the one worn (mockup 2 and 1 disagreed). Checks: npm test (4375 pass, golden frames unchanged), tsc, build, check:dist, npm run sprites leaves git clean. Looked at in a headless Chrome on the dev server: the desktop list, the phone list (touch=1, 392x720), left/right equipping with the preview on the player, E wearing GOING OUT, and a real sleep going from going-out clothes to pajamas on waking. Not done: ideas.md entries and sleep.md not edited (outside the listed docs; the planner may remove the two idea entries). Not checked: see `unverified`.
