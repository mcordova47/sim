---
id: "164"
title: "Outfit slots that change by occasion"
short: "Outfit slots"
status: review
owner: marc + claude
depends_on: []
summary: "Equip outfits into slots (everyday, pajamas, robe, going out) and change into any slot from the bookshelf; occasions change clothes automatically."
kind: design
decisions:
  - id: d1
    who: marc
    q: "Which outfit slots should there be?"
    options:
      - "EVERYDAY (home or casual outfits), PAJAMAS, ROBE (worn after a shower), GOING OUT (reserved: nothing triggers it yet)"
      - "one slot per style: home, casual, going out, pajamas, plus the robe in pajamas"
      - "something else"
    recommendation: "EVERYDAY (home or casual outfits), PAJAMAS, ROBE (worn after a shower), GOING OUT (reserved: nothing triggers it yet)"
    status: answered
    answer: "EVERYDAY (home or casual outfits), PAJAMAS, ROBE (worn after a shower), GOING OUT (reserved: nothing triggers it yet)"
    by: marc
    on: 2026-11-24
  - id: d2
    who: marc
    q: "Which occasions change your clothes automatically, and what brings you back to everyday?"
    options:
      - "waking up puts you in the PAJAMAS slot; a shower puts you in the ROBE slot; you return to EVERYDAY by hand at the bookshelf, or automatically after about two game hours awake"
      - "waking up and a shower change clothes automatically; returning to everyday is only by hand (nothing is automatic)"
      - "waking up, a shower and a nap change clothes; everyday returns when you start your first real task of the day"
    recommendation: "waking up puts you in the PAJAMAS slot; a shower puts you in the ROBE slot; you return to EVERYDAY by hand at the bookshelf, or automatically after about two game hours awake"
    status: answered
    answer: "waking up and a shower change clothes automatically; returning to everyday is only by hand (nothing is automatic)"
    by: marc
    on: 2026-11-24
  - id: d3
    who: marc
    q: "How does the Change clothes list at the bookshelf work?"
    options:
      - "a two-level list: first the slots (each shows the outfit equipped there); E on a slot wears that slot now; a second key (or a submenu) chooses which outfit is equipped in the slot"
      - "one flat list of all outfits as today, plus a second page of slots"
      - "two separate tasks at the bookshelf: Change clothes (wear a slot now) and Pick outfits (equip slots)"
    recommendation: "a two-level list: first the slots (each shows the outfit equipped there); E on a slot wears that slot now; a second key (or a submenu) chooses which outfit is equipped in the slot"
    status: answered
    answer: "a two-level list: first the slots (each shows the outfit equipped there); E on a slot wears that slot now; a second key (or a submenu) chooses which outfit is equipped in the slot"
    by: marc
    on: 2026-11-24
  - id: d4
    who: marc
    q: "What does an empty slot do, and does owning an outfit fill it?"
    options:
      - "an empty slot falls back to your everyday clothes; the first owned outfit that suits a slot fills it by itself"
      - "an empty slot falls back to everyday and you always fill slots by hand"
      - "slots always hold something (a default for each)"
    recommendation: "an empty slot falls back to your everyday clothes; the first owned outfit that suits a slot fills it by itself"
    status: answered
    answer: "an empty slot falls back to your everyday clothes; the first owned outfit that suits a slot fills it by itself"
    by: marc
    on: 2026-11-24
  - id: d5
    who: marc
    q: "Which outfits may go in which slot (the new `fits` list on an outfit)?"
    options:
      - "explicit `fits` list, natural slot first (used only for auto-fill): EVERYDAY takes home, casual and out outfits; GOING OUT takes casual and out; PAJAMAS takes pajamas; ROBE takes the bathrobe and pajamas"
      - "strict by style: each slot takes only its own style (a blazer cannot go in EVERYDAY)"
      - "no limit: any outfit in any slot"
    recommendation: "explicit `fits` list, natural slot first (used only for auto-fill): EVERYDAY takes home, casual and out outfits; GOING OUT takes casual and out; PAJAMAS takes pajamas; ROBE takes the bathrobe and pajamas"
    status: answered
    answer: "strict by style: each slot takes only its own style (a blazer cannot go in EVERYDAY)"
    by: marc
    on: 2026-11-24
  - id: d6
    who: marc
    q: "Does an automatic change of clothes say or sound anything?"
    options:
      - "nothing: no text and no sound; the new sprite is the news"
      - "a one-time line the first time it happens, then nothing"
      - "a short line every time (for example YOU PUT ON THE ROBE.)"
    recommendation: "nothing: no text and no sound; the new sprite is the news"
    status: answered
    answer: "nothing: no text and no sound; the new sprite is the news"
    by: marc
    on: 2026-11-24
  - id: d7
    who: marc
    q: "Does a change you make by hand stick, and does it stop the timed return to everyday?"
    options:
      - "yes: it sticks until the next occasion (sleep or a shower), and only an occasion arms the timed return"
      - "it sticks, but the timed return still happens after two awake hours"
    recommendation: "yes: it sticks until the next occasion (sleep or a shower), and only an occasion arms the timed return"
    status: answered
    answer: "yes: it sticks until the next occasion (sleep or a shower), and only an occasion arms the timed return"
    by: marc
    on: 2026-11-24
  - id: d8
    who: marc
    q: "Does a nap change your clothes?"
    options:
      - "no: a nap changes nothing (you nap in what you have on)"
      - "yes: it puts you in the PAJAMAS slot like sleeping does"
    recommendation: "no: a nap changes nothing (you nap in what you have on)"
    status: answered
    answer: "no: a nap changes nothing (you nap in what you have on)"
    by: marc
    on: 2026-11-24
  - id: d9
    who: marc
    q: "Does the Change clothes list always show all four slots, even a slot you cannot fill yet?"
    options:
      - "yes, all four always: an empty slot reads (EVERYDAY) and GOING OUT reads BY HAND, so nothing is hidden or a surprise later"
      - "only slots you can fill (an outfit of the slot's style is owned): the list grows as gifts arrive"
    recommendation: "yes, all four always: an empty slot reads (EVERYDAY) and GOING OUT reads BY HAND, so nothing is hidden or a surprise later"
    status: open
