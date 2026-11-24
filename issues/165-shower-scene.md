---
id: "165"
title: "A Sims-like shower scene that ends in the bathrobe"
short: "Shower scene"
status: review
owner: marc + claude
depends_on: ["164"]
summary: "A short comic shower scene (bubbles, steam, a hiss) when you take a shower, ending with the player in the bathrobe."
kind: design
decisions:
  - id: d1
    who: marc
    q: "Where does the shower scene play?"
    options:
      - "a composed close-up like the sofa and side-project scenes: the player in the shower, bubbles and steam, then out in the robe"
      - "in the bath room itself: the player stays in the tub with effects drawn over it"
      - "both: the in-room version while it runs, a close-up for the finish"
    recommendation: "a composed close-up like the sofa and side-project scenes: the player in the shower, bubbles and steam, then out in the robe"
    status: answered
    answer: "in the bath room itself: the player stays in the tub with effects drawn over it"
    by: marc
    on: 2026-11-24
  - id: d2
    who: marc
    q: "How should the effects look?"
    options:
      - "soap bubbles cover the body with the head showing (a nod to the censor blur); steam and fog drift up; droplets fall from the showerhead; all calm and slow"
      - "steam only, no bubbles"
      - "something sillier: more bubbles, bubbles that float away"
    recommendation: "soap bubbles cover the body with the head showing; steam and fog drift up; droplets fall from the showerhead; all calm and slow"
    status: answered
    answer: "soap bubbles cover the body with the head showing (a nod to the censor blur); steam and fog drift up; droplets fall from the showerhead; all calm and slow"
    by: marc
    on: 2026-11-24
  - id: d3
    who: marc
    q: "Sound for the scene?"
    options:
      - "a soft shower hiss (filtered noise on the effects bus) with a quiet click when it stops; the existing music keeps playing underneath"
      - "no sound beyond the existing music"
      - "a short jingle"
    recommendation: "a soft shower hiss (filtered noise on the effects bus) with a quiet click when it stops; the existing music keeps playing underneath"
    status: answered
    answer: "a soft shower hiss (filtered noise on the effects bus) with a quiet click when it stops; the existing music keeps playing underneath"
    by: marc
    on: 2026-11-24
  - id: d4
    who: marc
    q: "Reduced motion (the browser setting, docs/reduced-motion.md)?"
    options:
      - "with it on, the steam is still and the bubbles do not move; the scene is otherwise the same"
      - "with it on, skip the scene and just play the old shower"
      - "ignore the setting for this scene"
    recommendation: "with it on, the steam is still and the bubbles do not move; the scene is otherwise the same"
    status: answered
    answer: "with it on, the steam is still and the bubbles do not move; the scene is otherwise the same"
    by: marc
    on: 2026-11-24
  - id: d5
    who: marc
    q: "When no bathrobe will be worn (none owned or the ROBE slot is empty), what does the last picture of the shower scene show?"
    options:
      - "the outfit that will be worn after the shower (usually the everyday one), standing where the robe would"
      - "a towel wrapped round the player (one more picture to draw)"
      - "no last picture: the scene ends on the bubbles and the room comes back"
    recommendation: "the outfit that will be worn after the shower (usually the everyday one), standing where the robe would"
    status: answered
    answer: "i think n/a? because there isn't really a \"cutscene\" per se. it's more like the player appears in the shower and then outside of it with either the robe or everyday clothes (maybe a towel is another robe option, maybe even the default?)"
    by: marc
    on: 2026-11-24
  - id: d6
    who: marc
    q: "Besides Escape (stop, no points, no robe), should there be a way to skip to the end of the shower scene and still be paid?"
    options:
      - "no: Escape is the one back-out and pays nothing, as in every other scene"
      - "yes: pressing E skips to the last picture and pays the usual points"
      - "yes, but only after the player has seen the whole scene once"
    recommendation: "no: Escape is the one back-out and pays nothing, as in every other scene"
    status: answered
    answer: "no: Escape is the one back-out and pays nothing, as in every other scene"
    by: marc
    on: 2026-11-24
  - id: d7
    who: marc
    q: "A shower can be repeated every 16 seconds (a 10 second cooldown and the 6 second scene). Should every shower play the whole scene?"
    options:
      - "yes: it is only 6 seconds; look again after playing it"
      - "the whole scene the first time each game day, a shorter one (just the water and the robe) after that"
      - "only the first shower ever plays the scene"
    recommendation: "yes: it is only 6 seconds; look again after playing it"
    status: answered
    answer: "yes: it is only 6 seconds; look again after playing it"
    by: marc
    on: 2026-11-24
  - id: d8
    who: marc
    q: "What colour is the shower stall's tile in the close-up? The real bath is white glossy tile, but a heap of white bubbles cannot be seen against white."
    options:
      - "teal tile, for readability (a departure from the apartment)"
      - "the real bath's white tile, with the bubbles outlined in dusk (hard to read in the mockup)"
      - "a pale blue (sky) tile, between the two"
    recommendation: "teal tile, for readability (a departure from the apartment)"
    status: answered
    answer: "no closeup"
    by: marc
    on: 2026-11-24
  - id: d9
    who: marc
    q: "Marc suggested a towel might be another ROBE-slot option, even the default. Should a towel be drawn as an outfit for the ROBE slot, and be what you wear after a shower when you own no robe?"
    options:
      - "not now: with no robe the empty slot falls back to your everyday clothes; a towel is filed as a later outfit idea (new art through the outfit generator, and a style decision under the strict slots)"
      - "yes, as a second ROBE-slot outfit you can equip, but the default stays everyday clothes"
      - "yes, and the towel is what you wear after a shower until you own a robe"
    recommendation: "not now: with no robe the empty slot falls back to your everyday clothes; a towel is filed as a later outfit idea (new art through the outfit generator, and a style decision under the strict slots)"
    status: open
  - id: d10
    who: marc
    q: "Where does the player appear after the shower?"
    options:
      - "on the tile they stood on beside the tub (where they pressed E), facing the tub: no relocation, nothing to check"
      - "always on one fixed tile on the walkway, whichever tile they stood on"
    recommendation: "on the tile they stood on beside the tub (where they pressed E), facing the tub: no relocation, nothing to check"
    status: open
  - id: d11
    who: marc
    q: "With reduced motion on, should the falling droplets (1 x 2 pixels, a few pixels of travel) stay, while the steam and fog go still and the floating bubbles stop?"
    options:
      - "keep the droplets: they are the signal that the water is on, and they are tiny and short"
      - "make the droplets still too (a few fixed short strokes under the tap)"
    recommendation: "keep the droplets: they are the signal that the water is on, and they are tiny and short"
    status: open
