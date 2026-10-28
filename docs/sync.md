# Syncing the game's progress across devices (design note, issue 095)

Status: design only, nothing is built. Marc (2026-10-27) likes **the small server with a pairing link** and asked the designer to decide what it can, and (rule for this work) to **keep it small**. Every decision is marked **decided (reason)**. Section 16 lists what needs Marc: one non-blocking question.

Facts about the flashcards app were read from Marc's repo (`netlify/functions/progress.mjs`, `netlify.toml`, `README.md`, `SYNC.md`). Nothing there was changed. Facts about this repo were read from `achievements/progress.ts` and `feature.ts`, `sound/settings.ts`, `music/demo-store.ts`, `flashcards/key.ts` and `guest.ts`, `decor.ts`, `deliveries.ts`, `encounters.ts` and `config.ts`.

## 1. The recommendation in one paragraph
Three stages, each useful alone. **Stage 1: export and import** (a text code and a file, no server, with a small pure `mergeSaves`). **Stage 2: a Netlify Function with Netlify Blobs in this repo**, one opaque JSON blob per random key, paired by a `#sync=<key>` link. **Stage 3: automatic sync** (on load, when the page is hidden, every few minutes) and one control on the pause screen. All three use the same `mergeSaves`. The merge is deliberately plain: the apartment is taken whole from the side that was played most recently; owned things, achievements, stats and made tracks are only ever added to. Preferences, reset and the flashcards stay per device.

## 2. What syncs (decided: keep it small)
| Store | What | Synced? |
|---|---|---|
| `life.progress.v1` | unlocked achievements, stats, world (vars incl. the clock, room, position), decor, deliveries, encounters | **Yes**: the **progress group** |
| `life.tracks.v1` | the made tracks (their `.track` text and `made` time) | **Yes**: the **track list** only |
| `life.tracks.v1` | the draft, the next id, the save-reward cooldown | No (device-local) |
| `life.sound.v1` | muted, the record on the player, the payout wait, dialog voice, ad blocker | **No**: preferences stay on the device (decided: a phone and a laptop may reasonably differ, and it removes a whole set of merge rules) |
| `life.flashcards.v1` | the flashcards key, the cap window, the guest mode | No |
| `life.flashcards.guest.es.v1` | the guest's cards | No (issue 083: a guest's progress is never merged anywhere) |
| the touch layer, the 60 fps cap, left-hand layout | | No |
| `life.sync.v1` (new) | this device's sync key, a random device id, last sync time, the held merge (section 4.3) | local only, never in the blob |

The synced **document** is `{ app: "life", format: 1, device, activeAt, progress, tracks }`: `progress` is the progress group exactly as `ProgressStore` saves it, `tracks` is a list of `{ text, made }`. **Where the new fields live:** `activeAt` is stored in `life.progress.v1` as one more optional field (the loader gets one more tolerant read, like `decor` and `deliveries`), so it survives reloads with the group it describes; `device` and everything else new live in `life.sync.v1`. A document's `device` is the id of the device that wrote its `activeAt` (after a merge, the winner's).

## 3. Options (cost, limits, what can go wrong)
**(a) Manual export and import.** No server, no cost. The player copies a code or saves a file on one device and pastes or opens it on the other. Only as fresh as the player's effort. Good as the safety net for a lost save (Safari clears storage after about seven days away, `docs/mobile.md` section 5; an installed iPhone home-screen app starts empty).

**(b) A small server in this repo (recommended for stage 2).** A Netlify Function (`netlify/functions/sync.mjs`) with Netlify Blobs: no new service, the same origin as the game (no CORS), no secret. Cost: about 150 lines, the pairing UI, and a plan question (section 8). Can go wrong: quota use and abuse (bounded in section 8), the function being down (the game does not care).

**(c) Reuse the flashcards app's progress endpoint.** It would work today with no change to the app: its namespace pattern `^[a-z][a-z0-9-]{1,15}$` accepts `life`, its CORS accepts `https://*.mcord.dev` (so `sim.mcord.dev` but not `*.netlify.app` previews or other localhost ports), blobs are any JSON up to 500 KB. Not chosen: it couples the game to another deployment, I could not add caps or checks there (and may not touch that repo), it would share one credential between the Spanish deck and the game, and a guest has no key. The fallback if Marc does not want a server here. **Needed from the app: nothing.**

