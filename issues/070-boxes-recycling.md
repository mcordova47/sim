---
id: 070
title: Boxes: flatten, take out the recycling, they disappear
status: todo
owner: claude
depends_on: [066]
---

## Goal
Marc's idea (2026-10-26), building on issue 066: flattening the boxes should look like tidying them, and taking out the recycling should make them go away. The flow is: a package arrives and opens (a stack of boxes appears), you flatten them (they look a bit tidier), you take out the recycling (they disappear). Marc does not currently have a recycling bin, he takes the boxes out directly. Later a recycling bin can be an item to get (issue 062) that changes how flattened boxes look: a full recycling bin instead of a flat pile.

## Acceptance criteria
- The `boxes` state gets three values: 2 = a stack (a package was opened), 1 = flattened and tidy, 0 = gone. (Check the numbering against issue 066's choice and keep old saves meaning the same thing: the stack stays the default and an old value of 1 must not change meaning silently: use new names or a migration, say which.) The kitchen draws the three looks: the stack (`boxes`), tidy flat boxes (`boxes-flat`), and nothing (the area shows the bare floor and the pantry tub still shown: `boxes-gone`, the tub alone).
- `flatten-boxes` needs a stack and moves it to flat. The recycling task at the recycling and bin (`take-trash` today at both, check it) takes the flat boxes out when they are flat (they disappear, with its own points and flavor, and it still works for the ordinary trash and recycling when no boxes are flat). Taking out the recycling when the boxes are still a stack does not remove them (they must be flattened first, plain reason line). Opening a package puts a stack back (any state).
- Wording plain; the task prompts say what they do (for example 'Take out the recycling'); keep the existing flatten points and flavor, check the flavor lines still make sense.
- Art: only what 066 and this need (`boxes-gone` if not simply the tub; keep palette and the room's style). Leave the recycling bin item to issue 062 stage 4 (note it there: 'recycling bin' item that turns the flat pile into a full bin).
- Tests: the state machine (stack, flat, gone, collect from each), task offering and reasons, old saves, golden frames (kitchen not in them, check), render the kitchen in all three states at 1x and 4x and look. `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log
