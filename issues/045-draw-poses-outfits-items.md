---
id: 045
title: Draw the doing poses, outfits and held items in the game
status: done
owner: claude
depends_on: [034]
---

## Goal
034 drew the player's doing poses (`player-sit-sofa`, `player-type-desk`, `player-guitar`, `player-read-sofa`, `player-sleep-bed`, `player-eat-table`), 36 outfit sprites (casual, out, pajamas) and 16 `held-*` overlays (mug, laptop, book, guitar, four facings each). The game draws none of them yet.

## Acceptance criteria
- While a task runs, the player draws as the matching pose at the right place over the furniture (a pose can cover more than one tile; align it to the piece it belongs to, and hide the plain player sprite while it plays). Map each task to a pose in data (`pose` on the task), with a sensible fallback to the plain sprite. `guitar` also swaps the wall guitar for the pose while it plays.
- An `outfit` state, default home, picked by a getting-dressed task later; the plain sprite and the walk frames load from `player-<outfit>-...` when it is not home. A pajamas outfit is used right after sleep until you change (decide with Marc whether that is worth doing now).
- Held items draw over the player while the matching task runs or when carrying one (mug after `coffee`, until `drink-coffee`).
- Missing sprites fall back as in 031 and log once.
- Tests, a rendered frame of each pose in its room, `npm test` and `npm run build`; Marc plays it.

## Progress log

### 2026-10-23, claude: plan
Data-driven: a `pose` and a `held` on the task (tasks.ts), what they mean in `poses.ts` (sprite, the piece it belongs to, offset from that piece, size), outfits in `outfits.ts`, one new state variable `outfit`. The game remembers which piece the player faced when the task started and draws the pose there.

### 2026-10-23, claude: done, ready for review
**What changed**
- `src/game/poses.ts` (new): `POSES` (sit-sofa, read-sofa, type-desk, eat-table, guitar, sleep-bed), each with `on` (the piece's sprite name; the pose only plays at that piece, so doomscroll sits on the sofa and does nothing special on the bed), `at` (offset from the piece's top-left), `size`, and `replacesPiece` (guitar: the hanging guitar is hidden while the pose plays). `HELD_ITEMS`, and `CARRIED` (a full mug, state `mug` = 1, shows the held mug).
- `src/game/outfits.ts` (new): `OUTFITS` (home, casual, out, pajamas) and `outfitPrefix`.
- `src/game/state-vars.ts`: one new variable, `outfit` (0 to 3, default 0). **Additive; the only state change.** Issue 009c's save must treat it like the others (a save from before it exists loads it as 0).
- `src/game/tasks.ts`: a `LOOKS` map merged into the tasks: doomscroll, work-sofa and nap sit-sofa; work type-desk; eat-dinner, reheat and drink-coffee eat-table; guitar guitar; sleep sleep-bed. `held`: laptop (work-sofa, work-bed, work), book (journal), guitar, mug (drink-coffee). `Interactable` gained optional `pose` and `held`.
- `src/game/game.ts`: remembers the faced piece at task start (`doing`), `currentPose()`, draws the pose in place of the plain player in the depth sort (in front of whatever it overlaps, e.g. the desk chair), hides the guitar piece, draws the player from `player-<outfit>-...` (falling back to the everyday clothes, logging once) and the held overlay on top.
- `src/render/player-sprite.ts`: `playerFrame` takes an outfit prefix; new `OUTFIT_SPRITES`, `POSE_SPRITES`, `HELD_SPRITES`. `sprite-names.ts` loads them all (and the existing test checks each has a file).
- Tests: `src/game/poses.test.ts` (new, 20 tests) and three in `player-sprite.test.ts`.

**Acceptance criteria, how checked**
1. Poses: tests start each task at its furniture in the real apartment and check the pose sprite is drawn at the expected place and the plain player is not; guitar swaps the wall guitar and Escape restores both; a pose at the wrong piece or with missing art falls back to the plain player. Rendered frames from the real `Game` in headless Chrome at 4x, looked at: sofa (sit), desk (type, over the chair), table (eat, on the stool), guitar, bed (lump). Pass.
2. Outfit: `outfit` state, default home; plain and walk frames load from `player-<outfit>-...`; tested for idle and walk, and the fallback. Rendered the casual outfit. **The pajamas-after-sleep idea is not done**: with no getting-dressed task, sleeping once would leave you in pajamas for good. Left for Marc to decide with the getting-dressed task. No way to pick an outfit in play yet.
3. Held items: mug is carried after `coffee` until `drink-coffee`; laptop, book and guitar overlays show while their tasks run, when no pose is drawn. Tested; rendered mug and laptop-in-bed frames. Pass (the overlays are small).
4. Missing sprites: pose, outfit and held art each fall back and log once (tests).
5. `npm test` (909) and `npm run build` pass; Marc plays it: not yet.

