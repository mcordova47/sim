---
id: "185"
title: "Examine a trinket: the close-up card (stage B)"
short: "Examine card"
status: todo
owner: marc + claude
depends_on: ["167"]
summary: "An Examine task at the desk opens a close-up card with a large detailed picture, the name and the note."
kind: build
changelog: "You can examine a displayed trinket for a close-up, its name and a short note."
---

## Goal
Build stage B of `docs/trinket-display-design.md` (issue 173, merged), following Marc's answers in `issues/173-trinket-display.md` (d1 to d12: a small version in the room with an Examine action that opens a large detailed close-up; every displayed trinket has Examine; d6 the prompt only appears where the item is; d10 the close-up art is 48x48 shown at 3x on both views; d5 reference photos exist in reference-photos/trinkets and the agent may look at them read-only). Stage A (the small pictures, 'Display trinket') is merged (issue 167). Section 5 of the design is the spec (the task, the card, the close-up art, per-tile zones), section 9 the engine each piece needs, section 11 the text.

## Acceptance criteria
- **The Examine task** per trinket slot (today only `trinket-desk`; the nightstand and shelf slots come in later stages, so build it per slot in `tasks.ts` like `SWAPS`): `examine-<slot id>`, name and prompt 'Examine trinket' with `itemWord` so it reads 'Examine alebrije' (no 'the'), no points, duration 0, cooldown 0, a quiet end (`completed: false, quiet: true`), never counted in the 'every task' achievement, offered only when the slot holds an item (`Interactable.heldSlot` and one line in `Game` where `interaction.hidden` is set), last but one in the Tab cycle just before the swap task; `Decor.taskName` accepts `heldSlot` and the prompt box gets the item-aware text (the design explains the trap: `liveSlot` hides a task unless the item is live; the prompt box draws `item.prompt`); per-tile zones (d6): a slot task's zone is the piece tile that contains the slot's centre x (the desk's col 9), checked by `Decor.swapProblems` as a subset of the piece's tiles; the swap task may use the same zone.
- **The card** (`activities/examine.ts`, type `examine`, like `swap-decor`): an overlay over the dimmed live view (the dimming `rgba(26, 26, 46, 0.72)`), laid out for 320x192 and 224x208 from the live view size per the design's measured layouts (mockups `docs/trinket-display-mockups/05`, `06`, `07`): the 48x48 close-up at 3x in a bordered field, the item's name, its `FROM:` line and its note (nothing new stored, no points or counters); closes with E, Esc or a tap anywhere and returns to exactly the room; no sound of its own; holds the game clock, reads keys, registered with `registerActivity`.
- **The close-up art:** one 48x48 sprite per trinket and instrument (ten items: alebrije owl, alebrije cat, little telescope, finger skateboard, painted goose egg on its stand, worry doll, raccoon in a can, harmonica, kalimba, jaw harp), named `<item sprite>-close` (a convention, with a test that every trinket and instrument has one at exactly 48x48 and a fallback to the small sprite at 8x while one is missing); a detailed redraw of the same object (painted patterns, wheels, label shapes; the alebrijes' dots, stripes and flowers; the raccoon's mask), not the small sprite scaled up; palette only, no text; the agent may look at the reference photos in `reference-photos/trinkets` read-only to judge the real objects, but never copies, traces, names a file from or describes a photo in the repo; the small in-room sprite stays the simplified version of its close-up (same colours and silhouette idea). Look at every close-up on the card at 1x and 3x on both views and say what you saw; the reviewer must too.
- Text: the new prompt and card strings in `docs/text-review.md` (`unsupportedChars` runs over them); tests for the task (offered only with an item, the zone, the quiet end, the achievement exclusion, the prompt text for every trinket fits the narrow view), the activity (open, close by E, Esc and tap, the layouts, the fallback), and the close-up convention; a fresh game unchanged (golden frames unchanged: a fresh game owns no trinket); docs/decor.md 'What issue 185 built'; the `changelog:` line stays; standard checks: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean.
- Look at the Examine card in the running game yourself (dev server `?own=` the ten ids; display one at the standing desk, stand on the desk's col 9 tile, Tab to Examine) at desktop and phone size and say what you saw.

## Progress log
- 2026-11-25 (planner): filed on main from the merged trinket display design (issue 173) and started at Marc's request.
