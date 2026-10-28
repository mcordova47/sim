# Syncing the game's progress across devices (design note, issue 095)

Status: design only, nothing is built. Marc (2026-10-27) likes **the small server with a pairing link** and asked the designer to decide what it can. Every decision below is marked **decided (reason)**. Section 12 lists what truly needs Marc.

Facts about the flashcards app were read from Marc's repo (`netlify/functions/progress.mjs`, `netlify.toml`, `README.md`, `SYNC.md`). Nothing there was changed.

## 1. The recommendation in one paragraph
Build it in three stages, each useful alone. **Stage 1: export and import** (a text code and a file, no server, a pure merge function). **Stage 2: a Netlify Function with Netlify Blobs in this repo**, one opaque JSON blob per random key, paired by a `?sync=<key>` link (and a QR code later). **Stage 3: automatic sync** (on load, when the page is hidden, every few minutes) and one control on the pause screen. All three use the same pure `mergeSaves(a, b)` function, so the rules are written, tested and reviewed once. Conflicts are resolved by a field-wise merge, not "newest wins", because the rules are short (unions, maxima, and one "newer group") and a lost save is the worst outcome in a game with no goal but accumulation.

## 2. What syncs (decided)
| Store (localStorage) | What | Synced? |
|---|---|---|
| `life.progress.v1` | unlocked achievements, stats, world (vars, room, position, facing), decor (owned, placed), deliveries, encounters | **Yes**, all of it (merge rules in section 4) |
| `life.tracks.v1` | made tracks, the draft, the next id, the save-reward cooldown | **Yes**: tracks by id; the draft and cooldown follow the newer group |
| `life.sound.v1` | `dialogVoice` and `dialogVoiceChosen`, `adBlocker` | **Yes** (preferences the player chose) |
| `life.sound.v1` | `track` (the record on the player), `payoutLeft` | **Yes**, with the world group (they belong to the apartment, not the device) |
| `life.sound.v1` | `muted` | **No** (a phone on a train is not the laptop at home) |
| `life.flashcards.v1` | the sync key, the cap window (`paid`, `left`), `mode` | **No** (device-only; see section 9) |
| `life.flashcards.guest.es.v1` | the guest's cards | **No** (issue 083: a guest's progress is never merged anywhere) |
| the touch layer, the 60 fps cap, left-hand layout, anything per-browser | | **No** |
| the running score | not saved at all today | n/a |
| the sync key itself, `life.sync.v1` (new) | this device's key, last sync time, device id, epoch | local only, never in the blob |

**decided (small, and what a player expects):** the unit of sync is one JSON document, the "save", built from the rows marked Yes: `{ app: "life", format: 1, epoch, savedAt, device, progress, tracks, prefs }`. `progress` and `tracks` are the existing stores' own JSON, so the existing tolerant loaders (`Stats.load`, `Decor.load`, `Deliveries.load`, `Encounters.load`, `parseWorld`, `DemoStore`) remain the only readers and a damaged field is dropped by them, not by new code.

## 3. Options (cost, limits, what can go wrong)
**(a) Manual export and import.** No server, no cost. The player copies a code or saves a file on one device and pastes or opens it on the other. Limits: only as fresh as the player's effort, so "I forgot" is the failure; a code of a few KB pastes fine, but is not typeable. Nothing can leak. Good as the safety net for a lost save (Safari clears storage after about seven days away, `docs/mobile.md` section 5; an installed iPhone home-screen app starts empty).

**(b) A small server in this repo (recommended for stage 2).** A Netlify Function (`netlify/functions/sync.mjs`) with Netlify Blobs. No new service, no account beyond the Netlify one the site already has, same origin as the game (`/api/sync/...`), so no CORS. Cost: about 150 lines of function, the pairing UI, and a plan question (section 8). Can go wrong: quota use (mitigated, section 8), abuse of unlimited keys (mitigated by server-minted keys, a key cap and rate limiting), the function being down (the game does not care).

