---
id: "153"
title: "Order takeout (a meal in the delivery pipe)"
short: "Order takeout"
status: todo
owner: claude
depends_on: []
summary: "Order takeout at the nightstand phone; it arrives at the door box and you can eat it."
kind: build
decisions:
  - id: d1
    who: marc
    q: "Takeout (153, d1): the takeout arrives while a cooked or reheated plate is already on the table. What happens?"
    options:
      - "the meal stays in the box with a one-line explanation until the plate is eaten"
      - "opening the box is refused while a plate is on the table"
      - "the meal replaces the plate"
    recommendation: "the meal stays in the box with a one-line explanation until the plate is eaten"
    status: answered
    answer: "as recommended"
    by: planner
    on: 2026-11-23
---

## Goal
Build step D of `docs/decor-expansion-design.md` (section 10, engine piece P7) and the idea in `docs/ideas.md` ('Order takeout'). Marc answered yes (decision d6 of issue 148): ordered at the nightstand phone, delivered to the same box, eaten at the table for 40 points, +15 energy, +5 mood, no dishes, a container to recycle, no cold timer, no money. Restaurant and app names are invented generic names (no real brand, no real delivery app).

## Acceptance criteria
- The delivery queue can hold a meal (a `kind` on `Pending`, `deliverMeal(delayHours)`), arriving at the same box tile with the same one-line arrival popup; at most one meal pending; it counts toward the cap; `load`, `collect` and `parseDeliveries` handle it (an old save loads unchanged; hostile saves cut down).
- Tasks `order-takeout` (nightstand, next to Charge your phone, about 8 points, refused with a plain reason when one is on the way) and `eat-takeout` (dining table, needs the meal, sets boxes back to 1); cook, reheat and eat-dinner interplay as the note says (the existing-plate case handled); no change to a fresh game except the new task.
- Tests for each, a golden or state test for the box, and text added to docs/text-review.md. Standard checks pass; docs/tasks.md and docs/decor.md updated.

## Progress log
- 2026-11-23 (planner): filed on main from Marc's answers to issue 148 (decor expansion design note).
