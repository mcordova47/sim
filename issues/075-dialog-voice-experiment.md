---
id: 075
title: Experiment: a per-letter voice for dialog text, behind a toggle
status: review
owner: claude
depends_on: []
---

## Goal
Marc (2026-10-27): keep the beepy dialog voice as the default, but try the idea of reusing the flashcards voice for other text readings, as an experiment he can compare by ear. English text has no IPA source, so the cheap version is the per-letter spelling voice (`src/game/flashcards/mumble.ts`, `mumbleNotes`, one soft pitched blip per letter with vowel and consonant pitches), used for the dialog typewriter instead of the plain blip.

## Acceptance criteria
- A setting `dialogVoice`: `"beep"` (default, today's sound, byte-identical behaviour) or `"letters"`. While dialog text types out (the existing blip logic in `src/game/sound/feature.ts`, `SOUND.blipEveryChars`), `"letters"` plays the spelling voice's per-letter sounds for the characters that appeared (vowel and consonant pitches from `mumbleNotes`; spaces and punctuation are rests; a slight randomness is fine but seeded in tests; stay quiet and plain; never more than the existing voice cap; follows the typewriter speed and skips when the text skips; stops when the dialog closes).
- The setting is saved with the sound settings (`life.sound.v1`, tolerant of old saves, default `beep`), and Marc can switch it in game: a key in the achievements list screen (L) that toggles 'DIALOG VOICE: BEEP / LETTERS'; keep the L screen hint line within the screen width (issue 043's ad blocker will also want a key there: pick `D` for this and say which keys are used) and a dev-only URL override `?dialogvoice=letters` for quick tries.
- Mute (M) and the first-key audio unlock apply as before; no sound before the first key press.
- The flashcards' own voice styles are untouched; dialog text in dialogs, popups that already blip, the typing and notes games and cutscene lines all keep their behaviour in `beep` mode (tests prove the beep path is unchanged against the current code).
- Tests: the setting parse and save (old saves, junk values), the L-screen toggle and its hint line fits the width, `letters` mode emits per-letter voices with a fake audio context for a sample dialog line (counts, pitches in range, rests for spaces and punctuation), no extra voices beyond the cap, stops on close, and `beep` mode is byte-identical in a golden comparison of the voice events for a sample dialog. `npm test` and `npm run build` pass.
- Docs: `docs/music.md` or `docs/dialogs.md` explains the setting and how to try it. Marc listens and decides whether to keep it, promote it to the default, or remove it (a follow-up).

## Progress log

- 2026-10-27: plan: add `dialogVoice` to the sound settings, a `letters` branch in `SoundFeature.blips()`, a `game.dialogVoice` hook (like `jukebox`) so the L screen can show and toggle it without importing sound, key D in the list screen, dev `?dialogvoice=`, tests, docs.
- 2026-10-27: done. Files: `src/game/sound/{feature,settings}.ts`, `src/game/config.ts` (`SOUND.dialogLetters`, `dialogVoices`, `ACHIEVEMENTS_UI.dialogVoiceKey`), `src/game/game.ts` (the hook), `src/game/achievements/{feature,draw}.ts`, `docs/music.md`; tests `sound/dialog-voice.test.ts`, `sound/settings.test.ts`, `achievements/draw-voice.test.ts`, `achievements/feature.test.ts`; golden `sound/golden/dialog-beep-voices.json`.
  - Beep path: the `blip` branch is the old code untouched (same random draws, same order). The golden was recorded by running the recorder on a detached checkout of main (6df97fc) before the change: oscillator types, frequency and gain calls and start/stop times for a short line, a multi-page text and a skipped text. The new code matches it exactly.
  - Letters: at each slot of `blipEveryChars` characters the sound for the letter at that slot (from `mumbleNotes`), gain 0.5 of the effect, pitch wobble 4 percent from the feature's seeded random; more than 8 characters appearing in one frame (a skip) is silent; one sound per slot at most so the voice cap holds (low-priority effect).
  - Keys in the L screen: L (close), arrows, D (dialog voice), Shift+R then Y. The hint line `ARROWS: LOOK   D: VOICE   L: CLOSE   SHIFT+R: RESET` fits (the full `ARROWS... D: DIALOG VOICE: LETTERS ...` line is 401 px, over the 320 width), so the state `DIALOG VOICE: BEEP/LETTERS` is drawn at the right of the picked name's row (tested against the widest achievement name). Rendered headless at 1x (scaled 3x to look at): fits, no overlap with the longest name.
  - The `?dialogvoice=` override is dev only and is not saved; toggling in game saves.
  - Not checked: how the letters voice sounds in a browser (Marc listens); tuning values are in `SOUND.dialogLetters`.

