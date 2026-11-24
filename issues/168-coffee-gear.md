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
