---
id: 087
title: Mobile, stage 1: a touch layer in a flat portrait shell
status: todo
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
