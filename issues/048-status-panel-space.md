---
id: 048
title: Status panel space (and a phone battery?)
status: in-progress
owner: marc + claude
depends_on: []
---

## Goal
Energy and mood are on the screen, and more are likely (a phone battery was suggested). The status area is getting cluttered. Find a way to show more with less space. Needs thought, not just code.

## Acceptance criteria
- A short design note in `docs/hud-design.md` with three or four layouts for the current bars and the planned ones (energy, mood, clock, score, combo, maybe phone battery): for example icons with small meters instead of labels, bars that only appear when they change or are low, one bar cycled with a key, a pause menu that holds the detail. Mock each as ASCII or a rendered frame at the real 320x192 view. Marc picks.
- Decide whether a phone battery is a state variable (drains with doomscrolling, charges by a task) or only a gag, and what it would affect.
- Then build the pick as a small change: layout in `src/render/layout.ts`/`hud.ts`, no change to the state itself. `npm test` and `npm run build` pass. Marc looks at it.

## Progress log

### 2026-10-27, claude
Plan: design-note step only (`docs/hud-design.md`), no game code. Marc asked for 048 to be designed together with the portrait handheld shell of the mobile note (issue 049, read-only on the 049 branch): one HUD design that draws both over the 320x192 picture (desktop and landscape) and into a 320x56 strip in the shell body (portrait). The note lists what is shown and how often it matters, mocks three or four layouts at real pixel size, recommends one, decides the phone battery question, lists sprites and code, a staged build and open questions. Then an independent review. The build step (second acceptance bullet) waits on Marc's pick.
New answers from Marc (relayed 2026-10-27): he has an iPhone (Safari, notch, safe areas, no vibration); a small 1.0x to 1.33x portrait picture is fine to start; the shell's look "surprise me", so sketch both a warm grey and a dark body in the shell's stage 2.

Done (design step): wrote `docs/hud-design.md`: today's HUD and the free 32 px band above the world (the status panel overlaps the `uuu` painting, x 248 to 280, y 32 to 46, found by arithmetic from `MAIN_MAP` and `camera.ts`, not from a rendered frame), what is shown and how often, one model drawn into two containers (overlay ribbon, 320 x 56 strip), four layouts mocked at real pixel size from the game font (A icons always on, B ribbon with bars on change or low, C one cycled meter, D quiet HUD plus detail view), a recommendation (B, D later), the phone battery decision (real but gentle, later, own issue), sprites, code and a five-stage build plan, and eight open questions. Files: `docs/hud-design.md`, this issue. Mocks were generated with a script kept outside the repo; no game code touched, so `npm test` and `npm run build` were not rerun. Second acceptance bullet (build the pick) is not started: it waits on Marc's pick.
Not checked: how any layout feels on screen; icon sketches are 7 x 7 text sketches, not sprites.

