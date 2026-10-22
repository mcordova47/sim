---
id: 005
title: Floor plan and task list
status: blocked
owner: marc + agent
depends_on: []
---

## Goal
Turn Marc's real apartment into a level layout and a list of tasks.

## Blocked on
Marc to provide photos of the apartment (each wall and corner), rough room dimensions and a few furniture measurements (couch, bed, counter, desk).

## Photo handling
Photos are placed in `reference-photos/` (gitignored). Read them by path. Do not copy, embed or commit them, and do not write anything into the repo that identifies the address or personal belongings beyond furniture type, size and color. Output text descriptions only. Marc deletes the photos when this issue is done.

## Acceptance criteria
- Inventory of every furniture piece and fixture with approximate size and position, from photos plus measurements.
- A proposed side-on layout: which pieces are platforms, which are interactable, which are decoration. Needs Marc's review.
- Reachability check: every interactable can be reached by jumping from the floor given the physics constants in issue 002.
- Task list: for each interactable, the task name, prompt text, duration, base points and one-line joke or flavor text.
- Output as data (`src/game/room.ts` and `src/game/tasks.ts`) plus a short `docs/floor-plan.md` explaining choices.

## Progress log
