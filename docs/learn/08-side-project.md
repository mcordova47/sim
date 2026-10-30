# Module 8. The side project file: one bad line skips only itself (issue 124)

**Goal.** Make a real change to a parser-plus-composer pipeline, driven by tests.

**Effort.** An evening. Status in [`PLAN.md`](../../PLAN.md) on 2026-10-29: todo. Check that no `issue/124-*` branch exists first.

**Read.**
- [`docs/side-project-config-design.md`](../side-project-config-design.md) first 30 lines; [`src/game/side-project-room.txt`](../../src/game/side-project-room.txt) (the whole file).
- [`src/game/side-project-config.ts`](../../src/game/side-project-config.ts) lines 1 to 60 and 95 to 195 (the parser: a `switch` over commands; `fail(...)` collects problems and returns without throwing).
- [`src/game/side-project-room.ts`](../../src/game/side-project-room.ts) lines 28 to 80 (types) and 125 to 215 (`composeSideProject`: `fail` throws a `ComposeError`).
- [`src/game/side-project-room-config.ts`](../../src/game/side-project-room-config.ts) (the whole file, 42 lines) and [`issues/124-sideproject-skip-bad-line.md`](../../issues/124-sideproject-skip-bad-line.md).

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

Previous: [Module 7. A sound effect for a task (and a record, as an aside)](07-sound.md) | [Index](README.md) | Next: [Module 9. Features and events: write a listener](09-features.md)
