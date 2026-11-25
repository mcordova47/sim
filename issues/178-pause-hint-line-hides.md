---
id: "178"
title: "The pause screen's key hint line disappears at 27 achievements"
short: "Pause hint line hides"
status: done
owner: claude
depends_on: []
summary: "The desktop pause hint line, the only on-screen route to the pause pages, is hidden once a 27th achievement exists."
kind: fix
changelog: none
unverified:
  - "Only seen in headless Chrome with 27 test entries (dev shortcut), not on a real phone or with a real 27th achievement."
  - "How paging feels with the arrow keys (the cursor walks down column one, then column two, then the next page) is not judged."
  - "Reviewer: behavior on a real phone and with a real 27th achievement, and how paging feels in a browser, were not checked (no device or browser session)."
---

## Goal
Found by the design agent of issue 176 (docs/outfit-equip-screen-design.md): on the desktop pause screen the achievements list grows downward and the key hint line is only drawn while the achievement rows end above a limit (rows end at y 158 against a limit of 155 once there are 27 achievements; there are 26 today). The hint line is the only on-screen route to the pause pages (TRANSFER, SYNC, THINGS, PHOTOS), so a future 27th achievement would hide it. The agent also noticed that in a render of the existing 224-wide pause screen the legend overlaps the achievement count and DIALOG VOICE overflows its button; check whether the real game does the same.

## Acceptance criteria
- Reproduce the problem with a real or test state of 27 achievements (read the pause drawing in `src/game/achievements/` and its tests; do not add a real achievement), say exactly where the limit is and why, and fix it so the hint line (or the page buttons) stays reachable however many achievements there are (for example the list scrolls or clips above a reserved hint area); add a test that fails with 27 or more achievements and the old code.
- Check the 224x208 phone view and touch layout for the overlap the agent saw (the legend over the achievement count, DIALOG VOICE overflowing its button) in the running game, fix what is real, and say what you saw.
- The pause screen for 26 achievements looks exactly as before (golden or pixel test); standard checks pass (`npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean).

## Progress log
- 2026-11-24 (planner): filed on main from the finding of the issue 176 design agent.
- 2026-11-25 (claude): worked it. Reproduced first: a test of the old `drawList` with 27 achievements drew no P/I/F/T hint line. The limit is `rowsBottom <= footerTop - 9` (164 - 9 = 155): rows start at y 18, 10 each, two columns, so 26 end at 148 and 27 (14 rows in column one) end at 158. Fix: the desktop list now holds at most 13 rows a column (26 a page, `desktopRowsPerColumn`) and pages with the cursor like touch does; the hint line is always drawn; a `PAGE n/m` label sits after the count in the title row, only when there are 2 or more pages. 26 or fewer is unchanged: `golden/pause-26.json` was recorded from the old code (every drawText and fill of a 26-achievement screen) and the new code matches it. Touch needed nothing (buttons always drawn, 12 per page with a page button). Files: `src/game/achievements/draw.ts`, `feature.ts` (dev shortcut `?extraAchievements=N`, dev server only, adds N locked TEST entries), `pause-long-list.test.ts`, `golden/pause-26.json`.
- The 224-wide overlaps: not real. The pause screen switches the phone to the 320 x 192 picture while it is open (`fullPictureWhen`), so `drawList` never draws at 224. Looked at it in headless Chrome as a phone (touch): header, legend, DIALOG VOICE: LETTERS inside its button all clear. A test guards the 320 width. Nothing fixed there.
- Looked at: desktop 27 entries page 1 and page 2 (cursor moved 26 down), hint line and footer present on both; phone touch layout at 26. Checks: `npm test` (4173 pass), `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run sprites` leaves git clean, `npm run issues:check -- --validate`.
- 2026-11-25 (claude, review): independent review, verdict approve. Checks I wrote myself (kept outside the repo, copy of the branch's src plus main's draw.ts as `draw-main`): (1) desktop drawList for every list length 1..26 and every cursor draws byte-identical fills and texts to main; (2) touch drawList for 1..60 entries, cursor every 3rd, confirmReset on and off, identical to main; so the 26-achievement screen is unchanged and touch is untouched. (3) For 27, 52, 53, 78, 79 entries and the cursor at every index: the cursor's row is shown, rows are unique, the page starts at the multiple of 26, a page holds min(26, rest) rows, every row ends at or above y 155 and inside x 320, the label reads PAGE n/m correctly, all four hints (S, T, I, F) are drawn, and every achievement is reachable (27: page 2 is one row at x 3, y 17; 53: likewise). Boundaries 25/26, 51/52 behave. (4) 224 claim: `drawList` is called only from `feature.ts`, and `fullPictureWhen.push(() => this.listOpen)` (feature.ts:114, game.ts:573/624) makes the phone use the 320 x 192 picture while the pause screen is open, so the 224-wide pause screen is never drawn in the real game: true. (5) The dev shortcut is absent from the built bundle (grep of dist: 0 hits). Standard checks: `npm test` 4173 pass 1 skipped, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run sprites` (git status clean), `npm run issues:check -- --validate` (217 valid, only unrelated length warnings for 176 and 179).
  - Criterion 1 (reproduce at 27, say where the limit is, fix, test that fails on old code): pass. The limit and why are as the author states and match the old line (`rowsBottom <= footerTop - 9`); the new test file covers 27/40/100 and cursors; I did not re-run it against old code, but my main comparison shows main's rule hides the hint at 27 by the same arithmetic.
  - Criterion 2 (224 overlap): pass by code reading and the 320 width test; not seen on a real phone (unverified).
  - Criterion 3 (26 unchanged, checks pass): pass.
  - Scope: only the issue file, draw.ts, feature.ts (dev-only shortcut), the new test and golden. PLAN.md and other issues untouched. No privacy concerns.
  - Not verified: real phone, a real 27th achievement, paging feel in a browser. Note for the planner: PLAN.md table needs updating (178 done).
