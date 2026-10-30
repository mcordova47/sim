# Learning path: from reading the game to changing it yourself

For Marc. Written 2026-10-29, revised 2026-10-30 after review (issue 097). Twelve short modules, an evening or less each (about a dozen evenings in all, taken at any pace), that take you from "I understand the idea of the game loop" to "I can add a task, a picture, a sound, a screen or a mini-game on my own, on a machine with no Claude". Every module ends in a task you do yourself and a check the machine runs for you: a test that fails first and passes after, a visible result in `npm run dev`, or both.

There are no deadlines and no order you must keep beyond "each module leans on the ones before it". Stop whenever. Skip what bores you. This is a zen garden, not a course.

The tasks were checked against the code at `main` on 2026-10-29 (commit `79faee5`). Most were done in a scratch worktree and the failure messages quoted are real; where something was only read from the code, or not run, the text says so. A review found a few errors; the ones that were fixed are marked as re-run in the text where I did re-run them. I could not look at the game in a browser or hear it.

The reference material (a TypeScript crib, a map of the repo, a glossary) is on its own pages, linked at the bottom of this index. Look things up there as you go.

## How to use this

**Each module has the same parts:** the goal; the effort; what to read (small ranges, never the whole codebase); the idea first and then the code; one task that makes you use the idea; how the machine checks you; hints that do not give the answer away; where the answer lives in the code if you are stuck; what you can do afterwards.

**The flow for every task** (it is [`docs/contributing.md`](../contributing.md), with learning branches):
1. From the main checkout make a worktree on a learning branch, and install:
   ```
   git worktree add ../sim-worktrees/learn-NAME -b learn/NAME main
   cd ../sim-worktrees/learn-NAME
   npm install
   ```
   Every worktree needs its own `npm install` (a few seconds). Never edit the main checkout. Never `cd ../sim` from a worktree. A few modules build on an earlier practice branch ([module 7](07-sound.md) uses the task from [module 4](04-tasks-are-data.md)); they say so and give the exact command, which swaps `main` at the end for the earlier branch name.