unverified:
  - "The mockups use a flat stand-in for the room and were not looked at inside the running game; real glyphs, palette, sprites and layout constants were used."
  - "Nothing was run in a browser: the touch layer, the left and right keys on a phone pad and the narrow two-row layout are designed from the code, not tried."
  - "The save field was designed against parseDecor and sync/merge.ts by reading them; no code was written, so no test exercised the repair or the sync round trip."
needs:
  - who: marc
    kind: decide
    why: "Answer d9 (all four slots always shown); then say 'merge 164' (design only, reviewed)."
    since: 2026-11-24
---

## Goal
Marc (2026-11-24): an idea like materia in a classic role-playing game: slots for the different categories; you equip an outfit to a slot; on different occasions your outfit changes automatically to that slot's outfit. His first thoughts: after a shower you are put in the robe; after waking up you are in pajamas; after that, going-out outfits, but that is blocked until there is a way to go out; and perhaps an option to change into any of the slots at the bookshelf. Builds on issues 152 (worn outfits), 156 (outfits as data with a style), 158/159 (the generator and the outfits) and 150 (poses); see docs/ideas.md ('Outfit slots that change by occasion' and 'Put on the robe after a shower').

## Acceptance criteria
This issue is a DESIGN issue first: the agent writes `docs/outfit-slots-design.md` with: the slot list and which outfits fit which slot (an outfit's `style` and a new `fits` list); the occasions the game has today (waking from sleep, a nap, a shower, the clock) and how each is detected in the code (read `src/game/game.ts`, `tasks.ts`, the sleep and nap effects, `syncOutfit`); the save format (the equipped outfit per slot, the slot being worn; an old save loads unchanged); the Change clothes UI as 320x192 mockups (ASCII or a rendered contact sheet) and the phone layout; how manual changes interact with automatic ones (does a manual change stick until the next occasion); what happens in poses and in the sleep scene (pose sprites follow the worn outfit, issue 150); the quiet-collecting risks (no outfit is better; nothing required; an automatic change never interrupts a task); a size and a staged build plan (for example stage 1 slots and the list, stage 2 occasions); and the open questions with recommended defaults. Questions that Marc has not yet answered stay as open `decisions` entries in this file. No code in this issue.
- The note's claims about the engine match the code (the reviewer checks).

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
- 2026-11-24 (agent): started. Plan: read the outfit, decor, game, task and sleep code, render real mockups with the game's font, and write docs/outfit-slots-design.md. Docs only; no code or art.
- 2026-11-24 (agent): wrote docs/outfit-slots-design.md and four mockups in docs/outfit-slots-mockups/ (rendered with the game's font, palette and sprites by a throwaway script kept outside the repo). Design: four slots as a preference list over the existing `worn` decor slot; the Change clothes list becomes a list of slots (up/down slot, left/right outfit, E wears); occasions are `taskComplete` for `sleep` (PAJAMAS) and `shower` (ROBE) through a small data table, applied only when no task runs, plus a timed return to EVERYDAY after about two game hours; the save is an optional `outfits` field in the decor save (and the three hand-copied places in `sync/merge.ts`, which would otherwise drop it). Added decisions d5 to d8 (fits, text on automatic change, manual sticks, nap). Build plan 1a, 1b, 2 (about 560 lines of code plus tests). Files: docs/outfit-slots-design.md, docs/outfit-slots-mockups/*.png, this file. Not checked: see `unverified`.
- 2026-11-24 (reviewer): independent review. Verdict: CHANGES NEEDED (small, docs only). Checked against code at 055f688: syncOutfit (game.ts:486, called 740/787/822), `finish` order (interaction.ts: effects 321, onComplete 346, cancel returns 309-313 with no onComplete), State.applyEffects then onClockSkip (state.ts:124-146), deliveries.hours (saved, advanced by tick and skips), CLOCK 2 min/s (2 game hours = 60 s), shower plain task (tasks.ts:90), sleep and nap tasks and poses (sleep-bed `clothed: false`), swap-decor ends `{completed:false, quiet:true}` so no taskComplete for swap-worn, `worn` slot (decor-data.ts:141), parseDecor/load/toJSON, achievements/feature.ts 186/254/277, sync/merge.ts 148/197/238 (confirmed: normaliser, worldText and merge rebuild decor field by field, so an unknown field would be dropped), NARROW_VIEW 224x208, hintLine ARROWS to PAD, touch d-pad has left and right, old swap box always at the bottom (worn area y is 0). All table rows hold; line numbers drift by 1 to 3 in two places (see below). Criteria: slots and fits pass; occasions and detection pass; save format and old-save loading pass (by reading); UI mockups 320x192 and 224x208 viewed, pass (look in the game: can't verify); manual vs automatic pass; poses and sleep scene pass; quiet-collecting pass; size and staged plan pass; open questions as decisions pass (issues:check --validate: 207 valid, only summary-length warnings); no code pass (git diff main --stat: only docs/ and this file). Engine-claims criterion: passes except the items below.
  Changes needed:
  - [x] Section 'The hook for issue 165' (design note, line 97) says 165 may call `game.outfitSlots.occasion("shower")` mid-scene to change clothes at a moment of its own. Section 5 says the listener only sets `pendingOccasion`, applied when `interaction.active` is null, so a mid-scene call would be deferred until the scene (a running task) ends, and `worn` cannot flip during it. Make the two agree: either say `occasion()` is deferred too and a scene that wants the robe visible before the task ends must draw the robe sprite itself (it cannot rely on `worn`), or define an explicit immediate path and say why it is safe for poses. Also say what 165 sees when ROBE is empty (the shower puts you in EVERYDAY: its 'ends in the robe' stage must not assume the robe).
  - [x] Section 8 item 3 and the occasions table (nap does nothing): a nap skips 1 game hour (config.ts NAP.hours; State.applyEffects calls onClockSkip, which advances `deliveries.hours`), so a nap taken while a return is armed shortens the wait and can make the timed return fire right after the nap. Say so (and that it is intended or not), or have the timer count only ticking hours.
  - [x] Section 5 / 8 say `taskComplete` is emitted only on completion. `InteractionSystem.award` (interaction.ts:253-263, the track editor's save reward) also calls onComplete (so `taskComplete`) while a task is still running. It cannot match `sleep` or `shower`, but note it, because the listener must key on the id and not assume the task has ended.
  - [x] Line references: cancel return is interaction.ts:309-313 (note says 306-311); swap task is tasks.ts:372 (note says 370).
  Not checked (added to `unverified`): behaviour in a browser, touch layer on a phone, mockups in the running game. Nothing else out of scope; only docs/ and this file differ from main.
- 2026-11-24 (agent): round 2: fixed all four review items in the design note (165 hook now says occasion() is deferred and the scene draws its own robe, with the empty-ROBE case; a nap shifts an armed returnAt; the award path noted; line references corrected). Status back to review.
- 2026-11-24 (reviewer, round 2): independent re-review at 752c9e0. Verdict: APPROVE. The four round 1 items are truly fixed: (1) the 165 hook now says `occasion()` is deferred behind the busy gate, so the scene draws its own robe from the robe's sprites and the real change follows when the task ends; it also covers the empty-ROBE case (`outfitSlots.resolve("robe")`); sections 5 and 8 agree, and 165's file (shower task, robe via 164's occasion, Escape skips) can use it; (2) the nap shifts an armed `returnAt` by the skipped hour (NAP.hours 1; `applyEffects` runs `onClockSkip` before `onComplete`, so the listener sees the advanced hours); (3) `award` (interaction.ts:253-263) is noted; (4) line refs match: cancel return 309-313, swap task tasks.ts:372, effects 321, onComplete 346, syncOutfit 486 (called 740/787/822), decor.ts:175/352, feature.ts:186, merge.ts 148/197/238 (hand-copied fields confirmed), worn slot decor-data.ts:141, gift days 45/69/72. Also checked: after `finish` the active task is null, so the pose (derived from `interaction.active`) is gone before `onComplete`; cancel returns before effects and `onComplete`; the clock is held by `holdsClock` activities. All criteria pass by reading; `npm run issues:check -- --validate`: 207 valid (summary-length warnings only); `git diff main --stat`: only docs/outfit-slots-design.md, four mockup PNGs and this file. Not checked (in `unverified`): browser feel, touch layer on a phone, mockups in the running game. Planner: PLAN.md table needs updating; decisions d1 to d8 stay open for Marc.
- 2026-11-24 (agent): round 3, Marc's answers (d1 to d8 on main; taken into this file's front matter). Updated docs/outfit-slots-design.md: no timed return (nothing automatic except the two occasions; no `returnAt`, no `wearing`, the slot worn is derived), strict by style (a new `robe` style for the bathrobe, `SLOT_STYLES`, no `fits` list; the pajamas outfits stay pajamas; nothing saved or drawn reads style), a nap changes nothing, no text or sound, the shower scene of 165 is in-room and the robe is put on by the occasion when the task ends (the player appears outside the tub in it), simpler build plan (about 420 lines of code and 450 of tests, was 560 and 550), mockup 2 redrawn (ROBE has one outfit, so no arrows). New decision d9 (show all four slots always). Status review for a fresh reviewer.
