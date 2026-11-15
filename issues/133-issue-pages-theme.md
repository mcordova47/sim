---
id: "133"
title: "The issue pages get their own look (a theme of our own)"
short: "Issue pages: a theme of our own"
status: todo
owner: marc + claude
depends_on: ["130"]
summary: "The generated issue pages borrow the flashcards app's warm theme; give them a look that belongs to this project."
kind: design
decisions:
  - id: d1
    who: marc
    q: "Which direction should the pages' look take?"
    options:
      - "a: the full game look, the game's palette and pixel font throughout"
      - "b: the game's palette only, in a calm page with ordinary fonts"
      - "c: a hybrid, the palette, the egg logo in the header, the pixel font for headings and labels only, a readable font for body text"
    recommendation: "c: the hybrid, since the pages are mostly long text"
    status: answered
    answer: "c: the hybrid"
    by: marc
    on: 2026-11-15
  - id: d2
    who: marc
    q: "Light and dark: should the pages follow the system setting, or have one fixed theme?"
    options:
      - "follow the system setting, with both themes drawn from the game's palette"
      - "dark only, like the game"
      - "light only"
    recommendation: "follow the system setting (both themes from one palette), so it reads well in daylight and at night"
    status: answered
    answer: "as recommended"
    by: marc
    on: 2026-11-15
  - id: d3
    who: marc
    q: "Which extras from the game belong on the pages?"
    options:
      - "just the egg logo in the header and as the pages' favicon"
      - "the egg, plus pixel-art pills and card borders"
      - "the egg, pixel-art pills and borders, and a quiet sprite in the empty states"
    recommendation: "the egg plus pixel-art pills and card borders; no sprites in the empty states, to keep it calm"
    status: answered
    answer: "as recommended"
    by: marc
    on: 2026-11-15
---

## Goal
Marc (2026-11-15): the generated issue pages (`npm run issues:site`, issue 130) take their theme from the flashcards app's briefing page, which he liked as a pattern but which belongs to another project. Give them a look of their own: this game's. Graduated from `docs/ideas.md` ("Make the issue pages look like ours").

## Where the look lives today
- `scripts/issues-site.mjs` writes `style.css` and `site.js` into `dist-issues/` (not committed): a warm cream and dark palette with one orange accent, Space Grotesk and Inter from Google Fonts or a system fallback (check which: the pages must work offline with no outside requests), pills, cards and native `details` branches, light and dark, phone first.
- The game's own look: the 22-colour palette in `art/palette.json` and the pixel font used in the game's text (`src/render/`), the Simagotchi egg logo (`art/src/logo-egg.sprite`, `public/favicon.png`), the deadpan tone, and the pillar that nothing nags.

## What to do (design first; ask Marc one question at a time)
Write a short note (`docs/issues-theme-design.md`) with a few concrete options and mockups (rendered pages at phone and desktop width, light and dark), then ask, most important first:
1. **The direction:** (a) full game look: the game's palette and its pixel font throughout, authentic but tiring to read at length; (b) the game's palette only, in a calm readable page with ordinary fonts; (c) a hybrid (my recommendation): the game's palette, the egg logo in the header, the pixel font for headings, pills and labels only, and a readable system font for body text.
2. **Light and dark:** does the game's palette give both, or is there one canonical theme (the game is dark); contrast must stay readable.
3. **Details:** the logo in the header and as the favicon of the pages, pixel-art pills and card borders, and whether any sprites should appear (a quiet egg in the empty states) without breaking the calm tone.
Then build it as a small issue: only the generator's stylesheet and the page chrome change, the data and the page structure stay as they are; offline, zero dependencies (embed or bundle any font; no outside requests); privacy as before.

## Acceptance criteria
- A direction agreed with Marc and built behind the existing command; pages checked at 390 px and 1200 px in light and dark with no horizontal scroll and readable contrast; no outside requests; the usual checks pass; an independent review.

## Progress log
- 2026-11-15 (planner): filed from Marc's request to start a thread on the theme.
- 2026-11-15 (planner): Marc picked direction c, the hybrid (the game's palette, the egg in the header, the pixel font for headings, pills and labels only, a readable font for body text). Questions d2 and d3 recorded before asking; an agent builds the hybrid with the recommended settings and renders the alternatives for comparison.
- 2026-11-15 (planner): Marc took the recommendations on d2 (follow the system setting, both themes from the game's palette) and d3 (the egg plus pixel-art pills and card borders; no sprites in empty states).
