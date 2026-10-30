# Learning path: from reading the game to changing it yourself

For Marc. Written 2026-10-29, revised 2026-10-30 after review (issue 097). Twelve short modules, an evening or less each (about a dozen evenings in all, taken at any pace), that take you from "I understand the idea of the game loop" to "I can add a task, a picture, a sound, a screen or a mini-game on my own, on a machine with no Claude". Every module ends in a task you do yourself and a check the machine runs for you: a test that fails first and passes after, a visible result in `npm run dev`, or both.

There are no deadlines and no order you must keep beyond "each module leans on the ones before it". Stop whenever. Skip what bores you. This is a zen garden, not a course.

The tasks were checked against the code at `main` on 2026-10-29 (commit `79faee5`). Most were done in a scratch worktree and the failure messages quoted are real; where something was only read from the code, or not run, the text says so. A review found a few errors; the ones that were fixed are marked as re-run in the text where I did re-run them. I could not look at the game in a browser or hear it.

The reference material (a TypeScript crib, a map of the repo, a glossary) is at the end, below the modules, so the first module starts on the first screen. Look things up there as you go.

## How to use this

**Each module has the same parts:** the goal; the effort; what to read (small ranges, never the whole codebase); the idea first and then the code; one task that makes you use the idea; how the machine checks you; hints that do not give the answer away; where the answer lives in the code if you are stuck; what you can do afterwards.

**The flow for every task** (it is `docs/contributing.md`, with learning branches):
1. From the main checkout make a worktree on a learning branch, and install:
   ```
   git worktree add ../sim-worktrees/learn-NAME -b learn/NAME main
   cd ../sim-worktrees/learn-NAME
   npm install
   ```
   Every worktree needs its own `npm install` (a few seconds). Never edit the main checkout. Never `cd ../sim` from a worktree. A few modules build on an earlier practice branch (module 7 uses the task from module 4); they say so and give the exact command, which swaps `main` at the end for the earlier branch name.
