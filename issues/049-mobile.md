---
id: 049
title: Mobile (explore)
status: done
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

- 2026-10-27 (reviewer, independent, design-note step only; docs/mobile.md): **Verdict: approve for the design-note step** (criterion 1). Criteria 2 and 3 (the build, `npm test`/`npm run build` on a real change, Marc on a real phone) are intentionally not done and not judged. Branch diff is only `docs/mobile.md` and this file; no game code, no PLAN.md.
  - Criterion 1: **pass.** Covers same-vs-separate with what would justify separate, portrait/landscape/both with the 048 link, a portrait handheld shell (generic, no console branding) as primary and landscape secondary, d-pad/E/Escape/Tab-Q/menus, tap sizes in mm, handedness, haptics, the keyboard activities, scroll/zoom/safe areas/install/wake lock/audio unlock/saves/battery/081, real-size sketches, build and test plans, LAN how-to, open questions with recommendations.
  - Checked against code (all hold): `VIEW` 20x12 tiles of 16 = 320x192; `createScreen` uses whole CSS-pixel factor from `innerWidth/innerHeight`, ignores DPR, min 1; `Keyboard` listens on `window` by `e.code`, ignores `repeat`, releases on `blur`; `readControls` shape; `CYCLE_KEYS` Tab/KeyQ, Shift backward via `keysDown`; `HUD_BOX` 152x38, `STATUS_BOX` 76x50; typing counts any `isTypingKey` (KeyE counts), `fastCps` 9, `slowCps` 3; flashcards back phase uses dirPressed left/right and E; notes `window` 1.2; `DIALOG.strayWindow` 0.3, `gateMaxSeconds` 1.5; the 081 gate's `real` filter excludes only modifiers/CapsLock, so E and d-pad count; `engine.unlock()` is called from the window keydown handler in `sound/feature.ts`; `index.html` viewport is plain `width=device-width, initial-scale=1.0`; no touch code exists yet; flashcards origin/CORS comment (`*.mcord.dev` and localhost:5173 only) supports the "LAN address will not reach flashcards" claim; `?flashcards=demo` is dev only; `?pair=` exists in `flashcards/key.ts`; `npm run dev` is `vite` so `-- --host` works; loop draws every rAF.
  - Recomputed the 11-row scaling table with my own script (/private/tmp/chk.py): every CSS-integer, device-integer, game size, free W x H and exact-fit value matches. Phone usable sizes check (844-47-34=763; 932-59-34=839; 750=844-94; 369=390-21).
  - **Errors and inconsistencies found (non-blocking for the note; fix when the build step starts or in a doc touch-up):**
    - [ ] Section 3 cycle: Shift+Tab "sending Shift down, Tab, Shift up" fails if dispatched in one tick. `Keyboard` deletes Shift from `held` on keyup and `cycleStep` reads `controls.keysDown`, so Shift must still be held on the frame Tab is read; a synchronous trio cycles forward. The touch layer must hold Shift across at least one frame (test it).
    - [ ] Section 5 audio: the silent-switch sentence is garbled ("mutes Web Audio on iOS 16 and earlier for media elements, not Web Audio"). In practice the ring/silent switch does silence Web Audio on iOS unless a media element is playing (iOS 17+ has `navigator.audioSession`). Also "pointerdown alone is not enough, pointerup counts" I could not confirm; safest is to also resume in `touchend`/`click`. Unverified.
    - [ ] Section 2.5.1 mock: the diagram says A is 68 px "at (322, 420)" and B 68 px "at (252, 475)", but the text under it says B x 206..270 and A x 290..358 (centres 238 and 324, B 64 px). The diagram numbers (centres 252 and 322, B 220..284, A 288..356) disagree with the text. D-pad (150 at x 30..180, y 380..530), frame (344x216, x 23..367, y 65..281), screen (x 35..355, y 77..269) and status strip (y 289..345) do add up.
    - [ ] The same mock treats 763 as the full height including the 47 and 34 px safe areas (y=0 to 763), yet 763 is already the height after subtracting them (844 total). The mock is 81 px conservative and the "about 700 minimum" sum counts the insets again. Pick one convention.
    - [ ] Section 2.5.6: "932 x 430 at scale 5 (sides 166 each)" is wrong: at scale 5 (533 px) the sides are 199 each; at scale 6 (640, the largest) 146 each. The conclusion (turned shell works there) still holds.
    - [ ] Section 2.1 reading 1 says four of eleven rows improve (bold), but the Pixel row (3 dev = 1.14 vs 1x) also improves: five.
    - [ ] Section 3 haptics: "no haptic web API" on iOS is slightly out of date (Safari 17.4+ ticks on `<input type=checkbox switch>`); `navigator.vibrate` absent on iOS Safari is correct.
    - [ ] Section 5 persistence: an installed iOS home-screen app has storage separate from Safari, so installing starts with an empty save. The note says "installing keeps it"; make the first-install loss explicit (ties to the export/import question).
    - [ ] Section 5 install: "Chrome's install prompt wants a service worker" is outdated; harmless since the note skips one.
  - Platform claims judged right: `navigator.vibrate` unsupported on iOS Safari; `user-scalable=no` ignored by iOS Safari since iOS 10; Screen Orientation lock unavailable on iOS Safari; Wake Lock in Safari 16.4+, secure context, released on hide, installed-app fix in iOS 18.4; Safari 7-day eviction for non-installed sites; no Fullscreen API on iPhone; mm conversions use the nominal 163 ppi (real iPhone 14 CSS px are about 0.166 mm, so a little larger).
  - Scope: only `docs/mobile.md` and the issue file changed. Privacy: no personal details seen.
  - **Unverified (nothing run on a real phone, by the author or me):** d-pad feel and slide-to-turn, thumb coverage, safe-area values and standalone sizes, iOS audio unlock and the silent switch, wake lock, pull-to-refresh and pinch, install/storage behaviour, battery. No `npm run build`/`npm test` run (no code changed).
  - Status set to done for this step only; the build and phone-test criteria remain open for after Marc picks, so the planner may prefer to keep 049 open in PLAN.md.
