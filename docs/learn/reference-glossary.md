# Glossary (the project's own words)

[Back to the index](README.md)

| Term | Meaning | Where |
|---|---|---|
| task | something you do at an object; a record of name, prompt, duration, points, requires, effects | [`src/game/interactable.ts`](../../src/game/interactable.ts) (type), `tasks.ts` (data) |
| object / piece / prop | a lettered thing in a room map; a piece is its placed form; a prop sits on top of one | `apartment.ts`, `tilemap.ts` |
| legend | the table from a map letter to an object definition | `apartment.ts` (`MAIN`, `KITCHEN`, `BATH`) |
| activity | what a task is while it runs (wait, typing, cutscene, your own) | `activity.ts`, `activities/` |
| host | the narrow set of things the game lets an activity do (`openDialog`, `cue`, `setState`, `random`) | `activity.ts:51` |
| state var | a named number with a range (`dishes`, `mood`, `clock`); tasks read it in `requires` and write it in `effects` | `state-vars.ts`, `state.ts`, [`docs/state.md`](../state.md) |
| variant | which sprite an object shows, chosen by the first `when` that holds | `appearance.ts`, a legend entry's `variants` |
| feature | an optional module (sound, particles, achievements, time of day) that listens to events and may add a layer | `features.ts` |
| event | a typed announcement from `Game` (`taskStart`, `taskComplete`, `stateChanged`, `cue` ...) | `events.ts` |
| cue | a named moment in a cutscene (`{ cue: "record-spin" }`); `SOUND.cues` maps it to a sound | `config.ts` (`SOUND.cues`) |
| layer | something a feature adds with `game.addLayer` to update and draw each frame | `game.ts:60` |
| golden frame | a recorded log of every drawing call for fixed scenarios; a test compares the live drawing to it | [`src/game/golden/`](../../src/game/golden/), `main-room-frames.golden.test.ts` |
| composed view | a full-screen picture drawn by code at run time instead of a PNG | `render/composed-views.ts`, `render/side-project-view.ts` |
| decor slot / item | a place that holds one swappable thing, and the things that can go in | `decor-data.ts`, [`docs/decor.md`](../decor.md) |
| gift / checkpoint | a decor item delivered when a milestone is reached | `delivery-checkpoints.ts` |
| encounter / ad | a full-screen ad card that can interrupt a task | `encounter-ads.ts`, [`docs/random-encounters.md`](../random-encounters.md) |
| issue / worktree | one file in `issues/`; one git worktree per branch under `../sim-worktrees/` | [`PLAN.md`](../../PLAN.md), [`docs/contributing.md`](../contributing.md) |
| planner | the agent or conversation that merges reviewed branches (you never need one to learn) | [`PLAN.md`](../../PLAN.md) |

---

[Back to the index](README.md)
