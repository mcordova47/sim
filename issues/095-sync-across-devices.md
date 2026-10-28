---
id: 095
title: Sync the game's progress across devices (design first)
status: todo
owner: marc + claude
depends_on: []
---

## Goal
Marc (2026-10-27): asked whether there is an issue for syncing across devices. There was none; the closest was a line in `docs/mobile.md` (section 12, question 10) that took "your save lives in this browser, with an export and import code only if a save is ever lost" as the default. Marc now wants to look at real cross-device sync (for example the phone and the laptop). **This issue is a design note first; nothing is built until Marc has read it.**

## Background
- The save is in the browser: `life.progress.v1` (apartment state, decor, deliveries, achievements and stats, encounters), `life.sound.v1` (settings, dialog voice, ad blocker), `life.tracks.v1` (made tracks), `life.flashcards.v1` (the sync key, the cap window, the guest mode) and the guest's cards (`life.flashcards.guest.es.v1`). An installed iPhone home-screen app has storage separate from Safari, so each starts empty. Safari can clear the storage of a site not visited for about seven days.
- The site is a static bundle on Netlify (auto-deploys from `mcordova47/sim`). The flashcards app already has a key-based progress endpoint and a pairing link or QR (`?pair=<key>`), which is a good model for the user experience: no accounts, a door key, not a password.
- The repo is public: no secret may be committed, and anything the game stores for players must be safe to expose.

## What the design note (`docs/sync.md`) must cover
1. **What syncs.** Each store above, and what does not (device-only things such as the touch layer, mute, the flashcards cap window, anything per-browser). The flashcards progress already syncs through its own key; say how the game's sync relates to it (one key for both, or separate) and the guest's local cards.
2. **Options, with costs and a recommendation:** (a) manual: export and import a save code or file (no server); (b) a small server in this repo: a Netlify Function with Netlify Blobs (or similar) storing one blob per random key, pairing by link or QR like the flashcards app; (c) reusing the flashcards app's progress endpoint for the game blob (needs changes in Marc's other repo, so surface them, do not make them); (d) browser-native sync (none that works across Safari and desktop reliably). Say what each needs, limits and free-tier costs, abuse risks (nothing limits the number of keys), and what can go wrong.
3. **Conflicts.** Two devices played since the last sync: a merge rule per kind of data (owned items and achievements and visited rooms as unions; counters and stats as the larger; the apartment state, clock and position as the newer or per field; decor placement; deliveries queue; made tracks by id), the order of operations on load, and what the player sees. Compare "newest save wins with a warning" (simple) with a field-wise merge (safer but more code); give a recommendation in the spirit of issue 089's "keep it small".
4. **The experience.** Pairing (a link, a code, a QR scan, as the flashcards app does), where the control lives (the pause screen), what is shown while syncing (nothing that adds pressure), failure and offline behaviour (the game must always work offline; sync is best effort), when it syncs (on load, on leaving or hiding the page, every few minutes).
5. **Privacy and safety.** What is stored on the server (an opaque blob), who can read it (anyone with the key), no personal data in the save, deletion, rate limits, size caps (the flashcards blob cap is 500 KB), and what the production build must not expose.
6. A staged build plan (smallest first, for example export and import first, then the server), a test plan, and the open questions for Marc with recommendations, ordered most important first so they can be asked one at a time.

## Acceptance criteria
- `docs/sync.md` exists and covers the six points with a recommended option and the questions for Marc; no code changes. Needs from Marc's flashcards app, if any, are listed as 'Needed from the app', not made.
- Independent review of the note (a fresh agent), as for any design note.

## Progress log
