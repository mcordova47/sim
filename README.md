# Life

A top-down, Pokemon-style game set in a studio apartment. Walk tile to tile, face something, press E, earn points. See [PLAN.md](PLAN.md) for the design and the issue list.

The first version was a side-view platformer; it is kept in the git tag `side-view-prototype`.

## Run

```
npm install
npm run dev       # dev server
npm run build     # type check and production build
npm test          # unit tests
UPDATE_GOLDEN=1 npm test   # re-record the main-room golden frames (see below)
npm run sprites   # render art/src/*.sprite to public/sprites/ and a contact sheet
```

**Golden frames.** `src/game/main-room-frames.golden.test.ts` renders the main room headless over the recorded states (see `SCENARIOS` in `src/game/main-room-frames.ts`: the plant at each stage and drooping, night with the lamp glow, dusk with the blinds, the plate, the carried mug, morning) and compares every drawing call, in order, with `src/game/golden/main-room-frames.json`. It fails on purpose when the main room changes: new or redrawn furniture or wall art, a map edit, a lighting change or a new draw order. That is the cue to look at the room (render it and check that the change is what you meant), then run `UPDATE_GOLDEN=1 npm test` to re-record the file and commit it with the change, saying in the commit message what changed. `DUMP_DIR=<dir> npm test` also writes each frame's full log for diffing two builds by hand. If it fails and you did not mean to change how the room looks, something broke. The sleep sequence has its own, `src/game/sleep-frames.golden.test.ts` with `src/game/golden/sleep-frames.json` (the real main room at the moments of Go to sleep and the nap: the dark, the breath, the z), re-recorded the same way when that look is changed on purpose; the main-room frames above do not include it and stay unchanged by it.

Controls: WASD or arrow keys to walk (a new direction turns you first, holding it steps), E to use what you are facing. In menus: arrows or W and S to move, E to choose, Escape or X to go back. Escape also stops any running action (the top of the screen says ESC TO STOP). See `docs/dialogs.md` for writing dialogs.

## Layout

- `src/main.ts`: entry point
- `src/game/`: the game: loop, the player and grid, tile-map levels, the three-room apartment, interaction, scoring, events and layers, task content
- `src/input/`: keyboard state and controls
- `src/render/`: canvas, camera, pixel font, HUD, popups and colours (from the shared palette)
- `art/`: sprite sources, the palette and the style guide notes (`docs/art-style.md`)
- `issues/`: the issue files; one file per issue, tracked by `PLAN.md`
- `.claude/skills/`: the `work-issue`, `review-issue` and `merge-issue` skills used to run the project
