---
id: 091b
title: Encounter music 2: result jingles (success only)
status: done
owner: claude
depends_on: [091a]
---

## Goal
Stage 2: two jingle cues and effects (unsubscribed, add to cart), the phase `result`, the exit echo whenever there is no jingle.

Design and Marc's answers (2026-10-29): `docs/encounter-music-design.md` (Marc composes the real track in the editor or the music lab and the agent writes a placeholder; the record ducks to silence during an encounter; jingles only when the action succeeds (unsubscribed, add to cart), none for failure, refusal or Ignore; four passes then fade; no music with reduced motion). An agent cannot hear: sound is unverified until Marc listens, with exact steps.

## Acceptance criteria
- Each successful outcome plays one jingle and never the exit echo; failed unsubscribe, refusals and Ignore play none and keep the exit echo; muted plays none; the checks above pass; an independent review; audition steps for Marc.

## Progress log


- 2026-10-29 (claude): Started. Plan: jingles are config (`ENCOUNTERS.music.jingles`: outcome to cue) and two effects in `SOUND.effects`/`SOUND.cues`; the activity plays the cue when the closing line opens (`speak`, the `result` phase from 091a) and skips the exit echo in `leave` when the outcome has a jingle.
- 2026-10-29 (claude): Done, status review. Files: `src/game/config.ts` (jingles map, effects `encounterUnsubscribed` (rising G-major flourish with a held top note and a bass) and `encounterCart` (two bright notes and a sparkle), both under 0.6 s, cues `encounter-unsubscribed`, `encounter-cart`), `src/game/activities/encounter.ts` (`jingle()`, cue in `speak`, echo only when no jingle), tests in `encounter-game.test.ts` (new "result jingles" block: each success plays one jingle and no echo, also an impulse buy; failed unsubscribe, Ignore, already-own and cart-full play none and keep the echo; Escape on the result line; reduced motion) and `sound/feature.test.ts` (new cues sound, and are silent muted). `npm test` (3427 pass) and `npm run build` pass; no golden change.
- Decisions: the jingle is on the effects bus via the existing cue path so mute, the voice cap are free. With reduced motion a success still plays its jingle (brief feedback, no motion; there is still no music or echo), a failure stays silent; easy to flip if Marc wants the quiet path fully silent. No sound heard by an agent: how the jingles sound, and how they sit over the fading loop, is UNVERIFIED.
- Audition for Marc: `npm run dev` in the worktree, open `?encounter=<ad id>` (e.g. `?encounter=ad-candle`), press a key to start. Try: HIDE AD repeatedly (success gives the rising flourish, a failure gives the soft falling echo); ADD TO CART (ka-ching); IGNORE (soft echo only); ADD TO CART when already owned (soft echo only). Check the jingle is not buried by the loop fading (0.35 s) and not too loud. Tune by ear in `SOUND.effects.encounterUnsubscribed` / `encounterCart` in `config.ts`.
- 2026-10-29 (claude, independent review): Verdict APPROVE (behaviour); SOUND QUALITY UNVERIFIED. Checked in the worktree against main: `npm test` 3427 pass, `npm run build` passes, no files changed outside scope (config, encounter activity, two test files, this issue; no PLAN.md or other issues).
  - Success plays exactly one jingle and no exit echo: PASS. Own checks (a fake-host test outside the repo driving `EncounterActivity` directly): successful unsubscribe gives `encounter-unsubscribed` only; Add to cart gives `encounter-cart` only; an impulse buy from Ignore gives `encounter-cart` only; Look closer then cart gives one jingle; Escape on a success's closing line gives the jingle once, no echo.
  - Failure, refusal and Ignore play no jingle and keep `encounter-exit`: PASS. Own checks: failed unsubscribe, Ignore at high mood, cart full (deliver refused), an impulse buy that is refused, an ad for an owned item (refusal on open) and closing the menu with no choice all give `encounter-exit` only. Escape in the menu gives nothing.
  - Muted plays none: PASS by the cue path (`SoundFeature` cue handler plays through the engine, master gain 0) and the new `feature.test.ts` case, which includes both new cues and checks they are silent muted. I did not add a separate muted run.
  - Reduced motion: no echo ever (as before); a success still plays its jingle (author's decision, noted above), a failure is silent. Flagged: if Marc counts a jingle as music, flip it (design says no music with reduced motion).
  - Jingles under 1 s and cued: PASS (config test). How they SOUND, their level, and how they sit over the 0.35 s fading loop: UNVERIFIED, an agent cannot hear; Marc's audition steps above stand.
  - Minor, not blocking: if the closing dialog fails to open, `speak` has already played the jingle and then quits (no echo); harmless. `ENCOUNTERS.music.jingles` is typed `Record<string,string>`, so a typo in an outcome key is not compiler-checked (the test pins the two keys).
