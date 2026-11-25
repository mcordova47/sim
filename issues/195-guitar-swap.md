---
id: "195"
title: "Swappable guitars"
short: "Swappable guitars"
status: todo
owner: marc + claude
depends_on: ["193"]
summary: "Put a different guitar (the drawn nylon-string one first) in the guitar slot."
kind: build
changelog: "A second guitar, the nylon-string one, can turn up and replace the old one."
---

## Goal
Step Q of `docs/decor-expansion-design.md` (section 4): the existing guitar piece `G` (16x16 at abs (16, 96); looks `guitar` or `guitar-stand` while `guitarOut` is 1; the guitar task has a pose `player-guitar` (32x48) drawn over the piece and four held sprites; the nylon-string guitar already has a voice in `config.ts` and a drawn sprite `guitar-nylon`, unplaced) becomes a `guitar-wall` slot holding a guitar item with looks by state (issue 193): the current acoustic guitar is the default; the nylon-string guitar is the first swap, with its own voice (per the design: check what exists), the held sprites and the pose; each further guitar is data and art.

## Acceptance criteria
- The slot `guitar-wall` (kind instrument or a `guitar` plantKind-like field so trinket instruments do not fit it: design the kind rule), the swap task 'Change guitar' (no 'the'), item looks by state for stand and out, the guitar task and pose and held sprites per item (the viewpoint and orientation lesson of issue 172: the guitar is a south-wall piece: look at the original as the template), the sound voices per item, the skill model unchanged (docs/guitar-skill-design.md), tests, and the nylon-string guitar as the first item; pool and ladder; Look at all art and the result in the running game yourself (dev server with `?own=` ids; see docs/decor.md) at 1x and 8x on desktop and phone size and say what you saw; the reviewer must too; give Marc exact commands with absolute `~/...` paths.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean; golden frames for a fresh game unchanged unless the issue says which change; new strings into docs/text-review.md; docs/decor.md 'What issue NNN built' (use this issue's number); a `changelog:` line (at most 140 characters) stays.

## Progress log
- 2026-11-25 (planner): filed on main from the merged designs; not started (Marc asked to file the remaining build issues without starting them).
