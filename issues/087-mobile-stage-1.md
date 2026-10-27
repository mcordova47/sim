---
id: 087
title: Mobile, stage 1: a touch layer in a flat portrait shell
status: review
owner: claude
depends_on: [049]
---

## Goal
Build stage 1 of `docs/mobile.md` (issue 049) so Marc can try the game on his iPhone: the same game with a touch layer feeding the same `Controls` as the keyboard, in a plain CSS portrait shell (no pixel art yet), with the simple landscape overlay so rotating works from day one. Marc's answers are in the note's section 12: iPhone, portrait first, a 1.0x to 1.33x picture is fine, install as a home-screen app later (not this stage), phone input simplified, the pairing by pasting a link or key.

## What to build (the note's section 7, Stage 1)
- `src/input/touch.ts`: the pad and buttons (DOM elements built in code: d-pad, A for E, B for Escape, the choice-cycle button, three pills), the pointer-to-key mapping with synthetic key events using the same codes as the keyboard, shown only on touch devices (`?touch=1` forces it on desktop for testing), release-all on cancel, blur and hidden.
- `createScreen`: scale in device pixels (backing store in device pixels, `drawImage` from an offscreen 320x192 with smoothing off), `devicePixelRatio` and `resize` and `visualViewport` handling, safe-area insets, `100dvh`.
- `index.html`: viewport meta, the no-scroll, no-zoom and no-pull-to-refresh CSS, audio unlock on `pointerup`, `touchend` and `click` as well.
- Pause the loop when `document.hidden`; cap at 60 fps.
- Works: walking, E, Escape, menus, dialogs, the notes game, flashcard cards, the typing game (tap A). Skipped on phones for now: the track editor, the L screen toggles, names and the flashcards key (stage 3).
- Keep the in-canvas HUD unchanged (issue 086 changes it separately); the status strip under the screen shows a hint line or stays empty.

## Acceptance criteria
- Tests for the touch-to-Controls mapping (every button, hold-to-walk, the Shift-held-across-a-frame Shift+Tab long press, release on cancel and blur), the scale arithmetic for the note's phone sizes, and that desktop with no touch is unchanged (no touch layer, same canvas size).
- The 081 stray-key gates behave with touch input (a held pad direction after a key game does not walk the player).
- `npm test`, `npx tsc --noEmit`, `npm run build` pass; golden frames unchanged.
- How Marc tries it on his iPhone is written in the log: `npm run dev -- --host` and the Network address (plain HTTP: no wake lock, no clipboard read), and Chrome device mode with `?touch=1` for the desktop check. Anything that needs a real phone is listed as unverified.

## Progress log