2. Do the task. Run one test file with `npm test -- src/game/state.test.ts`, tests whose name contains a word with `npm test -- -t "clamps"`, everything with `npm test` (about 3,650 tests, 15 to 20 seconds). `npx vitest src/game/state.test.ts` (no `run`) watches and re-runs on save, which is the nicest way to work. Type-check with `npx tsc --noEmit`; the build (`npm run build`) runs it too and it also checks test files.
3. See it: `npm run dev` and open the printed address. Dev-only shortcuts are in [`docs/deploy.md`](../deploy.md) ("Dev shortcuts"); the ones used here are `?set=name:value` (set state variables, for example `?set=dishes:0,mood:10`), `?hour=20` (the clock) and `?touch=1` (the phone layer). Three more are worth knowing: the `[` and `]` keys step the clock back and forward (`TIME_DEV` in `config.ts`, dev only), `?room=kitchen` starts in another room, and `?encounter=ad-candle&again=1` shows an ad card on your first key press ([`docs/contributing.md`](../contributing.md) uses it).
4. Before you call it done: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`. (`npm run tools -- check` runs the same set.)
5. Commit on `learn/NAME`. To have it reviewed or seen, push the branch and open a pull request into `main`; Netlify makes a branch preview for the PR and GitHub's CI runs the type check, tests and build on it ([`docs/deploy.md`](../deploy.md)), so a red mark there is your first review. Nothing goes live until you merge, and `main` must stay releasable: a practice task is simply never merged, and that is fine.
6. Any new player-visible words go into [`docs/text-review.md`](../text-review.md) so you can mark them later.

<a id="closing-a-real-issue-on-a-machine-without-claude"></a>**Closing a real issue on a machine without Claude.** The planner's merge step (`/merge-issue`, the [`PLAN.md`](../../PLAN.md) table) needs Claude, but you do not. Do the work on a branch, put a dated line in the issue file's progress log and set `status: review` ([`docs/contributing.md`](../contributing.md) step 4), push the branch and open the PR, and let CI go green. Review and merge can wait until you are next with Claude: say "review NNN". Nothing is lost by waiting.

**How to check yourself with no one around.** Each task names its check. A red test that goes green is the main one. When the check is "look at it", the module says exactly what to do in the browser. When a test you did not write goes red, that is the project telling you a rule; read the failing test's name and the comment above it before changing anything. Several modules are built around exactly that.

**How to ask for a review.** With Claude: start a fresh session in the worktree and say "review this branch against module N of docs/learn/README.md" (or the module's own page). A fresh agent has none of your context, which is the point. Without Claude: read your own diff on the PR page the next morning (`git diff main...HEAD`) and tick the module's checks. Nobody needs to approve a practice task.

**When you are stuck.** In this order: (1) read the failing test's message to the end, they were written to name the problem; (2) read the hint; (3) open the file named under "if you are stuck"; (4) search for how something similar was done: `git log --oneline -S"some-name"` finds the commit that added a thing, and `git show --stat <commit>` shows every file it touched; (5) leave it for tomorrow. Tell the planner what was unclear, which is how the docs get better. Nothing here is a to-do list.

## Assumptions I made about you

**Assumptions I made about you** (change them if wrong): you know Elm-style apps in PureScript well; you have read TypeScript but do not write it daily; you know the browser enough to open dev tools but have not written canvas or Web Audio code; you are comfortable with git and the terminal; you play music and read a `.track` file easily. **Confirmed by Marc, 2026-10-30:** the TypeScript and canvas assumptions are about right, and his Web Audio experience so far is the song-of-life project (PureScript), so the sound modules can lean on that; he is fine pushing his own `learn/*` branches and opening PRs, treating most tasks as practice that never merges. Module 1 is a calibration: it shows how much TypeScript crib you need.

## Functional ideas you already have, and where they stop being true

This codebase is TypeScript with classes and mutation, not a pure Elm architecture. The parts close to what you know are marked in each module.

| You know | Here |
|---|---|
| `Msg`, `update`, `view` | `Controls` (one per frame) goes into `Game.update(dt, controls)`; `Game.render(ctx, alpha)` is the view. The model is mutated in place. |
| A sum type | A TypeScript discriminated union: `type DialogNode = Say \| Menu`, each with a `type` tag. You branch on it. |
| A record of data and an interpreter | A task (`Interactable`) is a record; `InteractionSystem` interprets it. Adding a task is adding data. |
| `foldl` over an update list | `ApartmentState.applyEffects(effects)`: `{ var, add }` or `{ var, set }` applied in order, then announced. |
| `Either`/`Writer` parser | `parseConfig(text)` returns `{ ops, problems }`: values and complaints, never a throw. |
| Subscriptions | `game.events.on("taskComplete", ...)`: a typed event emitter that features listen to. |
| Property tests | [`src/game/sync/merge.test.ts`](../../src/game/sync/merge.test.ts) checks the merge is commutative, associative and idempotent on random documents. |

---

## The modules

Track A is the minimum core knowledge for working safely around the engine. Track B is the parts you will work in: B1 configures existing things (mostly data), B2 makes real functionality changes.

| # | Module | Track | Effort |
|---|---|---|---|
| 1 | [Calibrate: state, and the tools](01-calibrate.md) | A | 1 evening |
| 2 | [Words, and the guard rails around them (first quick win)](02-words.md) | B1 | under 1 hour |
| 3 | [Who calls your code](03-callers.md) | A | 1 evening |
| 4 | [A task is data (and an achievement for it)](04-tasks-are-data.md) | B1 | 1 evening |
| 5 | [A variable that changes a picture (and what gets saved)](05-state-and-sprites.md) | B1 | 1 to 2 evenings |
| 6 | [The safety net: golden frames](06-golden-frames.md) | A | 1 hour |
| 7 | [A sound effect for a task (and a record, as an aside)](07-sound.md) | B1 | 1 hour |
| 8 | [The side project file: one bad line skips only itself (issue 124)](08-side-project.md) | B1 to B2 | 1 evening |
| 9 | [Features and events: write a listener](09-features.md) | A and B2 | 1 evening |
| 10 | [A new kind of activity](10-new-activity.md) | B2 | 1 to 2 evenings |
| 11 | [The narrow phone layout: the pause legend (issue 120)](11-narrow-layout.md) | B2 | 1 evening |
| 12 | [Ship one, and where to go next](12-ship-one.md) | all | 1 evening |

The tasks marked "invented" are stand-ins I made up to exercise an idea (a counter to wipe, a bin that fills). They are small and harmless but are not on the backlog; ship one only if you actually like it. Tasks from the backlog name their issue; check [`PLAN.md`](../../PLAN.md) first, because an agent may have taken it since this was written (`git branch --list 'issue/*'` shows live branches).

## Reference

- [TypeScript crib](reference-typescript-crib.md) (read once, 10 minutes)
- [One page map of the repo](reference-repo-map.md)
- [Glossary](reference-glossary.md) (the project's own words)