**(c) Reuse the flashcards app's progress endpoint.** Finding: **it would work today with no change to the app.** Its namespace pattern `^[a-z][a-z0-9-]{1,15}$` accepts `life`, its CORS accepts `https://*.mcord.dev` (so `sim.mcord.dev`, not `*.netlify.app` previews or `localhost:5173` with a different port), and the blob is any JSON up to 500 KB. Why not: it couples the game to another deployment, I could not add rate limits, key caps or a game-specific schema check there (and may not touch that repo), it shares one credential between the Spanish deck and the game (a game link would hand over Marc's Spanish progress and the reverse), and a guest has no key there at all. Kept as the fallback if Marc ever does not want a server here. **Needed from the app: nothing** (this is a note, not a request).

**(d) Browser-native sync.** None works across Safari on iPhone and a desktop browser for `localStorage` of one site. iCloud, Chrome Sync and Firefox Sync sync bookmarks and passwords, not a site's storage. Not an option.

**decided (matches Marc's steer, and (b) is the only one that is automatic, private enough and self-contained):** (a) first, then (b), then automation. (c) is the fallback, (d) is out.

## 4. Conflicts and the merge (decided)
**Decision: a field-wise merge, not "newest wins with a warning".** Newest-wins can silently throw away hours of play (the phone played on the train, the laptop was opened later) and needs a warning dialog the game's tone does not want. The field-wise rules below are about 120 lines, pure, and easy to test. Where a rule cannot be made safe, one device's group wins whole.

`mergeSaves(a, b)` is a pure function of two saves; it must be **commutative, associative, idempotent**, so the order of syncs never matters (the same property the flashcards app relies on). "Newer" means the larger `(savedAt, device)` pair, compared as a total order (device id breaks ties), where `savedAt` is the wall-clock time of the last local change. A wrong clock only changes which side wins the "newer group" rows, never loses a union or a maximum.

| Data | Rule | Reason |
|---|---|---|
| `progress.unlocked` (achievements) | union | owning is forever |
| `stats.taskCounts` | per task, the larger | counters only go up; summing would double count the shared past |
| `stats.totalPoints, bestChain, bestAward, bestScore, steps, bumps, cancelled, minAwards, playSeconds` | the larger of each | same; two devices' play time is not added (we cannot tell shared past from new) |
| `stats.rooms` | union | |
| `decor.owned` | union | |
| `decor.placed` | the newer group's placement, then any slot pointing to an item not in the union is dropped (an item is displayed in one place, issue 073: if both sides placed the same item in different slots, the newer group keeps it) | placement is a layout, it cannot be half and half |
| the **world group**: `world` (vars, room, col, row, facing), `deliveries.hours`, `encounters`, `prefs.track`, `prefs.payoutLeft`, `tracks.draft`, `tracks.reward` | the newer group, whole | the apartment is one coherent picture (dishes, mug, boxes, the clock); merging variable by variable would make a mug on the table and in the hand |
| `deliveries.fired` | union | a milestone fires once |
| `deliveries.pending` and `waiting` | from the union of both sides, minus anything now in `decor.owned`. A loser's pending entry is rebased: `at' = winner.hours + max(0, at - loser.hours)`. Waiting is a set. | no package is lost (its milestone is in `fired` and would never fire again) and none arrives twice |
| `tracks` (made tracks) | by id: the same id and the same text is one track; the same id with different text means two devices made different tracks, so the older keeps its id, the other gets a fresh id (`demo-<next>`) and a name that does not clash (existing rule `nameTaken`). `nextId` is the larger. Nothing is ever dropped; the merge may exceed `maxTracks` (12) up to 24, and the editor only refuses new saves above 12. | made things are never deleted by a merge |
| `prefs.dialogVoice, dialogVoiceChosen, adBlocker` | the newer side's value, except `dialogVoiceChosen` is the OR | a preference is the last thing the player said |
| `epoch` | the larger wins whole (section 7, reset) | a reset must not be undone by a union |

**To verify while building stage 1:** `DemoStore` tolerates more than `maxTracks` entries on load (it may drop extras; if so, the loader is adjusted only to allow up to 24, a small change inside stage 1), and the exact field names of `tracks.draft` and `reward`.

**Order of operations on load.** (1) Read local storage as today (the game starts immediately from it, never waiting for the network). (2) In the background fetch the blob. (3) `merged = mergeSaves(local, remote)`. (4) If `merged` equals local, do nothing. Otherwise write `merged` to local storage and apply it to the running game through one place (`applySave`). (5) If `merged` differs from remote, PUT it. The game is never asked to rebuild mid-action: if the merge changed the world group and the player is not on the pause screen or in a dialog or activity, the new state is held and applied at the next **pause screen open or the next load**, not live. Unions and maxima (achievements, owned items, tracks, stats) apply at once and invisibly because they cannot undo what is on screen.

**What the player sees.** Nothing while it happens. After applying a world-group change from another device, one calm toast, "Picked up where you left off on another device", no sound, no counter. A decor item or track arriving needs no message (it is just there next time). No warning dialogs, ever (the game has no pressure, `PLAN.md`).

## 5. The experience (decided)
- **Where.** The pause screen (the list screen, key L or the touch menu button) gets a row of controls under the existing two settings buttons: **SYNC** (opens the sync page), and on that page **PAIR ANOTHER DEVICE**, **COPY SAVE CODE**, **PASTE SAVE CODE**, **SAVE FILE**, **OPEN FILE**, **STOP SYNCING**. Everything is a button on the touch layout (issue 093's `pauseButtons` is the model: the tap list is the drawn list) and a key on the keyboard.
- **Pairing, device A.** First use of SYNC with no key: "TURN ON SYNC" asks the server to mint a key (POST), stores it in `life.sync.v1`, and shows the pairing link `https://sim.mcord.dev/?sync=<key>` with COPY LINK. A QR code of the same link is a stage 3 extra: the flashcards app uses a small hand-rolled SVG QR (a few KB) plus `jsQR` to read; the game needs only the drawing side to show a QR on the laptop for a phone camera to scan, which opens the link in Safari. Reading a QR inside the game is not needed (the phone's camera app does it) and is **not planned**.
- **Pairing, device B.** Opening the link: the game reads `?sync=`, removes it from the address bar at once (`history.replaceState`, the key is the only credential and should not stay in history), asks "SYNC WITH THIS SAVE?" (YES, NO), then runs a first sync that **merges** (so a device with its own progress loses nothing). A bare key or the whole link can also be pasted on the sync page (the same forgiving parser idea as `keyFromText`; touch text entry is issue 093's hidden input). An installed iPhone home-screen app opens without the link, so it pairs by paste (copy the link in Safari, open the installed app, PASTE LINK); say this on the page in one line.
- **While syncing.** The row shows a quiet line: `SYNC: ON`, `SYNC: OFF` or `SYNC: NO CONNECTION`, and nothing animated elsewhere. No spinner on the apartment, no score, no deadline.
- **When it syncs (stage 3).** On load (background, after the game is running); when the page is hidden (`visibilitychange`, the same hook that saves today; a best effort `fetch` with `keepalive: true`); every 5 minutes while visible and the pause screen is closed, only if something changed since the last sync; and on opening the sync page (SYNC NOW). Repeated syncs are cheap because the merge is idempotent.
- **Failure and offline (decided: the game always works offline).** Every sync call is wrapped, has a 8 second timeout, and failure sets the line to `NO CONNECTION` and tries again at the next trigger. A 4xx (key refused or 404) sets `SYNC: KEY NOT FOUND` and stops auto-syncing until the player acts. A blob that does not parse or has a newer `format` than this build is **not overwritten** (the same rule as the flashcards app's "a blob we cannot read is not one to overwrite") and the line says `SYNC: UPDATE THE GAME`. Local storage is the source of truth; the blob is a courier. If local storage is blocked, there is nothing to sync from and the SYNC row says so.

## 6. Export and import (stage 1, decided)
- **Format.** The save document of section 2 as JSON, then deflated and base64url-encoded with the prefix `LIFE1.` (`CompressionStream` where present; otherwise plain base64 JSON with the prefix `LIFE1p.`, both read). A typical save is well under 10 KB compressed; the code is pasted, not typed. A file is the same JSON as `life-save.json`.
- **Import is a merge** (`mergeSaves(local, imported)`), so importing an old file into a played game cannot lose anything; it can only add. After the merge the page reloads state through `applySave`. Replacing instead of merging is "RESET PROGRESS, then import".
- **Input.** Reuses `src/input/clipboard.ts` (copy with fallbacks, paste listener) as the track editor's export does. File download and the file picker work on iOS Safari.
- **Safety.** An import is parsed through the same tolerant loaders, size capped at 256 KB of text, and refuses anything without `app: "life"` and a known `format`. Nothing from the text is ever evaluated or used as HTML.

## 7. Reset while paired (decided)
Resetting progress while paired must not be undone by the next merge (a union would resurrect everything). **decided:** the save has an `epoch` (an integer, 0 at first). RESET PROGRESS on a paired device sets a new local save with `epoch = old + 1`, and the next sync PUTs it. Another device that sees a higher epoch on the server takes it whole (no merge) and shows the one calm toast "Progress was reset on another device". The reset question already asks to confirm and its wording gains one sentence when paired ("This resets every paired device"). The preference rows (voice, ad blocker) stay, as they do today. A guest's cards and the flashcards key are not touched, as today.

## 8. The server (stage 2): limits, abuse, cost
**API (decided: tiny, minted keys).** All JSON, `Cache-Control: no-store`, same origin.
- `POST /api/sync` mints a key and creates an empty entry. The server picks the key, not the client.
- `GET /api/sync/<key>` returns the blob or 404.
- `PUT /api/sync/<key>` replaces the blob. 404 if the key was never minted (so a client cannot create keys by writing).
- `DELETE /api/sync/<key>` deletes the blob and the key (STOP SYNCING offers it; it is how a player deletes their data).
The function does not merge (as in the flashcards app): the client does GET, merge, PUT, so the rule exists once, in TypeScript, with its tests. The handler is a pure `handle(request, store)` so tests drive it with an in-memory store, as the app does.

**Key length and alphabet (decided).** 32 characters of `a-z0-9`, drawn from `crypto.getRandomValues` with rejection sampling (no modulo bias): 36^32 is about 2^165, not guessable or enumerable. Anchored regex `^[a-z0-9]{32}$` before any store access, so a key cannot smuggle a path. Same shape as the flashcards key on purpose (people know it); the link parameter is `?sync=`, not `?pair=`, so a flashcards link pasted by mistake is not taken for a game key (and would 404).

**Size (decided).** The body is capped at **128 KB** counted in bytes (a save is a few KB and tracks add at most about 30 KB; 64 KB is `MAKE_TRACKS.maxSaveBytes`; 128 KB leaves room and stops free storage for other things). The body must parse as a JSON object with `app: "life"`, a known `format`, and only the known top-level keys, else 400. The flashcards cap is 500 KB; this save is much smaller.

**Abuse of unlimited keys (decided).** (1) Keys are server-minted, so creation goes through one rate-limited endpoint. (2) At most **1000 keys** exist; POST returns 503 "full" beyond that (counted with the store's list, cheap at this size; the game says `SYNC: UNAVAILABLE`). A pair of friends never gets near it; an attacker filling the store only turns sync off, never the game. (3) Per-IP rate limiting through the function's own config (Netlify's `rateLimit` option on the function; **verify the exact option at build time**), for example 60 requests a minute per IP and 5 mints an hour. (4) Blobs not written for 365 days are removed by a small lazy sweep at mint time (no scheduled function in stage 2). (5) A blob is only as big as the cap and only JSON of the expected shape, so it is poor free storage.

**Free-tier requests (decided approach, one fact for Marc).** One player generates about a dozen syncs a day (load, hide, a few five-minute ones while playing only when something changed). Each sync is one GET and at most one PUT. A hundred players is a few thousand requests a day, tens of thousands a month, far below the classic free allowance of 125,000 function requests a month; Netlify has since moved new accounts to a credit-based free plan where running out of credits can pause the site, and I cannot see which plan this site is on or its current numbers. That is question 1 in section 12. The mitigations above (rate limits, key cap, nothing automatic when nothing changed) keep the use small whichever plan it is.

**Production safety.**
- **No secrets, no env vars, no Netlify setting.** Netlify Blobs inside a function use the site's own credentials that Netlify injects at runtime. The repo holds only code. `@netlify/blobs` is added as a normal dependency. Nothing to set in the Netlify UI. If Marc's plan needs a change, that is section 12.
- **What the public repo exposes:** the API shape, the regexes and the caps. Safe by design: the only credential is a random key that is never in the code, the bundle, logs or the URL after load. The function never logs a key or a body.
- **The page does not leak the key:** removed from the address bar on load; `Referrer-Policy: strict-origin-when-cross-origin` already in `netlify.toml` strips the path and query on cross-origin requests; the site is `noindex`. `scripts/check-dist.mjs` gains a check that the bundle has no real key-shaped string and no dev fake (below).
- **Preview deploys must not write into the production store.** Name the store by context (for example `sync` for production, `sync-preview` otherwise, from `Netlify.context` or `process.env.CONTEXT`; **verify which is available**). A pairing made on a preview then simply does not exist in production.
- `netlify.toml` gains a `[functions]` section (`directory = "netlify/functions"`) and, for the function, `config.path = "/api/sync/*"` in the file itself, as the app does. There is no catch-all redirect here, so no 200-for-everything trap.

**What can be seen by whom.** The blob contains game progress only (task counts, rooms, owned items, track notes and names). No name, email, device info or IP is stored. Anyone with the key can read, overwrite and delete it, the same "door key, not password" model as the flashcards app, stated on the sync page in one line. Track names are typed by the player: a player could put a personal word in one, so the page's line says the save is readable by anyone with the link.

## 9. How it relates to the flashcards sync key and the guest's cards (decided)
- **Separate keys.** The game's sync key and the flashcards key are different credentials for different stores (`life.sync.v1` and `life.flashcards.v1`, different servers). Reasons: a guest (issue 089) has no flashcards key and still deserves sync; one leaked link must not hand over both; the flashcards app owns its own blob format and endpoint; and the game's link is `?sync=`, so a flashcards link is never mistaken for it.
- **Real flashcards progress already syncs** through its own key (the game never keeps a copy), so there is nothing for the game to do.
- **The guest's cards stay on the device** (Marc's rule in `docs/flashcards-guest.md`: a guest stays a guest). They are never in the save and never merged. A player who wants Spanish on two devices pastes the same flashcards key on both; that already works.
- **The cap window** (`paid`, `left`) is per browser and stays that way; syncing it would let a second device pay the same cap twice or hide a legitimate one.
- **Reset** clears the guest's cards today; with sync, reset still leaves the flashcards key alone and still clears this device's guest cards only.

## 10. Production build versus the dev server (decided)
- **Production (`sim.mcord.dev`):** the function runs, the page uses the same-origin `/api/sync`.
- **`npm run dev` and `npm run preview` have no Netlify functions.** Without help every call 404s and the sync row would show `NO CONNECTION`, which is correct but untestable. **decided:** two ways, in this order.
  1. **A local fake (the default for development and for agents).** A Vite plugin in a new `vite.config.ts` (`configureServer` and `configurePreviewServer`) serves `/api/sync/*` using the **same `handle(request, store)`** as the function with an in-memory store (reset when the dev server restarts). It exists only in the Vite config, so it is not in `dist/`; `check-dist` verifies the bundle contains no fake-server code. A second `npm run dev` window in another browser profile plays the "other device".
  2. **`netlify dev`** as the integration check before a push: it runs the real function and a local Blobs sandbox in front of Vite. Marc runs it (it may ask him to log in or link the site); agents do not. Netlify's own flow for a draft remains `docs/deploy.md` stage A.
- **The existing dev shortcuts** (`?own`, `?days`, ...) stay dev-only. A dev-only `?syncfake` is not needed since the fake is always on under Vite.
- **Preview deploys on `*.netlify.app`** work (same origin, preview store, see section 8).

## 11. Pause screen (issue 093) and the touch layer
- Sync lives on the pause screen, which already holds the clock (`pausedWhen`), draws at the full 320 x 192 picture (`fullPictureWhen`) and has one list of buttons used for both drawing and tapping (`pauseButtons`). The SYNC button is one more entry and the sync page is a second screen of the same layer with the same rule (the drawn list is the tap list), so there is one new view, not a new input system.
- Applying a changed world group happens only when the pause screen opens or on load (section 4), so nothing moves under a thumb. The 5 minute timer does not run while the pause screen or an activity is open (it checks the same pause hook).
- Touch text entry (hidden input raising the OS keyboard, issue 093) takes a pasted link or save code. A save code is too long to read on a 320 wide picture, so only the first and last characters are shown with its length. A hidden file input handles OPEN FILE.
- On touch, the "page hidden" save is the one that matters (iOS suspends tabs without much warning): sync uses `visibilitychange` with `keepalive`, the same trigger the progress save uses today.

## 12. Staged build plan (decided: smallest first)
**Stage 1: export, import, and the merge (no server).** `src/game/sync/save.ts` (the save document: build from the stores, `applySave`), `merge.ts` (`mergeSaves`, pure), `code.ts` (encode and decode), the pause-screen SYNC page with COPY CODE, PASTE CODE, SAVE FILE and OPEN FILE. Answers the lost-save problem on its own. Touches `achievements/feature.ts` and `draw.ts` lightly, `docs/mobile.md` question 10 gets a pointer.
**Stage 2: the server and pairing.** `netlify/functions/sync.mjs` (+ its handler module so tests can import it), `@netlify/blobs`, `netlify.toml`, the Vite dev fake, `src/game/sync/client.ts` (a `SyncBackend` interface like `StudyBackend`, a real and a fake), `life.sync.v1`, TURN ON SYNC, the pairing link, `?sync=` handling, SYNC NOW and STOP SYNCING, `check-dist` additions. Marc reviews how it works here, with `netlify dev` or a draft deploy, before stage 3.
**Stage 3: automatic.** Triggers (load, hidden, 5 minutes), the toast, the epoch reset, the QR drawing, the status line. Rate limit values are tuned here.
Each stage is its own build issue, written after Marc has read this note.

## 13. Test plan (decided)
- **Merge function: property tests** (the repo uses vitest; add `fast-check` as a dev dependency, **or** a seeded random generator in the test file if Marc would rather add no dependency; either is fine): commutative, associative, idempotent; monotone (every achievement, owned item, room and track of either input is in the output; every counter is at least both inputs'); the world group is exactly one input's; `merge(x, empty)` equals `x`; the output always loads through the real tolerant loaders without being changed by them; deliveries never duplicate an owned item and never lose a fired milestone's package; track id collisions never drop a track. Plus plain example tests per table row.
- **Fake storage and a fake server:** `fake-storage.ts` already exists. A `FakeServer` implements `SyncBackend` with an in-memory map, scripted failures (timeout, 500, 404, garbage blob, newer `format`, slow response) and a clock. Two `Game`-less "devices" (a stores plus a client each) play scripted sessions against it: A plays, syncs, B pairs, plays, syncs, A syncs again, then both equal; offline for a while; both reset; one device resets while the other plays.
- **The function:** `handle` driven with an in-memory store: key regex, size cap by bytes (a multi-byte body just over the cap), JSON and shape checks, a PUT to an unminted key, the 1000 key cap, DELETE, OPTIONS not needed, no key or body in the log output.
- **Code and file:** round trip, a damaged code, a code from a newer format, huge input, text with pasted whitespace or a whole link.
- **Pause screen:** the tap list equals the drawn list for the new buttons (as `pause.test.ts` does).
- **Build guard:** `check-dist` fails if a dev fake or a key-shaped string is in the bundle.
- **Not checkable by agents:** how it feels on a real iPhone (installed app pairing, `visibilitychange` timing, the clipboard bubble) and on the real Netlify (Blobs, rate limit, quotas). Marc tries these after stage 2.

## 14. Risks
- Clocks: a device with a wrong clock wins the "newer group" rows unfairly; it never loses unions or maxima. Accepted.
- A very old build writing a blob with an older `format`: a newer game reads old formats (an upgrade step per version); an older game refuses a newer one.
- Two devices syncing at the same moment: last PUT wins on the server, the loser's next GET merges and re-PUTs (the flashcards app's "self-healing" case); nothing is lost because merging is monotone.
- Playing on two devices at once is not a goal; it is tolerated.
- Safari clearing storage loses the local save and the sync key together; the pairing link on another device or the export code is the recovery. The sync page says so in one line.

## 15. Decisions made on Marc's behalf (one line each)
1. Option (b) with (a) first; (c) fallback; (d) out. **decided (Marc's steer, and (b) is the one that is automatic and self-contained).**
2. One document, field-wise merge with one "newer group". **decided (safer than newest-wins, small enough).**
3. Separate key from flashcards; `?sync=` not `?pair=`. **decided (a guest has no flashcards key; one leak must not expose both).**
4. Guest cards, the flashcards key, the cap window and `muted` are device-only. **decided (Marc's 083 rule and per-device meaning).**
5. Server-minted keys, 32 chars `a-z0-9`, 128 KB cap, 1000 key cap, rate limit, lazy 365 day sweep. **decided (bounds abuse and cost without a database).**
6. Import merges, it does not replace. **decided (cannot lose progress).**
7. Reset uses an epoch so it is not undone. **decided (a union would resurrect it).**
8. No QR scanning inside the game; QR drawing in stage 3 only. **decided (the phone camera does the scanning; avoids a camera permission and a decoder).**
9. World change from another device applies at pause screen open or load, never live. **decided (nothing moves under the player).**
10. Dev fake in the Vite config using the real handler; `netlify dev` for integration. **decided (works offline and for agents).**
11. No secrets, no env vars, no Netlify setting to change. **decided (Blobs use the site's own runtime credentials).**
12. Property tests may use `fast-check` or a seeded generator. **decided (either; the builder picks, no behaviour depends on it).**

## 16. Questions for Marc
Only things that depend on his account or taste. The rest is decided above.
1. **Which Netlify plan is `sim` on, and is a risk of the site pausing if credits run out acceptable?** Recommendation: check the plan and its function and Blobs allowance on the Netlify dashboard once; if it is a credit-based free plan, keep the defaults here (rate limit, 1000 key cap) and, if it worries you, set a spending or usage notification. Needs Marc: only he can see the account. Nothing in the repo changes whatever the answer.
2. **Is "anyone with the link can read the save" fine to say on the sync page?** Recommendation: yes (it is the flashcards app's model and the save has no personal data); it is the only sentence in the game about privacy, wording is Marc's taste.
No other question needs him.

Needed from the flashcards app: nothing.
