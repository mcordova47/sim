---
id: 024
title: Personal touch interview
status: todo
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
