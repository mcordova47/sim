---
id: 051
title: The meta side project (this game as a side project)
status: review
owner: marc + claude
depends_on: []
---

## Goal
Marc's idea (2026-10-23): the game supports side projects as things the character works on, and one of them is this project itself. You stare at a lower-res version of this screen and reflect that that version of you has its own simulation, which gives you a funny feeling that perhaps you are actually living in someone's side project.

## Acceptance criteria
- A task on the desk (a side-project task, for example "Work on side project") that opens the scene: the screen shows a lower-resolution picture of the game itself, with a few lines of quiet, wry reflection (not a gag machine; Marc reviews the wording in the text pass 037).
- Version 1: a static `view` (issue 040), a small, lower-res screenshot of the main room drawn as a sprite (an agent or a script can render it from the real game at 160x96 and quantize to the palette). Version 2, if it works: a live, lower-res render of the running game inside the view (a small canvas with the same room drawn at 1/2 scale, with the tiny player moving on its own), which is the better joke; decide after v1.
- Possible extra: the tiny player's own screen shows a still smaller one; at most one nested level, so it cannot recurse forever.
- Side projects as a concept: the task is one of several possible side projects (a small data list); only this one is written now. Each can have its own mood effect, points and cooldown.
- Does not break Escape (046), the input lock or saved progress. Tests; `npm test` and `npm run build` pass.

## Progress log

- 2026-10-23: Started. Plan: version 1 only. Side projects as a small data list (`src/game/side-projects.ts`), one entry written; its task is a cutscene using the `view` step with a new sprite `view-side-project` (320x192): a monitor frame around a 160x96 screenshot of the real game (rendered in headless Chrome at 1x, shrunk 2x by 2x2 averaging, snapped to the palette). Offer it at the standing desk after Answer emails. Quiet text in the style of the mirror lines.
- 2026-10-23: Version 1 done, ready for review.
  - Added `src/game/side-projects.ts` (data + `sideProjectTask`), `src/game/side-projects.test.ts` (9 tests: data to task, font characters, sprite loaded, offered at the desk and rotates in when Work is cooling down, view shown and removed, player does not move, mood/energy/cooldown/tired refusal, Escape at four stages restores the view and pays nothing, input lock released). `tasks.ts`: one import and one spread in EXTRA. `apartment.ts`: `side-project-game` added to the desk's tasks after `work`. `sprite-names.test.ts` expects the new sprite. `docs/tasks.md` has a section.
  - Art: `art/src/view-side-project.sprite` and its PNG. The screenshot is the real game (player at the desk chair, 8:04 am, no task prompt). I rendered the scene in the real game in headless Chrome at 1x and looked at it: the picture is a small, readable copy of the room (furniture, sofa, bed, gallery wall, even the tiny HUD as noise) in a monitor frame, with the dialog box over the desk edge below it. "ESC TO STOP" sits over the top bezel, which is fine.
  - Text (draft, for 037): "A small version of this room, on a small screen. Someone is at the desk." / "They are looking at a screen too." / "You do not follow that all the way down." Task flavor: "Same room, one size smaller."
  - Task numbers are placeholders: 45 points, cooldown 90, mood +4, energy -5, needs energy 10, good hours 20 to 24.
  - Not done: the nested "smaller screen inside the screen" extra, and version 2 (below). Not checked: how it feels with real keys in a browser.
  - Version 2 feasibility (live lower-res render): feasible, moderate, left as a follow-up. A second `Game` over the same rooms with its own `ApartmentState` (the save and features are attached outside `Game`, so it would not touch saved progress) could be rendered to an off-screen 320x192 canvas each frame and drawn at half size into the monitor area, with a small autopilot feeding it walk controls so the tiny player wanders. Needs: a new cutscene step or activity hook for a live `view`, sharing the sprite source, stepping the inner game from the outer update (it must not tick while the outer dialog is open, or it must, to look alive), disposing it on every end path, and tests with the stubbed canvas. Half-scale `drawImage` with smoothing off picks pixels rather than averaging, so it would look rougher than the v1 picture unless averaged by hand. Suggested as a separate issue; the one-nested-level extra comes with it for free (the inner game just plays the static picture).
  - Likely conflicts: `src/game/tasks.ts` (import line and the EXTRA list) with 009a (record player); `src/game/apartment.ts` desk line if 057 touches it (unlikely).
