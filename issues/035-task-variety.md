---
id: 035
title: Task variety from Marc's first playtest
status: done
owner: claude
depends_on: []
---

## Goal
Make the existing tasks less repetitive and match what they say. From Marc's playtest of the sprite build (2026-10-23). Related: the bigger content pass (task ideas kept locally), which still needs Marc's picks of songs, books and albums).

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
- 2026-10-23, claude. Plan: per-place `work` tasks with their own typing `text`; state variables `blinds`, `mug`, `recordSort` with `requires`/`effects` doing the cycling; tidy-desk, nap, admire-art. Marc's decisions: records cycle automatically, no menu; blinds and gallery-wall art come from 036.
- 2026-10-23, claude. Done, ready for review.
  - **Typing text:** `text` list on a typing spec, validated at level build (non-empty strings, font characters, width). Lists in `src/game/typing-text.ts`. `work` (desk) is emails, new `work-sofa` is code, new `work-bed` is a mix. Tests: `task-variety.test.ts`.
  - **Alternation, no new engine concept:** `blinds` (open-blinds / close-blinds), `mug` (coffee / drink-coffee), `recordSort` (a wrapping 0 to 3 variable; four sort tasks, each requires its own turn and adds 1). Records cycle automatically, alphabetical, year, favorites, color, then round.
  - **Blinds sprite:** the sprite-exists test reads every variant name, and `window-blinds-open` / `window-blinds-closed` are not on this branch (036 is parallel), so the window has variants on `blinds` that both name the existing `window-blinds`. At merge, change the two sprite names in `apartment.ts` (`W`) when 036's files are in. `gallery-wall.png` already exists on main but is not placed on the map.
  - **Clean the desk:** `tidy-desk`, no effects, cooldown 90.
  - **Sofa:** `nap` (energy under 75, +25, +1 hour, bed untouched; numbers in `NAP`), `work-sofa`, `admire-art`.
  - **One small engine addition:** `admire-art` walks to the gallery wall and back from whichever sofa tile the player stood on, which fixed relative `walk` steps cannot do. Added cutscene steps `goto {col,row}` and `back` plus an optional `route()` on the activity host (breadth first search in `Game`, avoiding doorways). Documented in `docs/activities.md`.
  - **Docs:** `docs/tasks.md` (new), `docs/activities.md`.
  - **Files:** `src/game/{tasks,apartment,state-vars,config,game,activity}.ts`, `activities/{typing,cutscene,fake-host}.ts`, new `typing-text.ts`, tests `task-variety.test.ts`, `activities/cutscene.test.ts`, `apartment.test.ts`.
  - **Checked:** `npm test` (565 pass) and `npm run build` pass. The existing level validation, reachability (every task has a reachable spot), font and sprite-exists tests all cover the new tasks. Points: new tasks 10 to 80, inside the old range 10 to 90.
  - **Not checked:** how any of it looks or feels in a browser (typing box with the new lines, the admire walk, the nap prompt).
  - **Design notes for Marc:** (1) an object offers the first startable task, so at the sofa and bookshelf the tasks rotate by cooldown and requirements rather than by choice; a pick-a-task menu would be a new feature. (2) the four record sorts and coffee make/drink are different task ids, so doing them in a row counts as variety for the combo (each id has a cooldown of at least 15 s, records 45 s). (3) the gallery wall spot (`GALLERY` in config.ts) is a placeholder tile on the north wall until 036 places the piece.
- 2026-10-23, reviewer (independent). Verdict: **approve**.
  - Ran `npm test` (565 pass) and `npm run build` (ok) on the branch. Wrote my own edge-case tests outside the repo (not committed).
  - **Typing text: pass.** `text` validated at build (rejects empty list, non-list, empty or blank strings, non-strings, non-font characters such as an accented e or a newline, and lines over `TYPING.maxLineWidth`). Desk is email, sofa code, bed mixed. A pool smaller than `lines` refills without throwing.
  - **Alternating tasks: pass.** Over 9 record sorts in a row the order was alphabetical, year, favorites, color, then round again, with `recordSort` wrapping 3 to 0. Coffee and drink alternated over 4 cycles; with every table task on offer the table rotated coffee, drink, reheat, eat. Blinds: close refused while closed, open refused while open, close available after the 15 s cooldown. Blind state is in apartment state. Records cycle automatically (no menu), as Marc decided.
  - **Clean the desk: pass.** No effects, cooldown 90.
  - **Sofa: pass.** Nap raised energy (40 to about 64 after the clock moved on), left `bedMade` at 1, refused at energy 90. Admire-art run from every standable tile and facing next to the sofa, with a prompt each time (up to 42 starts): reached the gallery tile, never stepped on a doorway, ended on its start tile with the starting facing. With all sofa tasks on offer, the sofa rotated doomscroll, contemplate, work-sofa, admire-art as cooldowns ran.
  - **Validation, reachability, font, sprite-exists, points (10 to 80): pass** via the existing tests, which cover the new tasks.
  - **Docs: pass.** `docs/tasks.md` and `docs/activities.md`.
  - **Scope:** only issue 035 files; no PLAN.md or other issues touched. No privacy concerns. The one engine addition (`goto`, `back`, `route()`) is small and documented.
  - **Unverified (browser feel and look):** the typing box with the new lines, the admire-art walk, the nap and other prompts, how the window reads (both variants use `window-blinds` until 036). Merge note: change the two `window-blinds` sprite names in `apartment.ts` (`W`) when 036's `window-blinds-open` and `window-blinds-closed` land; point `GALLERY` in config.ts at the real piece.
  - **Minor, not blocking:** pressing Escape in the middle of the admire-art walk skips the rest, so `back` never runs and the player is left partway across the room (I saw tile 3,3). This matches how Escape works for other cutscenes. The nap needs energy 75 or less, so at high energy the sofa offers other tasks only.
