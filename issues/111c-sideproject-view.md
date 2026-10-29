---
id: 111c
title: Side project config 3: the view and the painter
status: todo
owner: claude
depends_on: [111]
---

## Goal
Stage C: frame sprite, `drawScaled`, `SideProjectView` with a cache, the dim and light noise, the composed-view registry, and a fallback to the existing 101 picture. Touches `sprites.ts` and `cutscene.ts` only besides new files.

Design and Marc's answers (2026-10-29): `docs/side-project-config-design.md` (the little room is a faithful copy of the real room plus overrides from a config text file; drawn as a smoothed half-scale copy with a dim and light noise; `when` conditions come later in stage E; the tiny figure is a fixed glitch standing on the desk; no real effect at first, the picture only). Marc's idea (2026-10-29): the side project could have its own title, something like "Siminal Crossing" (text for the text review when picked). Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- The desk task shows the composed room; Marc looks at it beside the old one on both views; the fallback PNG still works; golden frames unchanged unless this screen is in them; the checks above pass; an independent review.

## Progress log

