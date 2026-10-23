# Activities

A task is what the player does at an object. By default it is a **wait**: they hold still for `duration` seconds. A task can name a different **activity** in its data, and the interaction system runs whatever it names. Adding a new kind of activity needs no change to the interaction system.

## Using one

In a task (in `tasks.ts`, or in a tile-map legend):

```ts
{ id: "work", name: "Answer emails", prompt: "Work", duration: 0, points: 80,
  activity: { type: "typing", lines: 2 } }
```

| type | what it is | settings |
|---|---|---|
| `wait` | hold still for `duration` seconds (the default) | none |
| `dialog` | a conversation or menu; also what a task with a `dialog` field is. It is over when the dialog closes; backing out of the dialog backs out of the task | none (uses the task's `dialog`) |
| `cutscene` | a short script of steps (below) | `steps` |
| `typing` | key mashing: every key press types a character of some lines of code | `lines` (default 2, at most 6) |
| `notes` | arrows appear one at a time; press the matching direction before time runs out | `count` (default 6, at most 14) |

### Cutscene steps

```ts
{ say: "text", speaker?: "name" }   // show text and wait for it to be read
{ ask: menuNode }                   // open a menu or dialog and wait for it to close
{ wait: 1.5 }                       // do nothing for a while
{ cue: "record-spin" }              // announce a named moment (event `cue`, for sound and animation)
{ face: "left" }                    // turn the player
{ walk: ["left", "left", "up"] }    // walk the player exactly one tile per direction
{ set: { var: "bedMade", value: 1 } } // set a state variable (a flag), clamped to its range
```

The answer of the last `ask` is passed on as the result's `data` (and in the completion event). Every step is checked when the level is built. A `set` step must name a state variable the game knows (an unknown one is rejected at load, naming the task), so it cannot fail halfway through a scene. `set` steps apply as they run and stay applied if the scene is skipped with Escape; they are not rolled back.

A `walk` that ends on or crosses a door tile enters the door (the player is moved to the other room) and the remaining steps, including later steps of the scene, run in the new room, from where the door put the player. The walk does not stop at doors. A test pins this.

Steps that take no time (a cue, a turn) run in the same update as the next step. Escape skips the rest of the scene, which still counts as finishing it.

## How it scores

- **Quality.** A mini-game reports how well it went, from 0 to 1. That scales the task's points between `ACTIVITY.minQualityFactor` (0.5) and `maxQualityFactor` (1.5) in `config.ts`; the award popup shows `NICE X1.30` or `SLOPPY X0.80` (two decimals). A NaN quality counts as 0. An activity with no quality (a wait, a cutscene, a dialog) pays its usual points.
- **Backing out.** `cancel()` is called by the interaction system only when Escape is pressed and the activity is `cancellable` (the typing game and cutscenes are; waits and notes are not). It is not called when an activity ends by itself. A cutscene's cancel is a skip: it still counts as completed. A task that is backed out of scores nothing, changes nothing in the apartment and starts no cooldown, so it can be tried again at once. `completed: false` means exactly this: no points, no effects, no cooldown, `taskCancelled` fires, the combo is untouched. The press that backs out never starts a task again (the buffered interact press is dropped). An activity that throws (in its factory, `start`, `update` or `cancel`) is treated the same way: it is reported to the console, cancelled, and the game carries on.
- Points bonuses, repeat penalties and the variety combo apply on top, as for any task.
- The task's `effects` (dishes, energy, the clock) apply when it completes, never when it is cancelled.

## Writing a new kind

```ts
import { BaseActivity, registerActivity } from "../activity";

class MyActivity extends BaseActivity {
  cancellable = true;
  update(dt: number, controls: Controls): void {
    // read controls.keys, controls.dirPressed ...
    this.progress = 0.5;                       // for the bar over the player
    this.finish({ completed: true, quality: 0.8 });
  }
  draw(ctx, screen) { /* optional picture, drawn over the HUD */ }
}

registerActivity("my-kind", (spec, item, host) => new MyActivity());
```

Import it from `src/game/activities/index.ts` so it is registered. Rules:

- Do not do anything with side effects in the constructor (it runs before the task is announced). Put it in `start()`, which is called right after `taskStart`.
- Ask the game for things through the `host`: `openDialog`, `cue`, `player` (to turn or watch them) and `random()`. Use `host.random()` and not `Math.random()`, so tests can be deterministic.
- `controls.keys` lists every key that went down this frame (by code, like `"KeyA"`); `controls.keysDown` every key held; `controls.keysReleased` every key let go this frame (for hold-and-release mini-games).
- An activity that reads raw keys (including E) should set `readsKeys = true`, so an E press made during it is not kept to start another task when it ends.
- `ActivityResult.data` is an optional outcome to pass on (it does not affect the score).
- Register a validator as the third argument of `registerActivity(type, factory, validate)`; it runs for every task when a level is built, so a typo shows up at load, not on the first press of E. Keep boxes inside the 320 px screen (see `TYPING.maxLines`, `maxLineWidth`, `NOTES.maxCount`).
- `host.setState(id, value)` sets a state variable.
- Movement keys do not move the player while an activity runs. Escape is the back-out key; X is a letter.
- To walk the player (a cutscene), set `playerControls` to a `Controls` with a `dir`; set it back to `null` to stop.
- Put tunable numbers in `config.ts`.
- `draw` is called every frame while the task runs; one that throws is reported and cancels the task, like a throwing `update`.
- Settings must be the right type: `count` and `lines` must be numbers, not text like `"3"`.
- `fakeHost()` in `activities/fake-host.ts` lets you test an activity without a game.

While a dialog is open (for example one a cutscene opened), the running activity's `update` is not called and the game clock stands still (`DIALOG.pauseClock`, true by default; if set false, `update` is called with no input), so a cutscene's text can't be skipped past by timing and a mini-game doesn't run behind a dialog. The dialog owns Escape: Escape inside a cutscene's own dialog closes that dialog and the scene goes on to its next step; Escape skips the scene only while no dialog is open.

`start()` runs right after `taskStart`, in the same frame as the opening press; `update` is first called on the next frame, so the opening press is not seen by the activity.
