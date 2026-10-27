---
id: 077
title: Make the per-letter voice the default for dialog text
status: todo
owner: claude
depends_on: []
---

## Goal
Marc (2026-10-27), after trying issue 075: he likes `dialogvoice=letters` better. Make `letters` the default dialog voice; `beep` stays as the other option in the same switch (the D key in the L screen).

## Acceptance criteria
- `DEFAULT_SETTINGS.dialogVoice` is `"letters"`. An old save with no `dialogVoice` field, or junk, now means `letters`; a save that explicitly says `beep` stays `beep` (Marc may have switched to beep on purpose). A fresh game with no storage starts in `letters`. No storage at all (private window) also `letters`.
- The beep path stays byte-identical to the old behaviour: the golden voice-event comparison (`src/game/sound/golden/dialog-beep-voices.json`) is now taken with the setting explicitly set to `beep` in the test; do not re-record the golden. Update the other tests that assumed the default was beep so they set it explicitly or expect `letters`, and rename the tests whose names say 'beep (the default)' to say what they now check; no check is removed or weakened (list each changed test and why in the log).
- The other sounds that use the plain blip (popups, typing and notes games, cutscene lines): keep their behaviour; only the dialog typewriter changes with the setting (as in issue 075); check each existing test that uses a dialog under the default settings and decide whether it should set `beep` or accept `letters`, and say which.
- Docs (`docs/music.md`): the default is letters; how to switch to beep (D in the L screen, `?dialogvoice=beep` dev-only override: add it if only `letters` exists as an override). The L screen label still reads BEEP / LETTERS correctly.
- `npm test` and `npm run build` pass.

## Progress log
