---
id: "153"
title: "Order takeout (a meal in the delivery pipe)"
short: "Order takeout"
status: review
owner: claude
depends_on: []
summary: "Order takeout at the nightstand phone; it arrives at the door box and you can eat it."
kind: build
unverified:
  - "How ordering, the arrival and eating feel in a browser (timing of the two-minute wait, the one-line popups, the table with the plate) was not played; only tests and the build were run."
  - "The takeout shows the existing table-plate sprite and the existing delivery-box sprite; whether a plate for a takeout meal reads right was not looked at."
decisions:
  - id: d1
    who: marc
    q: "A plate (cooked or reheated) is already on the table when you open the box with the takeout in it. The build keeps the takeout in the box, says so in one line, and the box stays until the plate is eaten. Is that what you want, or should the meal simply replace or sit beside the plate?"
    options:
      - "the meal stays in the box until the plate is eaten, with a one-line explanation"
      - "the box is refused (it cannot be opened) while a plate is on the table"
      - "the meal replaces the plate"
    recommendation: "the meal stays in the box until the plate is eaten (as built; the design note says a meal waits at the box as a package waits for a free tile)"
    status: open
needs:
  - who: marc
    kind: decide
    why: "One open question (d1): what happens when the takeout arrives while a plate is on the table. A default is built and works; nothing else waits."
    since: 2026-11-23
---

## Goal
Build step D of `docs/decor-expansion-design.md` (section 10, engine piece P7) and the idea in `docs/ideas.md` ('Order takeout'). Marc answered yes (decision d6 of issue 148): ordered at the nightstand phone, delivered to the same box, eaten at the table for 40 points, +15 energy, +5 mood, no dishes, a container to recycle, no cold timer, no money. Restaurant and app names are invented generic names (no real brand, no real delivery app).

## Acceptance criteria
- The delivery queue can hold a meal (a `kind` on `Pending`, `deliverMeal(delayHours)`), arriving at the same box tile with the same one-line arrival popup; at most one meal pending; it counts toward the cap; `load`, `collect` and `parseDeliveries` handle it (an old save loads unchanged; hostile saves cut down).
- Tasks `order-takeout` (nightstand, next to Charge your phone, about 8 points, refused with a plain reason when one is on the way) and `eat-takeout` (dining table, needs the meal, sets boxes back to 1); cook, reheat and eat-dinner interplay as the note says (the existing-plate case handled); no change to a fresh game except the new task.
- Tests for each, a golden or state test for the box, and text added to docs/text-review.md. Standard checks pass; docs/tasks.md and docs/decor.md updated.

## Progress log
- 2026-11-23 (planner): filed on main from Marc's answers to issue 148 (decor expansion design note).
- 2026-11-23 (claude): built on branch issue/153-takeout. Plan: a meal kind in the delivery queue, two tasks, requirements on cook, reheat and eat dinner.
- 2026-11-23 (claude): done, status review. What changed: `deliveries.ts` (`MEAL_ID`, `Pending.kind`, `deliverMeal`, `mealOrdered`, `mealWaiting`, `open(takeMeal)`; `collect()` leaves a meal; `parseDeliveries` and `load` handle `meal`, one at most, counted in the cap; an old save loads and writes unchanged), `game.ts` (arrival line, box opening puts the meal and plate on the table or holds it while a plate is there, `takeoutOrdered` follows the queue and queues the meal when the order sets it), `tasks.ts` (`order-takeout` 8 points at the nightstand, `eat-takeout` 40 points, 5 s, +15 energy, +5 mood, no dishes, sets `boxes` 1; `TAKEOUT IS WAITING` on cook, reheat, eat-dinner), `apartment.ts` (the two tasks placed), `state-vars.ts` (`takeout`, `takeoutOrdered`), `config.ts` (`DELIVERIES.mealDelayHours` 2), `takeout.test.ts` (24 tests), `cooldowns.test.ts`, `battery.test.ts` (its helper now matches the task it asked for, since the nightstand has two) and `boxes.test.ts` (its old-state test leaves out Eat the takeout, which sets the boxes), docs (`tasks.md`, `decor.md`, `text-review.md`). No new art; the golden frame test passes unchanged. Checks: `npx tsc --noEmit`, `npm run build`, `npm test` (3930 passed), `npm run issues:check -- --validate`. Design deviation: the meal arrives at the box even when a plate is on the table (the note's "waits at the box"); the open question is d1. Not checked: feel in a browser.
