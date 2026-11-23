---
id: "152"
title: "Worn outfits: change clothes at the nightstand"
short: "Worn outfits"
status: done
owner: claude
depends_on: ["151"]
summary: "Outfits become decor items worn from a non-map slot, changed at the nightstand."
kind: build
unverified:
  - "How the clothes list and the preview look in a browser, and how the THINGS page looks with the outfit sprites, were not seen."
  - "Review 2026-11-23: also not seen in a browser: the on-player outfit preview while the clothes list is open (and that it snaps back on Escape), the clothes list rows (player sprites as list icons), the seventh THINGS entry (everyday clothes) and its where line (WORN)."
---

## Goal
Build step B of `docs/decor-expansion-design.md` (section 5, engine piece P6): the three drawn outfits (casual, out, pajamas; 36 sprites already exist) become items of kind `outfit` in a slot `worn` that is not drawn on the map, changed at the nightstand by a task `swap-worn` ('Change clothes'), only offered when another outfit is owned. They arrive as gifts. The `outfit` state variable becomes derived from the slot. Marc (2026-11-23, decision d3 of issue 148): yes, and the poses staying in everyday clothes is a known bug filed as issue 150 (not fixed here).

## Acceptance criteria
- Slot `worn` (default `outfit-home`), items for the three outfits with deadpan notes and `from`, THINGS shows each by its idle-down sprite; `decor.test.ts`'s pinned slot list and main-room slot check are updated so non-map slots are exempt.
- `outfit` is derived each frame (like `parcel`); nothing else writes it; sleeping does not change clothes.
- A fresh game is unchanged (golden frames); the three outfits arrive through delivery checkpoints at days after the existing ones (state the days in the issue; Marc can change them).
- New strings are added to docs/text-review.md. Standard checks pass. Update docs/decor.md.

## Progress log
- 2026-11-23 (planner): filed on main from Marc's answers to issue 148 (decor expansion design note).
- 2026-11-23 (claude): built it. Plan was: a `worn` slot (new `offMap` flag so the main-room slot test exempts it), four `outfit` items (home is a starting thing; casual, out and pajamas are gifts), `Game.syncOutfit` deriving `outfit` from `decor.shownIn("worn")`, `swap-worn` on the nightstand named "Change clothes".
  - **Gift days chosen:** casual day 39, out day 42, pajamas day 45 (after the plants, last at day 36). Marc can change the numbers in `delivery-checkpoints.ts`.
  - Files: decor-data.ts, delivery-checkpoints.ts, apartment.ts (nightstand lists `swap-worn`), game.ts (`syncOutfit`), outfits.ts (`outfitFromItem`), tasks.ts and state-vars.ts (wording), docs/decor.md, docs/text-review.md, new `decor-worn.test.ts`; tests updated for the new counts (seven starting things, 22 gifts, 19 checkpoints), the pinned slot list, and poses.test.ts (outfit now set through the slot, since a direct write is put back).
  - Choices: the `outfit` variable follows what the room shows, so the highlighted outfit is on the player while the list is open (a preview, undone on Escape). A fresh game's THINGS page now has a seventh entry, the everyday clothes (that is the default item of the slot). The swap prompt for the `outfit` kind changed from the placeholder "Change the outfit" to "Change clothes" as the issue says. Notes are new deadpan lines, listed in text-review.md.
  - Checked: `npm test` all pass (golden frames unchanged), tsc, build. Not seen: the list and THINGS in a browser.
- 2026-11-23 (review, independent): **approve, with browser-only items unverified.**
  - Ran in the worktree: `npm test` 173 files, 3951 passed; `tsc --noEmit` clean; `npm run build` ok; `issues:check --validate` ok (188 valid; warnings only in 153's file, not this branch's change).
  - Own checks (scratchpad test, not committed, importing the worktree source): all four outfit sprites are in the loaded sprite set; junk saves (worn not owned, wrong kind, null, number, same item also placed in another slot, "junk", null) always load to an owned outfit item, and the game then derives a valid `outfit` 0 to 3; an old save with `outfit` 2 and no worn placement goes home; swap list lists home plus the three owned outfits, no NOTHING row, preview changes what the room shows and `outfit` follows, Escape restores, E commits and the old outfit returns to the list, nine steps around the list stay valid; a dangling preview is cleared by the game; `swap-worn` appears once in the apartment and no task effect names `outfit`; an outfit cannot go to another slot, art cannot go in `worn`, `worn` cannot be emptied.
  - **Criterion 1 (slot, items, notes, from, idle-down sprites, test updates): pass.** decor-data.ts lines for `worn` (offMap) and four items; pinned slot list and main-room check exempt `offMap`. THINGS look in a browser: can't verify.
  - **Criterion 2 (derived, nothing else writes, sleeping unchanged): pass.** `syncOutfit` is the only writer (grep: one `var: "outfit"` outside tests); stray write is put back; no sleep path touches it. A real overnight sleep was not run end to end; reasoned from the grep and the energy/clock test.
  - **Criterion 3 (fresh game unchanged, gift days stated): pass.** Golden frames pass; days 39, 42, 45 are stated in the log and docs/decor.md and sit after the last plant (36).
  - **Criterion 4 (text-review.md, checks, decor.md): pass.** Four notes, CLOTHES, WORN and "Change clothes" are in docs/text-review.md; docs/decor.md has a new section and the stale placeholder prompt is updated.
  - Beyond the criteria: scope is as listed (the 154 difference against main is only main moving on; `main...HEAD` shows none). No reference photos or personal details. Poses stay in everyday clothes (issue 150, known).
  - Not seen (browser): see `unverified` above. Marc should look at the clothes list and the THINGS page when merging.
