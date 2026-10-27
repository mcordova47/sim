---
id: 078
title: A sleep sequence instead of just a timer
status: in-progress
owner: marc + claude
depends_on: []
---

## Goal
Marc's idea (2026-10-27): "Go to sleep" is a 6 second timer with the sleep pose. Make it a little sequence: sleep-type music, lighting changes, slight deep-breathing and snoring movement, something like that.

## Ideas to build from (design first, then build; Marc picks)
- **Lighting:** the room dims to a deep night tint as you fall asleep, stays dark for the middle of the sequence, and the light comes back at the new hour when you wake (the seven hours skipped, issue 009d: the tint follows the clock, so either animate the clock forward visibly during the sequence or fade down and up with a pure visual overlay and apply the clock jump at the end; cancelled tasks apply no effects (046), so an early wake via Escape should leave the clock alone: say which).
- **Breathing and snoring:** the sleep pose breathes: a slow 1 px rise and fall (two or three frames, or a sub-pixel offset of the pose layer, not a new sprite per frame), a soft `z` rising now and then (the particle effect from 009b), a very quiet slow snore sound (a low filtered noise or a two-note descending pattern) at the lowest volume.
- **Music:** a short, soft, slow lullaby-like loop (the `.track` format in `docs/music.md`; a built-in sleep track in `src/game/music/tracks/` marked as a system track so it is not in the record player menu; it fades in and out, and any record that is playing ducks (fades down) while you sleep and comes back after; a muted game stays muted).
- **Sequence shape:** about 8 to 10 seconds (a config value): fall asleep (2 s), asleep (5 s) with the lighting and breathing, wake (2 s) with a gentle brighten and the existing wake-up effects (energy to full, bed unmade, clock +7). Escape wakes you early at any point (no payout, as now) and always restores the lighting and music.
- **Naps:** the sofa nap (`nap`, +25 energy and an hour) gets a smaller version of the same (shorter, no full dark).
- **Plain and quiet:** no text beyond the existing prompts; the existing `GO TO SLEEP` banner can fade or hide during the sequence if it covers the sleeper's head (a known issue from 053).

## Acceptance criteria
- A short design note (a section in `docs/music.md` or `docs/tasks.md`, or `docs/sleep.md`) with the choices above, the timings in one config table, and a recommendation; then a build issue after Marc picks. (If Marc says 'just build it', build the recommendation.)
- Tests for the sequence timing, Escape at every moment (lighting and music restored, no payout, clock unchanged), mute, the record player ducking and returning, nap, saves; the golden main-room frames unchanged for the normal game; `npm test` and `npm run build` pass; render frames of the sequence at 1x and look at them.

## Progress log

### 2026-10-27 (design note)
Wrote `docs/sleep.md` (design only, nothing built): the timeline and one config table (`SLEEP`: sleep 2+5+2 s, nap 1+2.5+1.5 s), light options with a recommendation (visual overlay, clock jump at the end), breathing (1 px band via `drawRegion` on the bed pose, whole-sprite bob on the sofa), snore and lullaby sound design (new `sleep` bus, system track folder, record ducking by bus ramp), nap, Escape matrix, saves, deliveries, z, banner, storyboard, tests, a five-stage build plan and 11 open questions for Marc. Found: the clock ticks during waits today, so the note recommends `holdsClock` for the sequence; game state is not saved, so a reload mid-sleep needs no restore. No code or sprite changes. Waiting on Marc to pick (or say "just build it").