**(d) Browser-native sync.** None works across Safari on iPhone and a desktop browser for one site's `localStorage`. Out.

**decided (Marc's steer; only (b) is automatic, private enough and self-contained):** (a) first, then (b), then automation.

## 4. Conflicts and the merge (decided: simple)
`mergeSaves(a, b)` is a pure function of two documents, run on documents **already normalised by the existing tolerant loaders** (so `parseDecor`, `Stats.load` and the rest have filled and clamped everything before the merge sees it). Rules:

| Data | Rule |
|---|---|
| `unlocked` (achievements) | union |
| `stats.taskCounts` | per task, the larger |
| other `stats` numbers (`totalPoints`, bests, `steps`, `bumps`, `cancelled`, `minAwards`, `playSeconds`) | the larger of each (two devices' play time is not added: shared past cannot be told from new) |
| `stats.rooms` | union |
| `decor.owned` | union |
| the **world group**: `world` (vars, room, position, facing), `decor.placed`, `deliveries`, `encounters` | **taken whole from the winner**, then two repairs: a placed slot whose item is not in the unioned `owned` is dropped, and any item in the unioned `owned` is removed from the winner's `pending` and `waiting` deliveries |
| `tracks` | union by content (4.2) |
| `activeAt`, `device` | the winner's |

**The winner** is the side with the larger `(activeAt, device)` pair (the random device id breaks ties; a total order). **`activeAt` is the wall-clock time of the last real player action: a finished task or a decor change (not a step, so wandering around a fresh install does not make it the winner).** Loading, applying a merge, a timer save and a first run never set it; a save never played has `activeAt = 0` and always loses, so a brand-new phone or the installed iPhone app cannot beat the laptop. **A legacy save** (progress but no `activeAt`, which is every save made before this ships) counts as 0 until its first finished task or decor change after the update; if both sides are 0 the device id decides, which is accepted (both are unplayed since the update, and owned things are kept either way). **It is clamped to now plus one day whenever it is read** (so `mergeSaves` takes `now` as an argument and tests fix it; a far-future input stays different from its clamp, so such a document is simply re-PUT, which is harmless), so a far-future clock cannot win forever (an honest wrong clock within a day only decides which apartment is kept, never loses a union or a maximum). Reset sets `activeAt` to now (section 7).

**Deliveries (decided: no rebase).** Taking the winner's deliveries whole and removing owned items is enough. A package that was only pending or waiting on the losing side is lost, but its milestone is not in the winner's `fired`, so it fires again when the winner reaches it, and a milestone whose item is already owned gives nothing (docs/random-encounters.md section 3: only new things arrive). Nothing is delivered twice. There is no queue-cap special case: `maxQueued` (20) is unreachable with the 13 milestones in the table, and if the table ever grows past it the loader's existing cut applies as it does today.

### 4.2 Made tracks (decided: union by content, no tombstones, no revisions)
- Identity is the track's **body**: its `.track` text **without the title line**, so a rename on arrival cannot make a track look new (no ping-pong). Equal body on both sides is one track (the first one seen keeps its title); the document keeps the earlier `made`, and the local `made` is not rewritten (a difference in `made` alone does not count as a change, so it causes no extra PUT).
- The ids (`demo-N`) are **local to a device and never synced**. The record player (`settings.track`) and the draft (`draft.id`) only ever refer to local ids, so nothing needs rewriting when a track arrives.
- **New `DemoStore.add(text, made)`** (the only change to the store; there is no replace loader). It **validates like `save`** because the blob is untrusted: `parseTrack`, the 2048 byte limit, `nameProblem`, and the 64 KB write limit; an invalid track is skipped. if the text is already stored it does nothing; otherwise, if there is room (fewer than `maxTracks`, 12), it stores the track under the next free local id (`nextId`, never a used id) with the incoming title, or, if that title is taken (the store's `nameTaken` check, case-insensitive, including the reserved names), the title plus a new small suffix (" 2", " 3", ... cut to fit the 24-letter limit; this suffix rule is new, only `untitledName` exists today), and bumps `version` so the record player notices. Over the cap the extra is **not added** (a stated limit: nothing on the device is lost or replaced; the track stays in the blob and a later sync adds it once a local track is deleted).
- A **deleted track may come back** after a sync (accepted). An **edited** track also arrives as a second copy beside the old version (accepted; no data is lost). To keep the blob bounded it holds at most 36 tracks (the newest `made` stay, ties broken by body text so the trim is deterministic).
- Because ids are not synced, the merge of the tracks is a plain set union by text: commutative, associative, idempotent.

### 4.3 Order of operations and applying (decided)
1. Load local storage as today; the game starts at once, never waiting for the network.
2. In the background fetch the blob, then `merged = mergeSaves(local, remote)` over the live state serialised through the objects' `toJSON`.
3. If `merged` differs from remote, PUT it (the blob is only ever a courier).
4. **A merge is held, not applied live.** The result is kept in `life.sync.v1` as `held`. It is applied **at the next load, when the pause screen opens, or immediately if no real player action has happened yet this session and the same guard as opening the pause screen holds (no task, dialog or locked input is open)** (so the usual first-step case, open the laptop and the sync arrives before you move, brings the other device's apartment in before anything can be played over it). The normal progress save keeps writing the live state to `life.progress.v1` and never touches `held`, so a timer save cannot overwrite an unapplied merge. If the player has already acted when the result arrives, the held merge waits for the pause screen or the next load, and is merged again with the live state first (idempotent, so what was played meanwhile counts).
5. **What applying means.** The progress group goes through the existing replace-style loaders in the order `Stats.load`, `Unlocks.load`, `restoreWorld`, `Decor.load`, `Deliveries.load` (it filters by what decor owns, so decor first), `Encounters.load`, at a moment nothing is running. Their `onChange` hooks call `save()`, so apply sets the feature's existing `resetting` guard, loads everything, then does one save. **Made tracks apply through `DemoStore.add`, which is safe at any time, so no reload method is needed.** Preferences do not sync, so `SoundFeature` (which reads its settings once, in its constructor) is not touched. **Before a merge replaces the local progress group** (the winner was the remote side and the result differs), the old local group is written to `life.sync.backup.v1` (one step back, overwritten next time). The sync page has RESTORE BEFORE LAST SYNC, which loads it again **and sets `activeAt` to now**, so the next sync does not simply replace it. The backup is a way back from a bad apartment, not from lost unions or maxima; it cannot undo an overwritten blob's additions.
6. **What the player sees:** nothing while it syncs and no message about what changed (there is no "picked up where you left off" claim). Accepted consequences, stated so nobody is surprised: the apartment, the clock and the player's position can jump to the other device's at load or on opening the pause screen (the clock may go back or forward); an apartment played later on the stale device wins on the next sync (the rule is the most recent real play). Owned things, achievements, stats and tracks are never removed by a merge.

## 5. The experience (decided)
- **Where.** The pause screen (the achievements list screen, key L or the touch menu button) gets a SYNC button next to the existing ones. The sync page has: TURN ON SYNC (when off), PAIR ANOTHER DEVICE (the link and COPY LINK), SYNC NOW, COPY SAVE CODE, PASTE SAVE CODE, SAVE FILE, OPEN FILE, RESTORE BEFORE LAST SYNC, STOP SYNCING. Everything is a button on the touch layout and a key on the keyboard, as issue 093's pause screen does it (the drawn list is the tap list).
- **Pairing, device A.** TURN ON SYNC asks the server to mint a key (POST), stores it in `life.sync.v1`, and shows `https://sim.mcord.dev/#sync=<key>`. A QR drawing of the same link is a stage 3 extra (the flashcards app draws a small SVG QR); reading a QR inside the game is **not planned** (the phone's camera app scans it and opens Safari).
- **Pairing, device B.** On load the game reads `#sync=`, removes it from the address bar at once (`history.replaceState`; the browser's own history on that device may still hold the link, readable only by that device's owner, and a leaked key is fixed by rotating it, section 8), asks "SYNC WITH THIS SAVE?" and first syncs with a **merge**, so a device with its own progress loses nothing. A bare key or the whole link can be pasted on the sync page (touch text entry is issue 093's hidden input). An installed iPhone home-screen app does not open with the link, so it pairs by paste (say so on the page in one line).
- **While syncing:** a quiet line, `SYNC: ON`, `SYNC: OFF`, `SYNC: NO CONNECTION`. Nothing animated, no counter, no pressure.
- **When (stage 3):** on load (background); when the page is hidden (`visibilitychange`, with `fetch` `keepalive`, whose body limit is 64 KB: a save larger than that skips the hide-sync and waits for the next trigger, it is best effort); every 5 minutes while visible, the pause screen closed and something changed since the last sync; and SYNC NOW.
- **Failure and offline (decided: the game always works offline).** Every call is wrapped with an 8 second timeout; failure sets `NO CONNECTION` and the next trigger tries again. A 404 or refused key sets `KEY NOT FOUND` and stops auto-sync until the player acts. A blob that does not parse, or has a newer `format` than this build, is **not overwritten** (the flashcards app's rule) and the line says `UPDATE THE GAME`. Local storage is the truth; blocked storage means nothing to sync, and the page says so.

## 6. Export and import (stage 1, decided)
- **Format.** The document of section 2, as JSON, deflated and base64url-encoded with the prefix `LIFE1.` (`CompressionStream` where present; otherwise plain base64 JSON with `LIFE1p.`; both are read). A save code is a few KB, pasted not typed. The file is the same JSON, `life-save.json`.
- **Import is a merge** (`mergeSaves(local, imported)`, then applied as in 4.3 at once, since the player is on the pause screen), so importing an old file can only add. Replacing a save is "RESET PROGRESS, then import".
- **Input.** Reuses `src/input/clipboard.ts` (copy with fallbacks, paste listener) as the track editor's export does; file save and the file picker work on iOS Safari.
- **Safety.** An import is parsed through the same tolerant loaders, capped at 256 KB of text, and refused unless it has `app: "life"` and a known `format`. Nothing from it is evaluated or used as HTML.

## 7. Reset (decided: local only)
RESET PROGRESS resets this device and **does not propagate**. It clears the progress group as it does today, leaves the tracks, the preferences and the flashcards key alone, and sets `activeAt` to now so the emptied apartment is the winner. Resetting one device leaves the others untouched, and the next sync may bring the old progress back (owned things, achievements and stats are unions and maxima). That is acceptable: it is how a safe-by-default merge behaves, and the game has no pressure about it. To truly start over everywhere, STOP SYNCING (which deletes the server blob) on one device and reset each device.

## 8. The server (stage 2): API, limits, abuse, cost
**API (decided: one path, the key in a header).** All JSON, `Cache-Control: no-store`, same origin, path `/api/sync` (declared as `config.path` in the function), the key in the `X-Sync-Key` header so it is not in the URL Netlify's request logs record:
- `POST /api/sync` mints a key and creates an empty entry with its creation time as blob metadata. The server picks the key; the response carries it once.
- `GET /api/sync` returns the blob or 404. `PUT /api/sync` replaces it (404 if the key was never minted, so a client cannot create keys by writing). `DELETE /api/sync` deletes the blob and the key.
- **Rotating a key** is STOP SYNCING (delete) then TURN ON SYNC (mint), and re-pairing the other devices with the new link.
The function does not merge (as in the flashcards app): the client does GET, merge, PUT, so the rules exist once, in TypeScript, with tests. The handler is a pure `handle(request, store)` so tests drive it with an in-memory store.

**Key (decided).** 32 characters of `a-z0-9` from `crypto.getRandomValues` with rejection sampling (no modulo bias): about 2^165, not guessable or enumerable. The anchored regex `^[a-z0-9]{32}$` is checked before any store access. The link carries `#sync=` (a fragment is never sent to a server, so it is in no Netlify log and no Referer), not `?pair=`, so a flashcards link is never taken for a game key.

**Size and shape (decided).** The body is capped at **128 KB** counted in bytes. It must parse as a JSON object with `app: "life"`, a known `format`, and only the known top-level keys, else 400. A real save is a few KB plus at most 36 tracks of 2 KB each (about 72 KB at the very most).

**Abuse and limits (decided approach; the rest is unverified).**
1. Keys are server-minted, so creating one goes through one endpoint that can be rate limited.
2. At most **1000 keys**; beyond that POST returns 503 and the game says `SYNC: UNAVAILABLE`. A full store only refuses new pairings; existing pairs keep working and the game is never affected.
3. **Rate limiting** through the function's own config (Netlify's `rateLimit` option; **unverified**: whether it exists and applies on this plan must be checked at build time). If the plan does not allow it, pairing may be refused when the store is full while existing pairs keep working; nothing here claims the store cannot be filled by a determined attacker.
4. **Expiry** by a lazy sweep at mint time: a minted key whose save is unplayed or empty (`activeAt` 0, no progress) is removed after **7 days**, and any key **not read or written in 90 days** is removed. "Last seen" is blob metadata, written on a PUT and on a GET at most once a day. The sweep needs a list and one metadata read per key: **its cost at 1000 keys is unverified** (Blobs list returns keys only), and it may need moving to a scheduled function.
5. A blob is only JSON of the expected shape under 128 KB, so it is poor free storage.

**Free-tier requests (one fact for Marc).** One player makes about a dozen syncs a day, each one GET and at most one PUT. A hundred players is tens of thousands of requests a month, far below the classic 125,000 a month. New Netlify accounts are on a credit-based free plan where running out of credits can pause the site; which plan `sim` is on is **unverified by me** and is the one question in section 16. Everything above keeps use small whichever plan it is.

**Production safety and the public repo.**
- **No secrets, no env vars, no Netlify setting to change.** Blobs inside a function use credentials Netlify injects at runtime. `@netlify/blobs` is added as a normal dependency. `netlify.toml` gains a `[functions]` section (`directory = "netlify/functions"`) and nothing else; the repo holds only code, the API shape, the regexes and the caps, all safe to expose.
- **The page does not leak the key:** it is in the fragment, removed from the address bar on load, and never logged by the function's own code. Whether the platform logs request headers is **unverified**. `scripts/check-dist.mjs` gains checks that the bundle has no dev-fake marker string and no literal `#sync=` followed by 32 characters of a-z0-9 (a plain 32 character test would match bundle hashes).
- **Preview deploys must not write to production's store:** name the store by context (for example `sync` for production, `sync-preview` otherwise, from `Netlify.context` or `process.env.CONTEXT`; **which is available is unverified**).
- **Who can see what.** The blob holds game progress only (task counts, rooms, owned items, track notes and names). No name, email or device details in the blob (the platform itself sees request IPs); the only identifier is a random device id used to break ties. Track names are typed by the player, so the sync page says the save is readable by anyone with the link. **Anyone with the key can read, overwrite and delete the blob, and an overwritten blob reaches every paired device's next merge** (an apartment of the attacker's choosing wins if its `activeAt` is the newest, at most a day ahead). The one-step local backup (4.3) can bring back the apartment, not undo added items or raised counters; STOP SYNCING and re-pairing rotate the key. Same "door key, not a password" model as the flashcards app.

## 9. How it relates to the flashcards key and the guest's cards (decided)
- **Separate keys.** The game's key and the flashcards key are different credentials for different stores and servers. A guest (issue 089) has no flashcards key and still deserves sync; one leaked link must not expose both; the flashcards app owns its own blob format.
- **Real flashcards progress already syncs** through its own key (the game keeps no copy), so the game does nothing for it.
- **The guest's cards stay on the device** (Marc's 083 rule). They are never in the document and never merged. A player who wants Spanish on two devices pastes the same flashcards key on both, which already works.
- **The cap window** is per browser and stays that way.

## 10. Production build versus the dev server (decided)
- **Production (`sim.mcord.dev`):** the function runs; the page calls the same-origin `/api/sync`.
- **`npm run dev` and `npm run preview` have no Netlify functions.** Without help every call fails and the row shows `NO CONNECTION`, which is correct but untestable. Two ways, in this order:
  1. **A local fake (the default for development and for agents).** A Vite plugin in a new `vite.config.ts` (`configureServer` and `configurePreviewServer`) serves `/api/sync` with the **same `handle(request, store)`** and an in-memory store (cleared when the server restarts). It lives only in the Vite config, not in `dist/`; `check-dist` verifies that. A second browser profile on the dev server plays "the other device".
  2. **`netlify dev`** as the integration check before a push: it runs the real function with a local Blobs sandbox in front of Vite. Marc runs it (it may ask him to log in or link the site); agents do not. A draft deploy is `docs/deploy.md` stage A.
- The existing dev shortcuts (`?own`, `?days`, ...) stay dev-only. Preview deploys on `*.netlify.app` work (same origin, a separate store).

## 11. Pause screen (issue 093) and the touch layer
- Sync lives on the pause screen, which already holds the clock (`pausedWhen`), draws at the full 320 x 192 picture (`fullPictureWhen`) and uses one list of buttons for drawing and tapping (`pauseButtons`). SYNC is one more entry, and the sync page is a second screen of the same layer with the same rule, so it is one new view, not a new input system.
- Apply happens only at load, on opening the pause screen, or before the first real action (4.3), never under a thumb. The 5 minute timer does not run while the pause screen or an activity is open.
- Touch text entry (issue 093's hidden input) takes a pasted link or save code; a code is too long to read on the 320 wide picture, so only its start, end and length are shown. A hidden file input handles OPEN FILE.
- On touch, hiding the page is the moment that matters (iOS suspends tabs with little warning): the hide-sync uses `visibilitychange` with `keepalive`, the same trigger the save uses today, best effort above its 64 KB limit.

## 12. Staged build plan (decided: smallest first)
**Stage 1: export, import and the merge (no server).** `src/game/sync/document.ts` (build a document from the stores, apply one at the safe point, `activeAt` in `ProgressStore` and the feature, the backup), `merge.ts` (`mergeSaves`, pure), `code.ts` (encode, decode), `DemoStore.add`, the pause-screen SYNC page with COPY CODE, PASTE CODE, SAVE FILE, OPEN FILE and RESTORE. Solves the lost-save problem on its own. `docs/mobile.md` question 10 gets a pointer.
**Stage 2: the server and pairing.** `netlify/functions/sync.mjs` and its handler module, `@netlify/blobs`, `netlify.toml`, the Vite dev fake, `src/game/sync/client.ts` (a `SyncBackend` interface like `StudyBackend`, real and fake), `life.sync.v1`, TURN ON SYNC, the link, `#sync=` handling, SYNC NOW, STOP SYNCING, the `check-dist` additions. Marc looks at how it works here before stage 3.
**Stage 3: automatic.** The triggers, the status line, the QR drawing, the first-action apply rule, the rate limit values.
Each stage is its own build issue, written after Marc has read this note.

## 13. Test plan (decided)
- **`mergeSaves`: property tests** (vitest; add `fast-check` as a dev dependency, or a seeded generator in the test file; either is fine): commutative, associative, idempotent (including with `activeAt` clamping); monotone (every achievement, owned item and room of either input is in the output, and so is every track body (up to the 36 cap); every counter is at least both inputs'); the world group is exactly the winner's, repaired only as in section 4; an unplayed save (`activeAt = 0`) never wins; a far-future `activeAt` is clamped; `merge(x, empty)` equals `x`; the output loads unchanged through the real loaders; no owned item stays in `pending` or `waiting`; two devices that both have `demo-1` with different text both keep their track. Plus plain example tests per table row.
- **`DemoStore.add`:** the same text twice adds once; a name clash gets a free name; at 12 tracks the extra is not added and nothing is replaced; ids are never reused; `version` bumps; the record player and the draft still point at their own tracks.
- **Fake storage and a fake server:** `fake-storage.ts` already exists. A `FakeServer` implements `SyncBackend` with an in-memory map and scripted failures (timeout, 500, 404, garbage blob, newer `format`, slow response). Two "devices" (stores plus a client each) play scripted sessions: A plays, syncs, B pairs, plays, both sync; offline for a while; a merge arriving before the first action applies at once, one arriving after waits for the pause screen; the backup restores; reset on one device and a later sync.
- **The function:** `handle` against an in-memory store: key regex, the byte cap (a multi-byte body just over it), shape checks, PUT to an unminted key, the 1000 key cap, expiry sweeps with a fake clock, DELETE, no key or body in any log output.
- **Code and file:** round trip, a damaged code, a newer format, huge input, pasted whitespace or a whole link.
- **Pause screen:** the tap list equals the drawn list for the new buttons (as `pause.test.ts` does).
- **Build guard:** `check-dist` fails on a dev fake or a literal `#sync=` plus a key.
- **Not checkable by agents:** feel on a real iPhone (installed-app pairing, the clipboard bubble, `visibilitychange` and `keepalive` timing) and on the real Netlify (Blobs, rate limit, quotas, logs). Marc tries these after stage 2.

## 14. Risks
- A device whose clock is up to a day fast can win the apartment unfairly. One that runs more than a day fast and keeps playing wins every merge, since its real play is stamped with its own clock (clamping only stops it sticking after it stops); it never loses a union or a maximum. Accepted.
- Playing on two devices at once is tolerated, not a goal; the most recent real play wins the apartment and the other's apartment changes are lost (owned things are kept).
- An older build meets a newer `format`: it refuses and says so (never overwrites). A newer build reads older formats.
- Two devices syncing at the same moment: the last PUT wins on the server; the other's next GET merges and re-PUTs. Because the merge only adds (except the winner-takes-the-apartment rule), nothing owned is lost.
- The 90 day expiry and Safari's 7 day clearing combine: a long break can lose both the local save and the server copy, so an export file is the only recovery then, and the sync page says so in one line.
- Safari clearing storage loses the local save and the sync key together; the pairing link on another device or an export code is the recovery, and the sync page says so in one line.

## 15. Decisions made on Marc's behalf
1. Option (b) with (a) first, (c) as the fallback, (d) out. **decided (Marc's steer; only (b) is automatic and self-contained).**
2. The synced document is the progress group and the made tracks only. **decided (keep it small).**
3. Preferences (muted, record on the player, payout wait, dialog voice, ad blocker) stay device-only; no per-pref merge. **decided (Marc 2026-10-28: keep it small; devices may differ).**
4. Reset is local only and does not propagate; no epoch; resetting one device leaves the others untouched and the next sync may bring the old progress back. **decided (Marc 2026-10-28).**
5. Made tracks: union by text, ids local and never synced, no tombstones, no revisions; a new `DemoStore.add`; extras over 12 are not added; deleted tracks may come back; an edited track arrives as a copy; the blob holds at most 36. **decided (Marc 2026-10-28; nothing on a device is ever lost).**
6. The world group (apartment state and clock, `decor.placed`, deliveries, encounters) comes whole from the side with the newest real play; owned items, achievements, stats and rooms are unions and maxima; no delivery rebase and no queue-cap exception. **decided (simpler; a lost package's milestone fires again).**
7. `activeAt` is set only by real player actions, clamped to now plus one day when read, stored in `life.progress.v1`; reset sets it; the document's `device` is the winner's. **decided.**
8. A merge is held and applied at load, when the pause screen opens, or before the first real action of the session; the clock may jump; no "picked up where you left off" message. **decided (Marc 2026-10-28).**
9. The merge runs over loader-normalised documents; the progress group applies through the existing replace-style loaders with the `resetting` guard and one save; a one-step local backup of a replaced progress group with RESTORE BEFORE LAST SYNC. **decided.**
10. Separate keys from flashcards; a `#sync=` link; the key in an `X-Sync-Key` header; one path `/api/sync`; no QR scanning in the game. **decided (a guest has no flashcards key; one leak must not expose both; keeps the key out of logs and Referer).**
11. Server-minted 32 character `a-z0-9` keys, 128 KB cap, 1000 key cap, rate limit if the plan allows it, 7 day expiry for unplayed or empty saves and 90 day expiry for unseen keys. **decided (Marc 2026-10-28); list and metadata cost unverified; never claimed to be lock-out proof.**
12. Import merges, never replaces. **decided (cannot lose progress).**
13. A dev fake in the Vite config using the real handler, plus `netlify dev` for integration. **decided (works offline and for agents).**
14. No secrets, no env vars, no Netlify setting to change. **decided (Blobs use the site's runtime credentials).**
15. Property tests with `fast-check` or a seeded generator; the builder picks. **decided (no behaviour depends on it).**

## 16. Questions for Marc
1. **Which Netlify plan is `sim` on?** Non-blocking: check at deploy time. A credit-based free plan can pause the site when credits run out; the defaults in section 8 keep use small, and nothing in the repo changes whatever the answer.

No other question needs him. Needed from the flashcards app: nothing.
