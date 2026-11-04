# Module 11. The narrow phone layout: the pause legend (issue 120)

**Goal.** Fix a layout bug test-first, in a view that is not the one you usually look at.

**Effort.** An evening. Status in [`PLAN.md`](../../PLAN.md): todo (check for an `issue/120-*` branch).

**Read.** [`issues/120-pause-legend-narrow.md`](../../issues/120-pause-legend-narrow.md); [`src/game/achievements/draw.ts`](../../src/game/achievements/draw.ts) lines 187 to 215 (`drawList`, the header and legend); [`src/game/config.ts`](../../src/game/config.ts) lines 6 to 12 (`DESKTOP_VIEW` 320x192, `NARROW_VIEW` 224x208, `VIEW`, `setView`); [`src/game/achievements/pause.test.ts`](../../src/game/achievements/pause.test.ts) line 14 (the `vi.mock` that makes `drawText` readable) and lines 206 to 218 (how the drawn texts are read back); [`docs/mobile.md`](../mobile.md) section 13 first paragraph.

**The idea.** The game draws at a fixed pixel size, and on a phone it is 224 wide. `VIEW` is a mutable object and `setView` switches it, so layout code that reads `VIEW.width` follows the view. "Does it overlap" is a question about text widths: `textWidth(...)` from the font module. No browser is needed: a test can mock `drawText`, call `drawList`, and read where each string was placed.

**Task: issue 120.**
1. Branch `learn/pause-legend`.
2. Write the test: for the desktop view and `NARROW_VIEW` (`setView(...)`, and restore with `afterEach(() => setView(DESKTOP_VIEW))`), call `drawList` with a fake `sprites` whose `has()` is true and `draw` is a spy, find the count text (`0/26`) in the mocked `drawText` calls, and expect the legend icon's x (the spy's third argument) to be to the right of the count's end (its x plus `textWidth`).
3. Run it: wide passes, narrow fails (the count text ends at 96 and the legend icon starts at 75, a 21 px overlap, inside the issue's 15 to 39).
4. Fix `drawList` so the narrow view does not overlap (drop the legend there, or give it its own line; the issue allows either).

**Checks.** Your test is red at 224 and green at 320 before the fix and green at both after it. The existing pause tests stay green. Then look at it: `npm run dev` with `/?touch=1`, press L (or tap the menu button): the header and legend no longer touch. The issue's acceptance criteria also want both views looked at.

**Hints.** The count text is drawn at `6 + textWidth(PRODUCT_NAME) + 8`. If you drop the legend, ask whether anything else explains the good-hour icon to the player.

**If you are stuck.** [`src/game/achievements/gallery-draw.test.ts`](../../src/game/achievements/gallery-draw.test.ts) lines 3 to 20 loops over wide and narrow views.

**Afterwards** you can do layout work for the phone and prove it without a phone.

---

Previous: [Module 10. A new kind of activity](10-new-activity.md) | [Index](README.md) | Next: [Module 12. Ship one, and where to go next](12-ship-one.md)
