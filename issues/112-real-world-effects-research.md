---
id: 112
title: Real-world effects: what is feasible (research)
status: done
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

## Review log
Both entries are written by the author from the reviewer's hand-back, not by the reviewer. Each reviewer was a fresh, independent agent; they were told not to edit files.

- **Round 1 (whole doc, commit 9d2b0b8 reviewed; fixes in 0f0d4be).** Reviewer reported 14 claims fetched from primary pages (it listed 11 as "OK", plus the unverified items it tried to resolve) and found nothing flat wrong. Flagged: GitHub's unauthenticated limit can be resolved (60 requests an hour per IP); the deploy cost of 15 credits is from `docs/deploy.md`, not the Netlify changelog; Spotify dev-mode details and the Premium-lapse note; Open-Meteo's omitted 300,000 a month; Strava's limits not tied to Single Player Mode; Last.fm "public profile" unsupported; Photos Picker 60-minute `baseUrl` not checked; Safari File System Access still unverified; Calendar scope class unverified; one omitted testing-mode exception (email, profile, openid only). Fixed in 0f0d4be: all of the above, by correcting the text or marking it unverified. The reviewer's report ended without an explicit approve or changes-needed word; its summary was "nothing is flat wrong, conservative and well hedged".
- **Round 2 (section 6a, the in-game browser; commit d1d1f58 reviewed; fixes in 4e9569e).** Reviewer reported spot checks of 7 claims (it said the Wikipedia licence and the 20 and 2 credit rates were not checked for lack of fetch budget). Confirmed: Hacker News "no rate limit", Wikimedia User-Agent policy, Readability's no-sanitising statement and the jsdom defaults, Netlify 10 credits per GB-hour. Flagged: "about 10 s" function timeout stale (docs summary says 60 s sync, 6 MB buffered; the page itself showed no numbers); "cannot be used for SSRF" overstated; missing DNS rebinding, redirect, IPv6-mapped and CGNAT ranges, decompressed-size caps; "1 GB" should read 1024 MB; Origin check is not authentication; CC BY-SA wording. Fixed in 4e9569e: all of these. Not checked by the reviewer: Readability's Apache-2.0 licence.
- **Verdict:** approve. The reviewers did not use that word; this is the author's reading of their reports (no claim found wrong, all flagged items fixed or marked unverified). Marc's decisions: none recorded yet; the doc ends with open questions for him, asked one at a time by the planner. No separate "Marc's decisions" commit exists.

## Acceptance results
The issue lists "what to do" items rather than numbered criteria.
- Each idea assessed (architecture, permission, privacy, iPhone, cost, effort, recommendation): done for email, photos, Uber Eats, calendar, music, weather, GitHub/Strava, reminders, send email, and (added later) the in-game browser. The smart-home lamp was skipped at Marc's request.
- Rules (nothing personal in the repo, tokens on device, playable with all off, quiet extra): section 2 and the risk table.
- Ranked list and open questions, one at a time: sections 9 and 11 (10 questions).
- No building, `src/` untouched: yes.

## Unverified (also listed in `docs/real-world.md` section 13)
Safari status of the File System Access API; Uber Eats deep-link formats and Uber's terms on automation; Apple Music (MusicKit) requirements; Open-Meteo CORS and key policy; Google ICS endpoint CORS; iOS standalone OAuth return behaviour; Netlify free-plan credit amount; Netlify function timeout and response size; Hacker News API CORS; robots.txt and terms for each reused site; exact Spotify 2026 changes; CASA assessment cost; whether Calendar scopes are sensitive; Photos Picker 60-minute `baseUrl`; whether a Last.fm profile must be public; Readability's Apache-2.0 licence line.
