---
id: "143"
title: "Apply Marc's text review rewrites to the game"
short: "Apply text rewrites"
status: done
owner: claude
depends_on: ["141"]
summary: "Marc's 17 rewrite marks from the text review are applied to the game's text, with limits and layout to fit."
kind: build
unverified:
  - "The THINGS page was rendered in the real game only at 320 x 192; the 224 x 208 layout was drawn through a harness in the dev server without sprites, because the game itself shows the list at 320 x 192 on the narrow phone too."
  - "How the longer notes read to Marc in play (pace, humour) is unseen; only screenshots were looked at."
---

## Goal
The 'apply the marks in a batch' step of issue 139: apply the 17 `rewrite:` marks in `docs/text-review.md` to the game, keeping Marc's exact words.

## Progress log
- 2026-11-16 (claude): plan: apply the 17 rewrites (decor-data notes, PHOTOS_DELETED, REEL.phoneLines), raise NOTE_MAX, make the layouts hold the longer text, update tests and docs, mark the 17 doc lines keep with the new text.
- 2026-11-16 (claude): built.
  - Strings: 15 item notes in src/game/decor-data.ts (item names unchanged), PHOTOS_DELETED in src/game/achievements/photos-draw.ts, the first entry of REEL.phoneLines in src/game/config.ts. All 17 in Marc's exact words. The code matched the doc's old text for every one (no differences).
  - Font: ' + / . , - already exist in src/render/font.ts, and "..." is three full stops; nothing added to the font, no wording changed.
  - Limits: NOTE_MAX 48 -> 80 (longest note is 78, water lilies). FROM_MAX unchanged (30).
  - THINGS layout: at four rows the longest entries (silkscreen at 320 x 192, barn and serenity at 224 x 208) ran past the box. The grid is now three rows a page (THINGS_ROWS 4 -> 3; 15 things a page on the wide view, 12 on the narrow one), cells unchanged at 24 tall, so the box is 24 px taller; the entry wraps a note over as many rows as it needs. Cells at 22 tall were tried and fail on the narrow view. The test now steps through every cursor on both views and both touch modes.
  - Sofa scene: the new phone line ("You scroll for a while. Why did you open your phone, again?", 59 characters) did not fit the wide phone's one row and was cut. The wide phone now takes a second row (a wrapped line makes the panel 186 tall instead of 177, centred); at most two rows. Narrow view unchanged (it already wrapped). New test: every line of the pool shows whole, inside the phone and clear of the buttons, on both views.
  - Text-rule tests: the "no counts" rule (digits, MORE, ALL, OF, SET) rejected three of Marc's notes ("NUM. 1/12", "+5 NOSTALGIA", "SENSE OF PRIDE", "A LANDSCAPE OF", "A HABIT OF"). Narrowest change: those five exact phrases are removed from the text before the rule runs (decor-entries.test.ts), and the THINGS draw test accepts the numerals "1/12" and "+5" (inventory-page.test.ts). The rule is otherwise unchanged. No test or list rejected Van Gogh or Rimbaud (Marc relaxed the real-names rule for long-dead people; nothing to change).
  - Docs: docs/text-review.md: the 17 lines now show the new text with `keep` (298 items parse, none unparsed, no rewrite marks left); the frozen snapshot scripts/fixtures/text-review-snapshot.md is deliberately unchanged (the parser tests use it). docs/inventory-design.md, docs/photo-gallery-design.md updated. Golden frame unaffected (main room not changed).
  - Renders (headless Chrome, 1x canvas): scratchpad d-0..d-3.png (THINGS 320 x 192: silkscreen, serenity now, starry night, water lilies), narrow-0..4.png (224 x 208: silkscreen, serenity, great wave, starry, water lilies; no sprites), ph-0..3.png (sofa line and PHOTOS delete message on both views), all under /private/tmp/claude-501/-Users-marccordova-Dev-repos-mcordova47-sim/515a2b28-2575-46b4-b906-65e037702ff1/scratchpad/.
  - Checks: npm test (169 files pass), npx tsc --noEmit, npm run build, npm run check:dist, npm run issues:check -- --validate pass.
- 2026-11-16 (claude, independent review): approve.
  - 17 strings: each read in code (photos-draw.ts, config.ts REEL.phoneLines[0], 15 notes in decor-data.ts) and matched against Marc's words, character for character; item names unchanged. No old string remains in src/ (case-insensitive scan of all 17 old texts; "on its own" hits are unrelated code comments, and PHOTOS_REMOVED "originals were never here" is a different string, not a mark).
  - docs/text-review.md: three-dot diff changes exactly 17 line pairs, each now the new text with `keep`; parseReview on a /tmp copy: 298 items, unparsed 0, rewrite marks 0. Other marks untouched.
  - Layout (own script, vite-node, outside repo): every owned item x every `where` x every `changeAt` (931 combos per view) at 320 x 192 and 224 x 208: text inside the box (worst slack 18 px and 16 px), clear of the sprite, nothing cut, joined text equals the full strings; box bottom 181 / 197 stays above the hint line. Grid and buttons come from the existing test (three rows, cells 24 tall, box below the grid).
  - Sofa phone (own script): all 6 pool lines on both views are shown whole; the wide panel with the 2-row line is y 3..189 of 192, text bottom 183 within the screen bottom 185; one-row lines unchanged (7..184); narrow view panel 6..202, text clear of the buttons. A line that wraps to 3 rows would be cut on the wide view, but no line in the pool does (longest is 59 characters, 2 rows) and the new test covers the whole pool.
  - Text-rule tests: the loosening is narrow: five exact phrases removed from the text before the "no counts" check (decor-entries.test.ts), and the THINGS draw test accepts only `1/12`, `+5`, `NUM.` besides PAGE n/m. Other text is still held to the rule.
  - Checks run: npm test (169 files, 3863 passed), npx tsc --noEmit, npm run build, npm run check:dist, npm run issues:check -- --validate (valid; two unrelated summary-length warnings on 138 and 142). Own renders /tmp/myph-0.png (wide sofa phone, two-row line) and /tmp/myph-2.png (narrow): text whole, nothing clipped.
  - Notes: the author's commit adds the 143 row to PLAN.md's table (one line); the planner owns that file, so it merges as is or can be dropped. Not verified (kept in `unverified`): the 224 x 208 THINGS layout in the real game (the game shows 320 x 192 there; only checked by calculation and a spriteless harness), and how the longer notes feel in play.
