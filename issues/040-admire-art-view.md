---
id: 040
title: Admire the art: a view of just the gallery wall
status: done
owner: claude
depends_on: []
---

## Goal
Marc's decision (2026-10-23): "admire the art" should change the perspective to look at the south gallery wall. The map need not change; show a view of only the wall, a static asset, not the whole map. Keep the cutscene steps `goto` and `back` for other purposes (for example playing guitar in different places).

## Acceptance criteria
- A cutscene step (for example `view {sprite}`) that shows a full-screen static image over the world and waits for a key or time, with the dialog box over it; Escape skips and always restores the normal view. The world is frozen behind it (like a dialog) and the input lock is held and released on every path.
- The `admire-art` task uses it on the gallery wall: no walk. Remove the placeholder `GALLERY` position from `config.ts` and the walk steps. The existing `goto`/`back` steps and their tests stay.
- The view asset (320x192, or whatever the screen is) is a new sprite `view-gallery-wall`, which an agent draws from Marc's photos in a separate art issue; until then use a clearly marked placeholder sprite (palette, labelled) so the mechanism can be built and reviewed. Note the art need in `issues/034-art-followups.md`.
- Docs: `docs/activities.md` and `docs/tasks.md`. Tests; `npm test` and `npm run build` pass.

## Progress log

- 2026-10-23: Started. Plan: add `view`/`unview` cutscene steps (the cutscene draws the image through the activity `draw` hook, with the dialog drawn over it by the game; `sprites` offered on the host), clear the view on every end path; `admire-art` uses it with no walk; drop `GALLERY`; placeholder `art/src/view-gallery-wall.sprite` (320x192, the pipeline accepts any tile multiple); load view sprites at start; docs and tests.
- 2026-10-23: Done, ready for review.
  - Added cutscene steps `view: "<sprite>"` (shows the picture full screen over world and HUD; stays up through later steps; the game's dialog draws over it) and `unview: true`. The view lives on the cutscene and is cleared in `end()`, so the last step, Escape and an error all restore the normal view. Held controls: the scene is a running task (`interaction.busy`), so the player is frozen and input is the scene's; no extra lock is taken, so there is nothing to release. Validation checks the sprite name.
  - `admire-art` now: view, say, wait, say, unview. No walk. `GALLERY` removed from `config.ts`. `goto`/`back` and their tests untouched.
  - `ActivityHost` gained optional `sprites`; `Game` passes its sprite source. `spriteNames` collects `view` sprites from the tasks so they load at start.
  - Placeholder: `art/src/view-gallery-wall.sprite` (320x192, slate checker, yellow frame, red diagonals, text PLACEHOLDER / VIEW GALLERY WALL / 320X192 REPLACE ME). The pipeline accepts any tile multiple, no change needed. PNG rendered to `public/sprites/`.
  - Docs: `docs/activities.md`, `docs/tasks.md`. Tests in `cutscene.test.ts` and `task-variety.test.ts` (replaced the old walk test); `sprite-names.test.ts` expects the new sprite. `npm test` (575) and `npm run build` pass.
  - Art need for the planner (not written to main's 034 file, as asked): a later art issue or 034 should redraw `view-gallery-wall` (320x192, same name) from Marc's gallery wall photos as a straight-on view of the whole south wall (the six-piece strip, larger), replacing the placeholder.
  - Not checked: how it looks and feels in a browser at 1x; the dialog box covers the bottom of the picture, so the real art should keep key content in the top ~140 px.
  - Likely conflicts with 038/041: `src/game/tasks.ts` (STATE_RULES/imports near `admire-art`) and docs/tasks.md.

- 2026-10-23 Review (independent reviewer). Verdict: **approve**, with two follow-ups below. `npm test` 575 pass, `npm run build` pass, working tree clean after rendering sprites. Diff vs main is only in scope (cutscene, activity host, game, tasks, config, sprite-names, tests, docs, placeholder sprite); no other issues or PLAN.md touched; no reference-photos content.
  - Criterion 1 (view step, frozen world, Escape restores, lock released): **pass**. My own tests (outside the repo, driving a real `Game` with a stub sprite source): from all 7 sofa tiles, Escape sent at 100 different frame offsets (waiting, in a dialog, in the wait step) always ended with the task not busy, no dialog open, `inputLocked` false and `view-gallery-wall` no longer drawn. The player did not move during the scene. Draw order is world, HUD, view, dialog, so the dialog sits over the picture. A scene ending without `unview` also clears the view (`end()` clears it). After the scene the task could be run 3 times in a row from the same tile and the player could walk again. No input lock is taken (the scene is `busy`), so there is nothing to leak.
  - Criterion 2 (admire-art, no walk, GALLERY removed, goto/back kept): **pass**. `grep GALLERY` finds nothing; goto/back tests unchanged and passing.
  - Criterion 3 (placeholder sprite): **pass**. `view-gallery-wall` is 320x192, clearly labelled PLACEHOLDER / REPLACE ME (viewed the PNG). Sprite is loaded at start through `spriteNames` (once). A sprite the source reports missing, and a game with no sprite source at all, both render without throwing and the scene keeps running. **Not done:** the art need is not noted in `issues/034-art-followups.md` on this branch (the author left it for the planner and wrote it in the log above). The planner must add it.
  - Criterion 4 (docs, tests): **pass**. `docs/activities.md` and `docs/tasks.md` updated. Validation rejects `view` of "", null, arrays, uppercase, spaces, slashes, `..`, double hyphens, and `view`+`unview` together, and bad `unview` values.
  - Finding (not a blocker; existing cutscene behaviour, but it limits this criterion in practice): Escape is ignored while a `say` dialog is open (only menus take cancel; a `say` dialog is advanced only with E). admire-art is say, wait, say, so Escape only skips during the 0.6 s wait; pressing Escape while the text is up does nothing (I held Escape for 30 frames with the dialog open: still open, still busy, view still shown). The view is always restored once the scene does end, so the criterion's "always restores" holds, but "Escape skips" is mostly not true for this scene. `docs/activities.md` line 89 says "Escape inside a cutscene's own dialog closes that dialog", which is wrong for `say` dialogs. Suggest a follow-up issue: let Escape close a `say` dialog (or skip the scene) when a cutscene opened it, and fix that doc line.
  - Unverified (not checked by anyone): how the placeholder and the final view look and feel in a real browser at 1x; whether the dialog box covering the lower part of the picture reads well; the real art. The tests stub the canvas and sprite source.
  - Likely merge conflicts with 038/041 in `src/game/tasks.ts` and `docs/tasks.md` (per the author); PLAN.md table needs updating by the planner.
