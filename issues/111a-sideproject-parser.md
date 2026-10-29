---
id: 111a
title: Side project config 1: the parser and command set
status: todo
owner: claude
depends_on: [111]
---

## Goal
Stage A of the design's build plan: `parseConfig`, the command set, errors and limits, with tests. No game change.

Design and Marc's answers (2026-10-29): `docs/side-project-config-design.md` (the little room is a faithful copy of the real room plus overrides from a config text file; drawn as a smoothed half-scale copy with a dim and light noise; `when` conditions come later in stage E; the tiny figure is a fixed glitch standing on the desk; no real effect at first, the picture only). Marc's idea (2026-10-29): the side project could have its own title, something like "Siminal Crossing" (text for the text review when picked). Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- Parser tests pass (good files, every error, limits); no game change; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; an independent review.

## Progress log

