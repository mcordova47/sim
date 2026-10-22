---
id: 006
title: Sprite pipeline and style guide
status: todo
owner: agent
depends_on: [001]
---

## Goal
Define the art rules and build the tooling that turns sprite source data into PNGs the game loads.

## Acceptance criteria
- `docs/art-style.md`: tile size (proposed 16px), shared palette (16 to 24 colors with names), outline rules, lighting direction, naming convention.
- Sprite source format: palette-indexed text grids or small scripts, one file per sprite, under `art/src/`.
- A script (`npm run sprites`) that renders all sources to PNG in `public/sprites/`, with an upscaled contact sheet for review.
- Validation: the script fails if a sprite uses a color outside the palette or has the wrong dimensions.
- Game-side loader that fetches sprites by filename and falls back to a labeled rectangle if one is missing.
- Two example sprites to prove the pipeline end to end.

## Progress log
