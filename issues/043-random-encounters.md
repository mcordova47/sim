---
id: 043
title: Random encounters (explore the idea)
status: todo
owner: marc + claude
depends_on: []
---

## Goal
Marc's brother suggested random encounters, in the Pokemon sense. It isn't thought through, so this issue is to decide what it would mean in a studio apartment, then (only if it holds up) build a small version.

## Acceptance criteria
- A short design note in `docs/random-encounters.md` with three or four concrete ideas (for example: walking the floor sometimes triggers a thought, a text from a friend, a neighbour noise, a pigeon at the window, an unexpected delivery), what each does (a dialog, a small choice, an effect on mood or energy), how often, and how it avoids being annoying. Marc picks.
- If Marc picks one: a minimal build (a rate per step or per tile zone, a short dialog from a list, a cooldown, a way for the player to turn them off), using the dialog system and state.
- Tests for the rate and cooldown; `npm test` and `npm run build` pass.

## Progress log
