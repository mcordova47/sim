---
id: "164"
title: "Outfit slots that change by occasion"
short: "Outfit slots"
status: todo
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
    status: open
  - id: d2
    who: marc
    q: "Which occasions change your clothes automatically, and what brings you back to everyday?"
    options:
      - "waking up puts you in the PAJAMAS slot; a shower puts you in the ROBE slot; you return to EVERYDAY by hand at the bookshelf, or automatically after about two game hours awake"
      - "waking up and a shower change clothes automatically; returning to everyday is only by hand (nothing is automatic)"
      - "waking up, a shower and a nap change clothes; everyday returns when you start your first real task of the day"
    recommendation: "waking up puts you in the PAJAMAS slot; a shower puts you in the ROBE slot; you return to EVERYDAY by hand at the bookshelf, or automatically after about two game hours awake"
    status: open
  - id: d3
    who: marc
    q: "How does the Change clothes list at the bookshelf work?"
    options:
      - "a two-level list: first the slots (each shows the outfit equipped there); E on a slot wears that slot now; a second key (or a submenu) chooses which outfit is equipped in the slot"
      - "one flat list of all outfits as today, plus a second page of slots"
      - "two separate tasks at the bookshelf: Change clothes (wear a slot now) and Pick outfits (equip slots)"
    recommendation: "a two-level list: first the slots (each shows the outfit equipped there); E on a slot wears that slot now; a second key (or a submenu) chooses which outfit is equipped in the slot"
    status: open
  - id: d4
    who: marc
    q: "What does an empty slot do, and does owning an outfit fill it?"
    options:
      - "an empty slot falls back to your everyday clothes; the first owned outfit that suits a slot fills it by itself"
      - "an empty slot falls back to everyday and you always fill slots by hand"
      - "slots always hold something (a default for each)"
    recommendation: "an empty slot falls back to your everyday clothes; the first owned outfit that suits a slot fills it by itself"
    status: open
  - id: d5
    who: marc
    q: "Which outfits may go in which slot (the new `fits` list on an outfit)?"
    options:
      - "explicit `fits` list, natural slot first (used only for auto-fill): EVERYDAY takes home, casual and out outfits; GOING OUT takes casual and out; PAJAMAS takes pajamas; ROBE takes the bathrobe and pajamas"
      - "strict by style: each slot takes only its own style (a blazer cannot go in EVERYDAY)"
      - "no limit: any outfit in any slot"
    recommendation: "explicit `fits` list, natural slot first (used only for auto-fill): EVERYDAY takes home, casual and out outfits; GOING OUT takes casual and out; PAJAMAS takes pajamas; ROBE takes the bathrobe and pajamas"
    status: open
  - id: d6
    who: marc
    q: "Does an automatic change of clothes say or sound anything?"
    options:
      - "nothing: no text and no sound; the new sprite is the news"
      - "a one-time line the first time it happens, then nothing"
      - "a short line every time (for example YOU PUT ON THE ROBE.)"
    recommendation: "nothing: no text and no sound; the new sprite is the news"
    status: open
  - id: d7
    who: marc
    q: "Does a change you make by hand stick, and does it stop the timed return to everyday?"
    options:
      - "yes: it sticks until the next occasion (sleep or a shower), and only an occasion arms the timed return"
      - "it sticks, but the timed return still happens after two awake hours"
    recommendation: "yes: it sticks until the next occasion (sleep or a shower), and only an occasion arms the timed return"
    status: open
  - id: d8
    who: marc
    q: "Does a nap change your clothes?"
    options:
      - "no: a nap changes nothing (you nap in what you have on)"
      - "yes: it puts you in the PAJAMAS slot like sleeping does"
    recommendation: "no: a nap changes nothing (you nap in what you have on)"
    status: open
---

## Goal
Marc (2026-11-24): an idea like materia in a classic role-playing game: slots for the different categories; you equip an outfit to a slot; on different occasions your outfit changes automatically to that slot's outfit. His first thoughts: after a shower you are put in the robe; after waking up you are in pajamas; after that, going-out outfits, but that is blocked until there is a way to go out; and perhaps an option to change into any of the slots at the bookshelf. Builds on issues 152 (worn outfits), 156 (outfits as data with a style), 158/159 (the generator and the outfits) and 150 (poses); see docs/ideas.md ('Outfit slots that change by occasion' and 'Put on the robe after a shower').

## Acceptance criteria
This issue is a DESIGN issue first: the agent writes `docs/outfit-slots-design.md` with: the slot list and which outfits fit which slot (an outfit's `style` and a new `fits` list); the occasions the game has today (waking from sleep, a nap, a shower, the clock) and how each is detected in the code (read `src/game/game.ts`, `tasks.ts`, the sleep and nap effects, `syncOutfit`); the save format (the equipped outfit per slot, the slot being worn; an old save loads unchanged); the Change clothes UI as 320x192 mockups (ASCII or a rendered contact sheet) and the phone layout; how manual changes interact with automatic ones (does a manual change stick until the next occasion); what happens in poses and in the sleep scene (pose sprites follow the worn outfit, issue 150); the quiet-collecting risks (no outfit is better; nothing required; an automatic change never interrupts a task); a size and a staged build plan (for example stage 1 slots and the list, stage 2 occasions); and the open questions with recommended defaults. Questions that Marc has not yet answered stay as open `decisions` entries in this file. No code in this issue.
- The note's claims about the engine match the code (the reviewer checks).

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