**Not done or not checked**
- `read-sofa` is drawn into `POSES` but no task uses it (there is no reading task). The pose and its art are ready for one.
- The pose shows at a fixed spot on the piece, so if you started the task from a different tile (for example the desk from col 6) the figure appears at the chair (col 8). Not checked how that feels in play.
- Nap uses the sit pose (there is no lying-on-the-sofa art).
- Outfits and pajamas cannot be seen in the game yet, only in tests and my renders.
- `docs/art-style.md` still says "the game does not use the poses yet" (not edited: outside this issue).

### 2026-10-23, claude (independent reviewer): review
Verdict: **approve**. `npm test` 909 pass, `npm run build` pass. Diff touches only src/ and this issue file; no PLAN.md or other issues, no reference-photos, no personal details.

**Criteria**
1. Poses: pass. Rendered real `Game` frames in headless Chrome at 3x and looked at them: sofa sit (middle cushion, in front of the sofa back), desk type (over the chair, below the desk edge), table eat, guitar (wall guitar hidden), sleep (lump fills the bed). Plain player is not drawn while a pose plays. Own checks: pose shown at the same spot when started from every sofa tile, desk cols 6/7/9; doomscroll on the bed gives no pose (plain player); Escape and natural finish restore plain player and wall guitar; missing art falls back to the plain player and warns once. Task-to-pose map is data (`LOOKS` in tasks.ts plus poses.ts). Pass.
2. Outfit state: pass for what was done. `outfit` var, default 0; idle and walk frames load from `player-<outfit>-...`; rendered casual (green) and pajamas; missing outfit art falls back to home. Pajamas-after-sleep is not done and was left for Marc, which the criterion allows ("decide with Marc"). Nothing sets `outfit` in play yet.
3. Held items: pass. Mug shows while carried (mug=1) and stops after drink-coffee finishes (mug 0); Escape on drink-coffee keeps the mug (mug stays 1, overlay shown). Laptop/book/guitar show only when no pose is drawn. Overlays are tiny.
4. Missing sprites: pass. Pose, outfit and held art each fall back and warn once.
5. Tests, frames, build: pass. Marc has not played it: **can't verify** (see below).

**Unverified (not passes)**
- How any of it feels in a browser in motion (pose pop-in at task start, walking up and back, held-item alignment against walk frames). I only looked at still frames.
- Starting from another tile: the stills show the figure appears at the fixed spot, e.g. a doomscroll from col 7 puts the sitter on the middle cushion (col 5), the desk from col 6 or 9 puts the typist at the chair (col 8). Static frames look fine; the jump itself in motion is unjudged.

**Observations (none blocks approval)**
- The typing box and the ANSWER EMAILS label are drawn over the desk, so while working at the desk the type pose is fully covered in a real frame. Seen only with the UI hidden. Likewise the work-bed task is covered by the box. This is existing UI layout, not a 045 bug, but the pose is mostly invisible during `work`.
- The held mug disappears while the eat-table pose plays (drink-coffee), and while a mug is carried the sit-sofa pose has no mug. Pose art does not include one; a small visual gap.
- Latent: a task that survives a room change keeps drawing its pose at the old room's coordinates (`doing.piece` is not cleared in `loadLevel`). Not reachable today, since no pose task lets the player walk through a door.
- `drawPlayer` logs a missing-sprite warning for an outfit's left-facing frame even when the right one is mirrored instead (no outfit is missing a left frame, so it does not show today).
- `read-sofa` has art and a pose entry but no task uses it; the guitar pose is 16x48 standing at the wall (looks right).
- `docs/art-style.md` still says the game does not use the poses yet.
- Issue 009c risk: `outfit` was inserted in the middle of `STATE_VARS` (after `mug`, before `recordSort`), not appended. If the save writes values by id, it is additive and an old save loads `outfit` as 0. If 009c saves by array position, or rejects a save with unknown or missing ids, this shifts or breaks it. It is also a likely textual merge conflict in state-vars.ts. Planner: when merging, check 009c's save format against this, and make a save from before `outfit` existed load as 0.
