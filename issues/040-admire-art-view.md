---
id: 040
title: Admire the art: a view of just the gallery wall
status: todo
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
