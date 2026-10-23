---
id: 035
title: Task variety from Marc's first playtest
status: todo
owner: claude
depends_on: []
---

## Goal
Make the existing tasks less repetitive and match what they say. From Marc's playtest of the sprite build (2026-10-23). Related: `docs/tasks-v2.md` (the bigger content pass, which still needs Marc's picks of songs, books and albums).

## Acceptance criteria
- **Typing text matches the task.** "Answer emails" shows code (`if (coffee) ship();`). Typing activities take their own lines (a `text` list on the spec, validated like `lines`), so email replies show email-ish lines, and working on code shows code. Keep to characters the pixel font can draw. Decide per task: `work` at the desk, `work` on the sofa and on the bed (those may be code, email, or a mix chosen by place).
- **Alternating tasks.** A task can cycle through a list on repeated use, driven by apartment state (not hidden counters), so it shows in saved progress later:
  - Open the blinds / close the blinds (blind state per window, and the sprite or window shows it if art exists; otherwise note it for 036).
  - Coffee: make coffee, then drink coffee, then make again (the mug state gates which is offered).
  - Records: alphabetize, arrange chronologically, arrange by favorites, arrange by color, and so on (cycle or choose; say which).
- **Clean the desk** gag: a task that rearranges the piles on the desk and changes no state (points only, a flavor line). Cooldown so it can't be farmed.
- **More sofa options:** nap (a short sleep that restores some energy and does not unmake the bed), work from the couch, and admire the art (a cutscene that walks to the gallery wall and says something, then returns). The gallery wall piece itself is issue 036.
- Every new task passes the existing level validation, the reachability tests and the font check. Points stay in the same range as the others.
- Docs: `docs/tasks.md` or the existing task docs list the new tasks.
- `npm test` and `npm run build` pass.

## Notes
- The alternation mechanism is the main design question: prefer one small state variable per alternating task, with `requires` and `effects` doing the cycling, so no new engine concept is needed. If that is awkward for the records list, say why and propose a minimal addition.

## Progress log