unverified:
  - "Nothing was run in a browser: how the in-room scene looks and feels at real size and speed, the timing, the touch layer and how small the bubbles read on a phone are designed from the code and mockups."
  - "The mockup pose art is drawn in code as a stand-in and the mockup particles come from a re-implementation of the particle pool equations, not the real pool; the HUD, popup and confetti are not drawn; the camera placement of the small bath room is read from camera.ts, not seen in the running game."
  - "The hiss and click were not heard, and the synth additions (a bus, a looping noise voice with hold) were read in the code, not tried."
  - "Issue 164 is an unmerged design: the slots, the occasion and 'return to everyday by hand' are taken from its note and Marc's answers, not from code."
  - "Whether steam and fog stay inside the room at real speed, and whether the 16 x 48 pose sorts in front of the tub as the sofa pose does, were read from the draw code, not seen."
needs:
  - who: marc
    kind: decide
    why: "Answer d9 to d11 (or accept the recommended defaults) about the in-room shower scene; then say 'merge 165' (design only, reviewed; the build follows 164)"
    since: 2026-11-24
---

## Goal
Marc (2026-11-24): a Sims-like animation for the shower scene: the player in the shower covered in soap bubbles with some kind of particle motion showing the shower is on (steam, fog); when the shower turns off, the player is out of the shower in a bathrobe. See docs/ideas.md ('Put on the robe after a shower'). Today `shower` is a plain task in the bath (6 s, 70 points, mood +6, `src/game/tasks.ts`).

