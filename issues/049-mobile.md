---
id: 049
title: Mobile (explore)
status: review
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

- 2026-10-27 (agent): worked the DESIGN NOTE step only, no game code. Wrote `docs/mobile.md`: same game vs separate, portrait vs landscape with device-pixel vs CSS-pixel scale arithmetic for real phones, controls (touch layer raising synthetic key events), per-activity mobile plans, platform bits (scroll, zoom, safe areas, install, wake lock, iOS audio unlock, persistence, battery, issue 081 gates), mocks, staged build plan, test plan, how to try on a real phone, open questions. Marc then asked for portrait with a handheld-style shell as the primary option; section 2.5 covers it, landscape is secondary. Not done: the small build and acceptance criteria 2 and 3 (they wait for Marc's pick). Not checked: anything on a real phone; the phone dimensions are typical figures, not measured. A rendered PNG was not made.
