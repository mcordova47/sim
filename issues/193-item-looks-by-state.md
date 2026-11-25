---
id: "193"
title: "Item looks by state: a shared piece for the table, the bed and the guitars"
short: "Item looks by state"
status: todo
owner: marc + claude
depends_on: []
summary: "A decor item can show a different sprite while a state variable is at least a number."
kind: build
---

## Goal
Engine piece P3 of `docs/decor-expansion-design.md` (sections 8 and 4): a `DecorItem` field giving 'show sprite X while a state variable is at least N' (and `max`), so a replacement piece that has more than one look can be an item: the dining table (with and without the plate, `table` and `table-plate`), the bed (made and unmade, plus the sleep pictures that include the bed), and the guitar (the guitar on its stand or in hand, `guitarOut`). Today the paintings have one look each and furniture items are single-sprite (issue 172, 192).

## Acceptance criteria
- The field, its validation at startup (known variable, sprites exist for each look), `Decor.look` and the drawing using it, a test per look rule; migrate nothing: no existing item changes look; prove it on a test item and on the current coffee table prop or the current record stand (no look change).
- Docs: how to add an item with looks (docs/decor.md and the learn lesson on adding decor if one exists: check docs/learn).
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean; golden frames for a fresh game unchanged unless the issue says which change; new strings into docs/text-review.md; docs/decor.md 'What issue NNN built' (use this issue's number); a `changelog:` line (at most 140 characters) stays.

## Progress log
- 2026-11-25 (planner): filed on main from the merged designs; not started (Marc asked to file the remaining build issues without starting them).
