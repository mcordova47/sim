---
id: 116
title: Name the game Simagotchi (title, link preview, README, pause screen)
status: done
owner: claude
depends_on: []
---

## Goal
Marc (2026-10-29): the game's name is **Simagotchi** (the repo and the domain keep `sim`). Apply it where the product name shows: the page title and description (`index.html`: title, `og:title`, `twitter:title`, descriptions, the hidden screen-reader line), the link preview (`public/social.png` via `npm run brand`; mind the rule that sprites carry no readable text, so if the image would need lettering, keep the picture and put the name in the og/twitter text only, and say which you did), `README.md`, `docs/` mentions of the old working title "Life" where it names the product, and the pause screen (a title line or wherever the name fits). Do not rename the repo, the domain, the Netlify site, `package.json` name or storage keys (saves must keep working).

Open question for Marc, not part of this issue: a different title for the game as it appears inside the game (he suggested something like "Siminal Crossing"). Do not add it here.

## Acceptance criteria
- The name shows in every place above; no save, storage key, URL or build output name changes; `npm run brand -- --check` passes (regenerate if the image changes); golden frames updated only if the pause screen changes and Marc's wording is in `docs/text-review.md`; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; an independent review.

## Progress log


- 2026-10-29: Started. Plan: name into index.html (title, og/twitter, descriptions, screen-reader line), README, pause header; keep social.png picture.
- 2026-10-29: Done, in review. Changed: `index.html` (title, og:title, twitter:title, added og:site_name, hidden line; descriptions are unchanged because they never carried the old name), `README.md` (heading and first sentence, note that the repo keeps `sim`), `src/game/achievements/draw.ts` + `pause.test.ts` (pause header now "SIMAGOTCHI  n/m"; the old "PAUSE  ACHIEVEMENTS n/m" plus the name would collide with the good-hour legend), `docs/text-review.md` (new entry). Link preview: the picture is unchanged (sprites carry no readable text, so no lettering); the name is in the og/twitter text only, so `public/social.png` and `npm run brand -- --check` are untouched. Golden frames unchanged (the pause screen is not in them). No save, storage key, URL, package name or build output name changed. `docs/` had no mention of "Life" as the product name; `PLAN.md` line 1 still says "Life" (not mine to edit; planner). Checked: npm test, tsc --noEmit, npm run build, check:dist, brand --check all pass. Unverified: how the pause header looks in a browser.
- 2026-10-29: Review (independent). Verdict: APPROVE, with one non-blocking follow-up and one item unverified.
  - Name in every place: PASS. index.html title, og:title, og:site_name, twitter:title, hidden screen-reader line (also checked in built dist/index.html); README heading and first sentence; pause header. Descriptions never carried the old name (checked). No "Life" product name left in index.html, README or docs.
  - og/twitter text: PASS. Both titles read "Simagotchi: a studio apartment game"; og:image/twitter:image URLs unchanged. social.png untouched and `npm run brand -- --check` exits 0 (picture kept, name in text only, as the issue allowed).
  - No save/storage key/URL/package/build output change: PASS. Diff touches no package.json, vite config, netlify.toml, public/, scripts/; the only `sim.mcord.dev` line is an unchanged context line. dist builds to the usual layout (hashed bundle name changes only from the code edit).
  - No in-game title ("Siminal Crossing") added: PASS. The string appears once, in docs/text-review.md, in a "not added" note; nothing in src.
  - Privacy: PASS. No employer, full name or address in the diff.
  - Checks: PASS. npm test (141 files, 3169 passed), tsc --noEmit, npm run build, check:dist all clean.
  - Golden frames / text-review: PASS. No golden file changed (pause list not in them). Pause strings are in docs/text-review.md (SIMAGOTCHI, 3/26). Marc's own wording is not given for them; the entry is marked "Marc to mark: keep / rewrite", which is the right state. PAUSE still appears as the touch pill and the L hint (src/input/touch-ui.ts:64, src/render/hints.ts:29), so the entry's claim holds.
  - Pause header overlap, real textWidth numbers (my own script; header = 6 + width("SIMAGOTCHI") + 8 + width(count); legend icon left = view width - 6 - width(LEGEND_TEXT) - 9 - 3 = 171 at 320, 75 at 224):
    - 320 wide: header ends at 90 (0/9), 96 (3/26), 102 (26/26), 114 (100/100); legend starts at 171; clear gap of 81/75/69/57. PASS. (The old "PAUSE  ACHIEVEMENTS 3/26" ended at 148, gap 23.)
    - 224 wide (narrow view): header ends at 90 to 114 but the legend icon starts at 75, so they overlap by 15 to 39 px whenever the legend is drawn (drawList is used for the narrow view too: src/game/achievements/feature.ts:995, legend not gated on width). FOLLOW-UP, not blocking: on main the old header ended at 142 to 166 and overlapped worse, so this change improves it but does not fix it; the author's comment "would run into the legend" is true at 224 for the new header too. Suggest a separate issue (drop the legend or move it to its own line on the narrow view).
  - How the pause header looks in a real browser: UNVERIFIED (not checkable here; numbers above are layout arithmetic, not a render).
  - Scope: PASS. Only index.html, README.md, docs/text-review.md, draw.ts, pause.test.ts and this file; PLAN.md untouched (its line 1 still says "Life"; planner's to edit).
  - PLAN.md table needs updating to done (planner only).
