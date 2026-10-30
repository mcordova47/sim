# Module 4. A task is data (and an achievement for it)

**Goal.** Add a task, with a requirement and effects, at an existing object, with tests; then give it an achievement and meet a limit nobody wrote down.

**Effort.** An evening.

**Read.**
- [`src/game/interactable.ts`](../../src/game/interactable.ts) lines 9 to 72 (the whole record).
- [`src/game/tasks.ts`](../../src/game/tasks.ts) lines 20 to 34 (the shape), 150 to 308 (`STATE_RULES`: tasks gain rules by merging; the helpers above it, `dirty`, `sortStep`, `working`, `STATE_GATED`, are at 120 to 148), 426 to 428 (the assembly), and [`docs/tasks.md`](../tasks.md) first 15 lines.
- [`src/game/apartment.ts`](../../src/game/apartment.ts) lines 184 to 200 (the kitchen legend: `C` is the sink and counter, with `tasks` and `variants`).
- [`docs/state.md`](../state.md) "Add a requirement" and "Add an effect".
- For the last step: [`src/game/achievements/data.ts`](../../src/game/achievements/data.ts) (64 lines), `unlock.ts` lines 1 to 15 (`isMet`), `achievements/draw.ts` lines 31 to 43 (`LIST_LAYOUT`, `LIST_CAPACITY`).

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

**Afterwards** you can add any simple task or achievement, and you know that new data can have layout consequences, so you run the whole suite after every data change. Add the task's words to [`docs/text-review.md`](../text-review.md) if you keep it. One thing I could not tell: the `kitchen-all` achievement leaves out `recycle-boxes`; deliberate or stale?

---

Previous: [Module 3. Who calls your code](03-callers.md) | [Index](README.md) | Next: [Module 5. A variable that changes a picture (and what gets saved)](05-state-and-sprites.md)
