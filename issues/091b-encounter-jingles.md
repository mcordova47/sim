---
id: 091b
title: Encounter music 2: result jingles (success only)
status: review
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
