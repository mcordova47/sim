---
id: 077
title: Make the per-letter voice the default for dialog text
status: done
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
- 2026-10-27: plan: flip `DEFAULT_SETTINGS.dialogVoice` to `letters` (settings.ts reads only an explicit `"beep"` as beep), have `SoundFeature` take its starting voice from `DEFAULT_SETTINGS`, put `letters` first in `SOUND.dialogVoices` (the comment says first is the default; the toggle is explicit, so order does not change it), then fix the tests that assumed beep.
- 2026-10-27: done. Files: `src/game/config.ts`, `src/game/sound/{settings,feature}.ts`, tests `src/game/sound/{dialog-voice,settings,feature}.test.ts`, `docs/music.md`. Golden `dialog-beep-voices.json` NOT re-recorded (git shows it unchanged); the beep test now runs with the setting explicitly `beep` and still passes against it.
  - The `?dialogvoice=beep` dev override already existed (devDialogVoice accepts both); docs now name it first. L screen label reads from the active mode, so it shows LETTERS by default and BEEP after D (tested). Beep/popup/typing-game/cutscene blips are untouched code; only `SoundFeature.blips()` for dialog depends on the setting.
  - Tests changed (12 failed after the flip; every check kept, none weakened):
    1. dialog-voice "beep (the default)" > byte-identical to golden: setup now passes `dialogVoice: "beep"`; describe renamed "beep (the other option)".
    2. dialog-voice > stays the beep when saved as beep / asked for beep: base is now explicit beep (was default); added a check that base equals the golden.
    3. dialog-voice letters > same every time: the "differs from" comparison now against explicit beep (was default).
    4. saving and switching > saves and loads next visit: start is letters, first toggle gives beep (saved and reloaded), second toggle back to letters; same round trip, directions swapped.
    5. labels the setting: LETTERS first, BEEP after the toggle.
    6. old save/junk: renamed; junk and missing field now expect letters; added explicit `beep` save stays beep, and storage: null gives letters.
    7. keeps other settings when switched: the toggle from letters now writes beep; other fields still checked.
    8. URL override: uses `dialogVoice: "beep"` override, expects saved value stays letters and next visit letters.
    9. settings.test defaults (nothing saved, no storage, damaged data): defaults now letters.
    10. settings.test saves the dialog voice: junk values now expect letters; added save/load of explicit beep.
    11. settings.test storage throws: load default is letters (saves still beep literals, which are just inputs).
    12. feature.test "blips as dialog text appears": now runs for both voices. Beep keeps its exact bar (>3 in 0.5 s); letters makes 3 in 0.5 s (rests on spaces) so its bar is >2. Both check silence while waiting.
  - Checked and left alone: achievements/feature.test.ts uses a fake voice (no default assumed). All other dialog-using tests pass under the letters default unchanged (they don't count dialog blips).
  - `npm test`: 2016 passed. `npm run build`: ok. Not checked: how letters feels by ear in a browser (Marc already tried it).
- 2026-10-27: Review (independent) - verdict APPROVE.
  - Default + saves: pass. My own scratch tests (outside the repo, on a copy of HEAD) check null/empty/{}/[]/null JSON, "Beep", " beep", arrays, objects, "constructor", "__proto__", explicit letters, explicit beep (keeps other fields), null storage: all give letters except an exact "beep"; DEFAULT_SETTINGS not mutated through load. SOUND.dialogVoices is ["letters","beep"] (typed from config, no toggle breakage).
  - Beep byte-identical: pass. `git diff main -- src/game/sound/golden` is empty. Mutation check: changing blipEveryChars 3->4 in the copy makes the two beep tests fail, so the golden test still guards the beep path (it runs with beep explicit).
  - Tests vs main: diffed all four test files. No assertion removed or loosened; changes are default flips, explicit beep setup, renames, and additions (beep golden equality, explicit beep save, null storage). feature.test blip test now runs for beep (original >3 bar kept) and letters (>2, justified by rests on spaces); not weakened for beep. Cosmetic: the comment and `it.each` lines there lost their indentation.
  - Other blips (popups, typing/notes games, cutscenes): no code changed; only SoundFeature's starting voice reads DEFAULT_SETTINGS. Pass.
  - Docs: pass (letters default, D key, ?dialogvoice=beep, save semantics). L label tested both ways.
  - `npm test` 2016 passed, `npm run build` ok. Scope: only config.ts, sound/{settings,feature}.ts, 3 test files, docs/music.md, issue file.
  - Note (not a defect): since 075 every save written by the game contains an explicit dialogVoice "beep", so players who never touched the setting stay on beep. This is what the criteria specify; Marc's own saved value decides what he hears.
  - Unverified: how letters sounds by ear in a browser.
- 2026-10-27: follow-up (planner request, from the review note): since 075 every save has an explicit "beep", so a saved beep alone cannot be read as a choice. Added `dialogVoiceChosen` to `life.sound.v1` (settings.ts, feature.ts). Only the D toggle sets it (`setDialogVoice`); every save keeps it, never clears it. On load "beep" counts only with `dialogVoiceChosen === true`; a plain saved "beep", junk, missing, or junk marker (false, "true", 1, null, [true]) gives letters. `?dialogvoice=` sets neither the marker nor the saved voice (also tested over a real beep choice).
  - Tests: settings.test (round-trip with marker; defaults include `dialogVoiceChosen: false`; unmarked/junk-marker beep loads letters; marked beep loads beep; save calls pass the new field); dialog-voice.test (saved-beep test now carries the marker; old-save test adds unmarked 075-style beep and junk markers; "keeps other settings" expects the marker after the toggle; new tests: marker only from the toggle and kept by later saves, beep -> letters -> beep across reloads, dev override sets neither). No check removed. Docs updated (`docs/music.md`). Golden untouched. 2018 tests pass, tsc and build ok. Needs a fresh review.
- 2026-10-27: Review 2 (independent, of e742c5d, the marker) - verdict APPROVE.
  - Load matrix (my own scratch test on a copy of HEAD, 23 cases): no storage, empty, junk JSON, `{}`, `null`, `[]`, unmarked beep, letters, marked letters, junk markers (false, "true", 1, null, [true], {}, 0, "beep"), `__proto__`/`constructor` keys all give letters; only `{dialogVoice:"beep",dialogVoiceChosen:true}` gives beep; null storage gives letters; DEFAULT_SETTINGS marker stays false.
  - Toggle sequence on the real SoundFeature and store: letters -> D -> beep (marker written) -> reload beep -> mute on/off keeps marker -> D -> letters (marker kept) -> reload letters -> D -> reload beep. `?dialogvoice=letters` over a saved marked beep: plays letters, a later save still writes beep + marker, next visit beep. Track change and payout saves go through the same `save()` that writes the held marker (code read), never clearing it.
  - Beep byte-identical: `git diff main -- src/game/sound/golden` empty. Mutation (blipEveryChars 3 -> 4 in a scratch copy): the two beep tests fail. Other blips unchanged (config diff vs main is only the dialogVoices order; achievements/ untouched, so L label and hint line are unchanged; draw-voice tests pass).
  - 2018 tests, `tsc --noEmit` and `npm run build` pass. Scope: sound settings/feature, config, tests, docs/music.md, issue file only.
  - Findings: none blocking. Minor: a player who pressed D in a 075 build before this change (a real beep choice saved without a marker) is read as letters; unavoidable and noted in the planner request. Letters not judged by ear.
