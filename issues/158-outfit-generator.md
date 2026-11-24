---
id: "158"
title: "Outfit generator: sprites from a small data entry"
short: "Outfit generator"
status: done
owner: claude
depends_on: ["156"]
summary: "Generate an outfit's 12 sprites from a palette per region plus a torso rule, with a few hand-drawn rows on top."
kind: build
changelog: none
unverified:
  - "How the cardigan feels walking at the real 1x size on a normal display: the reviewer also looked only at 3x browser captures (headless Chrome), not at 1x on a real screen."
decisions:
  - id: d1
    who: marc
    q: "Outfit generator (158, d1): is gift day 48 (three days after the pajamas on day 45) fine for the cardigan?"
    options:
      - "yes, day 48"
      - "another day"
    recommendation: "yes, day 48"
    status: answered
    answer: "as recommended"
    by: planner
    on: 2026-11-23
---

## Goal
Marc (2026-11-23), decision d2 of issue 156: the hybrid art route. One body template; each outfit is a small data entry (a palette per body region plus a torso rule per facing); a script writes ordinary `.sprite` files into `art/src`, so the game and the sprite checks do not change. A few hand-drawn rows per outfit can sit on top where the silhouette changes (a scarf, a long coat, the robe over the legs, a dress, shorts). Start from the agent's experiment in `art/options/route-test/` (`layer-outfit.mjs`, 50 lines, which repainted the shipped casual sprites as the body template and matched a hand-drawn cardigan to within 1 to 3 pixel rows in the front and back views).

## Acceptance criteria
- A data file lists outfits (id, regions with palette keys, torso rule per facing, optional hand-drawn row overlays) and `npm run sprites` (or a sibling command it calls) generates each outfit's 12 files (`player-<id>-idle-<dir>`, walk frames) into `art/src`; generated files carry a header saying so; re-running changes nothing if the data did not.
- Palette keys only, no text in sprites; a test fails if a generated sprite is not 16x16 or uses a non-palette key.
- The three existing outfits (casual, out, pajamas) are not regenerated or changed; the generator is proven on ONE new outfit (casual B, the cardigan, fern with walnut shading as Marc chose) added to the game as a gift item with its note (`from`, deadpan), shown in the Change clothes list and walked in the real game; say what you saw.
- Document how to add an outfit (a data entry and, if needed, hand rows) in docs/art-style.md ('Outfit sprites') so Marc can add one without Claude; the poses (issue 150) are out of scope but note how the same palette map could cover them.
- A fresh game is unchanged (golden frames); standard checks pass; `npm run sprites` leaves git status clean.

## Progress log
- 2026-11-23 (planner): filed on main from Marc's answer to d2 of issue 156.
- 2026-11-23 (claude): started. Plan: `art/outfits.json` (data) and `scripts/outfits.mjs` (generator, exported for tests) run first by `npm run sprites`; torso rules from the route-test script; the cardigan (fern `e`, walnut `7` shade, tee `6`) as the one proof outfit, wired as a gift item.
- 2026-11-23 (claude): built, worktree ../sim-worktrees/158-outfit-generator.
  - Generator: `scripts/outfits.mjs` reads `art/outfits.json` (id, prefix, template, torso rule with outer/shade/inner palette keys, legs recolour map, hand-drawn row overlays per file) and writes 12 files per outfit into `art/src` with a GENERATED header, only when the text differs (re-run says "up to date"; `git status` clean after a second `npm run sprites`). Rules: `open-front`, `solid`. `package.json` `sprites` now runs it first.
  - The three hand-drawn outfits are untouched (a test checks they carry no header). New outfit: CARDIGAN AND TEE, `outfit-casual-cardigan`, style casual, `OUTFITS` index 4, gift on day 48, note "IT DOES UP. YOU HAVE DECIDED IT DOESN'T." The sprites differ from the experiment's only in palette: fern outer, walnut shade, instead of tan and oak.
  - Tests: `scripts/outfits.test.mjs` (12 files, 16x16, palette keys, header, checked in matches the data, only rows 7 to 11 change from the template, overlays, no stray generated file, hand outfits untouched). Two existing counts raised by one (`deliveries.test.ts` checkpoints 19 to 20, `checkpoints-stage-a.test.ts` gifts 22 to 23). Golden frames unchanged (no re-record).
  - Looked at it in the real game: dev server in the worktree, headless Chrome, the game's `Game` exposed on `window` by a scratch entry (deleted, not committed), the item owned and placed in the `worn` slot, then the real arrow keys held for each direction, captured at 3x. Down: white tee strip down the middle, fern cardigan either side with a dark walnut column between; reads as an open cardigan, clearly not the plain green sweater. Up: all fern with a walnut seam down the middle, clearly separate from the brown hair (the tan version merged). Left and right: the white tee shows as a strip at the front edge, a walnut line, then fern; walk frames alternate legs and arm swing without the torso breaking. The fern is close to the green of the plain casual sweater, so the two casual outfits are told apart mainly by the tee strip and seam. The walnut shade is nearly the outline colour, so from the front the V reads as a dark stripe.
  - Docs: `docs/art-style.md` 'Generated outfits' (how to add one, poses note), `docs/decor.md` 'What issue 158 built'.
  - Checks: `npm test` 175 files, 3981 pass; `npm run build` passes.
  - Not done / outside scope: the poses, the other eight outfits (issue 159), and no V-neck overlay for the cardigan (the data supports overlays; none added).
