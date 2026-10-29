---
id: 124
title: Side project config: a bad piece or sprite name should skip only that line
status: todo
owner: claude
depends_on: [111d]
---

## Goal
Found in review of 111d: when one line of `src/game/side-project-room.txt` names a piece or sprite that does not exist, `composeSideProject` (111b) refuses by design and the whole drift falls back to the plain copy of the real room (`side-project-room-config.ts` catches the error). The design says only that line should be ignored (with a warning), so a typo or a renamed piece never costs the rest of the file. Make the composer (or the mapping layer) skip just the failing op, keep every other op, and keep a warning (dev console) with the line number from the parser's `line` field. A later op on a hidden id should also skip only itself.

## Acceptance criteria
- A file with one bad line applies every other line and warns once for the bad one; the shipped file still composes with no warnings; tests for a bad piece id, a bad sprite name, an op on a hidden id and several bad lines; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; an independent review (written entry on the branch).

## Progress log

