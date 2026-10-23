# Writing dialogs

A dialog is data: a tree of nodes in `src/game/dialog.ts`. Nothing about the engine changes when you add one.

## The pieces

```ts
import { choice, menu, say } from "./dialog";

say("Some text.")                     // shows text, then closes
say("First.", say("Then this."))      // shows text, then continues to the next node
say("Hello.", undefined, "Marc")      // with a speaker name tag
menu("Contemplate what?", [           // a list of choices, with an optional prompt
  choice("Existence", say("...")),    // a choice that leads on to a node
  choice("Nothing, actually"),        // a choice with nothing after it closes the dialog
])
```

- A `say` is wrapped to the box and split into pages of three lines. The interact key (E) finishes a page that is still typing, then moves on to the next page, then to `next` (or closes).
- A `menu` moves with the arrow keys or W and S, one entry per press (it wraps around), E chooses, and Escape or X goes back one level (or closes, from the top menu).
- A choice's `next` can be another `menu`, so submenus are just nesting. Cancel goes back to the menu you came from, with the cursor where you left it.
- Nodes are ordinary objects, so a node can lead back to an earlier one (a menu offered again after a reply). Build the loop by creating the menu first and pushing its choices afterwards.

## Getting one to open

- A task can carry one: `task: { ..., duration: 0, dialog: myMenu }` in a tile-map legend or an `Interactable`. The dialog opens when the task starts. (Until the activity framework, issue 022, a task with a dialog is instant and scores as soon as it starts.)
- Code can open one: `game.openDialog(node)`. It returns false if one is already open.
- While a dialog is open the player and the interaction system have no controls, and the game clock (task cooldowns, the combo timer) stands still (`DIALOG.pauseClock` in `config.ts`). Features that need to take the controls themselves use `game.lockInput()`, which returns a function that gives them back.
- Events: `dialogOpen`, `dialogChoose` (the label picked and the whole path so far) and `dialogClose`.

## Text rules

- The pixel font is uppercase only, so text is drawn in capitals whatever case you write it in.
- It covers A-Z, 0-9 and `. , : ; ! ? ' " ( ) / % + - * & # @ $ = _ < > [ ] { } | \ ^ ~` and the back tick.
- Curly quotes, dashes (en, em), the ellipsis character and odd spaces are replaced by plain ones automatically, so text pasted from a book works.
- Anything else (accented letters, emoji) can't be drawn. `src/game/dialog-data.test.ts` checks every dialog reachable from the game's tasks and fails with the text and the characters named. Add your dialog to that test's `roots` if it isn't reachable from a task.
- Keep choice labels short (the box is as wide as the longest label), at most eight choices in a menu, and replies to a few pages. The same test checks these.
