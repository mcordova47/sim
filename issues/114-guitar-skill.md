---
id: 114
title: Guitar skill: from single notes to fingerstyle
status: todo
owner: marc + claude
depends_on: [108]
---

## Goal
Marc (2026-10-28): layer in progression after the timbre (108). A new **"guitar skill" stat**: playing starts simple and becomes more complex as you get better.
1. Single notes at first.
2. Then chords.
3. Then full strumming patterns.
4. Then more complex fingerstyle-sounding patterns: each keypress could be multiple notes, or a persistent bass line and harmony run underneath while the keypress plays a melody line.

## Design questions (design first, one at a time, with the planner's recommendations)
- How skill grows (time playing, number of sessions, a quiet counter; never a grind or a bar to fill; see the zen-garden rule), whether it can fall (recommend no), whether it shows anywhere (a stat on the pause screen, deadpan wording) and how it relates to the "meaningless stats" idea in `docs/decor.md`.
- How keypresses map to notes at each level (the notes activity, `src/game/activities/notes.ts`), how a chord or strum is chosen from the key, and how the accompaniment pattern is scheduled so it stays in time with the keypress melody.
- Whether the instrument matters for skill (one skill per instrument, or one for all).
- Staging: each level as its own small issue, with tests of the pure mapping functions.

## Acceptance criteria
- A short design agreed with Marc, then small build issues filed.

## Progress log
- 2026-10-28: design written in `docs/guitar-skill-design.md` (branch `issue/114-design`): skill derived from `stats.taskCounts.guitar` (no new save field, sync merge already max), four levels as data, pure `key -> timed notes` functions, a groove scheduler on the music bus, staged plan 114a to 114g, 5 open questions for Marc. Status unchanged (todo).

## Later ideas (Marc, 2026-10-28)
- **Wrong key presses sound messed up** (nice to have, later): a wrong key in the notes game plays a deliberately off sound, such as a muted-string thunk, a buzz or a dissonant clash, instead of a clean note. Could depend on skill (a beginner clunks more, a better player's slips are subtler). Needs a look at how the notes activity decides what a wrong press is; file as its own small issue when picked.
- **More chords at higher levels** (Marc, 2026-10-28): increase the number of chords as skill rises, so a level has more than four chords and there is no longer a one-to-one mapping between the arrow keys and chords. Balance this against complexity: how a key picks among several chords (a held modifier, the previous chord, the position in the groove's progression, a second key row) without making it hard to play. Design with Marc after the level 6 groove (114b) is felt.
  - Planner's recommendation (2026-10-28, Marc asked to balance code complexity): **park it.** The six levels and the level 6 groove already give variety; a key-to-several-chords mapping costs roughly 150 to 250 lines plus hints and tests and loses the easy "one arrow, one chord" feel. Cheaper ways to get variety later: per-session seeded choice among two or three chord sets for the same arrows, or richer groove progressions. Revisit after the groove is felt.
