---
id: "143"
title: "Apply Marc's text review rewrites to the game"
short: "Apply text rewrites"
status: review
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
