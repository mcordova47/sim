---
id: 002
title: Player movement and collision
status: todo
owner: claude
depends_on: [001]
---

## Goal
A player rectangle that moves and jumps around a room built from solid rectangles, and feels good.

## Acceptance criteria
- Left/right movement with acceleration and friction; gravity and jumping.
- Variable jump height (release early to jump lower), coyote time and jump buffering.
- Collision against axis-aligned rectangles (floor, walls, furniture tops). One-way platforms supported.
- Room geometry is data (a list of rectangles), not hard-coded in the physics.
- All tuning constants live in one config object.

## Progress log
