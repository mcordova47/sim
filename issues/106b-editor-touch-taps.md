---
id: 106b
title: Track editor on phones 2: taps that edit
status: todo
owner: claude
depends_on: [106a]
---

## Goal
Stage 2: `tapTargets` on the activity: cells, gutter pitch, tabs, pages, tempo, LENGTH, PLAY, SAVE; the playhead follows the page.

Design and Marc's answers (2026-10-28): `docs/track-editor-phones-design.md` (6 pitch rows of 20 game px; top-level buttons Play, Save, Length, More; tap clears a note; share sheet with Copy fallback; paste tries the clipboard then a hidden text box). Touch targets follow 093 (at least 44 CSS px where possible); desktop behaviour and golden frames unchanged.

## Acceptance criteria
- The tap tests in section 4 pass; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log