## Acceptance criteria
A DESIGN issue first: `docs/shower-scene-design.md` with the scene as mockups at 320x192 (and the phone layout, 224x208): the stages (shower off, on with bubbles and steam, off, out in the robe), the art needed (counts and sizes, palette only, no text), the particle effects reusing `src/game/particles`, the sound cues (`SOUND.effects`), how the robe appears (via the outfit slots of issue 164: the occasion 'after a shower' equips the ROBE slot; until that exists the scene may use the robe item if owned and the everyday outfit otherwise), reduced motion (docs/reduced-motion.md), the task's duration and points (unchanged unless Marc says), how it ends and what happens if the player skips it (Escape), the sleep-pose style of a clothes-free picture (issue 150), and a size and staged build plan. Unanswered questions stay as open `decisions` entries. No code in this issue.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
- 2026-11-24 (claude): started on a worktree `~/Dev/repos/mcordova47/sim-worktrees/165-shower-scene` (branch `issue/165-shower-scene`, from main `b1db29a`). Plan: read the code the scene touches, render mockups with the game's own palette, sprites and font, and write `docs/shower-scene-design.md`. Note: `depends_on` 164 is `done` on its own unmerged branch, a design only; I read its note read-only and did not change it.
- 2026-11-24 (claude): wrote `docs/shower-scene-design.md` and nine mockup PNGs in `docs/shower-scene-mockups/` (desktop 320 x 192 and phone 224 x 208, four pictures each, plus the no-robe picture 4 and the white-tile comparison). The design: a new activity drawing a front-on shower stall at 4x in a 192 x 192 stage centred on both views (no view switch); four pictures over the 6 second task (curtain closed, on with foam, steam, droplets and fog, off with a click, out in the robe or the outfit that will be worn); the player is a real head over an opaque heap of foam, so there is no clothes-free body art; the activity owns a second particle pool because the game's pool is under the scene; the hiss needs a `shower` bus and a looping noise voice with hold (about 25 lines in the synth); reduced motion freezes steam and bubbles and cuts the curtain; Escape pays nothing and fires no occasion; the robe is drawn by `outfitSlots.resolve("robe")` and never written by the scene. Seven sprites (five 48 x 48, two 32 x 16), three particle kinds, four build stages. Added d5 to d8 as open decisions (each with a recommended default) and a `needs` entry. Files: `docs/shower-scene-design.md`, `docs/shower-scene-mockups/*.png`, this file. Not checked: see `unverified`.
- 2026-11-24 (reviewer): independent review at 86d5c5d. Verdict: APPROVE (status done; PLAN.md table needs updating by the planner; d1 to d8 stay open for Marc). Evidence: `git diff main...HEAD` touches only docs/shower-scene-design.md, ten PNGs and this file (no src, art or reference-photos); d1 to d4 are unchanged (the only front matter deletion is `status: todo`); `npm run issues:check -- --validate`: 207 valid, warnings only for other files; every decision has a recommendation and status open. Engine claims checked against the code: true or within a few lines: tasks.ts:90,189,349 (exact), apartment.ts bath map and `U` (228-245), activity.ts registerActivity and draw signature, game.ts draw order (world UI, HUD, activity, dialog, stop hint at 857-863; the hint is skipped for encounters), reducedMotionAsked at 155 and encounter dependency at 306, ActivityHost (339-377) has no reducedMotion member, interaction.ts Escape (159-160) and finish (302-347: cancel returns before effects, score, cooldown, onComplete), pool.draw uses the context's coordinates, ParticlesFeature.drawWorld is the only draw and taskEmitters is by task id and anchored in world pixels (1546), shapes and kinds throw when unknown, steam and bubble are `dot2`, synth NOISE_SECONDS 0.5, envelope is peak then exponential ramp to silence, `hold` only for formants (synth.ts:159), no loop in BufferSourceLike (audio-types 48-53), lazily made `sleep` and `encounter` buses with rampBus, SleepSound pattern, image smoothing off, drawScaled has no production caller (only a test), sprite sizes must be multiples of 16 except icon-*, HUD_ICON_NAMES is in spriteNames, the head is rows 0 to 6 and the shirt starts at row 7 of player-idle-down, bed pose is clothed false. Wrong or imprecise (all minor): (a) "the snore's 0.04, the quietest sound": the snore's main voice is 0.07 (noise layer 0.04) and a 0.035 sound exists; (b) "about 14,000 pixels" of art is 12,544 (5 x 2304 + 2 x 512); (c) the In short line says the robe falls back to "the outfit already worn" but 164 resolves an empty ROBE to EVERYDAY (section 5 and mockup 4b say it correctly); (d) section 9 item 9 says the desktop hint sits "in the strip above the stage's arm", but the stage fills the full 192 px height so there is no strip: the hint is drawn over the tile (it does not touch the arm) and is low contrast on teal in the mockups. Consistency with 164: the scene keeps task id shower, never writes worn, does not assume the robe is owned (`resolve("robe")`, with a worn-outfit stand-in until 164 stage 2), knows the occasion is deferred and draws its own last frame, and relies on cancel firing nothing. It departs from 164's suggestion of a `clothed: false` picture by using head over foam; that is within the 150 style and argued in section 2 and 4. Arithmetic: 48 x 4 = 192; desktop stage x 64 to 256, y 0 to 192; phone x 16 to 208, y 8 to 200; beats 0.117, 0.142, 0.167, 0.767, 0.883 of 6 s = 0.70, 0.85, 1.00, 4.60, 5.30 s, matching the timeline; sprite sizes 48 x 48 and 32 x 16 are multiples of 16; particle alive estimates (drops about 8 to 15, steam about 9, bubbles about 3, 25 in all, pool 60) hold. Mockups (viewed): 320 x 192 and 224 x 208 at 3x with caption strips outside the game picture, 4 stages plus the no-robe and white-tile comparisons; the head shows over an opaque heap, droplets, faint steam and the robe frame are present; legible, gender-neutral, no text in the picture (only the game's own stop hint); steam is faint in the mockups. Criteria: mockups pass; art list pass; particles reuse pool pass; sound cues pass; robe via slots pass; reduced motion pass; duration and points unchanged pass; end and Escape pass; clothes-free approach pass; size and build plan pass; open questions kept open pass; no code or art pass. Could not check: browser look and feel, audio, touch layer, how the bright scene reads after a dark night room, 164 outfitSlots code (unmerged), the foam geometry (see unverified). Optional tidy for the author, not blocking: fix (a) to (d) above.
- 2026-11-24 (claude): REVISED after Marc answered d1 to d8: he chose the in-room version (no close-up), no cutscene (the player appears in the tub and then beside it), no skip, every shower plays the whole scene. Rewrote `docs/shower-scene-design.md` and replaced the mockups in `docs/shower-scene-mockups/` (17 PNGs: the real bath room as the game draws it, small and bottom-centred, desktop 320 x 192 and phone 224 x 208, five pictures each, a 6x detail of the tub, the no-robe picture and the reduced-motion picture). The scene is now a pose (`shower-tub`, `clothed: false`, like `sleep-bed`) over the tub, one new 16 x 48 sprite, the game's own particle pool with four new kinds, task phases from data, a hiss on a new bus with a looping noise voice, and no robe handling of its own (164's occasion does it). The earlier review entry above applies to the superseded close-up design. Added d9 (towel), d10 (where the player appears), d11 (droplets under reduced motion), each open with a recommendation, and replaced the `needs` entry. Not checked: see `unverified`.
