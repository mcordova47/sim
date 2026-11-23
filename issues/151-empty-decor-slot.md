---
id: "151"
title: "Decor: slots that can hold nothing (the empty option)"
short: "Empty decor slots"
status: done
owner: claude
depends_on: []
summary: "Let a decor slot hold nothing, with a NOTHING row in the swap list; the first piece of the decor expansion."
kind: build
unverified:
  - "Nothing was seen in a browser: no real slot is empty yet, so the NOTHING row and an empty slot in the room were exercised only through tests and the headless swap activity, not drawn on screen. Also not rendered: an empty slot that has a prop on it (read in game.ts only)."
decisions:
  - id: d1
    who: marc
    q: "Empty decor slots (151, d1): only a slot with no default can be emptied, so the real-room slots keep always showing something?"
    options:
      - "Only slots with no default; real-room slots stay always-shown"
      - "Any slot can be emptied"
    recommendation: "Only slots with no default; real-room slots stay always-shown"
    status: answered
    answer: "as recommended"
    by: planner
    on: 2026-11-23
  - id: d2
    who: marc
    q: "Empty decor slots (151, d2): offer the swap task on an emptiable slot that already holds something, even when nothing else fits (so a lone trinket can be taken down)?"
    options:
      - "Yes, offer it"
      - "No, only when something else fits"
    recommendation: "Yes, offer it"
    status: answered
    answer: "as recommended"
    by: planner
    on: 2026-11-23
---

## Goal
Build step A of `docs/decor-expansion-design.md` (engine pieces P1 and P2): the `empty` slot option, and the new `DecorKind` values `trinket`, `coffee`, `outfit` and `furniture` with their swap prompts, so later steps (trinkets, the rug, outfits, the shelf, the sill) can be only data and art. Read the note's sections on P1, P2 and the new-slots table first, and `docs/decor.md`.

## Acceptance criteria
- A slot may have no `default`: it shows nothing (no placeholder box); the swap list has a NOTHING row at the top; `place(slot, none)` works; `starting`, `parseDecor` and `validateDecorData` accept a missing default; the save keeps `placed` only for slots with an item (a hand-edited save is still cut down, never an error).
- A map legend entry with a `slot` that has no default sprite no longer throws in `tilemap.ts` (say how an empty slot object names one).
- The new kinds exist with a plain swap prompt each (`SWAP_PROMPT`), validated like the others; the swap task is offered only when there is something to put in the slot (existing rule), so a fresh game is unchanged.
- A test-only empty slot proves it end to end (swap in, swap out, NOTHING, save and load, the inventory); it is not in the real room.
- The main-room golden frames do not change; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` and `npm run issues:check -- --validate` pass.
- docs/decor.md gets a short 'What issue 151 built' section.

## Progress log
- 2026-11-23 (planner): filed on main from Marc's answers to issue 148 (decor expansion design note).
- 2026-11-23: started. Plan: make `DecorSlot.default` optional and thread it through `Decor` (`plan`, `place`, `preview`, `starting`, `parseDecor`, `validateDecorData`, `look`), add the NOTHING row to the swap list, let a slot's legend entry in `tilemap.ts` have no sprite, add the four kinds and prompts, a test-only empty slot test and the docs section.
- 2026-11-23: done, in review. Files: `src/game/decor.ts`, `decor-data.ts`, `tilemap.ts`, `game.ts` (empty slot and prop draw nothing), `activities/swap-decor.ts`, `time-of-day/feature.ts`, `sound/feature.ts` (nullable readers), `tasks.ts` (only the four `SWAP_PROMPT` lines and an `export`, to stay clear of the takeout work), new `decor-empty.test.ts`, `decor.test.ts` (one expectation changed on purpose: a slot object with no sprite no longer throws), `docs/decor.md`. An empty slot object in a map legend simply has no `sprite`. Checks run: `npx tsc --noEmit`, `npm test` (171 files pass, golden main-room frames unchanged), `npm run build`, `npm run check:dist`. Two judgement calls are recorded as decisions d1 and d2 (emptiable only without a default; the swap task also offered on an emptiable slot that holds something). Not checked: how it looks in a browser, since no real slot is empty yet.
- 2026-11-23 (review, independent): verdict APPROVE. Criteria: (1) empty slot, NOTHING row, `place(slot, null)`, `starting`/`parseDecor`/`validateDecorData`, save keeps `placed` only for filled slots: pass (read the code and ran my own checks outside the repo: a hand-edited save with one item placed in an empty slot and in a default slot is cut down to one place and never throws; unknown, unowned, null and non-string placements are dropped; swap between an empty and a default slot moves the displaced item correctly and round-trips through save and load; a default slot refuses NOTHING; two empty slots do not trip the same-default check). (2) legend entry with a slot and no sprite: pass (variants come out empty, with and without a sprite, checked on a parsed map; an empty slot object just omits `sprite`). (3) new kinds and `SWAP_PROMPT`: pass; swap task offered only with something to put in (plus d2): pass, fresh game unchanged. (4) test-only empty slot end to end: pass (`decor-empty.test.ts`, 14 tests, plus my edge checks including preview then cancel, preview of NOTHING, and moving between two empty slots, all leave the room as it was). (5) golden main-room frames unchanged, `npx tsc --noEmit`, `npm test` (171 files, 3913 passed), `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`: pass, all run by me. (6) docs/decor.md 'What issue 151 built': pass. Beyond the criteria: scope is clean (only the files named in the log, the `tasks.ts` change is the four prompts and an `export`; no PLAN.md, other issues or reference-photos touched); no remaining caller still assumes a slot is never empty (`itemIn`/`placedIn`/`look` are now used only behind `shownIn`/`heldIn`/`lookAt`). Not verified: how an empty slot, the NOTHING row and the empty prop look in a browser (no real slot is empty yet); an empty slot with a prop was checked by reading `game.ts` only (it skips drawing), not rendered. Decisions d1 and d2 read as sensible and match their recommendations (a real-room slot with a default should keep always showing something; letting a lone trinket be taken down again beats leaving it stuck); both stay open for Marc. PLAN.md table needs updating by the planner.
