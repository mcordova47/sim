---
id: "168"
title: "Coffee gear: more ways to make coffee"
short: "Coffee gear"
status: review
owner: marc + claude
depends_on: []
summary: "A coffee slot on the table and one on the stove, more apparatus, and task names that follow the apparatus."
changelog: "The dining table and the stove can each hold a coffee maker, and Make coffee is named for whichever one is there."
kind: build
unverified:
  - "How the table and stove items look in the running game in a browser (checked only in composed pictures at 1x and 8x, and in draw-call tests)."
  - "The long prompt Make french press coffee fitting the prompt box on a narrow phone view."
  - "Reviewer: the real game in a browser (draw order of the stove pot against the player was checked only in code: props are drawn after their piece at the same sort key, the player last)."
needs:
  - who: marc
    kind: try
    why: "Look at the coffee gear on the table and the stove in the dev server (see the progress log for the address) and say whether the pictures and names feel right."
    since: 2026-11-24
decisions:
  - id: d1
    who: marc
    q: "What should the aeropress-like device be called (a fake generic or brand name, not the real one)?"
    options:
      - "AIR PRESS"
      - "PNEUMATIC PRESS"
      - "a fake brand name such as PUSHPRESSO"
      - "something else"
    recommendation: "AIR PRESS"
    status: open
  - id: d2
    who: marc
    q: "Which apparatus in the first batch? (the pour-over cone is the default on the table today)"
    options:
      - "table: french press, drip machine, pod machine; stove: percolator, moka pot, briki (a small long-handled pot); the espresso machine, siphon and air press in a second batch"
      - "table and stove with every apparatus at once"
      - "only three: french press, moka pot, drip machine"
    recommendation: "table: french press, drip machine, pod machine; stove: percolator, moka pot, briki; the espresso machine, siphon and air press in a second batch"
    status: open
  - id: d3
    who: marc
    q: "Does the make-coffee duration follow the apparatus (a drip machine quicker than a siphon)?"
    options:
      - "no: only the task name and prompt follow it; pay, energy, mood and duration stay equal (Marc's answer to Q5)"
      - "yes: duration follows too, pay stays equal"
    recommendation: "no: only the task name and prompt follow it; pay, energy, mood and duration stay equal"
    status: open
  - id: d4
    who: marc
    q: "How do they arrive?"
    options:
      - "gifts from day 85 on (three days apart) and in the random-encounter pool when issue 163 lands"
      - "only through the random-encounter pool"
      - "both, at once"
    recommendation: "gifts from day 85 on (three days apart) and in the random-encounter pool when issue 163 lands"
    status: open
---

## Goal
Build steps G and G2 of `docs/decor-expansion-design.md` (section 6), with Marc's answers: d5 of issue 148 (the apparatus changes the task name and prompt, not the pay or the held-mug picture) and d13 (two coffee stations: a table slot and a stove slot; each apparatus fits one; the task is offered where its apparatus sits; the stove slot starts empty). Names are generic nouns or fake brands, never real ones (d12; the aeropress-like device is d1 here).

