---
id: 112
title: Real-world effects: what is feasible (research)
status: review
owner: marc + claude
depends_on: []
---

## Goal
Marc (2026-10-28): how far can we push real-world effects, like the flashcards progress? Ideas: browsing email, browsing pixelated versions of real photos, ordering Uber Eats. Find out what is feasible, safe and cheap, and write `docs/real-world.md`.

## What to do (research and a short doc; no building)
- For each idea, say how it could work in a static site plus the small Netlify function, what permission or login it needs, what privacy risk it has on a public site, whether it works on an iPhone, and a recommendation. Ideas: email (Gmail read-only), photos (a local folder or uploaded pictures pixelated on a canvas, never leaving the device; the Google Photos API limits), Uber Eats (probably only opening the app or site by link, no ordering API for consumers), and other candidates (calendar, weather, now playing, a smart-home lamp, reminders, GitHub or Strava activity).
- Rules: nothing personal stored in the repo; tokens stay on the device unless Marc agrees; the game stays playable with every feature off; an effect must be a quiet extra, not pressure.
- End with a ranked short list and the open questions for Marc, one at a time.

## Progress log
- 2026-10-28: Research done, `docs/real-world.md` written (summary table, per-idea assessment, risks, ranked list, first experiment, open questions). Status set to review.
- 2026-10-28: Added idea 5 (in-game browser) at Marc's request.
