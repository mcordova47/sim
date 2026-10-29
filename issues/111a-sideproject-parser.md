---
id: 111a
title: Side project config 1: the parser and command set
status: done
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
- 2026-10-29 (claude, independent review): Verdict **approve**. Criterion "parser tests pass (good files, every error, limits)": pass (19 tests read; they cover every command, every error text, each limit edge). Own probes (fuzz of 30000 random token strings, odd whitespace, NBSP, BOM, CR-only, zero-width and NUL chars, `constructor`/`__proto__`/`toString` as names, `-0`, leading zeros, 4+ digit numbers, `dim` forms, pathological long/blank lines): never threw, always at most 100 ops, every problem starts "line N:" or "file ", one op per line, parsing a max-size file takes microseconds. "No game change": pass (diff is only the parser, its test and this issue; nothing imports the parser). `npm test` (152 files, 3372 passed), `npx tsc --noEmit`, `npm run build`, `npm run check:dist`: all pass, run by me. No personal info or real artist names in the files. Not verified (later stages, parser is not wired in): piece and sprite existence, compose, drawing, shipped file, narration guard. Minor, non-blocking notes for later: (1) `move a 12345 0` says "must be a whole number" though it is a whole number with too many digits; (2) `-0` parses to the number -0 (harmless); (3) leading zeros like `007` are accepted; (4) a CR-only line ending is not a line break (that line gets a "takes N values" error); (5) repeated `add` lines are allowed by design. PLAN.md table needs updating by the planner.
