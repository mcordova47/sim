---
id: "151"
title: "Decor: slots that can hold nothing (the empty option)"
short: "Empty decor slots"
status: todo
owner: claude
depends_on: []
summary: "Let a decor slot hold nothing, with a NOTHING row in the swap list; the first piece of the decor expansion."
kind: build
---

## Goal
Build step A of `docs/decor-expansion-design.md` (engine pieces P1 and P2): the `empty` slot option, and the new `DecorKind` values `trinket`, `coffee`, `outfit` and `furniture` with their swap prompts, so later steps (trinkets, the rug, outfits, the shelf, the sill) can be only data and art. Read the note's sections on P1, P2 and the new-slots table first, and `docs/decor.md`.

## Acceptance criteria
- A slot may have no `default`: it shows nothing (no placeholder box); the swap list has a NOTHING row at the top; `place(slot, none)` works; `starting`, `parseDecor` and `validateDecorData` accept a missing default; the save keeps `placed` only for slots with an item (a hand-edited save is still cut down, never an error).
- A map legend entry with a `slot` that has no default sprite no longer throws in `tilemap.ts` (say how an empty slot object names one).
- The new kinds exist with a plain swap prompt each (`SWAP_PROMPT`), validated like the others; the swap task is offered only when there is something to put in the slot (existing rule), so a fresh game is unchanged.
- A test-only empty slot proves it end to end (swap in, swap out, NOTHING, save and load, the inventory); it is not in the real room.
- The main-room golden frames do not change; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` and `npm run issues:check -- --validate` pass.
- docs/decor.md gets a short 'What issue 151 built' section.

## Progress log
- 2026-11-23 (planner): filed on main from Marc's answers to issue 148 (decor expansion design note).
