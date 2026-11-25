---
id: "191"
title: "Coffee gear, second batch: espresso machine, siphon and air press"
short: "Coffee second batch"
status: todo
owner: marc + claude
depends_on: ["168"]
summary: "Three more coffee makers with their art and names."
kind: build
changelog: "Three more coffee makers (an espresso machine, a siphon and an air press) can turn up."
---

## Goal
The second batch of issue 168 (docs/decor-expansion-design.md section 6; Marc's d12: generic noun names or invented brands, the aeropress-like device is called AIR PRESS by Marc's d1 of 168): an espresso machine, a siphon (vacuum pot) and the air press, as coffee-kind items for the table and stove stations of issue 168 (the table takes electric and press-style makers, the stove takes stovetop pots: the siphon sits on the table with a small burner, the espresso machine needs a narrow stylized look or a wider slot: the design says an espresso machine is wider than the 11 px the table slot allows: choose with evidence and say what you saw), each with palette-only 16x16 art and the item-aware task names ('Make espresso', 'Make siphon coffee', 'Make air press coffee'), deadpan notes, `from: A PACKAGE`.

## Acceptance criteria
- The three items, sprites, names and prompts (no 'the'; check the narrow view fits the longest prompt); pay, duration and effects stay equal to the other makers; they fit the correct station only; the mug and dishes loop works; New items join the random-encounter item pool (issue 163) by their kind, are placed in the ladder (`src/game/encounter-ladder.ts`: the test fails until they are) with a difficulty tier you suggest (easy, normal or hard), and have NO milestone gift days (Marc wants to space arrivals separately; the pool and ladder of issue 183 give the pacing).
- Look at all art and the result in the running game yourself (dev server with `?own=` ids; see docs/decor.md) at 1x and 8x on desktop and phone size and say what you saw; the reviewer must too; give Marc exact commands with absolute `~/...` paths.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean; golden frames for a fresh game unchanged unless the issue says which change; new strings into docs/text-review.md; docs/decor.md 'What issue NNN built' (use this issue's number); a `changelog:` line (at most 140 characters) stays.

## Progress log
- 2026-11-25 (planner): filed on main from the merged designs; not started (Marc asked to file the remaining build issues without starting them).