- 2026-11-23 (claude, independent review): verdict approve.
  - Generator checks I wrote and ran in a scratch copy outside the repo: re-running says "up to date" and `git status` stays clean after `npm run sprites` (run twice here). A hand edit to a generated file (one pixel in row 11) fails the checked-in-as-generated test; `npm run sprites` rewrites it back byte-identical. Torso key `z` in the data: the sprite pass stops with 290 "not in the palette" problems and writes nothing. Overlay with a bad key: same, 16 problems. Overlay row 40: "row 40 is 0 wide, expected 16", nothing written. Unknown torso rule: the generator throws "unknown torso rule". Bad legs letter: test fails. An orphan generated file with no data entry: test fails. A 3-wide overlay row throws "not 16 wide".
  - The three hand-drawn outfits: `git diff main` is empty for every `player-out-*` and `player-pajamas-*` file and for the `player-casual-(idle|walk)-*` files; no header on them. Only 12 new `.sprite` and 12 new PNGs for the cardigan plus the listed code, docs and package.json files changed; no `PLAN.md` or other issue touched.
  - `npm run build` passes; `npm test` 175 files, 3981 pass, 3 skipped; golden frames not re-recorded and pass; `npm run issues:check -- --validate` valid.
  - In the game (dev server on a scratch copy with the Game exposed on `window`; nothing of that in the repo), `?own=outfit-casual-cardigan`: Tab at the nightstand reaches Change clothes (3 of 3); the CLOTHES list shows EVERYDAY CLOTHES (in place) and CARDIGAN AND TEE; moving to it previews the cardigan on the player; E puts it on (`outfit` = 4, worn = `outfit-casual-cardigan`). THINGS (L, then I) shows the cardigan figure as the last tile with "CARDIGAN AND TEE / IT DOES UP. YOU HAVE DECIDED IT DOESN'T. / FROM: A PACKAGE / WORN / CHANGE IT AT THE NIGHTSTAND". The gift is on the day 48 checkpoint (`gift-day-48`, test count raised).
  - What I saw walking (real arrow keys, 3x captures, in the room next to the lamp table): down, a white tee strip down the middle, fern either side, a dark walnut column between the tee and fern; reads as an open cardigan. Up, all fern with a walnut seam, clearly apart from the brown hair. Left, fern body with the tee at the front edge and walnut line; walk frames swing arm and legs without the torso breaking. Right, the same mirrored (my capture of the right walk was partly covered by a dialog because I bumped the lamp, but the body read the same). In the full room view the player reads as a green jacket over white, distinct from the blue everyday clothes. The walnut is close to the outline so from the front the V is a dark stripe, as the implementer wrote.
  - Minor, not blocking: an overlay keyed by a misspelt file name (for example `idle-dwon`) is silently ignored by the generator and no test catches it; the generator itself does not validate palette letters (the sprite pass and test do). Worth a check in a later issue (159 will add overlays).
  - Not verified: 1x on a real display (kept in `unverified`). Decision d1 (day 48) stays open for Marc; it is a number in `delivery-checkpoints.ts`.
  - Tell the planner: the table in PLAN.md needs updating (issue 158 done).
- 2026-11-23 (claude, after Marc tried it): Marc liked the cardigan but not the walnut stripe down the back. `art/outfits.json` now has `"facing": { "up": "solid" }` on the torso; `scripts/outfits.mjs` reads an optional per-facing rule (`torso.facing.<dir>`, default the torso's `rule`). The 3 up files regenerated (back is plain fern, the same as the plain casual sweater's back); front, side and walk frames unchanged. No test pinned the seam. Looked at all 12 at 8x and 1x: back is plain green, clearly separate from the brown hair; front still has the tee strip and walnut column, sides unchanged. docs/art-style.md notes the option.
- 2026-11-23 (claude, independent review of 7ef8a7b): verdict approve. The 3 cardigan up files have no `7` and are a plain fern back; only those 3 `.sprite` and 3 PNGs differ from 66f3ce5 (the other nine are byte-identical). `torso.facing.up = "solid"` works; an unknown rule for a facing ("nope") throws "unknown torso rule nope". `npm run sprites` says up to date and git status stays clean; `npm run build` passes; outfits, outfits.test and decor-worn tests pass (21). casual, out and pajamas sprites have no diff versus main. Looked at all four directions plus walk-up frames at 8x on tan #b5835a: back is flat green with a small sleeve step, clearly separate from the brown hair (hair/green boundary is a clean line); front still shows the white tee strip and dark walnut column, sides unchanged. 1x capture was too small to judge more than the green-versus-brown split, which holds. Status stays done.
