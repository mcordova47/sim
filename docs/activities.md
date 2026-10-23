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
| `typing` | key mashing: every key press types a character of some lines of code | `lines` (default 2) |
| `notes` | arrows appear one at a time; press the matching direction before time runs out | `count` (default 6) |

### Cutscene steps

```ts
{ say: "text", speaker?: "name" }   // show text and wait for it to be read
{ ask: menuNode }                   // open a menu or dialog and wait for it to close
{ wait: 1.5 }                       // do nothing for a while
{ cue: "record-spin" }              // announce a named moment (event `cue`, for sound and animation)
{ face: "left" }                    // turn the player
{ walk: ["left", "left", "up"] }    // walk the player one tile per direction
```

Steps that take no time (a cue, a turn) run in the same update as the next step. Escape skips the rest of the scene, which still counts as finishing it.

## How it scores

- **Quality.** A mini-game reports how well it went, from 0 to 1. That scales the task's points between `ACTIVITY.minQualityFactor` (0.5) and `maxQualityFactor` (1.5) in `config.ts`; the award popup shows `NICE X1.3` or `SLOPPY X0.8`. An activity with no quality (a wait, a cutscene, a dialog) pays its usual points.
- **Backing out.** Escape cancels an activity that allows it (the typing game and cutscenes do; waits and notes do not). A task that is backed out of scores nothing, changes nothing in the apartment and starts no cooldown, so it can be tried again at once. The `taskCancelled` event announces it, and the combo is untouched.
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
- `controls.keys` lists every key that went down this frame (by code, like `"KeyA"`). Movement keys do not move the player while an activity runs. Escape is the back-out key; X is a letter.
- To walk the player (a cutscene), set `playerControls` to a `Controls` with a `dir`; set it back to `null` to stop.
- Put tunable numbers in `config.ts`.
- `fakeHost()` in `activities/fake-host.ts` lets you test an activity without a game.

While a dialog is open (for example one a cutscene opened), the running activity is not updated and the game clock stands still, so a cutscene's text can't be skipped past by timing and a mini-game doesn't run behind a dialog.
