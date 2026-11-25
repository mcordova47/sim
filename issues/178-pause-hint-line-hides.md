---
id: "178"
title: "The pause screen's key hint line disappears at 27 achievements"
short: "Pause hint line hides"
status: todo
owner: claude
depends_on: []
summary: "The desktop pause hint line, the only on-screen route to the pause pages, is hidden once a 27th achievement exists."
kind: fix
changelog: none
needs: [{who: marc, kind: try, why: "Look at the pause screen with extra achievements: cd ~/Dev/repos/mcordova47/sim-worktrees/178-pause-hint && npm run dev, open /?extraAchievements=1 and press L (26 rows plus the hint line; Down 26 times for page 2; &touch=1 for the phone layout); then say 'merge 178'", since: 2026-11-25}]
---

## Goal
Found by the design agent of issue 176 (docs/outfit-equip-screen-design.md): on the desktop pause screen the achievements list grows downward and the key hint line is only drawn while the achievement rows end above a limit (rows end at y 158 against a limit of 155 once there are 27 achievements; there are 26 today). The hint line is the only on-screen route to the pause pages (TRANSFER, SYNC, THINGS, PHOTOS), so a future 27th achievement would hide it. The agent also noticed that in a render of the existing 224-wide pause screen the legend overlaps the achievement count and DIALOG VOICE overflows its button; check whether the real game does the same.

## Acceptance criteria
- Reproduce the problem with a real or test state of 27 achievements (read the pause drawing in `src/game/achievements/` and its tests; do not add a real achievement), say exactly where the limit is and why, and fix it so the hint line (or the page buttons) stays reachable however many achievements there are (for example the list scrolls or clips above a reserved hint area); add a test that fails with 27 or more achievements and the old code.
- Check the 224x208 phone view and touch layout for the overlap the agent saw (the legend over the achievement count, DIALOG VOICE overflowing its button) in the running game, fix what is real, and say what you saw.
- The pause screen for 26 achievements looks exactly as before (golden or pixel test); standard checks pass (`npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean).

## Progress log
- 2026-11-24 (planner): filed on main from the finding of the issue 176 design agent.
