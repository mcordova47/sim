---
id: 116
title: Name the game Simagotchi (title, link preview, README, pause screen)
status: review
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
