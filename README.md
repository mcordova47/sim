# Life

A single-room platformer set in a studio apartment. Do mundane tasks, earn points. See [PLAN.md](PLAN.md) for the design and issue list.

## Run

```
npm install
npm run dev     # dev server
npm run build   # type check and production build
```

## Layout

- `src/main.ts`: entry point
- `src/game/`: loop, config and (later) physics, tasks and scoring
- `src/input/`: keyboard state
- `src/render/`: canvas setup and drawing
- `src/assets/`: static assets imported by code (sprites served as files go in `public/`)
