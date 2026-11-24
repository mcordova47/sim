---
id: "162"
title: "Reduced motion: audit every animation in the game"
short: "Reduced motion audit"
status: todo
owner: claude
depends_on: []
summary: "List every animation with its speed, size and looping, and decide which should change when the browser asks for less motion."
kind: research
changelog: none
decisions:
  - id: d1
    who: marc
    q: "Reduced motion (162, d1): hold the candle's glow steady when the browser asks for less motion?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: open
  - id: d2
    who: marc
    q: "Reduced motion (162, d2): add the game's own motion switch to the pause screen (separate from the browser setting)?"
    options:
      - "yes"
      - "no"
    recommendation: "no"
    status: open
  - id: d3
    who: marc
    q: "Reduced motion (162, d3): make the art close-up zoom, the phone camera scroll and the waking light ramp calmer under the setting?"
    options:
      - "yes"
      - "no"
    recommendation: "no"
    status: open
---

## Goal
Marc (2026-11-24) asked for an audit after learning that the game only honours the browser's reduced-motion setting in the ad encounters (issue 080). List every animation in the game and decide, for each, whether it should change when the setting is on. The setting is an accessibility request (large, fast, whole-screen or flashing motion can cause dizziness, nausea and migraines); it is not "no animation": small, slow, local motion and motion the player causes are generally fine.

## Acceptance criteria
- A document `docs/reduced-motion.md` with a table of every animation or moving thing in the game (the walk and pose animations, the candle and lamp glow flicker and the time-of-day light, the snore, coffee steam, dust and other particles (`src/game/particles`), the plant and other state changes if they animate, popups and the points and combo displays, the achievement pop-ups and legend, the time bars and clock, dialog boxes and menus opening, the cutscene and composed views (sofa, side project, the cutscene transitions), the photo reel and gallery transitions, the delivery arrival and the takeout, the music lab and track editor visuals, the title and pause screens, the ad encounters and their entrance and exit, and anything else found by searching `requestAnimationFrame`, `setInterval`, particle emitters, `flicker`, `shake`, fades and easing in `src/`). For each: where it is in the code, its speed (frames or Hz), its size (pixels or fraction of the screen), whether it loops or ends, whether the player causes it, whether it flashes (measure the strongest brightness change per second for anything that pulses), and a recommendation: leave as is, or a calmer version when reduced motion is asked (steady, slower, or a plain fade), with a one-line reason. Measured, not guessed: read the numbers from `config.ts` and the code, and run the headless render where useful.
- A short summary at the top: the few animations worth changing (the planner's guess: the candle flicker, perhaps others), what is already fine, and the cost of each change.
- If a change is cheap and clearly right (for example one flag), list it as a follow-up build issue draft with its acceptance criteria in the document; do not build anything in this issue. Open questions for Marc go into this issue file as open `decisions` entries with a recommended default.
- Also note what the setting does in each supported browser and how to test it (macOS Reduce motion, the browser's devtools emulation), written so Marc can try it without Claude.
- Standard checks pass: `npm run issues:check -- --validate`; docs only, no code or art changes.

## Progress log
- 2026-11-24 (planner): filed on main from Marc's question about reduced motion and the game's animations.