2. Do the task. Run one test file with `npm test -- src/game/state.test.ts`, tests whose name contains a word with `npm test -- -t "clamps"`, everything with `npm test` (about 3,650 tests, 15 to 20 seconds). `npx vitest src/game/state.test.ts` (no `run`) watches and re-runs on save, which is the nicest way to work. Type-check with `npx tsc --noEmit`; the build (`npm run build`) runs it too and it also checks test files.
3. See it: `npm run dev` and open the printed address. Dev-only shortcuts are in `docs/deploy.md` ("Dev shortcuts"); the ones used here are `?set=name:value` (set state variables, for example `?set=dishes:0,mood:10`), `?hour=20` (the clock) and `?touch=1` (the phone layer). Three more are worth knowing: the `[` and `]` keys step the clock back and forward (`TIME_DEV` in `config.ts`, dev only), `?room=kitchen` starts in another room, and `?encounter=ad-candle&again=1` shows an ad card on your first key press (`docs/contributing.md` uses it).
4. Before you call it done: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`. (`npm run tools -- check` runs the same set.)
5. Commit on `learn/NAME`. To have it reviewed or seen, push the branch and open a pull request into `main`; Netlify makes a branch preview for the PR and GitHub's CI runs the type check, tests and build on it (`docs/deploy.md`), so a red mark there is your first review. Nothing goes live until you merge, and `main` must stay releasable: a practice task is simply never merged, and that is fine.
6. Any new player-visible words go into `docs/text-review.md` so you can mark them later.

**Closing a real issue on a machine without Claude.** The planner's merge step (`/merge-issue`, the `PLAN.md` table) needs Claude, but you do not. Do the work on a branch, put a dated line in the issue file's progress log and set `status: review` (`docs/contributing.md` step 4), push the branch and open the PR, and let CI go green. Review and merge can wait until you are next with Claude: say "review NNN". Nothing is lost by waiting.

**How to check yourself with no one around.** Each task names its check. A red test that goes green is the main one. When the check is "look at it", the module says exactly what to do in the browser. When a test you did not write goes red, that is the project telling you a rule; read the failing test's name and the comment above it before changing anything. Several modules are built around exactly that.

**How to ask for a review.** With Claude: start a fresh session in the worktree and say "review this branch against module N of docs/learning-path.md". A fresh agent has none of your context, which is the point. Without Claude: read your own diff on the PR page the next morning (`git diff main...HEAD`) and tick the module's checks. Nobody needs to approve a practice task.

**When you are stuck.** In this order: (1) read the failing test's message to the end, they were written to name the problem; (2) read the hint; (3) open the file named under "if you are stuck"; (4) search for how something similar was done: `git log --oneline -S"some-name"` finds the commit that added a thing, and `git show --stat <commit>` shows every file it touched; (5) leave it for tomorrow. Tell the planner what was unclear, which is how the docs get better. Nothing here is a to-do list.

**Assumptions I made about you** (change them if wrong): you know Elm-style apps in PureScript well; you have read TypeScript but do not write it daily; you know the browser enough to open dev tools but have not written canvas or Web Audio code; you are comfortable with git and the terminal; you play music and read a `.track` file easily. Module 1 is a calibration: it shows how much TypeScript crib you need.

**Functional ideas you already have, and where they stop being true.** This codebase is TypeScript with classes and mutation, not a pure Elm architecture. The parts close to what you know are marked in each module.

| You know | Here |
|---|---|
| `Msg`, `update`, `view` | `Controls` (one per frame) goes into `Game.update(dt, controls)`; `Game.render(ctx, alpha)` is the view. The model is mutated in place. |
| A sum type | A TypeScript discriminated union: `type DialogNode = Say \| Menu`, each with a `type` tag. You branch on it. |
| A record of data and an interpreter | A task (`Interactable`) is a record; `InteractionSystem` interprets it. Adding a task is adding data. |
| `foldl` over an update list | `ApartmentState.applyEffects(effects)`: `{ var, add }` or `{ var, set }` applied in order, then announced. |
| `Either`/`Writer` parser | `parseConfig(text)` returns `{ ops, problems }`: values and complaints, never a throw. |
| Subscriptions | `game.events.on("taskComplete", ...)`: a typed event emitter that features listen to. |
| Property tests | `src/game/sync/merge.test.ts` checks the merge is commutative, associative and idempotent on random documents. |

---

## The modules

Track A is the minimum core knowledge for working safely around the engine. Track B is the parts you will work in: B1 configures existing things (mostly data), B2 makes real functionality changes.

| # | Module | Track | Effort |
|---|---|---|---|
| 1 | Calibrate: state, and the tools | A | 1 evening |
| 2 | Words, and the guard rails around them (first quick win) | B1 | under 1 hour |
| 3 | Who calls your code | A | 1 evening |
| 4 | A task is data (and an achievement for it) | B1 | 1 evening |
| 5 | A variable that changes a picture (and what gets saved) | B1 | 1 to 2 evenings |
| 6 | The safety net: golden frames | A | 1 hour |
| 7 | A sound effect for a task (and a record, as an aside) | B1 | 1 hour |
| 8 | The side project file: one bad line skips only itself (issue 124) | B1 to B2 | 1 evening |
| 9 | Features and events: write a listener | A and B2 | 1 evening |
| 10 | A new kind of activity | B2 | 1 to 2 evenings |
| 11 | The narrow phone layout: the pause legend (issue 120) | B2 | 1 evening |
| 12 | Ship one, and where to go next | all | 1 evening |

The tasks marked "invented" are stand-ins I made up to exercise an idea (a counter to wipe, a bin that fills). They are small and harmless but are not on the backlog; ship one only if you actually like it. Tasks from the backlog name their issue; check `PLAN.md` first, because an agent may have taken it since this was written (`git branch --list 'issue/*'` shows live branches).

---

### Module 1. Calibrate: state, and the tools

**Goal.** Run everything once, and prove you can read the state code by predicting it.

**Effort.** An evening, much of it setup. Note what felt slow.

**Read.**
- `docs/contributing.md` (the whole page, 47 lines).
- `src/game/state.ts` lines 1 to 56 (the types), 58 to 124 (the class, reading), 126 to 194 (`applyEffects`, `tick`, `write`, `announce`).
- `src/game/state-vars.ts` lines 7 to 30.
- `docs/state.md`, sections "Add a variable", "Add a requirement", "Add an effect".

**The idea.** The apartment and the character are a handful of named numbers, each with `min`, `max` and sometimes `wrap`. Everything a task does is a list of `Effect`s: `{ var, add }` or `{ var, set }`. `applyEffects` is a fold over that list that clamps (or wraps) each value, then announces one change per variable after all of them have applied. This is as close to an Elm `update` as the code gets: effects are data and one function interprets them. The difference is that `ApartmentState` is a mutable class.

**Warm-up quiz (no running; answers under "if you are stuck").**
1. A task has effects `[{ var: "dishes", add: -5 }]` and dishes is 1. What is dishes after, and why?
2. The clock is 23 and an effect says `add: 2`. What is it after?
3. Effects `[dishes +2, mood +1, dishes +1]` are applied. How many `onChange` calls, in what order, and what is the first one's `previous`?
4. What does `{ var: "dishes", set: 5, add: 100 }` do?
5. What happens at load if a task's `requires` names a variable `dishs`?

**Task: a state drill.**
1. Make the worktree: `learn/state-drill`, `npm install`.
2. Create `src/learn/state-drill.test.ts` (a new folder is fine). Write one `it` per question 1 to 4 using `new ApartmentState(STATE_VARS)` (imports: `ApartmentState`, `StateChange` from `../game/state`, `STATE_VARS` from `../game/state-vars`). Start each as a prediction, for example `expect(s.get("dishes")).toBe(/* your answer */ 0)`, run, and keep what the machine says when you were wrong.
3. Question 5 needs a whole task list, so do it by hand: misspell a variable in one `requires` in `src/game/tasks.ts` (say the `dishes` task's `dishes`), run `npm test -- src/game/apartment.test.ts`, read the error, and put the spelling back.

**Checks.** `npm test -- src/learn` is green; `npx tsc --noEmit` is clean; the misspelling gave an error that names the room and the task, for example `kitchen: task "dishes" requires uses the unknown state variable "dishs"`, not a mystery.

**Hints.** Question 3: write the `onChange` calls into an array and compare with `toEqual`; copy each change (`{ ...c }`). Question 4: the comment above `Effect` in `state.ts` says which wins.

**If you are stuck.** `src/game/state.test.ts` has all of these as tests. Answers: 1 is 0 (clamped); 2 is 1 (the clock wraps); 3 is two calls, `dishes` then `mood`, with `previous` 1 and a final `value` of 4 (a variable touched twice reports once, from its first previous value to its last); 4 `set` wins, so dishes is 5; 5 the game refuses to build the rooms, naming the room and task.

**Afterwards** you can run, test, type-check and build, and you can read the state code. If the TypeScript syntax was the slow part, say so and I will add a longer crib.

---

### Module 2. Words, and the guard rails around them

**Goal.** Add dialog and caption text, and learn which tests defend it. A visible win, early.

**Effort.** Under an hour. It can ship.

**Read.**
- `src/game/dialog.ts` lines 9 to 40 (`Say`, `Choice`, `Menu`, and the helpers `say`, `choice`, `menu`).
- `src/game/dialog-data.ts` lines 1 to 60 (the contemplate menu).
- `src/game/dialog-data.test.ts` lines 12 to 95 (a walk over the tree and four guards).
- `src/game/config.ts` lines 473 to 492 (`REEL.phoneLines`, `REEL.closeupLines`) and `src/game/activities/reel.test.ts` lines 134 to 140.
- `PLAN.md` "Decisions", the Humor entry (deadpan and sincere; never acknowledge it is pixels or a game), and `docs/text-review.md` first 10 lines.

**The idea.** A dialog is a sum type (`Say` or `Menu`) forming a tree, and the test is a fold over it that collects every node and checks each. Adding text is adding a node. The wording rules (characters the font has, short lines, a deadpan voice) are enforced by tests, so you can write freely and let the machine tell you when you stepped out.

**Task (a real, shippable change).**
1. Branch `learn/words`.
2. Add one choice to the `CONTEMPLATE` menu with a two-sentence reply in the project's voice.
3. Add two lines to `REEL.closeupLines` (the caption over a photo close-up; never anything about what a photo shows).
4. Add the new lines to `docs/text-review.md` under the matching sections.
5. Then deliberately break each guard once so you know what it says: put the word `small` in a caption, and add enough choices to make the menu longer than 8. Remove them.

**Checks.** `npm test -- src/game/dialog-data.test.ts src/game/activities/reel.test.ts` is green with your real lines. With the broken ones I got: `expected 'A small thing to remember.' not to match /pixel|resolution|small|tiny|size|…/i` and `Contemplate what?: expected 10 to be less than or equal to 8`. Visible: `npm run dev`, walk to the sofa and Contemplate (Tab or Q cycles between the sofa's tasks).

**Hints.** Use `say(text, next)` to chain a second page. Replies longer than four pages fail.

**If you are stuck.** The existing `existence` menu in `dialog-data.ts` nests menus.

**Afterwards** you can add or edit any text in the game and know the rules. The caption pools are the nicest tiny contributions: the whole change is one line.

---

### Module 3. Who calls your code

**Goal.** Know, for any piece of code you will write, what calls it, when, and what it may touch.

**Effort.** An evening. You said you understand the loop at a high level, so this module starts where that stops.

**Read.**
- `src/main.ts` lines 128 to 146 (the loop starts; `update` reads the keyboard into `Controls`, `render` draws). That is the only place the loop meets the game.
- `src/game/game.ts` lines 696 to 768 (`update`) and 780 to 820 (`render`); lines 197 to 254 (the constructor wires `InteractionSystem` callbacks to `events.emit`).
- `src/game/interaction.ts` lines 141 to 262 (`update`: find what you face, start a task) and 302 to 348 (`finish`).
- `src/game/activity.ts` lines 112 to 176 (the `Activity` interface) and 178 to 197 (`BaseActivity`).
- `src/game/events.ts` lines 9 to 51.

**The idea first.** One frame is: the loop calls `game.update(1/60, controls)` zero or more times, then `game.render(ctx, alpha)` once. `update` is the only place the simulation changes; `render` only reads. Inside `update`, one of three things has the controls: an open dialog, the pause screen (the clock stands still), or the interaction system. The interaction system either finds the task you face and starts its activity, or ticks the running one. When an activity is `done`, `finish` runs: the task's `effects` are applied (that is where `stateChanged` events come from), then the score is paid, then `taskComplete` is emitted, and features such as sound, particles and achievements react without `Game` knowing they exist.

In Elm terms: `Controls` is the message of the frame, `Game.update` is `update`, `Game.render` is `view`, features and layers are subscriptions and overlays. Unlike Elm there is no pure model value to return: everything mutates.

**What may I touch?** A short contract, five rules:

| Your code is | The game calls it | You may | You may not |
|---|---|---|---|
| An **activity** | `constructor`, then `start()` once after `taskStart`, then `update(dt, controls)` each frame (not while a dialog is open), `draw` each frame, `cancel()` on Escape | set `progress`, call `finish(...)`, use `host` (`openDialog`, `cue`, `setState`, `random`) | side effects in the constructor; `Math.random` (use `host.random`); read the keyboard (read `controls`) |
| A **layer** (a feature's picture) | `update(dt)`, `drawWorld` inside the camera, `drawHud` after the HUD | read `game`, draw | change the simulation from a draw hook; rely on canvas state you set (the game resets it) |
| An **event listener** | when the event is emitted | read the payload, do your own thing | edit the payload (everyone shares it); throw and expect others to stop (a throw is logged and skipped) |
| **Data** (tasks, maps, text) | read by the interpreters | change freely; load checks and tests catch typos | invent a field the types do not have |
| A **render** function | every frame | read | mutate |

Files you should not need to change for ordinary work: `loop.ts`, `main.ts`, `game.ts`, `interaction.ts`, `player.ts`, `grid.ts`, `camera.ts`. The exception is when a feature genuinely needs a hook (mobile did). If you think you need to edit `game.ts`, first look for an event or a `Layer` that does it.

**Task: trace one task.**
1. Branch `learn/trace`. Create `src/learn/trace.test.ts`.
2. Build a real game: `new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, random: () => 0.5 })`. Subscribe to `taskStart`, `stateChanged` and `taskComplete` on `game.events` and push a short string for each into an array.
3. Put the player at the coffee spot and press E. Use the helper pattern from `src/game/battery.test.ts` lines 17 to 26: `taskSpots(rooms.main).find((s) => s.id === "coffee")` from `src/game/plan-checks.ts:28`, then `game.player.placeAt(col, row, face)`, one `game.update(1/60, NO_INPUT)`, then one update with `{ ...NO_INPUT, interactPressed: true }`, then update until `game.interaction.busy` is false.
4. Before you run it, write on paper the exact list of events you expect for the whole run, including everything before `taskStart`.
5. Run it. Then rewrite the test to assert the real list, and add one sentence of comment explaining why each `stateChanged` sits where it does.

**Checks.** The test is green and asserts: `taskStart`, then the changes for `dishes`, `mug`, `energy`, `mood` in that order, then `taskComplete` last. (The log also begins with three `stateChanged` events, `energy`, `mood`, `battery`, before `taskStart`: the apartment ticking while the player stood still. Whether your prediction included them is the lesson.) Coffee runs 6 seconds, about 360 updates.

**Hints.** Which comes first inside `finish`, the effects or the `onComplete`? Which events fire when time passes and nothing is happening, and how often (see the comment on `onChange` in `state.ts`)?

**If you are stuck.** `interaction.ts:302` (`finish`) then `game.ts:197` to 232.

**Afterwards** you can say where any new code of yours sits in a frame, and you know the four hooks you may use. Modules 9 and 10 are uses of this table.

---

### Module 4. A task is data (and an achievement for it)

**Goal.** Add a task, with a requirement and effects, at an existing object, with tests; then give it an achievement and meet a limit nobody wrote down.

**Effort.** An evening.

**Read.**
- `src/game/interactable.ts` lines 9 to 72 (the whole record).
- `src/game/tasks.ts` lines 20 to 34 (the shape), 150 to 308 (`STATE_RULES`: tasks gain rules by merging; the helpers above it, `dirty`, `sortStep`, `working`, `STATE_GATED`, are at 120 to 148), 426 to 428 (the assembly), and `docs/tasks.md` first 15 lines.
- `src/game/apartment.ts` lines 184 to 200 (the kitchen legend: `C` is the sink and counter, with `tasks` and `variants`).
- `docs/state.md` "Add a requirement" and "Add an effect".
- For the last step: `src/game/achievements/data.ts` (64 lines), `unlock.ts` lines 1 to 15 (`isMet`), `achievements/draw.ts` lines 31 to 43 (`LIST_LAYOUT`, `LIST_CAPACITY`).

**The idea.** A task is a record, the apartment legend says which objects offer which task ids, and one interpreter runs them. An object offers the first of its tasks that can start right now; Tab or Q cycles when there are several. This is data plus an interpreter. `TASKS` is built by merging `CONTENT` with `STATE_RULES` by id, left to right. An achievement is data too: its `when` is a small sum type (a stat, a task count, a set of tasks) and `isMet` is a total function over it.

**Task (invented, shippable only if you like it): "Wipe the counter".** At the kitchen sink and counter. Only offered when there are no dirty dishes (reason text `DO THE DISHES FIRST`), lifts mood a little, has a cooldown, a deadpan one-line flavor and good hours of your choice. Change anything to taste, but use at least one `requires` on a state variable and one `effects` entry.
1. Branch `learn/wipe-counter`.
2. Add the task to `CONTENT` in `tasks.ts`, its rules to `STATE_RULES`, and its id to the `tasks` list of `C` in the kitchen legend.
3. Write `src/learn/wipe.test.ts` with two tests, using the `doTask` pattern from `battery.test.ts:22` but returning the id of the task that started (from the `taskStart` payload). Use `Game(APARTMENT.rooms.kitchen, ...)` and `taskSpots(APARTMENT.rooms.kitchen)`. Test one: with `dishes` at 2 the counter does not offer your task. Test two: with `dishes` at 0 and `mood` at 50 it starts, and mood ends above 50.
4. Run the whole suite.
5. Then the achievement: add `{ id: "wipe-3", name: "…", description: "…", when: { task: "wipe-counter", atLeast: 3 } }` to `ACHIEVEMENTS` (name 22 characters at most), and run `npm test` again. Two tests that look unrelated go red (`sync-draw.test.ts` and `transfer-draw.test.ts`, both about the pause list). Find out why without asking, then write down in one sentence what the limit is and what you would do about it (replace an achievement, page the list on desktop too, or leave it). Take the achievement out again; do not ship it.

**Checks.** Your two tests fail before the task exists and pass after. The whole suite stays green after step 4 (adding a task broke nothing when I did it). `ui-data.test.ts` guards your words: it rejects any character the pixel font cannot draw (a `€` in the flavor gave `wipe-counter.flavor: "€"`). A typo in a variable name gives `kitchen: task "wipe-counter" requires uses the unknown state variable "dishs"`. For step 5: `LIST_CAPACITY` evaluates to 28 on the desktop view, but `drawList` only draws the line of key hints (`P: SYNC`, `I: THINGS`, ...) when `rowsBottom <= LIST_LAYOUT.footerTop - 9`, and that cuts the usable list to 26, which is exactly how many there are. You should be able to say both numbers and which line of code the 26 comes from. This limit is not written in `docs/`; it is the first thing to log. Visible for the task: `npm run dev`, open `/?set=dishes:0`, walk west through the doorway in the west wall of the main room, go to the sink and face it: the prompt shows `Wipe the counter`; press E and see the mood popup.

**Hints.** Test one: when dishes are dirty the sink still offers something, so assert which task *did* start (it should be `dishes`), not that nothing did. If `taskSpots(...).find(...)` gives `undefined`, the id is not in the legend yet. Step 5: compute the rows: they are 10 px, the list starts at 18, and the footer is at `VIEW.height - 28`.

**If you are stuck.** Compare with `charge-phone`: its row in `tasks.ts`, its entry in the `N` legend of the main room, and its tests in `battery.test.ts` ("the charge task"). For step 5: `draw.ts` lines 36 to 43 and the `rowsBottom <= LIST_LAYOUT.footerTop - 9` check in `drawList`.

**Afterwards** you can add any simple task or achievement, and you know that new data can have layout consequences, so you run the whole suite after every data change. Add the task's words to `docs/text-review.md` if you keep it. One thing I could not tell: the `kitchen-all` achievement leaves out `recycle-boxes`; deliberate or stale?

---

### Module 5. A variable that changes a picture (and what gets saved)

**Goal.** Add a state variable, make tasks set it, make an object look different because of it with a new sprite, and understand what saving and syncing do with a new variable.

**Effort.** One or two evenings. This is the first module that touches art.

**Read.**
- `src/game/state-vars.ts` lines 7 to 30 and `docs/state.md` "Add a variant".
- `src/game/tilemap.ts` lines 27 to 53 (`ObjectDef`) and `src/game/appearance.ts` (the whole file, 40 lines: `pickVariant` is "first match wins").
- `src/game/apartment.ts` lines 184 to 200 (the dishes variants) and the kitchen's `N` (trash bin) and `X` (boxes) entries.
- `docs/art-style.md` (skim the palette and the rules: 16 px tile, palette letters only, no readable text); `art/src/bin.sprite` (read the grid), `art/palette.json`, `scripts/sprites.mjs`.
- For the saving step: `docs/sync.md` sections 2 and 4 (the table and the winner rule); `src/game/achievements/progress.ts` lines 15 to 45 and 55 to 66 (`WorldSave`, `parseWorld`); `src/game/sync/merge.ts` lines 117 and 128 to 135; `src/game/battery.test.ts` lines 62 to 80 (a save and load test).

**The idea.** A state var is a named bounded number; a variant list is a first-match pattern match from state to a sprite name, ending in a default. The sprite itself is text: a grid of palette letters, `.` transparent. `npm run sprites` turns each `art/src/NAME.sprite` into `public/sprites/NAME.png`; both are committed.

**Task (invented, shippable if you like it): the bin fills up.** Add `trash` (0 or 1). Cooking sets it to 1; "Take out the trash" now needs it to be 1 (`BIN IS NOT FULL` otherwise) and sets it back to 0. The kitchen's bin shows a new `bin-full` sprite while it is 1.
1. Branch `learn/full-bin` (from `main`).
2. Add the variable (`state-vars.ts`), edit `cook` and `take-trash` in `STATE_RULES`, and give the `N` legend entry `variants` (full first, then the default `bin` with no `when`).
3. A task that is gated by state has no time cooldown (issue 071, `docs/tasks.md`; the table is `STATE_GATED` in `tasks.ts` at line 148 and in `cooldowns.test.ts`). Put `cooldown: 0` on `take-trash` the way the other gated tasks do (`...STATE_GATED`), and run `npm test -- src/game/cooldowns.test.ts`. It goes red with `expected +0 to be 10`. (Gating by `requires` alone does not turn it red; the cooldown is a separate field.) Read that test's tables and make the decision on purpose: move `take-trash` from the `KEPT` table to the `STATE_GATED` list there.
4. `take-trash` has the flavor line `The bag was not full. You took it out anyway, out of spite.` That is now false. Rewrite it, and note the change in `docs/text-review.md`.
5. Draw `art/src/bin-full.sprite`: copy `bin.sprite` and change the top rows so the bag bulges. Run `npm run sprites`. Commit the `.sprite` and the generated `.png`.
6. The saving step. The new variable is saved with no code of yours: `AchievementsFeature` writes every variable into `world.vars` (`achievements/feature.ts` line 390), and the game's own loader keeps only names the game knows (`restoreWorld`, same file, `.filter(([id]) => this.game.state.has(id))`), so an old save without `trash` starts at `initial`. In a sync merge the whole world group comes from the device played most recently. Prove it: write `src/learn/sync-var.test.ts` that builds two documents through `normaliseDoc` (from `src/game/sync/merge.ts`; shape `{ app: "life", format: 1, device, activeAt, tracks: [], progress: { unlocked: [], stats: {}, world: { vars, room: "main", col: 1, row: 1, facing: "down" } } }`), one more recently played with `trash: 1`, and show `mergeSaves(a, b, now).progress.world.vars.trash` is 1 whichever argument order, and that an unknown variable name is dropped on the way in (that filtering is the sync path's `normaliseProgress`, not `parseWorld`).
7. Run everything.

**Checks.** `npm run sprites` says `Rendered N sprite(s)`, and any bad row width or letter is reported with file and row. `npx tsc --noEmit` clean. Golden frames stay green, because the default look did not change. The cooldown test goes red at step 3 and green after you move the entry. The sync test is red before the variable exists (the name is dropped as unknown; run it on `main` to see) and green after. Visible: `npm run dev` with `/?set=trash:1`, kitchen, the bin in the north-east corner: the full bag; do the trash task and it empties. A missing sprite never breaks the game: it draws a labelled rectangle and logs `Sprite "bin-full" not found; using placeholder` in the console.

**Hints.** A variant with no `when` must be last. For the art you only need to change a few rows; use `6` (paper) and `5` (mist) for the bag.

**If you are stuck.** The `boxes` variable (three states) is the full example: `state-vars.ts`, the `X` legend, and `flatten-boxes` and `recycle-boxes` in `tasks.ts`. `merge.test.ts` shows how documents are built.

**Afterwards** you can add state, show it, and draw 16x16 art, and you know what saving does. The exception you will meet: `hasPhotos` is derived from the device's pictures and deliberately never saved or synced (`achievements/feature.ts` line 389), so a variable can opt out. A new top-level saved thing, such as a new localStorage key, is not synced at all unless it is added to the sync document with a merge rule, which is a design change (`docs/sync.md`, section 2).

**Adding a decor item or a gift (a stretch; I ran it once, not a full task).** A new `DecorItem` is a line in `GIFT_ITEMS` in `src/game/decor-data.ts` plus a sprite. Adding one makes at least `checkpoints-stage-a.test.ts` ("real items have sprites and fit the right slots", which pins the 13 gifts) go red; where you insert the item decides whether the THINGS page tests react too (they did when I inserted mid-list, not for a reviewer who appended). Gifts are a design decision about what arrives when, so the project pins them; read why before you touch anything, and do not merge a stand-in.

---

### Module 6. The safety net: golden frames

**Goal.** Know what a golden frame is, read a failure, and re-record only on purpose.

**Effort.** About an hour.

**Read.**
- `src/game/main-room-frames.golden.test.ts` (the whole file, 35 lines) and the first 40 lines of `src/game/main-room-frames.ts`.
- `docs/decor.md` line 24 (why it exists). Glance at `src/game/golden/main-room-frames.json` (a list of `{ scenario, frame, calls, hash }`).

**The idea.** The test draws the real main room, headless, in twelve fixed scenarios (four frames each) and logs every canvas call. It compares each frame's call count and a hash to the recorded file. It does not compare pixels; it compares *what the code asked to draw*. If a change alters any drawing call, the test goes red. It is a regression net for pictures.

**Task: cause, read, and re-record a diff.**
1. Branch `learn/golden`.
2. In `apartment.ts`, in `MAIN_PROPS`, the `phone charger` prop has `at: { x: 18, y: 0 }`. Change `18` to `19`. Run `npm test -- src/game/main-room-frames.golden.test.ts`. It fails.
3. Find out *what* differs. Dump the log from the broken tree and from a clean one and diff them: `DUMP_DIR=$TMPDIR/after npm test -- src/game/main-room-frames.golden.test.ts`, then undo the edit and `DUMP_DIR=$TMPDIR/before npm test -- ...`. The files are named `<scenario>-<frame>.txt` (scenarios: `start`, `morning`, `night`, `dusk-blinds`, `blinds-closed-day`, `mug-carried`, `plate`, `plant-0` to `plant-3`, `plant-wilted`; frames 0 to 3). Run `ls $TMPDIR/before`, pick one, for example `morning-0.txt`, and `diff $TMPDIR/before/morning-0.txt $TMPDIR/after/morning-0.txt`.
4. Re-record with `UPDATE_GOLDEN=1 npm test -- src/game/main-room-frames.golden.test.ts` (with your edit back in), look at `git diff src/game/golden`, then undo the edit and the re-record with `git checkout`.

**Checks.** You can say in one sentence what the diff showed. When I did it it was `sprite phone-charger 243 16` against `242 16`, the x position of one sprite. You know the rule: re-record only when you meant to change the picture, and say so in the commit message.

**Hints.** Adding a task at the sofa also changes the golden frames (the prompt shows `1/N` choices); when I added one, two lines of the golden changed, and re-recording was right. There is a second golden for the sleep scene and a third for the dialog beep.

**If you are stuck.** The header comment of `main-room-frames.golden.test.ts` has the commands.

**Afterwards** you can change anything about how the room looks and tell a deliberate change from an accident.

---

### Module 7. A sound effect for a task (and a record, as an aside)

**Goal.** Use effects as data and a cue to attach a sound to a moment in a task.

**Effort.** About an hour. You will hear it; I could not.

**Read.**
- `src/game/config.ts` lines 1049 to 1130 (the `SOUND` table, then a few effects) and line 1348 (`SOUND.cues`).
- `src/game/sound/feature.ts` lines 151 to 190 (how events become sounds; the `cue` listener at 186).
- `src/game/sound/feature.test.ts` lines 210 to 222 (the cue test) and `docs/music.md` "Tuning the sound effects".
- `docs/activities.md` "Cutscene steps".

**The idea.** A sound effect is a record: a list of voices (`wave` or `noise`, frequency, length, gain, delay). There are no audio files. A cutscene step `{ cue: "name" }` emits a `cue` event; `SOUND.cues` maps the name to an effect; the sound feature plays it. So a task gets a sound with no code, only table entries.

**Task (extends module 4).** Make "Wipe the counter" sound like wiping. It needs that task, so start from your module 4 branch: `git worktree add ../sim-worktrees/learn-wipe-sound -b learn/wipe-sound learn/wipe-counter`, then `cd` there and `npm install`.
1. Add two effects to `SOUND.effects`, `wipe` and `wipe2` (a short filtered noise, length 0.3 s, gain around 0.1; start from `key`, the keystroke effect; make `wipe2` a little higher, for example a higher `freq`), and two cues in `SOUND.cues`: `"wipe": "wipe"` and `"wipe2": "wipe2"`. (A cutscene `cue` step takes only a name; it has no pitch.)
2. Give the task `activity: { type: "cutscene", steps: [{ cue: "wipe" }, { wait: 1 }, { cue: "wipe2" }, { wait: 1 }] }` in its `STATE_RULES` (the `duration` is then ignored).
3. In `src/game/sound/feature.test.ts` add `"wipe"` and `"wipe2"` to the list in the test "plays the toast sound for the achievement cue and the needle for the record cue".

**Checks.** That test fails until the cue table has your entries (I removed the `wipe2` entry to confirm: red) and passes with them; I ran this whole task end to end, and a headless run of the task emits the cues `wipe` then `wipe2`. `npm test -- src/game/sound` stays green. Audible: `npm run dev`, press a key to unlock audio, do the task: two wipes, the second a little higher (your `wipe2`). If it is too loud, lower `gain`; the master is `SOUND.master`.

**Hints.** Voices that play together are summed; `delay` staggers them. The `priority: "low"` effects are dropped first when many sounds play.

**If you are stuck.** Look at `needle` and the `record-spin` cue, and `src/game/activities/record-player.ts`.

**Aside: a record.** You know the `.track` format better than anything here. A record is a text file in `src/game/music/tracks/` named `NN-name.track`; the folder is read with `import.meta.glob` in `records.ts`, so nothing registers it, and `src/game/music/records.test.ts` fails, naming file and line, on a mistake (I changed one note to `B9` and got (with the file named) `line N: "B9:1" is not a note (examples: C4, F#3, Bb2, R for a rest)`, where N is the line you changed. Never rename a record that has shipped: the chosen record is saved in the player's browser by file name. Compose in `npm run lab`; `docs/contributing.md` has your own worked example (091d).

**Afterwards** you can add or change a sound and tie it to a moment.

---

### Module 8. The side project file: one bad line skips only itself (issue 124)

**Goal.** Make a real change to a parser-plus-composer pipeline, driven by tests.

**Effort.** An evening. Status in `PLAN.md` on 2026-10-29: todo. Check that no `issue/124-*` branch exists first.

**Read.**
- `docs/side-project-config-design.md` first 30 lines; `src/game/side-project-room.txt` (the whole file).
- `src/game/side-project-config.ts` lines 1 to 60 and 95 to 195 (the parser: a `switch` over commands; `fail(...)` collects problems and returns without throwing).
- `src/game/side-project-room.ts` lines 28 to 80 (types) and 125 to 215 (`composeSideProject`: `fail` throws a `ComposeError`).
- `src/game/side-project-room-config.ts` (the whole file, 42 lines) and `issues/124-sideproject-skip-bad-line.md`.

**The idea.** The parser is the part you know: text in, `{ ops, problems }` out, never a throw. The composer is stricter: one bad name throws, so today one typo drops the whole picture back to a plain copy. The task is making the composer match the parser's manners. Think "validate each `op`, an `Either` per line".

**Task: issue 124.** Make a line that names a piece or sprite the room does not have skip only itself, keep a warning with the parser's `line` number, and keep every other op.
1. Branch `learn/skip-bad-line` (or the issue's own branch if you want it reviewed and merged as the real thing).
2. Write the failing test first, in `side-project-room-config.test.ts`: ops `[bad hide, good move]`; expect the same result as the good move alone, and exactly one `console.warn` mentioning the bad line (use `vi.spyOn(console, "warn")`).
3. Make it pass. Keep existing behavior for callers that do not ask to skip: `composeSideProject`'s tests expect it to throw by default.
4. Run the suite; fix what goes red *on purpose*, test by test.

**Checks.** The issue's acceptance criteria, as tests: a bad piece id, a bad sprite name, an op on a hidden id (it skips only itself), and several bad lines each skip only themselves; every other line applies; one warning per bad line; and the shipped `side-project-room.txt` composes with no warnings. Your new test is red then green; `side-project-room.test.ts` (which expects throws) stays green. In my version `toRoomOps`'s test went red because it carries a new `line` field: a test failing for the right reason. Then the four checks. Visible: put a bad line (`hide piano`) in `side-project-room.txt`, run `npm run dev`, do "Work on side project" at the desk: the picture draws with every other line applied and the console warns once. Remove the line.

**Hints.** (1) The parser's line number is lost in `toRoomOps`; carry it. (2) Look at the `figure` case: it assigns `figure` *before* it checks the sprite exists. Skipping after a throw would leave a half-applied figure, so the order matters. (3) `sideProjectRoom` never passes `hasSprite` today, so a bad sprite name is not detected there at all; decide whether this issue includes wiring it (its criteria mention a bad sprite name).

**If you are stuck.** The design in one line: keep `fail` throwing, give `composeSideProject` an optional `onSkip` callback, and catch the `ComposeError` per op in the loop when it is given. The existing tests for each `fail` are in `side-project-room.test.ts` lines 188 to 224.

**Afterwards** you can change pure code with a test-first loop in a pipeline you understand, and this one is real.

---

### Module 9. Features and events: write a listener

**Goal.** Add a feature that reacts to an event and draws something, without touching `game.ts`.

**Effort.** An evening. Practice, not for shipping.

**Read.** `src/game/features.ts` (the whole file, 28 lines); `src/game/events.ts` lines 53 to 88 (`Emitter`: a listener that throws is logged and skipped); `src/game/game.ts` lines 60 to 73 (`Layer`) and 520 to 530 (`addLayer`); `src/game/time-of-day/feature.ts` lines 1 to 60 (a small layer class); `src/game/achievements/toasts.ts` (a timed on-screen thing).

**The idea.** A feature is a class that subscribes to events in its constructor and, if it draws, registers a layer. `features.ts` switches features on with one line each, so `game.ts` does not know them. It is the observer pattern; the event union in `events.ts` is your `Msg` type for subscriptions.

**Task: a noon note.** When the clock passes 12:00, show `NOON` in the middle of the HUD for three seconds.
1. Branch `learn/noon-note`.
2. Create `src/game/noon-note/feature.ts`: a class implementing `Layer` with `name`, `update(dt)` and `drawHud(ctx)` (use `drawText` and `COLOR.butter`, centered at `VIEW.width / 2`). Subscribe to `stateChanged` in the constructor and react when `id === "clock"` and `Math.floor(value) === 12`. Export `attachNoonNote(game)`.
3. Add one line to `attachFeatures` in `features.ts`.
4. Write `feature.test.ts` beside it: build a `Game`, create the feature, apply `{ var: "clock", set: 12 }` through `game.state.applyEffects`, expect the text, run `game.update` for four seconds of frames, expect it gone.

**Checks.** The test is green. The whole suite stays green (my golden frames were unchanged because it draws nothing until noon). Visible: `npm run dev` with `/?hour=11` and wait: the game clock runs 30 seconds an hour, or step the clock with `]`.

**Hints.** The state fires `stateChanged` for the clock once per game hour, with the exact value a frame past the hour (`docs/state.md` "Events"). The test uses `set`, which fires at once.

**If you are stuck.** `src/game/particles/feature.ts` is another small feature.

**Afterwards** you can add a feature in your own folder and be sure you did not need `game.ts`.

---

### Module 10. A new kind of activity

**Goal.** Write a small mini-game as an activity, register it and use it from a task.

**Effort.** One or two evenings. Practice (a stand-in task), though the pattern is how every mini-game here was made.

**Read.** `src/game/activities/wait.ts` (34 lines), `notes.ts` lines 1 to 125 (a complete small mini-game with a validator), `src/game/activities/index.ts`, `docs/activities.md` "Writing a new kind", `src/game/activities/fake-host.ts`, `src/input/controls.ts` lines 12 to 40.

**The idea.** An activity is a small state machine with `update(dt, controls)` and a `done`/`result`. `BaseActivity` supplies `finish`. The `quality` (0 to 1) scales the points between 0.5x and 1.5x. A validator runs at load so a typo in a task's settings fails then, not on the first press.

**Task: a "tap" activity.** The player presses E a set number of times before time runs out. Settings `presses` (default 8) and `seconds` (default 6). Quality is the share of time left.
1. Branch `learn/tap-activity`.
2. Write `src/game/activities/tap.ts` with a `TapActivity extends BaseActivity` (`cancellable = true`, and `readsKeys = true` because it reads E), then `registerActivity("tap", factory, validator)` with a validator that throws a message naming the task when `presses` or `seconds` is not a sane number.
3. Import it in `activities/index.ts`.
4. Use it: add a "Stretch" task at the sofa (`activity: { type: "tap", presses: 8, seconds: 6 }`, add the id to the sofa's `tasks` in the legend).
5. Test the class directly (`new TapActivity(3, 6)`, call `update(0.1, { ...NO_INPUT, interactPressed: true })`), and the failure paths.

**Checks.** Your unit tests are green. Three existing tests react, and each teaches something. (a) `game-activities.test.ts` ("builds an activity for every task in the real apartment") holds a hard-coded list of activity types: add yours (this is undocumented; log it). (b) The golden frame test goes red, because the sofa now has one more choice and the prompt says `1/N`: re-record with intent (module 6); the diff is two lines. (c) `escape.test.ts` runs Escape at seven moments on every real task; it passes for yours. Visible: `npm run dev`, sofa, Tab to Stretch, press E eight times.

**A side effect to know about (read from the code, `activity.ts` line 124 and `game.ts` line 660; not run).** `readsKeys = true` with `readsLetters` unset counts the mute key as a letter while the game runs, and blocks the pause list's hotkey too. If you want M to still mute during Stretch, set `readsLetters = false` (as the track editor does outside naming), and add a test that `hotkeyBlocked("KeyM", true)` is false while it runs.

**Hints.** `update` is not called on the frame of the opening press, so the first tap you see is the second press. Read `controls.interactPressed` once per frame; never count `keysDown`.

**If you are stuck.** `notes.ts` has the same shape; its tests are `src/game/activities/notes.test.ts`.

**Part 2, changing an existing activity** (optional, same evening). In `notes.ts` make three misses in a row end the game early and finish with the quality so far. Write the test first. Note which existing tests pin the behavior you are changing; that tells you what you are allowed to move.

**Afterwards** you can build a screen or mini-game and know every place it plugs in.

---

### Module 11. The narrow phone layout: the pause legend (issue 120)

**Goal.** Fix a layout bug test-first, in a view that is not the one you usually look at.

**Effort.** An evening. Status in `PLAN.md`: todo (check for an `issue/120-*` branch).

**Read.** `issues/120-pause-legend-narrow.md`; `src/game/achievements/draw.ts` lines 187 to 215 (`drawList`, the header and legend); `src/game/config.ts` lines 6 to 12 (`DESKTOP_VIEW` 320x192, `NARROW_VIEW` 224x208, `VIEW`, `setView`); `src/game/achievements/pause.test.ts` line 14 (the `vi.mock` that makes `drawText` readable) and lines 206 to 218 (how the drawn texts are read back); `docs/mobile.md` section 13 first paragraph.

**The idea.** The game draws at a fixed pixel size, and on a phone it is 224 wide. `VIEW` is a mutable object and `setView` switches it, so layout code that reads `VIEW.width` follows the view. "Does it overlap" is a question about text widths: `textWidth(...)` from the font module. No browser is needed: a test can mock `drawText`, call `drawList`, and read where each string was placed.

**Task: issue 120.**
1. Branch `learn/pause-legend`.
2. Write the test: for the desktop view and `NARROW_VIEW` (`setView(...)`, and restore with `afterEach(() => setView(DESKTOP_VIEW))`), call `drawList` with a fake `sprites` whose `has()` is true and `draw` is a spy, find the count text (`0/26`) in the mocked `drawText` calls, and expect the legend icon's x (the spy's third argument) to be to the right of the count's end (its x plus `textWidth`).
3. Run it: wide passes, narrow fails (the count text ends at 96 and the legend icon starts at 75, a 21 px overlap, inside the issue's 15 to 39).
4. Fix `drawList` so the narrow view does not overlap (drop the legend there, or give it its own line; the issue allows either).

**Checks.** Your test is red at 224 and green at 320 before the fix and green at both after it. The existing pause tests stay green. Then look at it: `npm run dev` with `/?touch=1`, press L (or tap the menu button): the header and legend no longer touch. The issue's acceptance criteria also want both views looked at.

**Hints.** The count text is drawn at `6 + textWidth(PRODUCT_NAME) + 8`. If you drop the legend, ask whether anything else explains the good-hour icon to the player.

**If you are stuck.** `src/game/achievements/gallery-draw.test.ts` lines 3 to 20 loops over wide and narrow views.

**Afterwards** you can do layout work for the phone and prove it without a phone.

---

### Module 12. Ship one, and where to go next

**Goal.** Take one of your changes through the whole flow: branch, checks, pull request, preview.

**Effort.** An evening.

**Task.** Pick the module whose result you would be glad to play: likely module 2 (words), 8 (issue 124) or 11 (issue 120). On its branch: run the four checks, push, open a pull request into `main`, open Netlify's preview for the branch, play it, and write the issue-file progress line if it belongs to an issue (`docs/contributing.md` step 4; see also "Closing a real issue on a machine without Claude" at the top). If it is not an issue, a PR description is enough. If there is Claude, ask a fresh agent to review it; if not, read your diff on GitHub. `main` stays releasable: see `docs/deploy.md` "Rule" before merging.

**Next, in rising size** (check `PLAN.md` for status; none of them is a duty): `091c` encounter music docs and tuning (it suits you: you tune by ear); `106e` editor polish on phones (optional); `042` clutter states (a new variable family with art like module 5, several times over; its code waits for sprites, so you would draw them yourself, or have an agent draw them first); `111e` side-project `when` conditions (design first: read `docs/side-project-config-design.md` all the way; it is the biggest of these).

**Afterwards** you can contribute without anyone and without Claude. The recent history says what you would most plausibly change: tasks and their rules (the battery, the plant, the boxes), a new state variable with art, text and caption pools, a new activity or screen, phone layout, and a new saved field. Modules 4, 5, 2, 10 and 11 are those.

---

## Reference

### TypeScript crib (read once, 10 minutes)
- `interface X { a: number; b?: string }`: a record type; `?` means the field may be missing.
- `type T = A | B`, and `{ kind: "move"; ... } | { kind: "look"; ... }`: a sum type; `switch (op.kind) { case "move": ... }` narrows it.
- `Record<string, X>`: a dictionary. `Partial<T>`: all fields optional. `Omit<T, "zones">`: T without that field. `Pick<T, "a" | "b">`.
- `{ ...a, ...b }`: record merge, right side wins. `tasks.map((t) => ({ ...t, ...RULES[t.id] }))` in `tasks.ts` is a left-biased merge of two tables.
- `x!` asserts "not null/undefined"; `x ?? y` is `fromMaybe`; `x?.y` is safe access.
- `import type { X }` is erased at build time. `class A extends B` and `abstract` exist; `private` is compile-time only; `readonly` is shallow.
- `as const` freezes literal types; `as Record<string, string>` is a cast the compiler trusts you on.
- Tests are Vitest: `describe`, `it`, `expect(x).toBe(1)` / `.toEqual({...})` (deep) / `.toThrow(/text/)`.

### One page map of the repo

```
PLAN.md                  working rules and the issue table. Do not edit it by hand (the planner does).
issues/NNN-slug.md       one file per issue: goal, acceptance criteria, progress log
docs/                    how things work (activities, tasks, state, decor, music, sync, mobile ...)
art/src/*.sprite         every picture, as text (a grid of palette letters); art/palette.json is the palette
public/sprites/*.png     BUILT from art/src by `npm run sprites`; committed
scripts/                 sprites.mjs, tools.mjs (`npm run tools` lists them), check-dist.mjs, brand.mjs
netlify/                 the sync server (a Netlify Function); you will rarely touch it
index.html, music-lab.html   the game page; the dev-only music lab page
src/main.ts              the glue: makes the canvas, keyboard, Game, features and starts the loop
src/game/
  loop.ts                fixed-timestep loop (you have read it)
  game.ts                the Game hub: owns the player, state, interaction, events, layers, dialogs
  config.ts              nearly every tunable number and table (SOUND, MUSIC, REEL, TIME_OF_DAY, ...)
  state.ts, state-vars.ts   ApartmentState (named bounded numbers) and the list of variables
  tasks.ts               every task, as data (CONTENT, STATE_RULES, LOOKS, GOOD_HOURS, EXTRA)
  apartment.ts           the three room maps and which objects offer which tasks
  tilemap.ts, level.ts   turns a map plus a legend into a Level (pieces, props, doors, variants)
  interaction.ts         the system that finds what you face, starts a task, pays it
  activity.ts            the Activity interface, BaseActivity and the registry
  activities/            wait, cutscene, typing, notes, sleep, make-track, flashcards, reel, ...
  events.ts, features.ts the event list and the one place features are switched on
  achievements/          the pause screen, saved progress, achievement data, toasts, stats
  sound/, music/         the synth, sound feature, `.track` parser; music/tracks/*.track are the records
  time-of-day/, particles/   two more features (light; sparkles)
  decor*.ts, deliveries.ts, encounters*.ts   decor items and gifts, packages, ad encounters
  reel/                  the photo reel and gallery (never real photos in tests: synthetic-pic.ts)
  side-project*.ts/.txt  the side project: its config file, parser and composer
  sync/                  save merge and sync client
  golden/                recorded drawing logs for the golden frame tests
src/render/              canvas, camera, hud, sprites, fonts, room painter, dialog box, touch editor
src/input/               keyboard, controls, touch layer, clipboard
src/lab/                 the music lab (dev only)
```
Tests sit beside the code as `x.test.ts` (about 160 files). There is no separate test folder.

### Glossary (the project's own words)

| Term | Meaning | Where |
|---|---|---|
| task | something you do at an object; a record of name, prompt, duration, points, requires, effects | `src/game/interactable.ts` (type), `tasks.ts` (data) |
| object / piece / prop | a lettered thing in a room map; a piece is its placed form; a prop sits on top of one | `apartment.ts`, `tilemap.ts` |
| legend | the table from a map letter to an object definition | `apartment.ts` (`MAIN`, `KITCHEN`, `BATH`) |
| activity | what a task is while it runs (wait, typing, cutscene, your own) | `activity.ts`, `activities/` |
| host | the narrow set of things the game lets an activity do (`openDialog`, `cue`, `setState`, `random`) | `activity.ts:51` |
| state var | a named number with a range (`dishes`, `mood`, `clock`); tasks read it in `requires` and write it in `effects` | `state-vars.ts`, `state.ts`, `docs/state.md` |
| variant | which sprite an object shows, chosen by the first `when` that holds | `appearance.ts`, a legend entry's `variants` |
| feature | an optional module (sound, particles, achievements, time of day) that listens to events and may add a layer | `features.ts` |
| event | a typed announcement from `Game` (`taskStart`, `taskComplete`, `stateChanged`, `cue` ...) | `events.ts` |
| cue | a named moment in a cutscene (`{ cue: "record-spin" }`); `SOUND.cues` maps it to a sound | `config.ts` (`SOUND.cues`) |
| layer | something a feature adds with `game.addLayer` to update and draw each frame | `game.ts:60` |
| golden frame | a recorded log of every drawing call for fixed scenarios; a test compares the live drawing to it | `src/game/golden/`, `main-room-frames.golden.test.ts` |
| composed view | a full-screen picture drawn by code at run time instead of a PNG | `render/composed-views.ts`, `render/side-project-view.ts` |
| decor slot / item | a place that holds one swappable thing, and the things that can go in | `decor-data.ts`, `docs/decor.md` |
| gift / checkpoint | a decor item delivered when a milestone is reached | `delivery-checkpoints.ts` |
| encounter / ad | a full-screen ad card that can interrupt a task | `encounter-ads.ts`, `docs/random-encounters.md` |
| issue / worktree | one file in `issues/`; one git worktree per branch under `../sim-worktrees/` | `PLAN.md`, `docs/contributing.md` |
| planner | the agent or conversation that merges reviewed branches (you never need one to learn) | `PLAN.md` |
