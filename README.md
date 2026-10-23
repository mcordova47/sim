# Life

A top-down, Pokemon-style game set in a studio apartment. Walk tile to tile, face something, press E, earn points. See [PLAN.md](PLAN.md) for the design and the issue list.

The first version was a side-view platformer; it is kept in the git tag `side-view-prototype`.

## Run

```
npm install
npm run dev       # dev server
npm run build     # type check and production build
npm test          # unit tests
npm run sprites   # render art/src/*.sprite to public/sprites/ and a contact sheet
```

Controls: WASD or arrow keys to walk (a new direction turns you first, holding it steps), E to use what you are facing. In menus: arrows or W and S to move, E to choose, Escape or X to go back. Escape also stops any running action (the top of the screen says ESC TO STOP). See `docs/dialogs.md` for writing dialogs.

## Layout

- `src/main.ts`: entry point
- `src/game/`: the game: loop, the player and grid, tile-map levels, the three-room apartment, interaction, scoring, events and layers, task content
- `src/input/`: keyboard state and controls
- `src/render/`: canvas, camera, pixel font, HUD, popups and colours (from the shared palette)
- `art/`: sprite sources, the palette and the style guide notes (`docs/art-style.md`)
- `issues/`: the issue files; one file per issue, tracked by `PLAN.md`
- `.claude/skills/`: the `work-issue`, `review-issue` and `merge-issue` skills used to run the project
