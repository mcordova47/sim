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
| `typing` | key mashing: every key press types a character of some lines (code by default) | `lines` (default 2, at most 6); `text`, a list of lines to pick from (no repeats until it runs out), each drawable by the font and under `TYPING.maxLineWidth` pixels. Lists live in `typing-text.ts` |
| `notes` | arrows appear one at a time; press the matching direction before time runs out | `count` (default 6, at most 14) |
| `make-track` | the track editor (a piano roll over the `.track` format), opened at the desk laptop. Free-form: it never finishes by itself, holds the game clock still (`holdsClock`), reads keys (`readsKeys`; `readsLetters` only while a name is typed, so M still mutes) and is left by Escape. Saving pays through `host.reward` | none (see music.md, "Your own tracks") |
| `flashcards` | studying Spanish at the desk computer against the real flashcards app: key entry, flip, grade, each answer sent to the server. Holds the clock still, reads keys, left by Escape. Pays per delivered card through `host.reward` | none (see flashcards.md) |

### Cutscene steps

```ts
{ say: "text", speaker?: "name" }   // show text and wait for it to be read
{ ask: menuNode }                   // open a menu or dialog and wait for it to close
{ wait: 1.5 }                       // do nothing for a while
{ cue: "record-spin" }              // announce a named moment (event `cue`, for sound and animation)
{ face: "left" }                    // turn the player
{ walk: ["left", "left", "up"] }    // walk the player exactly one tile per direction
{ set: { var: "bedMade", value: 1 } } // set a state variable (a flag), clamped to its range
{ goto: { col: 5, row: 1 } }        // walk to that tile of this room, around furniture and not through doorways
{ back: true }                      // walk back to the tile the scene began on and face the way you did
{ view: "view-gallery-wall" }       // cover the world and HUD with that full-screen (320x192) picture
{ unview: true }                    // take the picture away again
{ zoom: { to: {x, y, w, h}, ms } }  // push the shown picture in or out to that window (issue 061)
{ pick: { var, scenes } }           // play the scene (a list of steps) the state variable points at
```

`view` shows a static picture (a sprite named `view-...`, same size as the screen) over the world and the HUD. The step takes no time: the picture stays up while the steps after it run, so follow it with `say` (waits for a key) and `wait` (waits for time), and finish with `unview`. A dialog is drawn over the picture. The world is frozen behind it as for any running task: nobody walks, and the scene holds the controls. The picture belongs to the scene, so it goes away however the scene ends (the last step, Escape, an error) even without an `unview`. The sprite is loaded at start (the names are collected from the tasks' `view` steps); a missing file shows a labelled panel.

`zoom` moves the window onto the `view` picture. `to` is a window in picture pixels and must be a whole-number zoom of the screen (320x192 at 1x, 160x96 at 2x, 80x48 at 4x, 40x24 at 8x), with whole-number `x` and `y`, inside the picture; anything else is refused at load. The step takes `ms` milliseconds: the old window holds for a beat, then the view steps through each whole-number scale on the way (1x to 8x shows 2x, then 4x, then 8x), sliding toward the target. Never a blend, so the pixels stay crisp, and the picture is drawn with smoothing off. A `view` starts at the whole picture, and the zoom goes with the picture on every end path. `pick` reads the state variable (wrapping) and plays the matching scene in place of the step. The `admire-art` scene is built from `src/game/art-pieces.ts`, which also holds all of its text.

`goto` and `back` plan their own route (breadth first over the room's walkable tiles, from wherever the player is when the step starts), so a scene works from any tile it can be started from. A tile with no way to it skips the step, so a scene never sticks. Use `face` after a `goto` to look at something.

The answer of the last `ask` is passed on as the result's `data` (and in the completion event). Every step is checked when the level is built. A `set` step must name a state variable the game knows (an unknown one is rejected at load, naming the task), so it cannot fail halfway through a scene. `set` steps apply as they run and stay applied if the scene is cancelled with Escape; they are not rolled back. (Only the task's own `effects`, points and cooldown are held back.)

A `walk` that ends on or crosses a door tile enters the door (the player is moved to the other room) and the remaining steps, including later steps of the scene, run in the new room, from where the door put the player. The walk does not stop at doors. A test pins this.

Steps that take no time (a cue, a turn) run in the same update as the next step. Escape cancels the scene (see "Escape" below).

## Escape

Escape cancels a running action at any time, with or without text up: no points, no `effects`, no cooldown, the dialog closed, the input lock released, any `view` picture gone, and the combo untouched. `ESC TO STOP` is drawn at the top of the screen (between the score and the clock) while a cancellable action runs. X is not Escape (it is a letter in the typing game).

What happened before and after issue 046 (reproduced on the real `Game`; `src/game/escape.test.ts` holds the table as tests and also tries every real task with Escape at seven different moments):

| action | state | before 046 | now |
|---|---|---|---|
| wait | running | ignored | cancels |
| dialog task (menu or say) | dialog up | Escape went back one menu level, then cancelled at the top | cancels the whole task at once |
| cutscene | waiting step, walking | skipped, and still paid | cancels, pays nothing |
| cutscene | `say` up (typing out or fully shown) | ignored by the activity; the dialog took Escape and closed that one line, the scene carried on | cancels |
| cutscene | `ask` menu up | Escape closed the menu (a cancelled answer) and the scene carried on | cancels |
| cutscene | `view` picture and `say` | same as `say` | cancels, picture cleared |
| typing | running | cancels | cancels |
| make-track | any moment: editing, playing, typing a name, the start menu, the delete question, a paste | cancels at once, from anywhere (it does not close one box first) | cancels, pays nothing; the draft is already kept and the preview stops |
| notes | running | ignored | cancels (made cancellable at Marc's request; no points, effects or cooldown, and a buffered E cannot restart it) |

## How it scores

- **Quality.** A mini-game reports how well it went, from 0 to 1. That scales the task's points between `ACTIVITY.minQualityFactor` (0.5) and `maxQualityFactor` (1.5) in `config.ts`; the award popup shows `NICE X1.30` or `SLOPPY X0.80` (two decimals). A NaN quality counts as 0. An activity with no quality (a wait, a cutscene, a dialog) pays its usual points.
- **Backing out.** `cancel()` is called by the interaction system only when Escape is pressed and the activity is `cancellable` (everything is). It is not called when an activity ends by itself. A cutscene's cancel is a plain cancel, not a skip that pays. A task that is backed out of scores nothing, changes nothing in the apartment and starts no cooldown, so it can be tried again at once. `completed: false` means exactly this: no points, no effects, no cooldown, `taskCancelled` fires, the combo is untouched. The press that backs out never starts a task again (the buffered interact press is dropped). An activity that throws (in its factory, `start`, `update` or `cancel`) is treated the same way: it is reported to the console, cancelled, and the game carries on.
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

While a dialog is open (for example one a cutscene opened), the running activity's `update` is not called and the game clock stands still (`DIALOG.pauseClock`, true by default; if set false, `update` is called with no input), so a cutscene's text can't be skipped past by timing and a mini-game doesn't run behind a dialog. Escape still works while a dialog an action opened is up: the game cancels the action and closes the dialog (from any menu level) in one go. A dialog with no action behind it keeps its own Escape (back one menu level, then close).

`start()` runs right after `taskStart`, in the same frame as the opening press; `update` is first called on the next frame, so the opening press is not seen by the activity.
