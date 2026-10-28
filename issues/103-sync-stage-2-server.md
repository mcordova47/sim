---
id: 103
title: Sync stage 2: the Netlify Function with Blobs and the pairing link
status: done
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

- 2026-10-28 (agent): Built stage 2 on branch `issue/103-sync-stage-2`. Nothing pushed, deployed or logged in.

  **Netlify docs checked today (docs.netlify.com):** `@netlify/blobs` 11.1.7 (needs Node 22.12 or later; the toml pins 22); `getStore({ name, consistency })`; `getWithMetadata`, `getMetadata`, `set(key, value, { metadata, onlyIfNew, onlyIfMatch })`, `delete`, `list()` (keys and etags only; pages of 1000, all fetched by default); metadata max 2 KB, key max 600 bytes, store name max 64 bytes; no built-in expiry (so the sweep is ours); site and function credentials are injected at runtime; `netlify dev` uses a local sandbox store; default consistency is eventual, so the function asks for `strong`. Functions: `export default (req, context)` and `config.path`; `rateLimit: { windowLimit, windowSize (max 180), aggregateBy: ["ip","domain"] }` lives in the function config (not in toml), all plans allow code rules (2 per project on free), enforcement can lag up to 10 seconds, and rules are validated at deploy (an invalid one shows in the deploy log but does not fail the deploy). Functions bill by GB-hours on credit plans (10 credits per GB-hour).

  **What was built.** `netlify/functions/sync.mjs` (thin: store by `context.deploy.context`, rate limit), `netlify/lib/sync-handler.mjs` (the whole API: POST mint, GET, PUT, DELETE, header `X-Sync-Key`, 128 KB cap counted in bytes with Content-Length and a streamed count, shape check, 1000 keys, 7 and 90 day expiry, lazy sweep, no logging, no CORS headers because the game calls its own origin), `netlify/lib/memory-store.mjs` (shared by the dev fake and the tests), `vite.config.ts` (dev and preview fake using the same handler; `apply: serve` only), `src/game/sync/client.ts` (`SyncBackend`, `HttpBackend` with an 8 second abort, `keyFromText`, `linkFor`), `service.ts` (`SyncService`: turn on, sync now, pair, stop; statuses), `local.ts` (the key is kept in `life.sync.v1`, never in a save), `fake-server.ts` (test server: real handler plus scripted failures), the sync page in `achievements/draw.ts` and `feature.ts` (pause screen SYNC button on touch, P on the desktop; TURN ON SYNC, COPY LINK, SYNC NOW, PASTE KEY OR LINK, STOP SYNCING with a yes/no), `#sync=` handling in `src/main.ts` (key removed from the address bar at once, then a "SYNC WITH THE SAVE IN THIS LINK?" question), `check-dist` (fails on the dev fake marker, server code, or a literal `#sync=` plus 32 characters), `netlify.toml` (`[functions]` folder only), `docs/deploy.md`, `@netlify/blobs` dependency.

  **Keep-it-small choices (taken, not asked):**
  - No automatic sync (stage 3): only SYNC NOW, TURN ON SYNC and pairing sync. No QR.
  - Link origin is the page's own origin (works on dev, previews and production), not a hard-coded host.
  - No CORS headers at all (same origin). `OPTIONS` is 405.
  - Rate limit 60 per minute per IP across all methods of the path (one rule; free plans get 2). Pairing needs only a few calls, so this is generous for players and slows scripts. Not a lock-out guarantee. Because it is per path, a player on a shared IP (a school) shares the budget.
  - The sweep runs at mint time only when more than 100 keys exist (and an expired key is also deleted when it is next used), so a small store never pays for a sweep. Its cost at 1000 keys (1000 metadata reads plus the list) is unverified; it only happens on a mint.
  - "Last seen" is refreshed by a read at most once a day, with an etag guard so it cannot overwrite a newer save (a failed refresh is ignored).
  - A pairing link asks first, but pasting a key on the sync page pairs at once (the player chose to).
  - Pairing with a key first reads it; a wrong key changes nothing and the old key is kept. A minted key is stored before the first sync, so a failed first sync does not mint a second one.
  - Stop syncing offline keeps the key (so it can be retried) rather than leaving an orphan blob; the 90 day expiry cleans up anyway.
  - The merged document is applied through the 102 code (`applyIncoming`) when nothing is running, and held (`holdMerge`) when a task or dialog is, then applied when the pause screen opens or at the next load.
  - The blob is not checked deeper than its shape on the server; the client reads it through the tolerant parsers.

  **Limits chosen and why:** 128 KB body (a real save is a few KB, 36 tracks at 2 KB is about 72 KB), 36 tracks, 1000 keys, 7 and 90 day expiry, 60 requests a minute per IP, 8 second client timeout, a key is 32 characters of a-z0-9 (about 2^165) drawn by rejection sampling from the platform's random source.

  **Verification.** `npm test` 125 files, 2810 tests pass; `npx tsc --noEmit` clean; `npm run build` and `npm run check:dist` pass, and the built bundle holds no `life-dev-sync-fake`, no server code, one mention of `/api/sync` (the client). New tests: `server.test.ts` (the handler against an in-memory store: key regex and anchoring, minting and bias, shape and bad input, invalid UTF-8, the byte cap with a multi-byte body just over it, a lying Content-Length, PUT to an unminted key, the key cap, the sweep, expiry, last-seen once a day and not clobbering a concurrent PUT, no console output even when the store throws), `pairing.test.ts` (the client against the fake server: a two-device pair and converge, tracks both ways, key only in `life.sync.v1`, offline, full, key not found, garbage and newer-format blobs not overwritten, a refused PUT, one call at a time, stop, a merge held while a task runs, the page keys and tap targets, the link question, `HttpBackend` over a stubbed fetch with timeout and status mapping), `sync-draw.test.ts`, and `deploy.test.mjs` additions. I also ran `vite` on a spare port and used curl against the dev fake: mint, GET, PUT, GET, DELETE all answered as expected with `no-store`. I imported `netlify/functions/sync.mjs` in node: it loads and exports `config.path`; calling it outside Netlify throws `MissingBlobsEnvironmentError`, as expected.

  **Not checked (unverified):** the real function on Netlify (I did not run `netlify dev`, which needs login); that `context.deploy.context` is the string `production` on production deploys (the docs list `context.deploy.context` but I did not see the values; if it is different, the production site uses the `sync-preview` store, which still works, just under the other name); that `rateLimit` is accepted on Marc's plan (the docs say all plans; an invalid rule only shows in the deploy log); the cost of `list` and the sweep at 1000 keys; whether the platform logs request headers (so whether `X-Sync-Key` shows in Netlify's logs); how many credits the traffic takes (the docs give GB-hours only); how the feel is on a phone (clipboard, tap targets); the pause screen at its full touch layout (six buttons still make three rows, checked by test, not by eye).

  **For Marc to check (`netlify dev`, two browsers).**
  1. In the worktree: `npm install`, then `netlify dev` (it may ask you to log in or link the site; that is your step). Open the printed address (usually http://localhost:8888) in a normal window (device A).
  2. Press L, then P (or the SYNC button on touch). It reads SYNC: OFF. Press N (TURN ON SYNC). It should say SYNC IS ON and show `KEY: XXXX...XXXX`. Do a task first if you want something to see.
  3. Press C (COPY LINK). Open a private window or another browser (device B) at the same address, paste the link in the address bar. The pause screen opens on the sync page asking "SYNC WITH THE SAVE IN THIS LINK?". The address bar no longer holds the key. Press Y. B now has A's tasks and achievements (and tracks).
  4. Play a task on B, press L, P, S (SYNC NOW). On A, press L, P, S. A has B's task counts. Both show SYNC: ON.
  5. Offline: stop `netlify dev` and press S: NO CONNECTION; the game still plays. Start it again and S works. (Restarting `netlify dev` may clear the local sandbox store: then S says KEY NOT FOUND, which is correct.)
  6. Press X then Y (STOP SYNCING): SYNC STOPPED, the key is gone.
  7. Netlify side after a deploy (not before): Site, Logs and metrics, Functions, `sync`: calls appear and no key or save text is printed. Site, Blobs: stores `sync` (production) and `sync-preview` hold one entry per key. In the deploy log, confirm the rate limit rule was accepted. Under Usage and billing, check the credits after a few days. Nothing needs changing in Netlify settings.
  8. Without Netlify: `npm run dev` also works (an in-memory fake that resets when you stop it).

  **Leftover:** stage 3 (automatic sync, QR, status on load) is issue 104. `docs/sync.md` was not edited (it is the design); where this build differs: the sync page is reached by P on the desktop, the origin in the link is the page's own, and there is no CORS header at all.

- 2026-10-28 (reviewer, independent): **Verdict: approve.** Status set to done. PLAN.md table needs updating by the planner.

  **Commands (run by me):** `npm test` 125 files, 2810 passed, 1 skipped; `npx tsc --noEmit` clean; `npm run build` ok; `npm run check:dist` "dist/ looks ready to deploy". I grepped `dist/` myself: no `life-dev-sync-fake`, `unplayedMs`, `sweepAbove`, `@netlify/blobs`, memoryStore or `x-sync-key`; one `/api/sync` (the client); `#sync=` only as the bare marker. The diff touches nothing in `art/src`, `public/sprites` or the typing activity, and has no secrets, env vars, emails, local paths or Netlify settings changes (`netlify.toml` gains only `[functions] directory`; `process.env` appears only in a test asserting its absence). `package-lock.json` gains about 35 transitive packages from `@netlify/blobs` (all registry.npmjs.org).

  **My own checks (scratchpad, not in the repo).**
  - Handler against my own store (quoted etags, list with etag and directories, random latency): bad keys all 400 and never echoed; unminted GET and PUT 404 and no key created; a multi-byte body just over 128 KB is 413, exactly 128 KB accepted, cap+1 413, a streamed body with no Content-Length over the cap 413; 17 shape cases (arrays, null, wrong app, format 2, unknown field, `__proto__`, 37 tracks, bad types, empty, bad JSON, invalid UTF-8) all 400; 405 for OPTIONS and PATCH; `no-store` on every answer; the key never appears in a response; console silent, including when the store throws (500, no detail). Sweep with a fake clock: unplayed key 404 at 7 days even if read at 6.9 days, empty save (activeAt 0) at 7 days, played key alive at 89 days and gone after 91 unseen; more than 100 keys makes a mint sweep 150 expired keys; 1000 live keys gives 503; 1000 expired keys then mint works; last-seen refresh only after a day, with `onlyIfMatch`; DELETE then GET 404.
  - Store calls match `@netlify/blobs` 11.1.7 types and the current Netlify Blobs docs (`getWithMetadata` type text, `getMetadata`, `set` with metadata and `onlyIfNew` or `onlyIfMatch` returning `modified`, `delete`, `list()` returning `{blobs,directories}`).
  - Client over `HttpBackend` with a stubbed fetch to my handler: offline, hang (aborts at the timeout, also when the body read hangs), an HTML 200 answer, 429 and 500 all give NO CONNECTION with no throw and game state untouched; double clicks give ONE MOMENT; two devices syncing at the same time then again converge; an upper case pasted link works; the key is only in `life.sync.v1` (every storage entry checked), not in the document, code or save file; `reset()` keeps the key; every request goes to `/api/sync`; newer-format, garbage and `[]` blobs are left untouched on the server. A blob with a bad inner field is read tolerantly and overwritten by the merged save, which is fine.
  - Dev fake: ran `vite` on a spare port; curl showed POST mint (32 chars), GET `{}` with `no-store`, 405, 400. Stopped afterwards.
  - `src/main.ts` `#sync=` flow read, not run in a browser: the hash is removed with `replaceState` before the question, even for an invalid key.

  **Criteria:** two browsers pair and converge: pass (fake server and my HTTP-level two-device test; not two real browsers on Netlify); production build has no dev fake: pass; `check:dist`: pass; test, tsc, build: pass; Marc's instructions in the log: pass (steps 1 to 8); unverified list: pass.

  **Non-blocking observations (no change needed to merge):**
  - A PUT racing a DELETE can recreate the key (my parallel PUT, DELETE, PUT left it present); the 90 day expiry cleans it up.
  - Concurrent mints near 1000 keys have no atomic count and could overshoot by a few.
  - A 429 from the rate limit shows as SYNC: NO CONNECTION.
  - `rateLimit` omits the documented `action` field; the docs list it among the properties and do not say it is optional. Marc's step 7 (the deploy log) covers it.
  - Every mint does one `list()`.
  - Pairing with a new key while already paired replaces the old key without asking.

  **Unverified (author's and mine):** the real function on Netlify or under `netlify dev` (not run); that `context.deploy.context` equals `"production"` (the docs page defines the property but lists no values; the fallback is the `sync-preview` store); that `rateLimit` is accepted on Marc's plan and that omitting `action` is fine (the docs page states no plan limits); Blobs `list` and `getMetadata` cost at 1000 keys; whether the platform logs request headers (`X-Sync-Key`); credit cost; feel on a phone and the full touch layout by eye; the `#sync=` flow in a real browser (clipboard, address bar removal).