- 2026-10-27: starting. Plan: pure touch mapping (`src/input/touch.ts`) driven per frame, DOM layer (`src/input/touch-ui.ts`), device-pixel `createScreen` with an offscreen 320x192 in touch mode only (desktop path kept exactly as it was), portrait flat shell plus landscape overlay in `index.html` CSS, loop pause on hidden and a 60 fps render cap, audio unlock from real pointer/touch/click events.
- 2026-10-27: built stage 1. Status review.
  **What changed**
  - `src/input/touch.ts` (new, no DOM): `TouchPad` turns pointer calls into key down/up on a `KeySink` (A=KeyE, B=Escape, d-pad=KeyW/A/S/D, L=KeyL, mute=KeyM, cycle=Tab). A key released before any game update has read it is held back one update (`afterFrame`), so a very quick tap still counts. Cycle button: a short press is Tab; held 400 ms it sends Shift down, then Tab on a later update (Shift is in `keysDown` when Tab is in `keys`), then lets both go (Tab first). `releaseAll` for blur, hidden, pagehide, touchcancel and the layer switching off. `dpadDirection` (four ways, dead zone), `touchLayerVisible` (coarse pointer and touch points, hidden by a trusted key, `?touch=1` or `?touch=0`), `eventKeySink` (raises untrusted KeyboardEvents on window, so every existing key listener works).
  - `src/input/touch-ui.ts` (new, DOM): builds the d-pad, A, B and three pills (CHOICE, LIST, SOUND) in code, pointer capture per control, multi-touch, the audio unlock on real `pointerup`, `touchend` and `click`, and on coming back visible.
  - `src/render/canvas.ts`: `fitScale` (device pixels, min 1), `pictureArea` (safe areas, portrait leaves 330 px for controls), `desktopScale` (the old rule). `createScreen` keeps the old 320x192 canvas on desktop. In touch mode it draws into an offscreen 320x192 and `present()` copies it, smoothing off, to a canvas whose backing store is whole device pixels per game pixel. Handles `resize`, `orientationchange` and `visualViewport`. `Screen.ctx` is now a getter.
  - `src/game/loop.ts`: stops while the page is hidden (no time jump on return), draws at most about 60 a second (updates stay at 60). Injectable env for tests.
  - `src/game/features.ts`: `attachFeatures` now returns `{ unlockAudio }` (one line outside the listed files, needed for the iOS audio unlock).
  - `src/main.ts`: mounts the touch layer, switches the screen mode, `touch.afterFrame()` each update, `screen.present()` each render, blocks context menu, gesturestart and two-finger touchmove.
  - `index.html`: viewport meta (no zoom, viewport-fit=cover), no-scroll, no-select, no pull-to-refresh CSS, `100dvh`, and the flat shell: portrait puts the controls under the picture, landscape floats them over the corners at 55% opacity. The HUD drawing is untouched; the strip under the screen is left empty.
  - Tests: `src/input/touch.test.ts` (every button, hold to walk, tap, quick tap, slide left to up, dead zone, second finger, long-press Shift+Tab ordering, cancel and blur release, visibility rule, three stray-key gate tests through a real `Game`), `src/render/canvas.test.ts` (note's phone sizes, never below 1, desktop unchanged: 320x192 canvas, whole CSS factor, drawing straight onto it), `src/game/loop.test.ts` (60 fps cap at 120 Hz, no skipping at jittery 60 Hz, hidden pause).
  **Checked**: `npx tsc --noEmit`, `npm run build`, `npm test` (107 files, 2530 tests) pass; golden frames unchanged (no render code changed). Rendered with headless Chrome at `?touch=1`, portrait 500x900 and landscape 900x500: picture at the top with d-pad, B, A and the three pills below; landscape has them over the corners. Not tested with a real touch.
  **How Marc tries it on his iPhone**
  1. On the Mac: `cd /Users/marccordova/Dev/repos/mcordova47/life-worktrees/087-mobile-stage-1 && npm run dev -- --host`.
  2. Vite prints a `Network:` line such as `http://192.168.x.x:5173/`. The phone must be on the same Wi-Fi. Open that address in Safari. It is plain HTTP, so there is no wake lock and no clipboard read (not needed in this stage). If it will not load, check the Mac firewall and that the phone is not on cellular or a guest network.
  3. Hold the phone upright. Try: walk with the pad (hold, slide from one arrow to another without lifting), A to use things, B to back out, CHOICE to cycle an object's choices (hold it for the backwards cycle), tap A in Answer emails, the notes game with the pad, flashcard cards, rotate to landscape.
  4. Add to Home Screen: Share, Add to Home Screen. It works as a shortcut, but the installable app (manifest, icons) is a later stage, so there is no proper icon and Safari may still show its bars; an added shortcut has its own empty saved game, separate from Safari's.
  5. Desktop check: Chrome, open `http://localhost:5173/?touch=1`, open DevTools device mode (Cmd+Opt+I, then Cmd+Shift+M), pick an iPhone, and use the mouse as the thumb. `?touch=0` forces the layer off. Without `?touch=1` and with no touch screen, nothing changes from before.
  **Unverified (needs a real phone)**: the feel of the pad (sliding round furniture), button size and spacing, thumbs covering the picture, the iOS audio unlock on the first touch and the silent switch silencing sound, rotation mid-game, the safe areas on the notch and home bar, pull-to-refresh and pinch zoom being blocked on iOS Safari, `visualViewport` changes as Safari's bars slide, the loop pausing when switching apps, 60 fps cap feel, battery. Also not exercised in a browser: pointer capture and `lostpointercapture` on real touch, the DOM wiring of the audio unlock (the engine's unlock itself is covered by existing tests).
  **Left out on purpose (stage 3)**: track editor, L screen toggles, typing names and the flashcards key, tap-to-pick on menus, hiding the CHOICE button when there is one choice, handedness. The typing game counts A taps because any key advances it; its speed window is not tuned for thumbs.
