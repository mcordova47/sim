---
id: "196"
title: "Playable instruments: where to start"
short: "Playable instruments design"
status: todo
owner: marc + claude
depends_on: []
summary: "Design how the harmonica, kalimba or jaw harp could be played, as small skills like the guitar."
kind: design
decisions:
  - id: d1
    who: marc
    q: "Which instrument should be playable first?"
    options:
      - "the kalimba (its notes map to a small row of keys, a calm sound)"
      - "the harmonica"
      - "the jaw harp"
      - "none for now"
    recommendation: "the kalimba (its notes map to a small row of keys, a calm sound)"
    status: open
---

## Goal
Marc (2026-11-25 ask: file the remaining build issues): the display instruments (harmonica, kalimba, jaw harp; issue 167) could become playable later, one issue each (docs/decor-expansion-design.md section 4: a task, a voice in the sound feature, the arrows activity with its notes, held sprites, tests; the item must never be needed and an unowned instrument's task is simply not offered). This is the design step before any build, because it adds a whole skill system beside the guitar's (docs/guitar-skill-design.md).

## Acceptance criteria
A DESIGN issue: `docs/playable-instruments-design.md` with mockups where useful: how an instrument skill works next to the guitar's (levels, groove, the arrows activity `NotesActivity`, how notes map to keys for the kalimba, the harmonica's breath and the jaw harp's twang), the task (`play-kalimba`, pay, cooldown, requires the item displayed in a trinket place or just owned? decide with a recommendation), the voice (the music-lab and sound feature: what a kalimba voice needs; you cannot hear audio: describe how Marc tunes it by ear), the held sprites (4 per instrument at 16x16) and whether a pose is needed, the tie to the trinket places (an instrument is also a display item), the quiet-collecting risks, the sync and save fields (taskCounts, skill levels: `sync/merge.ts`), sizes and a staged plan, and open questions as `decisions` entries with a recommended default. No code and no art in this issue.

## Progress log
- 2026-11-25 (planner): filed on main from the decor expansion design; not started.
