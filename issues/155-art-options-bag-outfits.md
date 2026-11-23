---
id: "155"
title: "Art options to browse: the takeout bag and the outfits"
short: "Bag and outfit art options"
status: review
owner: marc + claude
depends_on: []
summary: "Candidate art for the takeout bag and the three outfits, to browse and choose from before anything ships."
kind: design
unverified:
  - "The page was only seen as a headless Chrome screenshot, not opened by hand, and the sprites were judged by looking at 8x renders and a 3x scene; how they feel in the game at 1x on the real room was not seen."
  - "Only the idle-down frame exists for each outfit candidate; walk frames and the other three facings are not drawn."
needs:
  - who: marc
    kind: decide
    why: "Choose a bag (A to D), a casual, a going-out and a pajamas option from the browsing page, or none."
    since: 2026-11-23
---

## Goal
Marc (2026-11-23), after trying issues 152 and 154: the takeout bag still reads a bit like a box, and the outfits are unclear, especially the going-out one (what is it meant to be?). Produce candidate art and a way to browse it, with a plain label saying what each option is meant to be, so Marc can choose. Nothing in the shipped sprites changes in this issue; the chosen options become a follow-up build issue (and update the art in 152 and 154 or replace it).

## Acceptance criteria
- Candidate sprites live outside the shipped sprite folders (for example `art/options/`), so `npm run sprites` and the build are unchanged.
- **Bag:** at least four candidates with clearly different silhouettes (not a rectangle like the box: for example a tall bag with a handle loop, a rolled-top paper bag, a bag with a wider belly and tapered top, a takeout carton with a handle), each 16x16 in the room palette, no text or brand, each labelled with what it is.
- **Outfits:** first, for the existing three (casual, out, pajamas) say plainly what each one is currently drawn as (read the sprites in art/src, issue 045's file and docs/art-style.md; be honest if it is unclear). Then for each of casual, out and pajamas give at least three candidates (the idle-down frame is enough at this stage), clearly different from each other and readable at 16x16, each labelled with what it is meant to be (for example for out: a jacket and scarf, a button-up shirt and dark trousers, a dress, a blazer over a tee). Give the going-out outfit the most options (at least five).
- A browsing page the planner can hand to Marc: all candidates large (8x and 1x), grouped by thing, each with a letter and its label, the current art shown first for comparison, and a way to see them on the room's floor or against the player's other frames. It should be reachable with one command (for example `npm run tools -- options`) and built into an ignored folder; it must also be viewable without Claude.
- The agent looks at every candidate itself and drops the ones that do not read; the reviewer does the same and says what they saw.
- No readable text in sprites, no brands, nothing from reference-photos/.
- Standard checks pass; `npm run sprites` leaves git status clean.

## Progress log
- 2026-11-23 (planner): filed on main from Marc's request.
- 2026-11-23 (claude): started in worktree ../sim-worktrees/155-art-options. Plan: candidates as .sprite files in art/options/ (outside art/src, so the sprite build is untouched), a labels file, a generator scripts/options.mjs that writes dist-options/index.html (gitignored, one self-contained file), a tool entry `npm run tools -- options`. Draw, look at each at 8x and 1x, drop what does not read.
- 2026-11-23 (claude): built the options and the page. Open it with `npm run tools -- options` (builds dist-options/index.html, one self-contained file, gitignored, opens it; also openable by double-click once built). Files: art/options/** (candidates, options.json labels, reference/takeout-bag-154.sprite = a copy of the unmerged 154 bag for comparison), scripts/options.mjs, a `options` entry in scripts/tools.mjs, dist-options/ in .gitignore. Shipped art untouched: `npm run sprites` leaves git clean; tests and build pass.
  - What the current art is (read from art/src and looked at at 8x): casual = fern-green sweater with bare-skin forearms (so it reads short-sleeved) over denim jeans; out = red-and-walnut two-colour check flannel over brown corduroy trousers, plus a stray blush pixel on the left shoulder, which is the character brief's 'corduroy pants and a flannel' (045 only says to wire the sprites): it reads as a lumberjack flannel, not as going out, and nothing in the repo says what 'out' should look like beyond that; pajamas = teal top over plum bottoms (plain matching set); home = denim-blue tee over slate sweatpants.
  - Candidates kept: bag A tall paper bag with twine handle loop, B paper bag with a thick rolled top cuff wider than its body, C paper bag with a drink cup and straw out of the top, D takeout carton with a wire handle; casual A hoodie, B cardigan over tee, C striped long-sleeve with chinos, D denim jacket over tee; out A jacket and red scarf, B light-blue button-up, C plum dress, D camel blazer over tee, E long taupe coat, F mustard jacket over tee; pajamas A striped set, B sleep tee and shorts with slippers, C terry bathrobe.
  - What I saw and threw away: a rolled-top round-bellied bag read as a clay pot, a trapezoid bag read as a box again, a bag twisted into two ears read as a rabbit, a knotted plastic bag read as a perfume bottle or sack, a star-dotted dark pyjama set read as a jacket with gold buttons, a henley over plaid bottoms read as a grey blob with a face-like button square. Out F was first corduroy ribs, which read as stripes, so it became a plain mustard jacket. At 1x everything outfit-wise reads by colour block only: A/B/C/D casual are told apart, jacket/shirt/dress/coat are told apart; bag B (the cuff) is the weakest at 1x and may still read as a small box or cup; bag C's cup reads as a cup on top of a box more than inside a bag.
  - Judgement calls: only the idle-down frame is drawn; out C (a dress) is included because the issue named it, the player is not otherwise coded as any gender and the hair and face are unchanged.
