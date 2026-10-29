---
id: 106d
title: Track editor on phones 4: share and paste
status: todo
owner: claude
depends_on: [106c]
---

## Goal
Stage 4: Share (system share sheet, Copy fallback), Copy, Paste (clipboard first, then a hidden text box), `importText` cleanup (CRLF, NBSP, signature).

Design and Marc's answers (2026-10-28): `docs/track-editor-phones-design.md` (6 pitch rows of 20 game px; top-level buttons Play, Save, Length, More; tap clears a note; share sheet with Copy fallback; paste tries the clipboard then a hidden text box). Touch targets follow 093 (at least 44 CSS px where possible); desktop behaviour and golden frames unchanged.

## Acceptance criteria
- The mangled-text cases pass; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review; Marc tries it on his phone (first real check).

## Progress log