### 2026-10-27, review (independent)
Scope: design note step only; the second acceptance bullet (build the pick) is deferred until Marc picks, so this approval is for the note, and the issue file stays open for that step if the planner wants it tracked (status set to done for the design step per the review skill).
Diff against main: only `docs/hud-design.md` and this file. No game code, no PLAN.md, no other issues.
Checked against the code (all pass): `VIEW` 320 x 192; `HUD_BOX` 152 x 38 at (0,0); `STATUS_BOX` 76 x 50 at (244,0); panels 144 x 30 at (4,4) and 68 x 42 at (248,4); 4320 + 2856 = 7176 px = 11.68%; mood bar y 43 to 46; combo bar 46 x 2, energy/mood bars 52 x 3; `MAIN_MAP` 19 x 10 (304 x 160), kitchen 13 x 10, bath 9 x 6; `clampX`/`clampY` centre sideways and bottom-align (world y 32, kitchen x 56, bath y 96); painting columns p 2-3, q 7-8, u 14-16 give x 40-72, 120-152, 232-280 at y 32 to 48 (sprites 32x16, 32x16, 48x16); status panel overlaps the `uuu` painting at x 248-280, y 32-46; left panel nicks p and q by 2 px; config numbers (ENERGY fall 4, low 25, sleep 60, tired 1.6; MOOD rest 50, drift 3, low 25; CLOCK 2 min/s, late 22 to 5; SCORING combo window 25, max 3; bonus 1.5; start energy 80, mood 60; tint keys); about 7.5 s per energy point, about 7 minutes from 80 to 25; users of the boxes (world-ui placeLabel, game.ts popup avoid, toasts at y 52, drawStopHint, plus tests); `H` is unused (only KeyL list key, Tab/KeyQ cycle); `icon-*` off-grid rule in art-style.md; the local task list phone tasks; mobile.md quotes (2.5.1 strip y 242 to 298, x 35 to 355, 2.5.2, 2.1 scale, phone gag in label strip) are quoted correctly.
Mock arithmetic (script, outside the repo): every pixel mock has exactly the stated size (54x29, 116x26, 80x11, 112x11, 80x11, 76x11, 106x11, 48x11, 76x11); glyphs match the 5x7 font; chip areas and percentages (7.5, 2.8, 3.3, 2.2) are right; strip bars 78 x 6, icons 14 x 14 at y 8 and 32 are right.
Nits (not blocking, for whoever builds):
- Strip mock (section 5.1) first row is 159 chars wide, the rest 160.
- "Ten 7 x 7 sprites" (section 7): the list has nine now plus `icon-phone` and `icon-plug` later, so 11 (9 for stages 1 and 2); the section 4 sheet draws 10 and no plug.
- Section 7 code list: the chips are called "76 x 14 and 84 x 14 including their margin" but the mocks are 76 and 80 wide; and the right chip grows to 112 wide while a bar is out, so the avoid box for popups and toasts must be the grown extent (about 116), not 84.
- The score width in the left chip fits about 5 digits at 1x before it meets the combo text; the note gives no max score assumption.
- The "today" mock uses `x` (wall under the panel) without a legend entry, and shades the whole 8 px row under the left panel although only 2 px is covered.
- The note does not mention the mobile note's free option of a phone gag in the shell's body LED or label strip (2.5.5 and 2.5.2), which is a cheap alternative to the gag B.
- The empty band is `ink` only when the tileset painter is active (otherwise `night`, game.ts line 634); harmless.
- Tint keys listed in section 2 are a subset (7.25, 19.5 and 21 omitted).
Can't verify: how any layout looks rendered in a browser or on an iPhone (mocks are text; icons are sketches, not sprites); readability at 1x on a phone; whether the golden frame test records the HUD (the note says "check"); `npm test` and `npm run build` were not rerun (no code changed).
Verdict: approve. Acceptance criterion 1 (three or four layouts mocked at real size, with the strip) pass; criterion 2 (phone battery decision with effect and cost) pass; criterion 3 (build the pick) not started by design, waits on Marc.
- 2026-10-27 (Marc's answers, asked one at a time): layout **B** is the pick (a one-row ribbon in the empty top 32 px; icons at rest, a bar only on change or when low, a key to peek), built in stages: always-on small bars first so he can see it, then the show-on-change rule, then the strip container for the portrait shell (issue 049). Taken at the note's recommendations unless he objects: the top 32 px band is the rule for the HUD (nothing covers the room); peek key H (a tap on the phone); detail view D later, as a page of the L screen. Still to ask: the phone battery, the time format (icon and no AM/PM), the portrait shell's empty band, the minute digit.
- 2026-10-27 (Marc, phone battery): kind of a gag, plus a task to charge the phone; leave open the idea of it affecting phone tasks later. So: a battery level shown with a phone icon (the HUD keeps a slot for it), a "charge your phone" task that fills it, and no effect on other tasks for now. Whether it drains (with doomscrolling or time) or only decorates is for the follow-up issue to decide with him; a hard effect on phone tasks stays an open later option.
- 2026-10-27 (Marc, clock): show `9:40` with a sun, dusk or moon icon and no AM/PM. Taken at the note's recommendations unless he objects: in the portrait shell the picture's empty top band stays as an ink stripe until he sees the shell on his iPhone (cropping the 320x192 view is a 049 decision); the minute digit is left as it is. All eight questions in docs/hud-design.md are now answered or defaulted; the build (stage 1, always-on small bars in the top band) can be written as its own issue.

- 2026-10-27, claude: docs-only text fixes to `docs/hud-design.md`: the reviewer's eight nits (strip mock row width, sprite count of 11 with 9 for stages 1 and 2, chip sizes and the grown 116 x 14 avoid box, 5-digit score assumption, mock legend and the shaded cell, the body-LED gag option, the band fill, all nine tint keys), section 8 rewritten to the decided gag plus charge-task design, section 10 shows Marc's answers. No re-review needed for these text fixes (no code, no new claims about the code). Not merged.
