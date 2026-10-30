# Module 5. A variable that changes a picture (and what gets saved)

**Goal.** Add a state variable, make tasks set it, make an object look different because of it with a new sprite, and understand what saving and syncing do with a new variable.

**Effort.** One or two evenings. This is the first module that touches art.

**Read.**
- [`src/game/state-vars.ts`](../../src/game/state-vars.ts) lines 7 to 30 and [`docs/state.md`](../state.md) "Add a variant".
- [`src/game/tilemap.ts`](../../src/game/tilemap.ts) lines 27 to 53 (`ObjectDef`) and [`src/game/appearance.ts`](../../src/game/appearance.ts) (the whole file, 40 lines: `pickVariant` is "first match wins").
- [`src/game/apartment.ts`](../../src/game/apartment.ts) lines 184 to 200 (the dishes variants) and the kitchen's `N` (trash bin) and `X` (boxes) entries.
- [`docs/art-style.md`](../art-style.md) (skim the palette and the rules: 16 px tile, palette letters only, no readable text); [`art/src/bin.sprite`](../../art/src/bin.sprite) (read the grid), [`art/palette.json`](../../art/palette.json), [`scripts/sprites.mjs`](../../scripts/sprites.mjs).
- For the saving step: [`docs/sync.md`](../sync.md) sections 2 and 4 (the table and the winner rule); [`src/game/achievements/progress.ts`](../../src/game/achievements/progress.ts) lines 15 to 45 and 55 to 66 (`WorldSave`, `parseWorld`); [`src/game/sync/merge.ts`](../../src/game/sync/merge.ts) lines 117 and 128 to 135; [`src/game/battery.test.ts`](../../src/game/battery.test.ts) lines 62 to 80 (a save and load test).

**The idea.** A state var is a named bounded number; a variant list is a first-match pattern match from state to a sprite name, ending in a default. The sprite itself is text: a grid of palette letters, `.` transparent. `npm run sprites` turns each `art/src/NAME.sprite` into `public/sprites/NAME.png`; both are committed.

**Task (invented, shippable if you like it): the bin fills up.** Add `trash` (0 or 1). Cooking sets it to 1; "Take out the trash" now needs it to be 1 (`BIN IS NOT FULL` otherwise) and sets it back to 0. The kitchen's bin shows a new `bin-full` sprite while it is 1.
1. Branch `learn/full-bin` (from `main`).
2. Add the variable (`state-vars.ts`), edit `cook` and `take-trash` in `STATE_RULES`, and give the `N` legend entry `variants` (full first, then the default `bin` with no `when`).
3. A task that is gated by state has no time cooldown (issue 071, [`docs/tasks.md`](../tasks.md); the table is `STATE_GATED` in `tasks.ts` at line 148 and in `cooldowns.test.ts`). Put `cooldown: 0` on `take-trash` the way the other gated tasks do (`...STATE_GATED`), and run `npm test -- src/game/cooldowns.test.ts`. It goes red with `expected +0 to be 10`. (Gating by `requires` alone does not turn it red; the cooldown is a separate field.) Read that test's tables and make the decision on purpose: move `take-trash` from the `KEPT` table to the `STATE_GATED` list there.
4. `take-trash` has the flavor line `The bag was not full. You took it out anyway, out of spite.` That is now false. Rewrite it, and note the change in [`docs/text-review.md`](../text-review.md).
5. Draw `art/src/bin-full.sprite`: copy `bin.sprite` and change the top rows so the bag bulges. Run `npm run sprites`. Commit the `.sprite` and the generated `.png`.
6. The saving step. The new variable is saved with no code of yours: `AchievementsFeature` writes every variable into `world.vars` (`achievements/feature.ts` line 390), and the game's own loader keeps only names the game knows (`restoreWorld`, same file, `.filter(([id]) => this.game.state.has(id))`), so an old save without `trash` starts at `initial`. In a sync merge the whole world group comes from the device played most recently. Prove it: write `src/learn/sync-var.test.ts` that builds two documents through `normaliseDoc` (from [`src/game/sync/merge.ts`](../../src/game/sync/merge.ts); shape `{ app: "life", format: 1, device, activeAt, tracks: [], progress: { unlocked: [], stats: {}, world: { vars, room: "main", col: 1, row: 1, facing: "down" } } }`), one more recently played with `trash: 1`, and show `mergeSaves(a, b, now).progress.world.vars.trash` is 1 whichever argument order, and that an unknown variable name is dropped on the way in (that filtering is the sync path's `normaliseProgress`, not `parseWorld`).
7. Run everything.

**Checks.** `npm run sprites` says `Rendered N sprite(s)`, and any bad row width or letter is reported with file and row. `npx tsc --noEmit` clean. Golden frames stay green, because the default look did not change. The cooldown test goes red at step 3 and green after you move the entry. The sync test is red before the variable exists (the name is dropped as unknown; run it on `main` to see) and green after. Visible: `npm run dev` with `/?set=trash:1`, kitchen, the bin in the north-east corner: the full bag; do the trash task and it empties. A missing sprite never breaks the game: it draws a labelled rectangle and logs `Sprite "bin-full" not found; using placeholder` in the console.

**Hints.** A variant with no `when` must be last. For the art you only need to change a few rows; use `6` (paper) and `5` (mist) for the bag.

**If you are stuck.** The `boxes` variable (three states) is the full example: `state-vars.ts`, the `X` legend, and `flatten-boxes` and `recycle-boxes` in `tasks.ts`. `merge.test.ts` shows how documents are built.

**Afterwards** you can add state, show it, and draw 16x16 art, and you know what saving does. The exception you will meet: `hasPhotos` is derived from the device's pictures and deliberately never saved or synced (`achievements/feature.ts` line 389), so a variable can opt out. A new top-level saved thing, such as a new localStorage key, is not synced at all unless it is added to the sync document with a merge rule, which is a design change ([`docs/sync.md`](../sync.md), section 2).

**Adding a decor item or a gift (a stretch; I ran it once, not a full task).** A new `DecorItem` is a line in `GIFT_ITEMS` in [`src/game/decor-data.ts`](../../src/game/decor-data.ts) plus a sprite. Adding one makes at least `checkpoints-stage-a.test.ts` ("real items have sprites and fit the right slots", which pins the 13 gifts) go red; where you insert the item decides whether the THINGS page tests react too (they did when I inserted mid-list, not for a reviewer who appended). Gifts are a design decision about what arrives when, so the project pins them; read why before you touch anything, and do not merge a stand-in.

---

Previous: [Module 4. A task is data (and an achievement for it)](04-tasks-are-data.md) | [Index](README.md) | Next: [Module 6. The safety net: golden frames](06-golden-frames.md)
