---
id: 114a
title: Guitar skill, stage 1: the rule, chords and strumming (levels 1 to 3)
status: review
owner: claude
depends_on: [108]
---

## Goal
Build stages 114a, 114b and 114c of `docs/guitar-skill-design.md` (section 11): `GUITAR_SKILL` data and the skill level rule (derived from the guitar session count, no new saved field), chords at level 2, strumming at level 3, the dev override `?guitarskill=1|2|3|4` (dev server only) and a console audition, pure mapping functions with tests. Level 1 is today's single note, unchanged. Marc's answers and the decisions are at the end of the design doc.

## Acceptance criteria
- Levels follow the thresholds in config (4 / 12 / 30 sessions); levels 2 and 3 play chords and strum patterns through the current instrument's voice; no dropped notes (the voice cap tests from 108 still pass); save and sync unchanged; `npm test`, `npx tsc --noEmit`, `npm run build` pass; Marc listens (an agent cannot hear: unverified until then, with exact steps to audition each level).

## Progress log
- 2026-10-28: plan: GUITAR_SKILL data, pure `guitar-skill.ts`, SoundFeature plays chords/strums through lookahead, dev `?guitarskill=` and `auditionGuitarSkill`.
- 2026-10-28: built. Files: `src/game/config.ts` (GUITAR_SKILL, string/chop effects, `SOUND.guitarStrings`), `src/game/sound/guitar-skill.ts` (+ test), `feature.ts`, `engine.ts` (`now`, `playAt`), `decisions.ts` (`noteKeyDir`), `features.ts` (passes the guitar session count from stats). Level read once at taskStart of a notes activity; level 1 path is the old single-note call. Level 4 plays as strumming until 114b. Strums are queued and handed to the audio clock 80 ms ahead each frame (so a new press cancels the rest and the voice cap sees only near notes). Chords capped at four strings, each string one voice 0.5 s; the first of a gesture adds the pick tick. Deviation from the design: chord roots E3 and F#3 (not E2, F#2) so nothing is below A2 as the design's own test rule says.
- Checks: `npx tsc --noEmit`, `npm test` (2862 pass, incl. 108 no-drop tests), `npm run build` pass. New tests: thresholds and junk, data shape, pure chord/strum functions, level read once, no refused notes at 0.1/0.15/0.3 s spacing for chords and strums in steel, nylon and plain with headroom for a chime.
- Not verified: how it sounds (an agent cannot hear), and the features.ts wiring from real stats (no automated test; read by eye). Not checked: pressing faster than 0.1 s at levels 2 and 3 (may drop strings at the cap).
- Audition: `npm run dev`, open `http://localhost:5173/?guitarskill=2` (or 3, or 4 which is strumming for now), face the guitar, press E, play arrows; add `&guitarvoice=nylon`. Or in the console after pressing a key: `auditionGuitarSkill(2)` / `(3, "nylon")`.
