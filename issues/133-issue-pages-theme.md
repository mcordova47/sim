---
id: "133"
title: "The issue pages get their own look (a theme of our own)"
short: "Issue pages: a theme of our own"
status: done
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
unverified:
  - "Not looked at in Safari or Firefox, only headless Chrome; the embedded pixel font and color-mix() surface colour are standard but unchecked there."
  - "Reviewer: Safari and Firefox rendering not checked (headless Chrome only); characters outside the game's glyph set fall back to the system font, and the 12px pixel text (1.5 px per game pixel) is soft on a 1x screen, crisp on a retina one, not checked on a 1x display."
  - "The pixel font draws only the game's capitals, digits and punctuation; other characters (an accent, a dash) fall back to the system font."
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
- 2026-11-15 (agent): built the hybrid (d1 = c) with the recommended settings (d2: follow the system setting; d3: egg plus pixel pills and card borders, no sprites in empty states). Marc has since taken d2 and d3 as recommended, so these settings are final. What changed, all in the generator: `scripts/issues-site.mjs` (stylesheet split into palette tokens, base, pixel edges and an optional empty-state egg; page chrome gets the egg as the header mark and `<link rel="icon">`; `buildSite` takes a `look` option; `favicon.png` is copied from `public/` into `dist-issues/`), new `scripts/pixel-font.mjs` (builds a TrueType font at build time from the game's own 5x7 glyph table in `src/render/font.ts`, embedded as a data URI, so no outside request; the glyphs are this project's own art, no third-party licence), new `scripts/issues-theme.test.mjs`. There was no Google Fonts link in the pages already (system font stacks); a grep of `dist-issues/` for outside URLs finds none, and a headless Chrome load with name resolution blocked made no request of its own. Page structure, content and data are unchanged. Checked with headless Chrome: no horizontal scroll at 390 and 1200 px, light and dark, on ten pages. Comparison screenshots are in the session scratchpad, not committed. Known failing test on main, not from this change: `scripts/issues-decisions.test.mjs` expects "Nothing is waiting on you." on the real decisions page, but 133's own open d2 and d3 make it false.
- 2026-11-15 (reviewer, independent): verdict approve. Built with `npm run issues:site` (202 files). Checked myself, not from the log: (1) Scope: `git diff main...HEAD --stat` is the generator, `scripts/pixel-font.mjs`, one new test and this file; the only markup change is the header mark link and the `<link rel="icon">`; no data, structure or other issue touched. PASS. (2) Pixel font: viewed in headless Chrome, headings, pills and group labels render in the pixel font; body, summaries, buttons, code stay in the system font. Of all h1-h3 and pill/label text in the 198 pages, the only character missing from the glyph set is the straight double quote (4 uses), which falls back. PASS. (3) Egg is the header mark and `dist-issues/favicon.png` (byte-identical to `public/favicon.png`). PASS. (4) Offline: grep of `dist-issues` for `http(s)://`, `@import`, googleapis, gstatic finds only prose in issue text and one `url(data:font/ttf...)`; no external `src`/`href`. PASS. (5) No horizontal scroll: scripted all 198 pages x 390 and 1200 px x light and dark with every `details` open (`documentElement.scrollWidth` vs width), zero overflow; looked at the home, needs, decisions, a thread and issue 026 screenshots at 390 and 1200 in both themes. PASS. (6) Contrast computed from `art/palette.json` and the tokens (WCAG): light text 15.1, muted 9.2 (surface 9.8), link 6.5 (6.96), need pill 7.9; dark text 15.1 (surface 12.0), muted 7.7 (6.1), link 6.9 (5.4), need pill 7.0, muted on slate 4.7. All text pairs clear AA 4.5. Non-text edges are faint (light mist on paper 1.96, dark slate on night 1.3); decorative card edges, pill borders pass 3:1 in light (4.3) and just fail in dark on bg (3.5 passes, card edge 1.3 does not); noted, not blocking, since the card text carries the meaning. (7) No red and no urgency colours: the CSS holds only palette colours, no brick/red; "none of it urgent" wording is unchanged from before and counts are unchanged. PASS. (8) Hover/focus: `a.card` hover and focus-visible switch the notched edge to the accent; `summary:focus-visible` keeps a 2px outline; focus on a card also shows Chrome's default rounded blue ring over the square edge (seen in a screenshot), visible, a little off-palette; buttons and selects use the browser default ring. Acceptable. (9) Long strings: `body { overflow-wrap: anywhere }` kept; `pre` and tables scroll inside their own box; no page overflow on the code and table pages (007a-c, 082, 026). PASS. (10) Tests: `npx vitest run scripts`: 308 pass, 1 fail, the `issues-decisions` real-repo test expecting "Nothing is waiting on you.". It also fails on main, by reading: that test is unchanged on main and main's `issues/134-tidy-stale-statuses.md` has 7 `status: open` decisions, so the real decisions page is never empty there. The author's log blames 133's own d2 and d3, which are now answered; the cause is 134's open decisions (a stale explanation, not a defect of this change). `npm run issues:check -- --validate`: valid. Not verified: Safari and Firefox rendering; non-glyph characters; the soft look of 12px pixel text on 1x screens (listed in `unverified`). Minor, not blocking: the egg's opaque dark square shows against the light dark-mode page edge; that test's failure message should be handled by whoever closes 134 (needs the test or the decisions changed). Issue was still `status: todo` when I started (never set to review); I set done on the planner's instruction. PLAN.md table needs updating by the planner.
