# Module 1. Calibrate: state, and the tools

**Goal.** Run everything once, and prove you can read the state code by predicting it.

**Effort.** An evening, much of it setup. Note what felt slow.

**Read.** (New to TypeScript syntax? Keep the [TypeScript crib](reference-typescript-crib.md) open beside you; the [repo map](reference-repo-map.md) and [glossary](reference-glossary.md) are there too.)
- [`docs/contributing.md`](../contributing.md) (the whole page, 47 lines).
- [`src/game/state.ts`](../../src/game/state.ts) lines 1 to 56 (the types), 58 to 124 (the class, reading), 126 to 194 (`applyEffects`, `tick`, `write`, `announce`).
- [`src/game/state-vars.ts`](../../src/game/state-vars.ts) lines 7 to 30.
- [`docs/state.md`](../state.md), sections "Add a variable", "Add a requirement", "Add an effect".

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
3. Question 5 needs a whole task list, so do it by hand: misspell a variable in one `requires` in [`src/game/tasks.ts`](../../src/game/tasks.ts) (say the `dishes` task's `dishes`), run `npm test -- src/game/apartment.test.ts`, read the error, and put the spelling back.

**Checks.** `npm test -- src/learn` is green; `npx tsc --noEmit` is clean; the misspelling gave an error that names the room and the task, for example `kitchen: task "dishes" requires uses the unknown state variable "dishs"`, not a mystery.

**Hints.** Question 3: write the `onChange` calls into an array and compare with `toEqual`; copy each change (`{ ...c }`). Question 4: the comment above `Effect` in `state.ts` says which wins.

**If you are stuck.** [`src/game/state.test.ts`](../../src/game/state.test.ts) has all of these as tests. Answers: 1 is 0 (clamped); 2 is 1 (the clock wraps); 3 is two calls, `dishes` then `mood`, with `previous` 1 and a final `value` of 4 (a variable touched twice reports once, from its first previous value to its last); 4 `set` wins, so dishes is 5; 5 the game refuses to build the rooms, naming the room and task.

**Afterwards** you can run, test, type-check and build, and you can read the state code. If the TypeScript syntax was the slow part, say so and I will add a longer crib; the short one is [the TypeScript crib](reference-typescript-crib.md).

---

Previous: (this is the first module) | [Index](README.md) | Next: [Module 2. Words, and the guard rails around them](02-words.md)
