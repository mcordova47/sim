---
id: 024
title: Personal touch interview
status: done
owner: marc + agent
depends_on: []
---

## Goal
Make the game feel like Marc's life, not a generic one. An agent interviews Marc about his day-to-day, one question at a time, and turns the answers into a design document, a richer task list and a brief for the character. This issue writes documents only, no game code, so it can run now, alongside the engine work.

## What Marc already told us (do not ask again, build on it)
- Software engineer, works from home.
- A singer-songwriter with a few things released. Mostly plays open mics. Writes music, posts on social media about it.
- Reads: pick from a few books, maybe with real excerpts shown as cutscenes.
- Listens to music: records or streaming.
- Sometimes makes animations for his music.
- Works on silly side projects (a fun meta touch: a task about making a game, perhaps this one).
- Works from different spots: couch, desk, bed.
- He may supply a picture of himself for the character.
- Wants abstract tasks too (contemplate existence and similar, with a submenu of topics), cutscenes (for example a guitar-playing snippet) and mini-games (key notes, mashing keys to type at work).

## Acceptance criteria
- The interview is short, friendly and skippable: one question at a time, easy to pass on, a few themes (a normal day, work, music, reading and listening, side projects, small habits and objects around the apartment, what makes him laugh, how silly or earnest the tone should be). Stop when Marc says to.
- `docs/about-marc.md`: what the agent learned, organised by theme, in Marc's own words where possible. Marc reads and edits it before it is committed. It stays in the repo only and is never pushed unless Marc decides to. No employer, no full name, no address, and nothing about other people unless Marc says so.
- `docs/tasks-v2.md`: a proposed task list built from it. For each task: a name and prompt (only characters the pixel font has), where it happens (the spot), what kind of activity it is (wait, cutscene or mini-game and which), what it changes in the apartment (dishes, the bed, energy, the clock), how long it takes, rough points, one line of flavor, and whether it needs new art. Cover the themes above, including working from the couch, the desk and the bed as different spots, and a "contemplate" menu with at least eight topics and a line of reply for each.
- Reading and listening content: a short list of books or texts and tracks Marc chooses. For excerpts use public-domain texts or very short quotes, and flag any copyright concern for Marc to decide. Never include song lyrics by others or long copyrighted passages. Track and album names alone are fine.
- A character brief for the player sprite: appearance, clothes, hair, glasses or not, how the character should feel, and notes for the four-direction art. If Marc gives a picture, it goes in `reference-photos/` (gitignored); only the drawn sprite and the text brief go in the repo. No photo content or likeness details beyond what Marc approves.
- Marc approves the documents before this issue closes.

## Notes
- Another agent's interview approach: ask, listen, reflect back in one line, then move on. Don't make Marc write essays. Offer examples when he is stuck.
- The task list will be reshaped by the engine work (state, activities, dialogs), so write tasks in plain language and let the content issue turn them into data later.

## Progress log

- 2026-10-22: Started. Plan: interview Marc one question at a time across the themes, then write docs/about-marc.md, docs/tasks-v2.md and the character brief for his approval. Documents only.
- 2026-10-23: Interview done (9 questions, themes covered: day, work, work spots, music, reading and listening, side projects, tone, character, boundaries). Habits and small objects left open at Marc's request. Drafted `docs/about-marc.md`, `docs/tasks-v2.md` and `docs/character-brief.md` in the worktree, **not committed**: Marc must read and edit about-marc.md first. Waiting on Marc's approval before committing and requesting review. Not checked: whether the tone is right and whether any task is wrong (his call).
- 2026-10-23: Marc read and approved all three docs ("looks great"). Set status: review. Files: docs/about-marc.md, docs/tasks-v2.md, docs/character-brief.md. Open items left in tasks-v2.md for later: song names, book/album picks, more habits. Not independently checked yet.

- 2026-10-23 REVIEW (independent): verdict **approve**. Documents only; branch diff is docs/about-marc.md, docs/tasks-v2.md, docs/character-brief.md and this file. No code, PLAN.md or other issues touched; nothing from reference-photos/ (gitignored) in the diff.
  - Interview short/skippable, one question at a time, stops when Marc says: can't verify (conversation not available); log records 9 questions, habits left open at Marc's request.
  - about-marc.md: pass. No employer (grepped for employer names), no full name, no city or address, no names of people in his life (kept generic). Named people are only authors and artists in book/album lists. Not pushed (branch has two local commits). Marc approval recorded in log; not verifiable by me.
  - tasks-v2.md: pass. Script parsed all 58 task rows, plus 10 contemplate topic/reply pairs, against the GLYPHS keys in src/render/font.ts (uppercased, plus space): 0 prompts, flavor lines, topics or replies use a character outside the font. Contemplate has 10 topics (needs 8), each with a reply. Spots cover table, couch, desk and bed as separate work tasks. Each row has spot, kind, changes, time, points, flavor and art.
  - Reading/listening copyright: pass. No lyrics, no long quotes (only short Marc quotes in about-marc.md). Public-domain claims look right (Prufrock, Williams 1923, pre-1930 cummings, Wyllie Metamorphosis, Garnett, Heart of Darkness, Study in Scarlet, Room of One's Own); Animal Farm, A Moveable Feast etc. are correctly marked paraphrase only. Albums by name only. The one real-text risk (a Joyce line) is flagged for Marc.
  - Character brief: pass. Appearance, outfits, feel, four-direction notes present; says nothing is from a photo; no photo committed.
  - Marc approval before closing: log says approved. Tone feels right to Marc: UNVERIFIED (his judgement).
  - Minor, non-blocking notes for the content issue: (1) Conventions say points are 20 to 100 but 8 tasks are 5 to 15. (2) "Watch something while eating" has no separate prompt (name only, 28 chars); the longest prompts are 26 to 27 chars (about 160 px at scale 1), so check they fit the HUD/dialog width. (3) Several spots do not exist in docs/floor-plan.md (closet or dresser, mail pile, hamper, floor, mat, bookshelf as a reading spot is the cube bookshelf, front door is decoration there, standing desk not plain desk); tasks-v2 defers this to 020, but the content issue must map them. (4) A few kinds are ambiguous ("wait or watch TV option", "mini or wait"). (5) Open items for Marc (song names, picks, habits) remain, as the issue allows.
  - PLAN.md row for 024 needs updating by the planner (todo -> done).
