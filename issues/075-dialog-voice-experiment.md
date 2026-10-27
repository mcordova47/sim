---
id: 075
title: Experiment: a per-letter voice for dialog text, behind a toggle
status: todo
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
