---
id: "155"
title: "Art options to browse: the takeout bag and the outfits"
short: "Bag and outfit art options"
status: done
owner: marc + claude
depends_on: []
summary: "Candidate art for the takeout bag and the three outfits, to browse and choose from before anything ships."
kind: design
unverified:
  - "Review: how the page feels opened by hand in a real browser (double-click) and how any candidate looks in the real game; only headless Chrome screenshots and my own 8x/1x renders were seen."
  - "The page was only seen as a headless Chrome screenshot, not opened by hand, and the sprites were judged by looking at 8x renders and a 3x scene; how they feel in the game at 1x on the real room was not seen."
  - "Only the idle-down frame exists for each outfit candidate; walk frames and the other three facings are not drawn."
decisions:
  - id: d1
    who: marc
    q: "Art options (155): which takeout bag? (A tall paper bag with a twine handle, B rolled-top bag, C bag with a drink cup, D takeout carton with a wire handle)"
    options:
      - "A"
      - "D"
      - "B or C"
      - "something else or draw another round"
    recommendation: "A"
    status: answered
    answer: "A and D look good, but both are drawn from the wrong perspective for something against the south wall (redo from the right viewpoint; see issue 157)"
    by: marc
    on: 2026-11-23
  - id: d2
    who: marc
    q: "Art options (155): which casual outfit? (A grey hoodie, B tan cardigan over a tee, C striped tee with chinos, D denim jacket over a tee)"
    options:
      - "D"
      - "B"
      - "A or C"
      - "something else or draw another round"
    recommendation: "D"
    status: answered
    answer: "keep the current casual, plus A (grey hoodie), B (cardigan) and D (denim jacket); several outfits per category are allowed"
    by: marc
    on: 2026-11-23
  - id: d3
    who: marc
    q: "Art options (155): which going-out outfit? (A dusk-blue jacket with a red scarf, B light-blue button-up, C plum dress, D camel blazer over a tee, E long taupe coat, F mustard jacket over a tee)"
    options:
      - "A"
      - "C"
      - "F"
      - "something else or draw another round"
    recommendation: "A"
    status: answered
    answer: "going out: A (jacket and scarf), B (button-up), D (blazer); E becomes a peacoat; the dress comes back later (it must not make the player conform to a gender; fine as one option among several)"
    by: marc
    on: 2026-11-23
  - id: d4
    who: marc
    q: "Art options (155): which pajamas? (A sky-and-white striped set, B blush tee with plum shorts and slippers, C white bathrobe with an orange belt)"
    options:
      - "A"
      - "B"
      - "C"
      - "something else or draw another round"
    recommendation: "A"
    status: answered
    answer: "pajamas: the current one, A but try vertical stripes, and C (the robe), which might be worn after a shower"
    by: marc
    on: 2026-11-23
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
- 2026-11-23 (review, independent): verdict APPROVE. Ran in the worktree.
  - Candidates outside art/src: all 18 sprites are in art/options. `npm run sprites` rendered 200 sprites and `git status` stayed clean before and after. `npm run build` ok, `npm test` 3944 passed, `npm run issues:check -- --validate` valid. Diff touches only art/options, scripts/options.mjs, scripts/tools.mjs, .gitignore and the issue file (no PLAN.md, no shipped art).
  - Validity: my own script parsed every sprite with parseSprite (palette keys, 16x16, tile size): no errors. No letters or text drawn in any sprite; nothing from reference-photos (grep and the page source have no reference to it).
  - Page: `npm run tools -- options` is listed and builds dist-options/index.html; dist-options/ is ignored (`git status --ignored` shows it). The page has 61 inline data: images and zero http(s) references, so it is self-contained. Current art is loaded from art/src/player-{casual,out,pajamas}-idle-down.sprite and delivery-box.sprite (the shipped files), shown first in dashed cards with 8x and 1x. The bag-now reference is a copy of 154's bag and is byte-identical (ignoring comments) to art/src/takeout-bag.sprite on main. Its label says "unmerged", which is now stale because 154 has merged; harmless.
  - Current outfits description: I read the three sprites. casual = green top with skin-coloured forearms, blue legs (accurate). out = red and brown two-colour check over brown trousers with a stray pixel at the left shoulder (accurate; the comment in the file says flannel and corduroy). pajamas = teal top over plum bottoms (accurate). The issue's account is honest, including that nothing says what "out" should be.
  - What I saw, 8x (contact sheet) and 1x (the 1x copies on the sheet and the page at 1x). Bags: A reads as a paper bag with a handle, clearly not a box (best). B reads as a loaf of bread or a box with a lid; the rolled top is a white band, so it is still box-like at 1x (drop). C is a box with a cup and straw on top; it does not read as a bag with a cup inside (drop or redraw). D reads as a white takeout pail/carton with a grey handle and a red square; distinct silhouette, but the red square looks like a label and could pass for a bowl (keep as the odd one). Casual: A grey top with a darker band, the hood is not visible, reads as a plain grey sweater (label overstates; weak). B tan cardigan over white tee reads as a vest or open jacket, ok. C black-and-white stripes with brown trousers reads as a striped tee, a bit prisoner or sailor; label says slate and white and chinos, the rendering is near black (mildly dishonest). D blue jacket over white tee reads well. Out: A jacket with red scarf reads clearly. B light-blue top with a faint placket reads as a plain tee more than a button-up at 1x ("sleeves rolled" not visible). C purple dress reads as a dress, clear. D tan/brown blazer over white tee looks almost identical to casual B (drop one). E taupe coat reads as a grey sweatshirt or smock; "double row of buttons" not visible at 1x, similar to casual A (drop). F yellow jacket over white tee reads as a yellow vest/jacket; fine and distinct. Pajamas: A blue-and-white stripes reads as pyjamas; B pink tee with purple shorts and orange slippers reads well; C white robe with orange belt reads as a robe or lab coat. Outfits at 1x read by colour block only, as the author said.
  - My drop list: bag B, bag C, casual A, out E (and one of casual B / out D as a near-duplicate). Even with those the counts hold up if the author redraws; as it stands bag has 4 shown and only A and D are convincing. Not a blocker because the issue's purpose is a browse-and-choose, the agent's own drops are recorded, and Marc can reject them; I recommend the planner mention that B and C are weak.
  - Labels honest? Mostly. Overstated: casual A (hood), casual C (slate, chinos look dark), out B (rolled sleeves), out E (double buttons), bag B (a rolled cuff reads as a lid). These are about detail that does not survive at 16x16, not wrong colours.
  - Criteria: candidates outside shipped folders pass; bag at least four with different silhouettes, 16x16, no text pass (B and C are weaker); outfits current description pass, at least three each (4/6/3) and out at least five pass; browsing page with letters, labels, 8x and 1x, current first, scene, one command, ignored folder, self-contained pass; no text, brands or reference photos pass; checks and clean sprites pass; agent looked and dropped pass. Opening it by hand in a browser and the in-game feel: unverified.
  - The d1 decision for Marc is expected and fine. PLAN.md row for 155 needs updating by the planner.
