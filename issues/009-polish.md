---
id: 009
title: "Polish: sound, particles, achievements, time of day"
status: todo
owner: marc + claude
depends_on: [009a, 009b, 009c, 009d]
---

## Goal
Add the layers that make a no-goal game fun to poke at.

This is the umbrella issue. The work is split into four parallel pieces, each in its own module, built on the events and layers from [017](017-game-events-and-layers.md): [009a](009a-sound.md) sound, [009b](009b-particles.md) particles, [009c](009c-achievements.md) achievements and saved progress, and [009d](009d-time-of-day.md) time of day (optional). This issue is done when the pieces Marc wants are merged and he has played the result.

## Acceptance criteria
- Sound effects for jump, land, task complete and combo (generated or from a CC0 source; note the license).
- Particles for landing and task completion.
- Achievements with funny names (e.g. "Doomscrolled three times"), shown as toasts.
- Time-of-day cycle that changes lighting and which tasks score best.
- Optional: score persisted in localStorage.

## Progress log
