# Module 6. The safety net: golden frames

**Goal.** Know what a golden frame is, read a failure, and re-record only on purpose.

**Effort.** About an hour.

**Read.**
- [`src/game/main-room-frames.golden.test.ts`](../../src/game/main-room-frames.golden.test.ts) (the whole file, 35 lines) and the first 40 lines of [`src/game/main-room-frames.ts`](../../src/game/main-room-frames.ts).
- [`docs/decor.md`](../decor.md) line 24 (why it exists). Glance at [`src/game/golden/main-room-frames.json`](../../src/game/golden/main-room-frames.json) (a list of `{ scenario, frame, calls, hash }`).

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

Previous: [Module 5. A variable that changes a picture (and what gets saved)](05-state-and-sprites.md) | [Index](README.md) | Next: [Module 7. A sound effect for a task (and a record, as an aside)](07-sound.md)
