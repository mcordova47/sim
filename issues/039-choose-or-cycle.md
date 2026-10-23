---
id: 039
title: Choosing a task at an object (options, not only first-available)
status: done
owner: claude
depends_on: []
---

## Goal
An object with several tasks currently offers the first one that can start, so the sofa and the bookshelf rotate by cooldown and requirements. Marc wants some things to be options the player picks, without taking up much screen: show one task at a time and press a key to cycle (to save space). From his playtest, 2026-10-23.

## Design (planner's defaults, 2026-10-23; Marc adjusts after playing)
- **No per-object configuration.** An object offers the tasks that can start right now, in the order they are listed. If exactly one can start, nothing changes from today. If two or more can start at the same time, the prompt shows the first and the player cycles through the others with a key. Tasks that exclude each other through `requires` (open and close the blinds, make and drink the coffee, the record sorts, make the bed and sleep) therefore stay automatic, and desk (work, side project, journal, tidy desk), sofa (doomscroll, work, nap, contemplate, admire the art), bed (work, doomscroll, sleep, make bed when both allowed) and bookshelf become choices without a flag.
- **Key:** `Tab` cycles forward, `Shift+Tab` backward (prevent the browser's focus move while the game has focus); also accept `Q` as an alias. Pick one in the log if a conflict shows up.
- **Prompt:** one line at the 320x192 view: the task's verb as today, and when more than one is available a small `<` and `>` (or a `1/3` count) beside it in the HUD, drawn from sprites or the pixel font. It stays one line with the longest name.
- **Selection memory:** the chosen task stays selected while the player stays facing that object, and resets to the first available when they walk away or face another object. After finishing a task, keep the same selection if still available, otherwise the first.
- **Unavailable tasks** (a requirement not met, or cooling down) are not in the cycle; if the first available task is the only one, the existing "why not" messages still show for the object's first task when nothing can start.
- Works with the saved game (nothing saved), the input lock, dialogs and activities (`Controls` needs the new key, from the pressed-key list added in 022; it must not trigger while a task runs or a dialog is open), and the good-hour icon (the icon follows the selected task).

## Acceptance criteria
- The design above is implemented and written into `docs/tasks.md`; the choice behaviour lives in the interaction system (`InteractionSystem`), not in per-object data.
- `unavailableReason` and `nearby` keep their current behaviour for the single-task case (the existing tests pass unchanged); new tests cover cycling forward and back, wrap-around, reset on leaving, selection kept after a task, cooldown and requirement changes while selected (an item becoming unavailable moves the selection), and the key not firing during tasks or dialogs.
- The desk offers Answer emails and the side project together when both can start (no more waiting for a cooldown), and the sofa and bed offer their choices.
- A rendered frame of the prompt with and without a choice at 1x; the longest prompt with the indicator fits one line. `npm test` and `npm run build` pass. Marc plays it.

## Progress log

- 2026-10-23: Started. Plan: selection logic in `InteractionSystem.update`, Tab/Q read from `controls.keys`, count in the prompt, tests, docs.
- 2026-10-23: Done, ready for review.
  - Changed: `src/game/interaction.ts` (`choices`, `choiceIndex`, cycling, memory), `src/input/keyboard.ts` (Tab no longer moves focus), `src/render/world-ui.ts` and `src/game/game.ts` (`<2/4>` after the verb), `docs/tasks.md`, `docs/floor-plan.md`. Tests: `src/game/task-choice.test.ts` (cycling, wrap, Shift/Q, reset, memory, availability changes, no cycling during tasks/dialogs/locks, real desk/sofa/bed, a seeded fuzz of random keys, Escape, dialogs and locks), `src/render/choice-prompt.test.ts`.
  - Decision: only a pick the player made is remembered. Remembering the automatic fallback broke an existing test (`offers the first task on an object that can be done now`) and would pin the wrong task; with the rule, the existing tests pass unchanged.
  - Decision: the cycle key is ignored on the frame a task ends, so a Tab typed into the typing game can't cycle.
  - Checked: `npm test` (1191 pass), `npm run build`. Rendered the real game in headless Chrome at 1x (320x192, harness deleted): open-blinds with no choice (as before, with good-hour icon), desk `WORK ON SIDE PROJECT <2/4>`, sofa `DOOMSCROLL <3/3>`. Longest real prompt with the count and good-hour hint is tested to fit one line.
  - Survey of real data over random states: choices now appear at the desk (work, side project, journal, tidy), sofa, bed, dining table (coffee/reheat/dinner), fridge (stare/humidifier), vanity (mirror and brush teeth) and bookshelf (water plant and a sort). The blinds and records stay automatic.
  - For the planner: at the vanity the mirror variants can overlap (`mirror-tired` with `mirror-day`, etc.), so the cycle can show two entries both called "Look in mirror". Not changed (outside the design as written); 041 could make them exclusive.
  - Not checked: how it feels in a browser, Tab behaviour in real browsers (preventDefault is on the window keydown).

- 2026-10-23: Review (independent reviewer). Verdict: approve.
  - Criterion 1 (design implemented, in `docs/tasks.md`, logic in `InteractionSystem`): pass. Read the diff; no per-object data, docs updated in `tasks.md` and `floor-plan.md`.
  - Criterion 2 (single-task behaviour unchanged; new tests): pass. `npm test` 1191 pass. My own temporary differential test ran the real main-room items through `main`'s old `interaction.ts` and the new one over 6 x 4000 random frames (random E, Escape, X, arrows, Shift, M, random facing spots, no Tab/Q): `nearby`, active task and score identical every frame. Author's tests cover the listed cases.
  - Criterion 3 (desk, sofa, bed choices): pass. Desk offers work, side project, journal, tidy together; sofa and bed offer choices (tested in the real game, `random: () => 0.5`).
  - Criterion 4 (rendered frame, one line, test and build, Marc plays): partly. `npm test` and `npm run build` pass; the width of the longest prompt is asserted by `choice-prompt.test.ts`. I did not re-render a frame, so the render is unverified by me. Marc has not played it yet.
  - Edge checks I wrote (temporary harness, deleted): Shift held alone or Tab held without a new press does not cycle; Tab+Q in the same frame cycles once; wrap forward and back; hammering Tab/Q while the typing game runs does not cycle or break the task; Escape out of the typing game then Tab leaves a sane `choices`/`nearby`; Shift+Tab with a dialog open leaves the pick unchanged; changing rooms and returning resets the pick to the first.
  - Unverified (not tested by anyone): feel in a real browser, and `Tab` preventDefault actually stopping focus movement in real browsers (the code adds it to the keydown preventDefault set; only read, not run).
  - Scope: only the files named in the log, plus this issue file; no `PLAN.md` or other-issue edits; no reference-photo content. Note for planner: the vanity can show two entries both named "Look in mirror" (already logged by the author, belongs to 041). "Only a player's pick is remembered" is a deliberate, logged deviation from the "keep selection" wording and is reasonable.
  - Planner: update the `PLAN.md` table to done for 039.
