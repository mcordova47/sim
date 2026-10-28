---
id: 103
title: Sync stage 2: the Netlify Function with Blobs and the pairing link
status: todo
owner: claude
depends_on: [102]
---

## Goal
Build stage 2 of `docs/sync.md` (sections 3, 8, 9, 10 and 12): a small server in this repo and the pairing link, using `mergeSaves` from issue 102. Marc (2026-10-28): the small server with a pairing link is his pick; keep it small; he reviews it working. The agent never deploys; the site auto-deploys on a push to `main`, so work on a branch and check with `netlify dev` instructions for Marc.

## What to build
- `netlify/functions/sync` (one path `/api/sync`), Netlify Blobs storage with server-minted 32-character `a-z0-9` keys, the key in an `X-Sync-Key` header, a 128 KB blob cap, a 1000-key cap, a rate limit if the plan allows it (else document that pairing may be refused while existing pairs keep working), 7-day expiry for unplayed or empty saves and 90-day expiry for unseen keys (mark the Blobs list and metadata cost as unverified), CORS and caching headers, no logging of the key, and **no secrets, env vars or Netlify settings**.
- The client: mint, pair (a `#sync=<key>` link and a pasted key; the QR drawing is an optional later extra), fetch, merge with `mergeSaves`, PUT; best effort and offline-safe (the game always works with no network); a Vite dev plugin that runs the real handler as a dev fake, plus `netlify dev` for integration.
- The key is separate from the flashcards key. A guest's cards and the flashcards key stay device-only.
- Tests: the handler against a fake Blobs store (caps, expiry, bad input, size, rate limit path), the client with a fake server, a two-device scenario.

## Acceptance criteria
- Two browsers pair and converge; the production build has no dev fake; `npm run check:dist` passes; `npm test`, `npx tsc --noEmit`, `npm run build` pass; the instructions for Marc to check the Netlify side (the plan limits, a function log) are in the log; unverified items listed.

## Progress log
