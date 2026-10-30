# Module 7. A sound effect for a task (and a record, as an aside)

**Goal.** Use effects as data and a cue to attach a sound to a moment in a task.

**Effort.** About an hour. You will hear it; I could not.

**Read.**
- [`src/game/config.ts`](../../src/game/config.ts) lines 1049 to 1130 (the `SOUND` table, then a few effects) and line 1348 (`SOUND.cues`).
- [`src/game/sound/feature.ts`](../../src/game/sound/feature.ts) lines 151 to 190 (how events become sounds; the `cue` listener at 186).
- [`src/game/sound/feature.test.ts`](../../src/game/sound/feature.test.ts) lines 210 to 222 (the cue test) and [`docs/music.md`](../music.md) "Tuning the sound effects".
- [`docs/activities.md`](../activities.md) "Cutscene steps".

**The idea.** A sound effect is a record: a list of voices (`wave` or `noise`, frequency, length, gain, delay). There are no audio files. A cutscene step `{ cue: "name" }` emits a `cue` event; `SOUND.cues` maps the name to an effect; the sound feature plays it. So a task gets a sound with no code, only table entries.

**Task (extends [module 4](04-tasks-are-data.md)).** Make "Wipe the counter" sound like wiping. It needs that task, so start from your [module 4](04-tasks-are-data.md) branch: `git worktree add ../sim-worktrees/learn-wipe-sound -b learn/wipe-sound learn/wipe-counter`, then `cd` there and `npm install`.
1. Add two effects to `SOUND.effects`, `wipe` and `wipe2` (a short filtered noise, length 0.3 s, gain around 0.1; start from `key`, the keystroke effect; make `wipe2` a little higher, for example a higher `freq`), and two cues in `SOUND.cues`: `"wipe": "wipe"` and `"wipe2": "wipe2"`. (A cutscene `cue` step takes only a name; it has no pitch.)
2. Give the task `activity: { type: "cutscene", steps: [{ cue: "wipe" }, { wait: 1 }, { cue: "wipe2" }, { wait: 1 }] }` in its `STATE_RULES` (the `duration` is then ignored).
3. In [`src/game/sound/feature.test.ts`](../../src/game/sound/feature.test.ts) add `"wipe"` and `"wipe2"` to the list in the test "plays the toast sound for the achievement cue and the needle for the record cue".

**Checks.** That test fails until the cue table has your entries (I removed the `wipe2` entry to confirm: red) and passes with them; I ran this whole task end to end, and a headless run of the task emits the cues `wipe` then `wipe2`. `npm test -- src/game/sound` stays green. Audible: `npm run dev`, press a key to unlock audio, do the task: two wipes, the second a little higher (your `wipe2`). If it is too loud, lower `gain`; the master is `SOUND.master`.

**Hints.** Voices that play together are summed; `delay` staggers them. The `priority: "low"` effects are dropped first when many sounds play.

**If you are stuck.** Look at `needle` and the `record-spin` cue, and [`src/game/activities/record-player.ts`](../../src/game/activities/record-player.ts).

**Aside: a record.** You know the `.track` format better than anything here. A record is a text file in [`src/game/music/tracks/`](../../src/game/music/tracks/) named `NN-name.track`; the folder is read with `import.meta.glob` in `records.ts`, so nothing registers it, and [`src/game/music/records.test.ts`](../../src/game/music/records.test.ts) fails, naming file and line, on a mistake (I changed one note to `B9` and got, with the file named, `line N: "B9:1" is not a note (examples: C4, F#3, Bb2, R for a rest)`, where N is the line you changed. Never rename a record that has shipped: the chosen record is saved in the player's browser by file name. Compose in `npm run lab`; [`docs/contributing.md`](../contributing.md) has your own worked example (091d).

**Afterwards** you can add or change a sound and tie it to a moment.

---

Previous: [Module 6. The safety net: golden frames](06-golden-frames.md) | [Index](README.md) | Next: [Module 8. The side project file: one bad line skips only itself (issue 124)](08-side-project.md)