## Acceptance criteria
- Slot `coffee-table` (kind `coffee`, abs (62, 18, 16x16), a prop on `T` at local (46, 2), default today's dripper so a fresh game looks the same): redraw the `table` and `table-plate` sprites without the dripper and draw the dripper as the default item; check the mug prop and the plate variant still read; and slot `coffee-stove` on a stove burner (kitchen; check the real kitchen sprites for the stove and where it is drawn from; empty by default; kind `coffee`).
- Task text follows the apparatus (the same `taskName` and `itemWord` mechanism issue 149 built for plants, extended to the make-coffee task and its prompt), the make-coffee task is offered at the station that holds an apparatus (and may be offered at both if both hold one), pay and effects stay equal; the mug, dishes and the drink-coffee task work as today.
- The first batch of apparatus from d2 as items with art (palette only, no text), deadpan notes, gift days from d4 (state them); an espresso machine that is wider than its slot may need a narrow stylized look: say so when drawn.
- Look at all art yourself in the room at 1x and 8x and say what you saw (the reviewer must too); tell Marc how to see it with absolute `~/...` paths.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git status clean; golden frames for a fresh game unchanged; new strings go into docs/text-review.md; docs/decor.md gets a short 'What issue NNN built' section.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
- 2026-11-24 (agent): started in ~/Dev/repos/mcordova47/sim-worktrees/168-coffee-gear. Working assumptions, none answered by me: d1 AIR PRESS, d2 the first batch (table: french press, drip machine, pod machine; stove: percolator, moka pot, briki; the second batch is not built), d3 equal duration, d4 gifts from day 85 three days apart (the encounter pool waits for 163). Plan: slots and task text first, then art.
- 2026-11-24 (agent): built, status review. Table slot `coffee-table` (prop on the table, default `coffee-pourover`, table and table-plate redrawn without the dripper) and stove slot `coffee-stove` (prop on the top-right burner, starts empty). Items: french press, drip machine, pod machine (table); percolator, moka pot, briki (stove); art in `art/src/coffee-*.sprite`. Task text: new `heldSlot` on tasks and `Decor.taskPrompt`, so the name and the prompt follow the apparatus; `coffee-stove` is a second task with the same rules (`COFFEE` in tasks.ts), offered only with a pot on the stove, counted with `coffee` for Regular Order and left out of "every task". Gifts: days 85, 88, 91 (table), 94, 97, 100 (stove); the encounter pool waits for 163. Files: apartment.ts, decor-data.ts, decor.ts, game.ts, interactable.ts, tasks.ts, delivery-checkpoints.ts, achievements/data.ts and feature.ts, docs (decor.md, tasks.md, text-review.md), new test decor-coffee-168.test.ts, art and public/sprites. Tests that pinned starting items (now 8), gift count (37), checkpoints (34) and the slot list were updated; `decor-worn.test.ts` now takes "earlier gifts" by list position. Golden frames recorded again (each frame gains one call: the `coffee-pourover` prop; the table pixels are not in the log). The prompt of the table task changed from "Make coffee" to "Make pour-over coffee" (same as its name). Not built: the second batch (espresso machine, siphon, air press), so no stylized espresso machine was needed. Looked at: table with each item, with and without the plate, 8x, and the stove with each pot, 8x (composed from the sprite files, not the running game). Try it: `cd ~/Dev/repos/mcordova47/sim-worktrees/168-coffee-gear && npm run dev`, then open the address with `?own=coffee-french-press,coffee-drip-machine,coffee-pod-machine,coffee-percolator,coffee-moka-pot,coffee-briki` and use the dining table and the stove (Change the coffee gear).
- 2026-11-24 (reviewer): Review of branch issue/168-coffee-gear. Verdict: APPROVE (no fixes needed; four small nits below, none blocking).
  - Checks run in the worktree: npm test (178 files, 4267 passed, 3 skipped), npx tsc --noEmit (clean), npm run build, npm run check:dist, npm run issues:check -- --validate (207 valid, only summary-length warnings on other issues), npm run sprites (git status clean afterwards). All pass.
  - Slots (pass): `coffee-table` main (62, 18, 16x16) with prop on T at (46, 2), default `coffee-pourover`; `coffee-stove` kitchen (93, 56) on V at (29, 8), empty by default, kind coffee. My own composition of the new `table` and `table-plate` plus the cone at (46, 2) against the old sprites from main: 0 differing pixels for both, so a fresh game looks the same.
  - Golden frames (pass in spirit, deviation): the criterion says unchanged, but the log changed. I dumped full frame logs on main and on the branch (DUMP_DIR): the only difference in start-0 and start-1 is one added line, `sprite coffee-pourover 62 18`, drawn after the table. Together with the zero pixel diff, a fresh game draws the same picture. The author recorded the goldens again and said so.
  - Task text (pass): `coffee` and `coffee-stove` share one rule set (same points 70, time 6, mug, dish, energy, mood; the author's test compares the rest of both objects). Names and prompts follow the item: Make french press / drip / pod coffee at the table, Make percolator / moka / briki coffee on the stove, Make stovetop coffee as plain wording. A preview (swap list open) does not change the real task text.
  - Own edge checks (scratchpad, outside the repo, all pass): save and load round trip with moka pot on the stove and french press on the table; old saves (`{owned:[lamp], placed:{}}`, undefined, empty) give the cone on the table, nothing on the stove, cone owned; a save with the pot in the wrong slot or unowned is repaired (table falls back to the cone, stove empty); place of a pot at the table or a press on the stove is refused with nothing changed; stove swap from moka to briki, then NOTHING empties it and the stove task is hidden, a pot can be placed again; the table cannot be emptied; the cone can be swapped back in. Mug: it is one variable, so coffee made at either station is drunk at the table; with a full mug the stove offers only cook and swap (coffee hidden), as at the table. Prompt text at the stove and table checked in code (Make french press coffee, Make percolator coffee). Achievements: Regular Order uses anyOf both tasks, "every task" leaves out `coffee-stove`. Draw order: props are drawn after their piece at the same sort key and the player is added last, so the player wins ties; the pot sits on the burner and nothing in the kitchen is drawn over it.
  - Art (looked at renders I made from the sprite files with scripts/sprite-lib.mjs: table with each item, with and without the plate and the mug prop, at 1x and 8x; stove with each pot at 1x and 8x): the table still reads with the kettle, mug and plate. The kettle is not covered by anything; the mug prop sits below and in front of the kettle and the plate stands clear of the mug. Cone: tall funnel over a scale, as before. French press: glass carafe with a dark plunger knob, reads at once, its handle comes close to the table's right edge but stays on the top. Drip machine: slate frame with a pale top and a glass pot, reads. Pod machine: teal body with a lever, reads, a little busy at 1x. Table with no item (not reachable in game): bare oak on the right, as designed. Stove: percolator is a round blue-ringed lid (reads as a pot, the glass knob is the centre dot), moka pot is a pale eight-sided lid with a black handle (reads, a little like a plate at 1x), briki is an orange ring with a brown centre and a long brown handle (reads best). All three sit on the top-right burner, the teal towel line is not covered, and nothing in them is text or a readable word. Not the real game: see unverified.
  - Gift days (pass): 85, 88, 91, 94, 97, 100, after the outfit checkpoints (72) and the other existing gifts (nothing in the file is later; no gift between). Changelog sentence is 113 characters (limit 140). New strings are in docs/text-review.md ("Coffee gear (issue 168)"); docs/decor.md has "What issue 168 built". Scope: no PLAN.md edit, no other issue file touched; the other changed tests were updated for the new item and gift counts.
  - Brands: no real brand in sprites, item names, notes or text-review. See nit 1.
  - Nits (not blocking, the author or planner can pick them up):
    - [ ] docs/decor.md (the 168 section) says "AIR PRESS for the aeropress-like device", which writes the real name in a note; the issue file's own d1 does the same (planner text). Reword to "the press-style device" if the no-real-names rule covers docs.
    - [ ] `art/src/table.sprite` and `table-plate.sprite` header comments still say the table has a dripper over a mug on a scale at its east end; it is the bare table now and the cone is `coffee-pourover`.
    - [ ] Decisions d1 to d4 are still open: the build uses the author's assumptions (AIR PRESS not built yet, first batch, equal duration, days 85 to 100). Marc should answer them; the second batch (espresso machine, siphon, air press) is not built, so no stylized espresso machine was needed.
    - [ ] The per-frame golden log now has an extra call (see above); a later issue that touches the table should expect it.
  - Could not verify: the running game in a real browser (looks, motion, the prompt text on screen), and whether Make french press coffee fits the prompt box on a narrow phone view. Both are listed under `unverified`. Marc's `try` need stays open.
  - PLAN.md table needs updating by the planner (done for 168).

- 2026-11-24 (agent, round 2 after Marc's try): coffee looks good; two art changes only, no wording or prompt changes. (1) `coffee-french-press` redrawn smaller: 7 px wide and 10 tall with a small handle, shorter than the kettle and no wider than the mug. (2) `coffee-pod-machine` redrawn as a compact teal single-cup machine: pale pod lid with a yellow lever, a dark spout over a tangerine cup on a light drip tray, and a sky-and-denim water tank standing up at the back right (it reads as a pod machine at 16x16, so no replacement apparatus is proposed). Looked at on the table with the plate and mug at 8x, and at 1x (very small, the blue tank and orange cup are what stand out).
