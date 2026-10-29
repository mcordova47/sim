# The side project picture from a config (design note, issue 111)

Status: design only, nothing built. For Marc's review; the planner asks the open questions one at a time.

## Summary
The little room in `view-side-project` stops being a PNG and is **composed at runtime**: the real main room's pieces, drawn at half size, dimmed and softened, inside a monitor frame, then changed by a short **editable text file of overrides** (move this, swap that look, hide this, add that, and where the tiny figure stands). An empty file means a faithful copy of the real room; every line is a deliberate drift. A pure `composeSideProject(room, config, state)` returns a list of draw operations, so it is all testable without a canvas. The same function takes game state, which is where later effects come from.

## Today
- `art/src/view-side-project.sprite` (320x192): a monitor on a desk, an older room layout as plain shapes inside it, HUD bars, a tiny figure (issue 101).
- `src/game/side-projects.ts`: one `SideProject` with `view: "view-side-project"` and four lines. A cutscene `view` step draws the sprite full screen; the phone's narrow view switches to 320x192 for it (issue 090).
- The room inside the monitor is about half scale (the real main room is 20 tiles wide, about 320 px; the monitor screen is about 165 px).
- Line 2 of the narration says the tiny person stands on top of the desk. That is the glitch.

## Recommended design

### 1. Config: format and place
A plain text file in the repo, `src/game/side-project-room.txt`, imported with Vite's `?raw` (the repo already does this in tests), so editing it reloads the dev server. Not in the pause screen: it is Marc's file, like the map, and the game stays free of editor UI. Hand-parsed, no dependency, one command per line, `#` comments:

```
# the little room: overrides of the real room, in the real room's pixels (1x)
move   queen-bed      +16 0        # shift by
look   queen-bed      bed-unmade   # draw another sprite
hide   cube-bookshelf
add    plant-2        at 96 72     # a sprite not in the real room
figure on standing-desk 6 -9       # the tiny person: piece, then offset (the glitch)
dim    0.35                        # optional tuning, with limits
```
- Piece ids are the real pieces' names, slugged (`queen-bed`, `standing-desk`); `look` and `add` take a sprite name that exists. Coordinates are real-room pixels, so a number means the same thing as in the map.
- Unknown piece, missing sprite, number out of range: a clear error naming the line. In tests it fails; in the browser it logs a warning, ignores that line and keeps going. The game never breaks over this file.

### 2. The compose function
`src/game/side-project-room.ts` (pure):
```
parseConfig(text): { ops: ConfigOp[]; problems: string[] }
composeSideProject(level: Level, config: ConfigOp[], state?: (id)=>number): DrawOp[]
DrawOp = { sprite: string; x: number; y: number }     // real-room pixels, drawn in order
```
Order: floor and walls, pieces sorted as the real room sorts them, the figure last. It starts from `APARTMENT.rooms.main`, applies the ops, and returns the list. The unnamed pieces the real game draws by rules (decor slots, the plant) use their default look, so the little room is steady and does not track the real one's state unless a `when` says so (stage E).

### 3. Drawing and staying near the existing look
- New sprite `view-side-project-frame`: today's monitor, desk and wall with the screen area transparent (cut from the existing source; the HUD bars stay in the frame).
- A small `SideProjectView` draws the frame, then the ops at 1/2 scale into an offscreen canvas, **cached** (redrawn only if the config or state changed), then a dim overlay and light scan noise. Half scale with smoothing on averages pixels, which gives the "slightly degraded, dimmer copy" for free; dim is `rgba(ink, 0.3)` and is tunable in the config within 0 to 0.6.
- `SpriteDrawer` gets an optional `drawScaled(ctx, name, x, y, scale, smooth)`; tests keep recording drawing calls.
- The cutscene `view: "view-side-project"` stays the same name; a small registry of **composed views** (name to painter) is checked before sprites. Narrow view and `drawRegion` zoom keep working because the painter fills the same 320x192.
- Fallback: if the config or a sprite fails, draw the old PNG (kept until Marc approves the composed one).

