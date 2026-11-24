---
id: "162"
title: "Reduced motion: audit every animation in the game"
short: "Reduced motion audit"
status: review
owner: claude
depends_on: []
summary: "List every animation with its speed, size and looping, and decide which should change when the browser asks for less motion."
kind: research
changelog: none
decisions:
  - id: d1
    who: marc
    q: "Hold the candle glow steady when the browser asks for reduced motion (draft 162b in docs/reduced-motion.md)?"
    options:
      - "yes: steady glow at its average; about five lines and a test"
      - "no: leave the flicker, it is not a flash by the measured numbers"
    recommendation: "yes: it is the only brightness change that runs by itself, forever; the fix is cheap"
    status: open
  - id: d2
    who: marc
    q: "Should the game get its own motion switch (a pause-screen setting that overrides the browser's), for people who cannot or do not know how to change their system setting?"
    options:
      - "no: the system setting is the standard; nothing more to build"
      - "yes: a pause-screen switch that defaults to the system setting"
    recommendation: "no for now: the system setting is what the standard asks for, and only one thing changes today"
    status: open
  - id: d3
    who: marc
    q: "Under reduced motion, should the art close-up zoom jump straight to its target and the phone camera snap instead of easing, and should the waking light take longer than 2 s?"
    options:
      - "leave all three: each is slow or a single crisp change the player caused"
      - "cut the zoom straight to the target only"
      - "all three calmer"
    recommendation: "leave all three: none is a flash, and each is small, short or player-caused (see rows 4, 15 and 46)"
    status: open
unverified:
  - "Nothing was run in a browser: the setting, the game with it on and the candle as it looks on screen were not seen."
  - "Brightness numbers are computed from the palette and the code's formulas over assumed floor colours, not measured from rendered pixels."
  - "The encounter entrance's count of about three flashes in 0.8 s is a hand count of up and down pairs, not rendered frames."
  - "Chrome and Safari devtools emulation steps are from general knowledge; the OS settings paths and Firefox's preference are from MDN."
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
- 2026-11-24 (claude): started on branch issue/162-reduced-motion-audit. Plan: read how `reducedMotion` reaches `Game` and the encounter, search `src/` for every source of motion, measure the flicker and the biggest brightness changes from `config.ts` and the code (computed outside the repo), and write `docs/reduced-motion.md` with the table, the summary, the browser notes and follow-up drafts. Docs and this file only.
- 2026-11-24 (claude): wrote `docs/reduced-motion.md`: summary, how it was measured, the candle's measured numbers (12 changes a second, about 2.5 cycles a second, strongest brightness swing about 0.03 against the 0.10 WCAG flash threshold, 1.7 to 2.4% of the picture), other brightness changes, a 56-row table of every moving thing, the setting in each browser and how to try it, one follow-up draft (162b steady candle) and what is unverified. Only the candle is worth changing; the ad encounter was already handled in 080. Three open decisions (d1 to d3) above, on this branch because the issue file is edited here; they need to reach main with the merge. Files: `docs/reduced-motion.md`, this file. No code or art changes. Scratch scripts for the measurements were kept outside the repo. Not checked: anything in a browser (see `unverified`).
