---
id: "159"
title: "Draw the chosen outfits"
short: "Draw the outfits"
status: todo
owner: marc + claude
depends_on: ["158"]
summary: "Add the outfits Marc chose from the options with the generator: casual, going out and pajamas."
kind: build
decisions:
  - id: d1
    who: marc
    q: "Outfits (159, d1): the blazer came out taupe, not the camel you chose, because camel merged with the tan hair from behind and the wood floor. Keep taupe?"
    options:
      - "keep taupe with a white collar line at the nape"
      - "go back to camel"
      - "another colour"
    recommendation: "keep taupe with a white collar line at the nape"
    status: answered
    answer: "keep taupe (taken by the planner: Marc said everything else is perfect; change it if not)"
    by: planner
    on: 2026-11-24
needs: [{who: marc, kind: try, why: "Look at the eight new outfits: cd ~/Dev/repos/mcordova47/sim-worktrees/159-draw-the-outfits && npm run sprites -- --sheet=player and open art/contact-sheet.png, or npm run dev with ?own=outfit-<id>; then answer d1 and say 'merge 159'", since: 2026-11-24}]
---

## Goal
Add the outfits Marc chose (issue 155, d2 to d4) using the generator (issue 158), each as a decor item arriving as a gift (new days after 45) with a deadpan note:
- **Casual:** A (grey hoodie), D (denim jacket over a tee). (B, the fern cardigan, is the proof outfit in 158.)
- **Going out:** A (jacket and scarf), B (button-up), D (blazer), E as a peacoat.
- **Pajamas:** A as vertical stripes (not horizontal), C (the robe; a hand-drawn overlay over the legs; the shower hook is a later idea in docs/ideas.md).
- Later: the dress, a red jacket (brick with walnut shading); see docs/ideas.md. A spread so no gender is the default (Marc, 2026-11-23).
Candidates are in `art/options/`.

## Acceptance criteria
- Each outfit is a data entry (and hand rows where needed); look at each walking in four directions at 1x and in the room, and drop or redraw those that do not read; say what you saw. Every outfit is distinguishable from the hair and from the others.
- Items, notes and gift days added (state the days; Marc can change them); new strings in docs/text-review.md.
- Standard checks pass; a fresh game is unchanged. Split into two issues if it is too much for one review.

## Progress log
- 2026-11-23 (planner): filed on main; waits for 158.
