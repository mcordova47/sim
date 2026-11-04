# Module 2. Words, and the guard rails around them

**Goal.** Add dialog and caption text, and learn which tests defend it. A visible win, early.

**Effort.** Under an hour. It can ship.

**Read.**
- [`src/game/dialog.ts`](../../src/game/dialog.ts) lines 9 to 40 (`Say`, `Choice`, `Menu`, and the helpers `say`, `choice`, `menu`).
- [`src/game/dialog-data.ts`](../../src/game/dialog-data.ts) lines 1 to 60 (the contemplate menu).
- [`src/game/dialog-data.test.ts`](../../src/game/dialog-data.test.ts) lines 12 to 95 (a walk over the tree and four guards).
- [`src/game/config.ts`](../../src/game/config.ts) lines 473 to 492 (`REEL.phoneLines`, `REEL.closeupLines`) and [`src/game/activities/reel.test.ts`](../../src/game/activities/reel.test.ts) lines 134 to 140.
- [`PLAN.md`](../../PLAN.md) "Decisions", the Humor entry (deadpan and sincere; never acknowledge it is pixels or a game), and [`docs/text-review.md`](../text-review.md) first 10 lines.

**The idea.** A dialog is a sum type (`Say` or `Menu`) forming a tree, and the test is a fold over it that collects every node and checks each. Adding text is adding a node. The wording rules (characters the font has, short lines, a deadpan voice) are enforced by tests, so you can write freely and let the machine tell you when you stepped out.

**Task (a real, shippable change).**
1. Branch `learn/words`.
2. Add one choice to the `CONTEMPLATE` menu with a two-sentence reply in the project's voice.
3. Add two lines to `REEL.closeupLines` (the caption over a photo close-up; never anything about what a photo shows).
4. Add the new lines to [`docs/text-review.md`](../text-review.md) under the matching sections.
5. Then deliberately break each guard once so you know what it says: put the word `small` in a caption, and add enough choices to make the menu longer than 8. Remove them.

**Checks.** `npm test -- src/game/dialog-data.test.ts src/game/activities/reel.test.ts` is green with your real lines. With the broken ones I got: `expected 'A small thing to remember.' not to match /pixel|resolution|small|tiny|size|…/i` and `Contemplate what?: expected 10 to be less than or equal to 8`. Visible: `npm run dev`, walk to the sofa and Contemplate (Tab or Q cycles between the sofa's tasks).

**Hints.** Use `say(text, next)` to chain a second page. Replies longer than four pages fail.

**If you are stuck.** The existing `existence` menu in `dialog-data.ts` nests menus.

**Afterwards** you can add or edit any text in the game and know the rules. The caption pools are the nicest tiny contributions: the whole change is one line.

---

Previous: [Module 1. Calibrate: state, and the tools](01-calibrate.md) | [Index](README.md) | Next: [Module 3. Who calls your code](03-callers.md)
