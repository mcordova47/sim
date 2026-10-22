---
id: 003
title: Interaction and scoring system
status: todo
owner: claude
depends_on: [002]
---

## Goal
Let the player walk up to objects, press a key and do a task that awards points.

## Acceptance criteria
- Interactable objects defined as data: id, position, prompt text, duration, base points, cooldown.
- A prompt appears when the player is in range; pressing the interact key starts the task and locks the player for its duration.
- Diminishing returns: repeating a task within a window reduces its points.
- Streak/combo hook: a score multiplier when different tasks are done in quick succession (rules can be simple, tuned later).
- Task definitions live in a single data file so adding a task needs no engine changes.
- Three placeholder tasks to prove it out (e.g. fridge, sink, bed).

## Progress log
