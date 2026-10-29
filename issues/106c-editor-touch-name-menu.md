---
id: 106c
title: Track editor on phones 3: name, More menu, delete
status: todo
owner: claude
depends_on: [106b]
---

## Goal
Stage 3: `wantsText`, `textValue`, `setText`; the More menu; Undo; delete with confirm.

Design and Marc's answers (2026-10-28): `docs/track-editor-phones-design.md` (6 pitch rows of 20 game px; top-level buttons Play, Save, Length, More; tap clears a note; share sheet with Copy fallback; paste tries the clipboard then a hidden text box). Touch targets follow 093 (at least 44 CSS px where possible); desktop behaviour and golden frames unchanged.

## Acceptance criteria
- Naming works through the hidden input; the menu equals the keys; a touch-only run through make, save, rename and delete passes in tests; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log

