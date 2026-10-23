---
id: 002
title: Player movement and collision
status: done
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
- 2026-10-22: Starting in worktree `../life-worktrees/002-player-movement`. Plan: `world.ts` (rect/solid types and collision), `player.ts` (state, input-driven update), `controls.ts` (key mapping), a placeholder room in `placeholder-room.ts` (named so it won't collide with the real `room.ts` that issue 005 produces), tuning in `config.ts`.
- 2026-10-22: Done, ready for review. Added `src/game/{world,player,placeholder-room}.ts`, `src/input/controls.ts`, a `PLAYER` tuning block in `config.ts`, and rewired `main.ts` (placeholder scene replaced by a controllable player in the placeholder room). Controls: A/D or arrows to move; Space, W or Up to jump.
  - Acceptance criteria:
    - Left/right with acceleration and friction (separate ground and air values), gravity, jumping: implemented in `Player`. Checked by a headless script.
    - Variable jump height, coyote time, jump buffering: implemented. Headless checks: full-hold apex 37.8px vs 13.7px for a tap; a jump 3 frames after leaving a ledge works, 12 frames after does not; a press 6px above the ground fires on landing.
    - Collision against axis-aligned rects, one-way platforms: implemented (axis-separated resolution; one-way only catches from above). Checked: landing on floor, couch top, shelf; blocked by couch side and walls; jump up through the shelf and land on it; no fall-through at max fall speed.
    - Room geometry is data: `Solid[]` in `placeholder-room.ts`; physics only sees the array.
    - All tuning in `PLAYER` in `config.ts`.
  - Checks run: `npm run build` passes. Headless physics script (esbuild bundle run under node; 13 checks, all pass) lives outside the repo, so there is no test suite in the repo yet.
  - **Not checked in a browser:** how the movement feels (acceleration, jump arc, interpolation smoothness). Needs Marc to play it.
  - Notes for the planner and for issue 005:
    - Effective jump apex is about 38px, not the configured 40 (discrete integration). Reachability checks in 005 should use about 37px. The placeholder steps are 36px, so they work with little margin.
    - Resolution assumes the player never starts overlapping a solid. A spawn inside a solid gets ejected unpredictably (once through a wall). Fine for static levels; keep spawn points clear.
    - The placeholder room is in `placeholder-room.ts` so it won't conflict with the real `room.ts` from 005.
    - No drop-through for one-way platforms yet (not in the criteria).

- 2026-10-22: **Review (independent): APPROVE.**
  - `npm run build` (tsc --noEmit + vite build): pass. No test suite in repo. Diff vs main touches only the issue file, `config.ts`, `placeholder-room.ts`, `player.ts`, `world.ts`, `controls.ts`, `main.ts`; no PLAN.md, other-issue or skill edits; no reference-photos or personal data.
  - My own headless checks (esbuild bundle of `player.ts` run under node, driven with simulated Controls; temp scripts kept outside the repo):
    - Left/right with accel/friction, gravity, jump: **pass**. Reaches maxSpeed 90 exactly, friction stops to 0, grounded/air values used separately.
    - Variable jump, coyote, buffering: **pass**. Apex 37.8px held vs 6.4px for a 1-frame tap. Jump just after walking off a ledge works. Press about 6px above ground jumps on landing. Holding jump through landing without a fresh press does not bunny-hop. No mid-air double jump.
    - Collision and one-way: **pass**. Exact corner landings (dx -10/-9.99/0/63.99/64/64.01 against a block edge) land on the block or miss it correctly. Diagonal run/fall into a block corner never overlaps. Jumping into a ceiling or the underside of a solid block stops the rise with no overlap. In the placeholder room a full jump from under the shelf rises through it and lands on top (apex 124.2 vs shelf top 140); a tap under it does not land on it; walking sideways into a one-way is not blocked; a player already overlapping a one-way falls through it. 400k-step random-input fuzz (dt 1/60 and 1/30) in the placeholder room: 0 solid overlaps, 0 out-of-bounds.
    - Room geometry is data (`Solid[]` in `placeholder-room.ts`, `world.ts` types): **pass** by reading the code.
    - All tuning in one config object (`PLAYER` in `config.ts`): **pass** by reading the code. Jump speed is derived from `jumpHeight`.
  - **Feel in a browser: can't verify.** Author/user-reported only: Marc played it and says the movement feels good. I did not run a browser.
  - Out-of-scope or non-blocking findings (no action required for this issue):
    - `Player.update(dt)` is only safe for small dt. With dt >= 0.1 it tunnels through floors and thin walls (e.g. dt 0.25 fell through the floor). This cannot happen today: `loop.ts` always calls `update(TIMESTEP)` with fixed 1/60, so `MAX_FRAME_TIME` never reaches physics. Anyone calling `update` with a variable dt later should know.
    - Author's noted limits stand: apex about 38px (placeholder steps are 36px), spawn must not overlap a solid, no drop-through for one-way platforms.
  - PLAN.md table row for 002 needs updating by the planner (still shows `todo`).
