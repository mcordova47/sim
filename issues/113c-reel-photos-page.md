---
id: 113c
title: Photo reel 3: the PHOTOS page
status: review
owner: claude
depends_on: [113a, 113b]
---

## Goal
Stage C: PHOTOS page on the pause screen: `PhotoIO`, one-at-a-time decode, add flow, REMOVE ALL, texts (section 7, lines go to docs/text-review.md for Marc), tests.

Design and Marc's answers (2026-10-28): `docs/photo-reel-design.md` (sofa task; full 22 colours, Bayer dither strength 20, stored 48 x 36 or 36 x 48 shown at 3x; cap 60 pictures; a reset keeps the photos, REMOVE ALL is separate; one fixed caption line per session, never about resolution or size). Look tool: `art/tools/pixel-looks.html`. Privacy: no photo, name or caption of a photo ever enters the repo or bundle; `check:dist` unchanged.

## Acceptance criteria
- Works on desktop; add and remove all work; reset keeps the photos; game otherwise unchanged; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log

- 2026-10-28 (claude): started. Plan: `reel/photo-io.ts` (PhotoIO: picker, one-at-a-time decode, persist), `reel/photo-add.ts` (the add flow and its result text), `achievements/photos-draw.ts` (page layout shared by draw and tap), PHOTOS button (touch, 8th and last of four rows) and key O on the pause screen, tests, text lines into docs/text-review.md.
- 2026-10-28 (claude): done, in review. Built:
  - `reel/photo-io.ts`: `PhotoIO` (pickImages with `accept="image/*" multiple`, called in the tap or key press; `decode` one file at a time via `createImageBitmap` with `from-image` orientation and an `<img>` fallback, drawn to at most 256 px on the long side; `keepStorage` calls `navigator.storage.persist()`), and the browser version.
  - `reel/photo-add.ts`: the add flow. Decodes one file, pixelates, drops the big picture; stops decoding when the reel is full; one batch to the store at the end; a store error mid-add is caught and the added count comes from a fresh `list()` (113b follow-up); `persist()` is asked after a successful add (113b follow-up); `summaryLines` is the page's result text.
  - `achievements/photos-draw.ts`: `photosLayout` (one function that draws and taps), buttons ADD PHOTOS, REMOVE ALL (two taps: the first turns it into "SURE? REMOVE ALL"), BACK, a status line, a message, and stored pictures at 1x in 48 x 48 cells (as many as fit; the count line says how many there are). Touch buttons or desktop key list (A, R, Esc).
  - `feature.ts`: page `photos`, key O on the pause list, touch button, store opened on first use (a player who never opens the page never touches IndexedDB), a reset keeps the photos, Esc first puts away the REMOVE question. Pause screen: the touch list is now eight buttons, which still fits its four rows (pageTop 89 unchanged); the desktop hint line has four hints spread across it (SYNC, THINGS, PHOTOS, TRANSFER SAVE).
  - Tests: `photo-add.test.ts` (many, undecodable, cap, nothing decoded when full, duplicate, only indices reach the store, portrait, mid-add storage error, unlistable store, wording), `photos-page.test.ts` (keys, touch taps, tap list equals drawn list, buttons do not move when a message appears, two-tap remove, reset keeps photos, the sync document has no reel field and does not change when pictures are added, nothing about the reel in saved progress, store not opened until the page is, text fits both views, no resolution/size/pixel words, fits at 320 x 192 and 224 x 208). `transfer-draw.test.ts` button list updated for PHOTOS.
  - `docs/text-review.md`: the new PHOTOS section for Marc.
  - Checks: `npm test` 136 files / 3024 passed, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass. Rendered at 1x and 3x on both views with a software canvas and the real font (synthetic scene run through the real pixelate; no photo used): pause list, PHOTOS empty, with 12 pictures, armed REMOVE, busy, worst-case message, no storage. Looked at them; text and thumbnails sit inside the picture and nothing overlaps. With a five-line message on the desktop the thumbnails are dropped (no room); only the buttons are guaranteed.
  - Not checked: real iPhone picker (multi-select, HEIC, rotation, cancel), real IndexedDB, `navigator.storage.persist()` in a real browser, how the page feels with a finger.
  - Left over: the "sofa has nothing to scroll" line points at the 113d task, which does not exist yet.
