---
id: 018
title: Layer hardening
status: done
owner: claude
depends_on: [017]
---

## Goal
Close the gaps the second review of issue 017 found in how `Game` runs layers, before the polish features (009a to 009d) lean on them. The approved review found that a layer which does its own `ctx.save()`, translates or fades, and then throws before its own `restore()` (the usual particle or lighting pattern) leaves the camera transform shifted for the rest of the session, even though the game loop keeps running and the layer is removed. A plain drawing error is already handled; this case is not.

## Acceptance criteria
- A layer that calls `ctx.save()` and throws before its `restore()`, a layer that forgets a `restore()`, and a layer that calls `restore()` too many times cannot leave the world shifted, faded or otherwise changed for later layers, the popups, the prompt, the HUD or the next frame. Reset the canvas to the known frame state (identity transform, `globalAlpha` 1, `source-over` compositing) at the start of each frame and again right after the world pass, but only when some layer has a draw hook, so a game with no layers makes exactly the same draw calls as now.
- A test with a stateful fake canvas that tracks the transform through `save`, `restore` and `setTransform` proves each of those three cases, in `drawWorld` and in `drawHud`.
- `Layer` gets an optional `name`, and the "layer threw and was removed" message includes it, so a log line says which feature broke. Tests cover named and unnamed layers.
- The `Layer` doc comment states plainly that a layer must balance its own `save`/`restore`, what the game guarantees if one doesn't, and that a layer cannot move the camera (shake would need a camera API).
- Adding the same layer object twice is either ignored or documented. Pick one and test it.
- A replay against `main` (as done for 015 and 017) shows no change to the draw calls for a game with no layers or with layers that have no draw hooks.

## Notes
- From the review: a layer that throws is removed for the rest of the session, taking its other hooks with it. That is intended; the name in the log is the fix for it being hard to diagnose.
- Screen shake would need a camera API (`camera.shake`, or an offset the camera adds), not a layer. Leave it for the polish features to ask for if they want it.

## Progress log

- 2026-10-22 (claude): Plan: reset the canvas (identity transform, alpha 1, source-over) at frame start and after the world pass when some layer has a draw hook; reset before each layer's hook too (camera translation for world layers, identity for HUD), so a broken layer can't affect the next one; add `Layer.name`; ignore duplicate `addLayer`.
- 2026-10-22 (claude): Done, in review.
  - `src/game/game.ts`: `resetCanvas` helper; `render` resets at frame start and after the world pass only if `layers.some(l => l.drawWorld || l.drawHud)`; `drawLayer` resets inside its own save before each hook (camera translate for world, identity for HUD); `Layer.name` shown in the "threw and was removed" message (`A layer "name" threw...`, unchanged text when unnamed); duplicate `addLayer` is ignored; doc comment on `Layer` rewritten (balance your own save/restore, what the game guarantees, can't move the camera).
  - `src/game/game-events.test.ts`: transform-tracking fake canvas (save/restore/translate/setTransform, alpha, composite); 3 misbehaviours (throws before restore, forgets restore, restores too often) x `drawWorld`/`drawHud`; later world layer still gets the camera transform; name in log (named and unnamed); duplicate add; same draw calls for a layer with no draw hooks.
  - Checks: `npm run build` passes; `npm test` 155 pass (146 before, plus 9 new... 146 existing + 9 new). With the old `game.ts`, the 9 new tests fail. Replay against the base commit (10aa74d) `Game`, 9,000 random-input updates, rendering every second frame, md5 of every draw call: identical on all 4,500 frames both with no layers and with an update-only layer (the run only reached a score of 20, so it exercises little task logic; draw calls are what matter here).
  - Not verified: nothing in a real browser. The canvas state stack can't be inspected through the public API, so a layer that forgets a `restore()` still leaves one extra entry on the stack each frame (harmless to output, but it grows); the doc comment says such a layer is still a bug. Not fixed, would need `ctx.reset()` or a wrapper context.

- 2026-10-22 (claude, independent review): **Approve.**
  - Ran `npm run build` (ok) and `npm test` (155 pass). Diff against 10aa74d touches only `game.ts`, `game-events.test.ts` and this file. No scope problems.
  - Criterion 1 (reset canvas, only when a draw hook exists): pass. `hardened` is computed per frame from `drawWorld`/`drawHud`; reset at frame start and after the world pass; `drawLayer` also resets inside its own save before each hook. Checked with my own throwaway tests (deleted, not committed) using a fake canvas that tracks a full affine matrix, alpha, composite, clip and the save stack: a layer that does `scale`/`rotate`/`transform` and throws, a HUD layer that forgets `restore` after `rotate`, and a world layer that calls `restore` twice before another world layer all left the next layer at the camera translation (world) or identity (HUD), alpha 1, `source-over`, and the frame ended at identity. A world layer removing itself and adding a HUD layer mid-draw behaved correctly.
  - Criterion 2 (tests for the 3 cases in world and HUD): pass. 6 parametrised tests plus the later-layer test; they check the background fill, the world layers after, popups/prompt/HUD and the end state.
  - Criterion 3 (`name`): pass. Named and unnamed tested. My edge cases: empty string and `undefined` give the unnamed text; a name with quotes or a newline is printed raw (cosmetic only); a non-Error `throw "str"` is handled; works from `update`, `drawWorld` and `drawHud`.
  - Criterion 4 (doc comment): pass. States balance, the guarantee, the unremoved stack entries, and no camera moves.
  - Criterion 5 (duplicates): pass, ignored and tested. Note: removers are keyed on the layer object, so a stale remover from an earlier `addLayer` also removes a layer re-added later, and a duplicate add's remover removes the one registration. Existing behaviour, not documented, harmless.
  - Criterion 6 (replay shows no draw-call change): partly verified. I re-ran my own check that a game with an update-only layer makes identical fillRect/fillText/drawImage calls to one without layers; I did not rerun the author's 9,000-update md5 replay against 10aa74d. With no draw hooks `hardened` is false, both resets are skipped and `drawLayer` returns at `if (!hook)` before its new code, so I judge it low risk.
  - Beyond the criteria, notes (not blocking):
    - The reset covers transform, alpha and composite only. A layer that calls `restore` too many times and then sets `clip`, `shadowBlur` or `filter` leaves those set for later layers and the HUD (my fake showed all three surviving a frame). Not in the listed reset, and a layer that balances its own calls is unaffected, but the criterion wording "or otherwise changed" is broader than what is guaranteed. If polish features use clip or shadows, widen `resetCanvas` or document it.
    - Unverified (needs a real browser): real canvas state-stack behaviour. In my fake, a layer that forgets `restore` grew the stack by one per frame (1, 2, 3, 4), matching the author's note; the real leak cost, any browser stack limit, and long-session behaviour were not checked. Also unverified: real `setTransform` and `globalCompositeOperation` handling.
  - PLAN.md table needs updating (planner only).
- 2026-10-23 (planner): Merged. `game.ts` auto-merged with 021's changes; I read the merged render and layer code and both suites pass (224 tests). Reviewer notes carried forward: the reset covers the transform, alpha and compositing only (clip, shadow and filter are not reset; noted in 009b and 009d); a layer that forgets a `restore()` still grows the canvas state stack by one entry a frame (harmless to output, a bug in that layer).
