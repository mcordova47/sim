---
id: 049
title: Mobile (explore)
status: todo
owner: marc + claude
depends_on: []
---

## Goal
Marc wants the game to work on a phone. Decide what that means before building: touch controls (a d-pad and an action button), layout in portrait and landscape, the scale rule for small screens, and whether it is a webpage or an installable web app.

## Acceptance criteria
- A short note in `docs/mobile.md` with the options and a recommendation, covering: on-screen d-pad and buttons (E, Escape, the key for choosing in 039), tap targets, how the 320x192 view scales on common phones (integer scaling only), prevent scrolling and zoom, safe areas, wake lock so the screen stays on, and saved progress (009c) in the phone browser.
- Marc picks; then a small build: the touch layer feeding the same `Controls` as the keyboard, shown only on touch devices, with a test for the mapping.
- `npm test` and `npm run build` pass. Marc tries it on a real phone and says what is off.

## Progress log
