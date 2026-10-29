---
id: 111a
title: Side project config 1: the parser and command set
status: review
owner: claude
depends_on: [111]
---

## Goal
Stage A of the design's build plan: `parseConfig`, the command set, errors and limits, with tests. No game change.

Design and Marc's answers (2026-10-29): `docs/side-project-config-design.md` (the little room is a faithful copy of the real room plus overrides from a config text file; drawn as a smoothed half-scale copy with a dim and light noise; `when` conditions come later in stage E; the tiny figure is a fixed glitch standing on the desk; no real effect at first, the picture only). Marc's idea (2026-10-29): the side project could have its own title, something like "Siminal Crossing" (text for the text review when picked). Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- Parser tests pass (good files, every error, limits); no game change; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; an independent review.

## Progress log


- 2026-10-29 (claude): Started. Plan: a pure `parseConfig` in `src/game/side-project-config.ts` with tests, nothing imported by the game.
- 2026-10-29 (claude): Built. Commands `move`, `look`, `hide`, `add <sprite> at x y`, `figure on <piece> dx dy`, `dim`; `#` comments; a bad line is reported as "line N: ..." and skipped, the rest still applies; repeats of the same move/look/hide/figure/dim are reported and the first wins. Limits (exported `LIMITS`): 8000 chars, 200 lines, 120 chars a line, 100 commands, moves within 160, `add` inside x -64..384 and y -64..256, dim 0..0.6. The parser is syntax only: whether a piece or sprite exists is stage B (compose) and D (shipped file). Files: `src/game/side-project-config.ts`, `src/game/side-project-config.test.ts` (19 tests). Checked: `npm test` (152 files pass), `npx tsc --noEmit`, `npm run build`, `npm run check:dist` all pass; nothing imports the parser so the build is unchanged in behavior.
- Left over: Marc's idea of the side project's own title ("Siminal Crossing") is text for the text review, not built here (no title command in the config; it belongs in `side-projects.ts`).