### 4. Tests
- Parser: every command, comments, blank lines, each error message, limits.
- Compose: an empty config equals the real room's pieces (a faithful copy); each command changes exactly one thing; the figure is last; unknown pieces refuse.
- The shipped file: parses with no problems; every sprite named exists (the sprite-names test already lists names against files; add the config's); the figure still stands on the desk, because line 2 of the narration says so (a test that fails if the file moves it, with a message to change the line too).
- Render: with the recording drawer, one frame draws frame, N scaled ops and the dim, in order; the cache does not redraw when nothing changed.
- A golden of the composed op list for the shipped config.

### 5. Later effects (not built here)
The side project already changes mood and energy. Two ways it could matter more, both small:
- **Room to side project:** `when plantStage>=2` after a command (same `Requirement` shape the game uses) makes the little room follow the real one in one thing.
- **Side project to room:** a `SideProject.effects` list, run when the cutscene ends, sets a state variable (a flag such as "the figure got off the desk") that something in the real room reads: a prop, a line, a decor item showing up in a delivery. It follows the quiet-zen rule: a tiny cosmetic surprise, no progress bar, no pressure.

## Staged build plan (small issues)
| Stage | Issue | What | Done when |
|---|---|---|---|
| A | 111a | `parseConfig`, command set, errors, limits, tests | parser tests pass; no game change |
| B | 111b | `composeSideProject` from the real main room; faithful copy test; ids slugged | tests pass; no game change |
| C | 111c | Frame sprite, `drawScaled`, `SideProjectView` with cache, dim and noise, composed-view registry, fallback to the PNG | the desk task shows the composed room; Marc looks at it beside the old one |
| D | 111d | The real `side-project-room.txt` (the figure on the desk, a few drifts), figure sprite, shipped-file tests, golden | acceptance by eye; old PNG removed after Marc agrees |
| E | 111e | `when` conditions and the narration guard | one drift follows the real room's state |
| F | 111f | `SideProject.effects` and one real effect | only after Marc picks the effect |
A to C can run in parallel with nothing else; they touch only new files plus `sprites.ts` and `cutscene.ts`.

## Risks
- **Look drift from the art.** Smoothed half scale will not match the hand-drawn 101 picture pixel for pixel. Mitigation: stage C shows both; the dim and noise are tunable; fallback PNG stays until approved.
- **Colors outside the palette.** Averaging makes in-between colors. Mitigation: it reads as a screen; if Marc dislikes it, quantize to the palette in the offscreen step (one function) or use pixel-picking (question 2).
- **Performance.** Cached, drawn once per change, not per frame.
- **Narration and config can disagree** (the desk line). Guarded by a test.
- **Slugged piece ids** change if the map renames a piece. A test that the shipped config's ids exist catches it.
- **Cutscene and phone view** rely on a 320x192 full-screen view; the painter keeps that size. Checked in stage C on the narrow view.
- Scope: the hidden pieces and drift must stay mundane and deadpan; this is not a level editor.

## What I decided myself
- **Text file in the repo, not a pause-screen editor.** Smallest thing that lets Marc change it without redrawing, and no editor UI to maintain.
- **Overrides on a faithful copy, not a full scene list.** The little room then gets the real room's changes for free, and the file only says how it drifts.
- **Composed at runtime, not a build step that writes a PNG.** A build step would be simpler to render but cannot react to state, which later effects need.
- **Real-room pixel coordinates**, same as the map.
- **Own hand-written parser** in the style of the repo's other data (no YAML or JSON dependency, comments allowed).
- **Narration text stays in `side-projects.ts`** for the text review; the config only holds the picture.
- **Bad config never breaks the game.**
- **The old PNG stays as fallback until approval.**
- **No live moving figure** in this issue (see 051's version 2 notes).

## Open questions for Marc (most important first)
1. **What does drift mean? ANSWERED by Marc 2026-10-29: A, faithful copy plus overrides.**
   - A. Faithful copy plus overrides (my recommendation): the little room follows the real one except where the file says.
   - B. Frozen: the little room is a fixed scene listed in full, never following the real one.
   - C. Mostly frozen, but follows a short list of things (the plant, the lamp).
2. **How should the little room look? ANSWERED by Marc 2026-10-29: A, smoothed half scale with dim and light noise.**
   - A. Smoothed half scale with a dim and light noise (recommended): soft like a screen, the most "degraded copy".
   - B. Sharp pixel-picking at half scale, palette colors only: crisp but rough.
   - C. Dedicated half-size sprites: cleanest, but needs new art.
3. **Should the file support `when` conditions in the first pass? DECIDED by the planner 2026-10-29: A, later (stage E).**
   - A. Later, stage E (recommended): ship the plain overrides first.
   - B. Yes, from the start.
4. **Should the tiny figure move? DECIDED by the planner 2026-10-29: A, a fixed glitch standing on the desk.**
   - A. No, a fixed glitch: standing on the desk (recommended).
   - B. It wanders on its own (needs the live render of 051's version 2).
   - C. It alternates between two spots every few visits.
5. **What should the first real effect be? DECIDED by the planner 2026-10-29: A, none yet, the picture only.**
   - A. None yet, the picture only (recommended until 111e is done).
   - B. A tiny cosmetic one: after enough sessions something from the little room appears in the real one.
   - C. A small mood or energy tweak depending on what the little room shows.
