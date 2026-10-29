---
id: 106b
title: Track editor on phones 2: taps that edit
status: review
owner: claude
depends_on: [106a]
---

## Goal
Stage 2: `tapTargets` on the activity: cells, gutter pitch, tabs, pages, tempo, LENGTH, PLAY, SAVE; the playhead follows the page.

Design and Marc's answers (2026-10-28): `docs/track-editor-phones-design.md` (6 pitch rows of 20 game px; top-level buttons Play, Save, Length, More; tap clears a note; share sheet with Copy fallback; paste tries the clipboard then a hidden text box). Touch targets follow 093 (at least 44 CSS px where possible); desktop behaviour and golden frames unchanged.

## Acceptance criteria
- The tap tests in section 4 pass; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log


- 2026-10-29 (claude): Plan: `tapTargets` on `MakeTrackActivity` reading the 106a layout (cells, gutter pitch, tabs, pages, tempo, LENGTH, PLAY, SAVE), the page following the playhead, tests in the style of flashcards-touch.
- 2026-10-29 (claude): Built. Files: `src/game/activities/make-track.ts` (tapTargets, viewPage/pageChosenAt, shownPage, choosePage, scrollPitches; pad keys hand the page back to the cursor), `src/render/track-editor-touch.ts` (layout gains `pitchUp`/`pitchDown`, drawn as UP/DN in pitched channels), `src/game/config.ts` (`pageHoldSeconds: 3`), `src/game/activities/make-track-taps.test.ts` (new, run at 224 x 208 and 320 x 192: cell place/clear/replace/blip, later page, same-as-E, gutter, tabs, pitch scroll reaches every pitch in melody and bass, pages, tempo clamp, LENGTH, PLAY, SAVE pays once, draft kept, page hold and follow, ignored while naming, and a touch-only make/play/save run), `docs/make-tracks.md` section 15. `tsc`, `npm test` (3143 pass; goldens unchanged) and `npm run build` pass.
- Design addition (not in the note): UP/DN pitch-window buttons in the page strip. The note had no way to reach pitches outside the first window (C4 to F4 for melody) except the pad. They fit the strip without touching the 106a layout tests.
- Left for 106c: the name button, MORE and the landscape UNDO are drawn but only flash "Not on the phone yet."; no Undo state exists yet.
- **Decision on make-track on phones: keep it reachable.** Nothing gates it today, and with 106b a touch-only run can make a track (cells, tabs, pages, pitch scroll), play it, save it (auto name "Untitled N", reward works) and leave with B; the test "makes, plays and saves a track with taps, the pad and A/B only" proves it with no other key. What a phone cannot do yet: rename (106c), delete, copy/paste/share (106c/106d), cut to 16 steps (More menu, 106c); a 32-step track cannot be made on a phone before 106c, and a pasted or saved 32-step track still edits fine. So no hold-back is needed; if Marc prefers the task hidden on touch until 106c lands, it is a one-line gate in tasks, not done here.
- Not verified: how 33 CSS px rows and the UP/DN buttons feel under a real thumb, iOS audio on PLAY, and the 3 s page hold feel. Needs Marc's phone.
