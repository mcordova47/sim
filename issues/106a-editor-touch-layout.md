---
id: 106a
title: Track editor on phones 1: touch layout and drawing
status: todo
owner: claude
depends_on: [093]
---

## Goal
Stage 1 of section 7: `touchEditorLayout`, `drawTrackEditorTouch`, the live-view drawing in both shapes, hint wording through `hintLine`.

Design and Marc's answers (2026-10-28): `docs/track-editor-phones-design.md` (6 pitch rows of 20 game px; top-level buttons Play, Save, Length, More; tap clears a note; share sheet with Copy fallback; paste tries the clipboard then a hidden text box). Touch targets follow 093 (at least 44 CSS px where possible); desktop behaviour and golden frames unchanged.

## Acceptance criteria
- Layout and hint tests pass (every rectangle inside the view at 224 x 208 and 320 x 192, none overlap, cell rectangles map back to (step, pitch), bar buttons at least 50 x 18); docs updated (`docs/make-tracks.md` On phones, `docs/mobile.md` section 4); desktop unchanged; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log

