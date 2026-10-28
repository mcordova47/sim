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
