# Real-world effects: what is feasible (research, issue 112)

Status: research only, nothing is built, `src/` untouched. Facts were checked on 2026-10-28 against the pages cited in section 12. Anything not confirmed on a primary page is marked **(unverified)**.

Context: a static Vite site on Netlify (https://sim.mcord.dev/, repo is **public**), one small Netlify Function plus Blobs for sync (`docs/sync.md`), Marc on an iPhone (often the installed home-screen app, `docs/mobile.md`). The one real-world effect today is flashcards progress.

## 1. Summary table

Effort is for a first small version. Risk is privacy/safety on a public site.

| # | Idea | Login | iPhone | Cost | Effort | Risk | Recommendation |
|---|------|-------|--------|------|--------|------|----------------|
| 2 | Pixelated own photos (file picker, IndexedDB, canvas) | none | works (file input; no File System Access API) | free | small | very low (never leaves the device) | **Do first** |
| 4b | Weather (Open-Meteo, no key) | none | works | free (non-commercial) | tiny | very low | Good tiny extra |
| 4c | Now playing via Last.fm username | none for reads | works | free | small | low (a public scrobble feed) | Good second |
| 4a | Google Calendar as day structure | Google, via a private ICS link or OAuth | works | free | medium | medium | Try with the ICS link, not OAuth |
| 4d | GitHub / Strava activity | none (GitHub public) / OAuth (Strava) | works | free | small / medium | low / medium | GitHub maybe, Strava skip |
| 4e | Reminders to the phone (ntfy or web push) | none (ntfy topic) / permission prompt | works only as the installed home-screen app | free | medium | low-medium (pressure rule) | Defer; against "quiet extra" |
| 1 | Browse Gmail | Google OAuth, restricted scope | works | free to test, expensive to publish | large | **high** (others' mail on screen) | Do not build for the public site |
| 4f | Send email | Google OAuth, sensitive scope | works | free | medium | high (account safety) | Skip |
| 5 | In-game browser (allowlisted feeds, later reader mode) | none | works | free | medium (feeds) / large (HTML) | low-medium (others' content, abuse) | Build feeds first, after the photo frame |
| 3 | Uber Eats ordering | n/a | link opens the app | free | tiny (link only) | low as a link, high if automated | Only a quiet "suggest dinner" link |

## 2. Ground rules (from the issue and the pillars)

- The game is playable with **everything off**. Every effect is opt-in per device, off by default, and absent from a fresh install.
- A quiet extra, never pressure: no unread counts, no streaks, no "you missed" nudges, no notifications by default.
- Nothing personal in the repo or the bundle: no tokens, keys, client secrets, usernames, calendar URLs, photos. `npm run check:dist` already scans the bundle for an email address and local paths; it would need extending for any new secret shape.
- Tokens and settings stay on the device (localStorage / IndexedDB) unless Marc agrees to the server holding them (open question 4).
- The public site means any visitor sees the code. Features must be inert for a visitor who has not set them up, and must never show a visitor Marc's data.

## 3. Idea 2: pixelated real photos (recommended first)

**How it works.** A "photo frame" or "pictures" object in the apartment. The player taps it, picks images with a plain `<input type="file" accept="image/*" multiple>`, the page draws each onto a small canvas (for example 48 x 32), quantizes to the game palette, and stores only the pixelated result (a few KB) in IndexedDB. The original never needs to be kept and nothing is uploaded. No server, no login, no key.

**Login/permissions.** None. iOS shows its own photo picker and the page only receives the files the player chose.

**Data and privacy.** Exposes nothing beyond what the player picks. Risk: a pixelated face is still a face, and a screenshot or stream shows it, so the picture is stored only on that device and never added to sync (sync is `life.progress.v1` and tracks, `docs/sync.md` section 2). Strip metadata by construction: drawing to a canvas drops EXIF and GPS.

**iPhone/Safari.** File input and canvas work everywhere. The File System Access API (`showOpenFilePicker`, folder access) is **not** available in Safari or iOS Safari (MDN marks it limited availability; the Safari row did not load, so confirm at https://caniuse.com/native-filesystem-api, **unverified**), so "a local folder that updates by itself" is impossible on the iPhone. It could be a desktop-Chrome-only bonus. Origin private file system exists in Safari but is not needed: IndexedDB holds a few KB per picture. Safari may evict storage after about seven days away (`docs/mobile.md` section 5, `docs/sync.md`), so treat pictures as re-pickable, not precious.

**Google Photos.** Not worth it. Since 31 March 2025 the Library API no longer lets an app read a user's whole library: only media the app itself created (scopes `photoslibrary.readonly`, `.sharing` and the full scope were removed). Choosing existing photos now goes through the **Picker API**, which needs the `photospicker.mediaitems.readonly` scope, a session the user completes in Google Photos, and returns `baseUrl`s that last about 60 minutes (per a search summary of Google's Picker guide, not re-read). That means an OAuth client, consent screen and a token for what the file input already gives with no login. iCloud Photos has no web API a third-party site can use (**unverified**, from general knowledge); on the iPhone the system picker already reaches iCloud photos.

**Cost.** Free. **Effort.** Small: a picker, a pixelate function (pure, testable), a store, one in-game viewer. **Recommendation.** Do this first.

## 4. Idea 1: browsing email (Gmail)

**How it could work.** Two shapes.
1. *Token in the browser:* Google Identity Services in the page, a read scope, the browser calls the Gmail REST API directly, the token lives in memory or localStorage. No server, but see the OAuth problems below.
2. *Server holds the token:* the Netlify Function does the OAuth code exchange and refresh, keeps a refresh token in Blobs, the game asks the function for a trimmed list. It needs a client secret in a Netlify environment variable (never the repo) and makes the server a store of Marc's mail access. Heavier and a bigger blast radius.

**Scope and verification.** `gmail.readonly` and `gmail.metadata` are **restricted** scopes; `gmail.send` is **sensitive**; `gmail.compose` is restricted. Restricted scopes in a *published* app need Google's verification plus an annual third-party security assessment (CASA) if the app stores or transmits the data on a server; the cost is not stated on Google's page. That route is not sensible for a personal toy.

**Testing mode instead.** An "external" OAuth app left in *Testing* needs no verification, allows up to **100 named test users**, shows an "unverified app" warning, and its **refresh tokens expire after 7 days**. So Marc would sign in again about weekly. Fine for one person, and it can never serve other players. (Google's Ads forum has one reply claiming no fixed expiry in Testing; the official setup docs say 7 days, so plan on 7.) An "internal" app is not an option: it needs a Google Workspace org and would be CollegeVine's, not Marc's personal account, which is an additional reason to avoid it (account and employer safety).

**OAuth on a static site.** The old implicit flow is described by Google as insecure for single-page apps and for legacy use only; Google recommends Google Identity Services, with the code model (authorization code with PKCE) for refresh tokens. The token model gives short-lived access tokens with no refresh token, so the browser-only version means a consent popup every hour or so. The redirect/origin must be registered (https://sim.mcord.dev plus localhost; the `*.netlify.app` previews would not work, as with flashcards).

**Privacy and safety.**
- Email is mostly *other people's* data (senders, subjects, previews). On a public site, a screenshot, stream or screen recording of the game shows them. Mitigation if ever built: show only the count or a fake pixelated "envelope" per message, no sender or subject text, never persist the content.
- A stolen read token exposes the whole mailbox. In localStorage, any XSS on the origin reads it. Restricted-scope tokens are the highest-value thing this site could hold.
- A Gmail connection to a personal account from a hobby site invites account-safety problems (consent screen warnings, revoked tokens). Never use the work (CollegeVine) account.

**iPhone.** Works in Safari and the installed app (popup/redirect OAuth is fiddlier in standalone mode, **unverified**). **Cost.** Free in Testing. **Effort.** Large. **Recommendation.** Do not build for the public site. If Marc wants the idea, a local-only toy: a pixel "inbox" showing only the *count* of unread, behind the weekly re-login. Even that is low value for the effort.

## 5. Idea 3: Uber Eats

**What exists.** The **Marketplace APIs** are for restaurants and partners to manage stores, menus and orders. Uber also lists **Consumer Delivery APIs** (browse merchants, carts, orders, tracking, with the customer linking their Uber account) but access is case by case, "may require written approval from Uber", via an intake form, aimed at businesses (voice ordering, assistants). Third-party reviews describe an NDA and licence before production access. A personal game will not get that.

**What is left.**
- *Opening the app/site by link.* `https://www.ubereats.com/` opens the app via universal links on iPhone when installed; a link needs no login from us and exposes nothing (exact deep-link formats for a pre-filled search or address are **unverified**; do not invent them).
- *Automating the website or the app* (browser automation, unofficial endpoints) is fragile and very likely against Uber's terms (**unverified**, check their terms before any attempt) and risks the account. Not recommended.

**A quiet "suggest dinner".** In the game, when it is evening and the fridge task is not done, the character may *mention* a craving; a phone object or a menu entry "Order food" opens Uber Eats in a new tab. No tracking, no credentials, no order data. The game never knows whether the player ordered. Pure link, so works on iPhone, free, tiny.

**Recommendation.** Only the link, and only if Marc wants it. Never anything that places an order.

## 6. Idea 4: other candidates

**a. Google Calendar.** Two ways. (i) The calendar's **secret ICS address** ("Secret address in iCal format" in Calendar settings): a URL that returns events with no OAuth. The URL is a bearer secret, stored on the device (or a Netlify env var if a function fetches it, because Google's ICS endpoint does not send CORS headers for browsers, **unverified**). Anyone with the URL can read the whole calendar, so it never goes in the repo. (ii) OAuth with `calendar.events.readonly`/`calendar.freebusy` (Google's scopes page does not label them; I believe they are sensitive, **unverified**; Testing mode has the same 7-day token expiry and 100-user cap; the only exception is an app asking for just email, profile and openid). Game use: today's events become soft tasks or the day's rhythm ("meeting at 3: the character looks at the clock"), shown as generic pixel blocks. Privacy: event titles can name other people and clients, so show only "busy" shapes or Marc-chosen labels, never titles. Work calendar: never, same employer concern. iPhone: fine. Effort: medium. Rank: the best "real world feeds the game" idea after photos, via ICS through a function (CORS) kept private to Marc.

**b. Weather.** Open-Meteo needs no key; the free tier is for non-commercial use (under 10,000 calls a day, 5,000 an hour, 600 a minute, 300,000 a month, CC BY 4.0) and its terms warn that shared hosting IPs (Netlify is named) can be rate-limited sooner. Calling from the browser means the limit is per player IP, which is fine. Needs a location: use a coarse, hard-coded city (do **not** use the Geolocation API or a precise address; the repo is public and the apartment is real). The window shows rain or sun. Free, tiny, iPhone fine. CORS is not stated on the fetched page (**unverified**; I believe browser calls are allowed). Low risk.

**c. Music now playing.**
- *Last.fm:* `user.getRecentTracks` needs only a username and an API key, no user auth, and marks the current track `nowplaying="true"`. The API key is a low-value identifier but still should not be committed; browsers calling directly would expose it to every visitor, so a tiny function proxy with the key in an env var is cleaner. Works for whatever scrobbles to Last.fm (Spotify and Apple Music can both scrobble). The profile must expose recent tracks (a Last.fm privacy setting, **unverified**). Best option. Rate limits are not specified on the page (error 29 exists for too many requests).
- *Spotify:* a new app is in Development mode: **5 authorized users max**, owner needs Premium (the app stops working if the Premium lapses), and Spotify tightened dev mode on 11 Feb 2026 (new apps) and 9 Mar 2026 (existing apps): batch and browse endpoints are removed and search is capped at 10; the currently-playing endpoint is not listed as removed. Extended access needs a registered business with 250k monthly users, so it can never be public. For Marc alone it works but needs OAuth with PKCE and refresh handling. Prefer Last.fm.
- *Apple Music:* MusicKit needs an Apple Developer account and developer token (**unverified**, from general knowledge, check before relying). Skip.
Game use: the record player or speaker shows the artist as pixel text. Privacy: shows listening habits of whoever's username is configured; do not default to Marc's username in the public bundle.

**d. GitHub / Strava.** GitHub's REST API serves public events without login (60 requests an hour per IP unauthenticated, per https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) and works from a browser; it is fine for "you pushed today" as a desk plant growing. Low risk, but the repos are public anyway. Strava: apps start in **Single Player Mode** (athlete capacity 1, own data only), default limits 200 requests per 15 minutes and 2,000 a day; needs OAuth with a client secret (so a function) and refresh tokens, and activity data carries location (home address in routes). Skip Strava.

**e. Reminders to his phone.** *ntfy:* topic-based pub/sub, no account; the iPhone has an app, and a PWA exists (Safari iOS 16.4+). Anyone who knows or guesses a topic name can read or send, so the topic must be long and random and not in the repo, which means the function would send it from an env var. *Web push in the game itself:* iOS only allows it for a site **installed to the Home Screen** with a standalone manifest, iOS 16.4 or later, permission asked from a button tap, and the push endpoints are `*.push.apple.com`. It also needs a service worker, VAPID keys (secret, an env var) and storing subscriptions on the server, which grows the sync function from "an opaque blob" into a user database. Against the pillars: notifications are the opposite of a quiet extra. Defer; if wanted, one opt-in "remind me to eat/sleep" in the character's voice, user-scheduled only.

**f. Send email.** `gmail.send` is a sensitive scope, but the risk is the reverse of reading: a bug or abuse sends mail as Marc. Skip. (`mailto:` links need no OAuth if ever wanted.)

## 6a. Idea 5: an in-game browser (allowlisted reader)

**The idea.** A computer or phone object opens a pixel "browser" that shows a simplified, pixel-styled view of a page: headings, paragraphs, links, images pixelated. No JS or CSS. Instead of a free-text URL bar, a **curated allowlist** of sites chosen by Marc (a "bookmarks" menu, in the existing dialog/menu style).

**Why a function is required.** A browser page cannot read another site's HTML: without the other site's `Access-Control-Allow-Origin` header the fetch is blocked (CORS). Feeds and APIs that do send CORS headers can be called directly (Hacker News API is public, no auth, "no rate limit" per its docs; CORS not stated on the fetched page, **unverified**). For ordinary pages the Netlify Function fetches server-side and returns a small simplified document (JSON of blocks: heading, paragraph, link, image ref, plus the source URL and a fetched-at time). The game never renders HTML; it draws blocks, so nothing from a page is ever inserted into the DOM.

**Two versions.**
1. *Easy first version: feeds and APIs only.* RSS/Atom/JSON feeds of allowlisted blogs, Wikipedia's REST API, the Hacker News API. The data is already structured (title, summary, link, date), no HTML parsing, no extraction guesses. Wikimedia requires a descriptive `User-Agent` with contact info for server calls and may return 403 for generic ones; browsers should send `Api-User-Agent` instead (policy page). Feed content fields can contain HTML, so strip to text (or a tiny tag whitelist) in the function.
2. *Harder version: HTML reader mode.* Fetch the page, parse it with `jsdom` or `linkedom`, run Mozilla Readability (Apache-2.0) to pull the article, then convert to blocks. Readability's README says it does **not** sanitise unsafe input and recommends DOMPurify; here that is covered by converting to a closed set of plain blocks and discarding everything else, but pass the URL so relative links resolve and keep jsdom's script and resource loading **off** (its default). Works for blog-type pages; it fails on JS-rendered sites, paywalls, login pages and odd layouts. Maintenance is per site: allowlist entries are tested, not guessed.

**Allowlist as the safety answer.** The function accepts a site **id** (not a URL) and maps it server-side to a fixed origin and path pattern, so it is not an open proxy and SSRF (making the server call internal addresses) is greatly reduced, provided no client input ever reaches the host. Defence in depth: refuse private and special ranges (0/8, 10/8, 100.64/10, 127/8, 169.254/16 which covers cloud metadata, 172.16/12, 192.168/16, ::1, fc00::/7, fe80::/10, IPv4-mapped ::ffff:0:0/96), pinning the resolved IP for the connection so DNS rebinding cannot swap it after the check (or skip the IP check, since origins are fixed and trusted); use `redirect: "manual"` and refuse any cross-origin hop (allowlisted hosts can have open redirects); cap size with a streaming byte count after decompression, not Content-Length, plus a time cap; accept only `text/html`, `application/xml`, `application/json` (and image types on the image route, with the same controls); ignore userinfo and odd ports in feed-supplied links. The allowlist lives in the function config or a server file, not as secrets, but it is public in the repo (fine: Marc's own sites and public feeds, no personal data). Origin check (not authentication: it is easy to spoof outside a browser) and per-IP rate limit as in section 7; rely on the rate limit.

**Rendering.** Text goes through the pixel font and the dialog box machinery (issue 023 already wraps, pages and types text and has a glyph-coverage test). The font's coverage is the constraint: real prose has curly quotes, dashes, accents, ampersands, digits and possibly uppercase and lowercase. Plan: normalise in the function (curly to straight quotes, em dash to " - ", strip accents or map to the nearest glyph, replace unknown characters with `?` or drop them) so the client never meets a glyph it cannot draw; extend the font only if Marc wants accents. Long text pages by interact key (keyboard) or tap (touch) with up/down to scroll, headings as a bigger style or a menu title, links as a selectable list (choose to follow within the allowlist, or "open in real browser" as an outbound link). Cap an article to the first N characters with "read more on the real site".

**Images.** The function returns image URLs only from allowlisted hosts (or not at all); the client fetches through the function's image route (CORS again), downsizes and quantises to the game palette on a canvas (the same `pixelate` as the photo frame), then caches the tiny result in IndexedDB keyed by URL. Never hotlink the original from the player's browser (it would leak the player's IP to the third party and fail on CORS).

**Caching and cost.** Cache the simplified document in Netlify Blobs or an HTTP cache header for hours, so a hundred players cost one upstream fetch. Compute is billed as GB-hours at 10 credits each with 1024 MB default memory (Netlify docs): a one-second fetch is about 0.003 credits, so 1,000 uncached fetches is about 3 credits, plus bandwidth at 20 credits per GB (tiny JSON) and 2 credits per 10,000 web requests. Credit cost is not the issue; abuse control is (rate limit, allowlist, cache). Synchronous function timeout and response size limits were not confirmed on a primary page; a search summary of Netlify's configuration docs says 60 seconds synchronous and 6 MB buffered, while older forum posts say 10 seconds (**unverified**, page itself returned no numbers); design for under 10 seconds. Keep responses to tens of KB.

**Copyright, terms and robots.** Showing others' content is the real question, not the code.
- Prefer sources that invite it: Marc's own sites, feeds meant for readers, Wikipedia (CC BY-SA: attribution, a link to the licence, and a note of changes), Hacker News API. For anyone else, written permission or skip.
- A transformed text-only reader view with attribution, the original link and a short excerpt is the defensible shape, but it is still a republication; a site's terms may forbid automated fetching or caching, and robots.txt should be honoured for HTML fetches (fetch it in the function and refuse disallowed paths; legal weight is jurisdiction-dependent, not legal advice, **unverified**).
- Send an honest `User-Agent` naming the game and a contact (Wikimedia requires this), low volume, cache hard.
- Show the source name and URL on every page, a clear "fake browser" frame, and no ads or tracking of the original.
- Do not strip a site's paywall or login content; fail with "page not available".

**Hostile content and prompt injection.** Treat every fetched page as untrusted. Output is a closed block schema drawn as pixels, so scripts and styles cannot run. Limit text length and block count. Links go only to allowlisted ids or an explicit "open externally" button (a normal `rel="noopener noreferrer"` link). If an LLM were ever used to summarise pages, injection becomes real (page text instructing the model); do not add one. Show page text only, never act on it.

**Fit with the pillars.** The mundane-is-the-joke part is strong: doomscrolling already exists as a task; a pixel browser with a bookmarks list of "my blog", "an encyclopedia", "the orange-site front page" is that joke made real. In-world sites can be fake brands (ad copy and fake sites as part of the game, no real brand logos) mixed with a few real feeds; the real ones are a quiet extra, off by default, never a "new posts" badge. The game never waits on a fetch: a loading line in the character's voice, and a friendly failure ("the wifi is out").

**iPhone/Safari.** Everything client-side is canvas, IndexedDB and fetch to our own origin: works on iPhone. **Login.** None. **Privacy.** The function sees which site id a player opened (our own logs, not stored by us); the target site sees the function, not the player. No personal data. **Cost.** Free at this scale. **Effort.** Feed version: medium (function, block schema, allowlist, text normaliser, a reader screen). HTML reader mode: large and per-site.

**Recommendation.** Worth building, **feeds first**: it reuses the dialog text machinery, needs no login and has a clear safety story. Do it after the photo frame and weather because it needs the proxy function that Last.fm and calendar need anyway; so design that function once (section 7). HTML reader mode only for Marc's own sites, later.

**First allowlist shape.** Entries like `{ id, label, kind: "feed" | "api" | "html", origin, path, maxChars }`: (1) Marc's own blog or site feed (his, so permission is trivial), (2) Wikipedia via its REST API ("random article" as the cheerful default), (3) the Hacker News API (top ten titles), (4) one or two reader-friendly feeds Marc chooses, (5) a couple of fake in-world sites bundled as static data (no network at all), so the browser object works offline and with every real site off.

## 7. Architecture notes

- **No secrets in the bundle or repo.** Vite inlines `import.meta.env.VITE_*` at build time; anything with that prefix is public. Server secrets (Last.fm key, ICS URL, a Google client secret, VAPID keys) go in Netlify environment variables read only in the function.
- **A function per effect.** Keep the sync function as is; add a separate small proxy function (for example `/api/world`) that fetches an upstream, trims it to the few fields the game needs and returns it. It should sit behind the same `*.mcord.dev` origin check the progress endpoint uses, a per-IP rate limit like the sync function (60 a minute) and a short cache, so a visitor cannot use it to burn Marc's upstream quota. If it serves *Marc's* data (calendar, Last.fm), a random per-device pairing token should be required, like the sync key; otherwise any visitor would see his now-playing and calendar.
- **CORS.** Direct browser calls need the upstream to allow it (Last.fm, GitHub public, Open-Meteo: believed yes, **verify per API**); Google Calendar ICS does not (use the function). A function on the same origin has no CORS issue.
- **Netlify free plan.** Netlify moved to credits on 14 April 2026; confirmed rates: bandwidth 20 credits per GB, compute 10 per GB-hour, web requests 2 credits per 10,000 (the 15 credits per deploy comes from `docs/deploy.md`; the April changelog does not list deploys). Third-party pages say the free plan has 300 credits a month; I did not find that on Netlify's own page (**unverified**). A few thousand tiny proxy calls cost almost nothing, but a public, uncached proxy could be hammered, which is why the rate limit and cache matter. Documentation-only pushes to `main` are already kept off production (`docs/deploy.md`).
- **OAuth redirect on a static site.** Registered redirect URIs must be exact and HTTPS; localhost for dev; `*.netlify.app` previews fail (same limit as flashcards). Standalone iPhone apps open OAuth in a separate sheet, and returning to the installed app can lose in-memory state (**unverified**).
- **Where tokens live.** On-device only: localStorage is readable by any script on the origin, so keep the third-party script list empty (the site has no analytics now). Do not sync tokens through the sync blob; sync is meant to be an opaque progress file.

## 8. Risks (checklist)

| Risk | Where it bites | Mitigation |
|------|----------------|------------|
| Secrets in the public repo or bundle | any API key, ICS URL, client secret, ntfy topic | env vars in the function only; extend `check:dist` to fail on key-like strings; never `VITE_` prefix a secret |
| Reading others' data on screen | email senders/subjects, calendar attendees | show counts or generic shapes, never names or titles |
| Screenshots and streams | anything personal drawn in the game | opt-in, a "hide real-world details" toggle, nothing sensitive by default |
| Open proxy / quota burn | a public function fetching upstreams | origin check, rate limit, cache, pairing token |
| Free-plan limits | request or compute credits, Blobs reads | small payloads, caching, no polling loops, effects off by default |
| OAuth Testing mode | 7-day refresh expiry, 100 users, unverified-app warning | accept weekly re-login or avoid OAuth |
| Terms of service | automating or scraping Uber Eats; heavy Google Photos use | links only; use official APIs only |
| Account safety | Gmail send/read, work accounts | personal account only, least-privilege scopes, never CollegeVine accounts, revocable at myaccount.google.com |
| Pressure | notifications, unread badges, streaks | notifications opt-in and rare; no counters that shame |
| Location | weather, Strava routes | coarse city only; no GPS |
| Everything off | each effect | feature flag defaults off; the game never waits on a network call |

## 9. Ranked list (value for the game vs effort vs risk)

1. **Pixelated photos** (high charm, small effort, near-zero risk).
2. **Weather in the window** (tiny effort, no risk, small charm).
3. **Now playing via Last.fm** (small effort, low risk, a lovely touch on the record player).
4. **In-game browser, feeds and allowlist only** (medium effort, low-medium risk, strong joke fit, shares the proxy function).
5. **Calendar via a private ICS link** (medium effort, medium risk, strong "real day" feeling).
6. **GitHub activity** (small, low value).
7. **Uber Eats link** (tiny, harmless, depends on taste).
8. Reminders / push (medium, goes against the quiet rule).
9. Gmail read (large, high risk, low payoff), then Strava, Spotify, send email: skip.

## 10. Recommended first experiment

**Pixelated photo frame, device-only.** One object, a file input, a pure `pixelate(image, palette)` function with a test, IndexedDB storage of the small result, a viewer that cycles them, a delete button. No server, no login, no new dependency, no network. It proves the "real life in the game" feeling at the lowest risk. If it lands, weather (no key) is a one-hour follow-up and Last.fm is the next step that needs a function.

## 11. Open questions for Marc (one at a time)

1. Do you want photos first, and are you comfortable with the pictures staying on one device only (not synced, re-pick after Safari clears storage)?
2. Should any picture be allowed to include people's faces, or should I keep it to places and objects (a note in the UI)?
3. For weather, is a coarse city fine (your choice, or none), and should it affect the game visibly (rain at the window) or just flavour text?
4. For now-playing and calendar: are you OK with the Netlify function holding a secret (Last.fm key, a calendar link) in an environment variable, with a pairing token so only your devices can read it?
5. Is your Last.fm profile (or any scrobbling) something you use, or would you rather skip music?
6. Calendar: personal calendar only, and shown as unnamed shapes rather than titles?
7. Do you want any push or reminder at all, or is "no notifications ever" the rule?
8. Uber Eats: a plain "order food" link in the game, or nothing?
9. In-game browser: do you want it, with a curated allowlist (which of your own sites or feeds, plus Wikipedia and Hacker News), feeds first, and fake in-world sites as the always-on default?
10. Email: do you still want it given the weekly re-login and the others' data on screen, or drop it?

## 12. Sources

- Google OAuth app verification and production readiness: https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance
- Restricted scope verification (security assessment, annual reassessment): https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- Gmail scope classification: https://developers.google.com/gmail/api/auth/scopes
- Google OAuth for browser apps (implicit flow, Identity Services): https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow
- Testing mode, 100 test users and 7-day refresh tokens: https://developers.google.com/health/setup and https://support.google.com/cloud/answer/15549945
- Google Photos Library API changes (31 Mar 2025): https://developers.google.com/photos/support/updates
- Google Photos Picker API: https://developers.google.com/photos/picker/guides/media-items and https://developers.google.com/photos/picker/reference/rest/v1/sessions
- Google Calendar API scopes: https://developers.google.com/workspace/calendar/api/auth
- Uber Consumer Delivery APIs: https://developer.uber.com/docs/consumer-delivery/introduction and Marketplace: https://developer.uber.com/docs/eats/introduction
- Spotify quota modes: https://developer.spotify.com/documentation/web-api/concepts/quota-modes ; Feb 2026 changes: https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide
- Last.fm `user.getRecentTracks`: https://www.last.fm/api/show/user.getRecentTracks
- Open-Meteo terms: https://open-meteo.com/en/terms
- Strava rate limits and single player mode: https://developers.strava.com/docs/rate-limits/
- WebKit Web Push on iOS: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- ntfy PWA and known issues: https://docs.ntfy.sh/subscribe/pwa/ and https://docs.ntfy.sh/known-issues/
- Netlify credit pricing update: https://www.netlify.com/changelog/2026-04-14-pricing-updates-april-2026/
- Netlify function usage and billing: https://docs.netlify.com/build/functions/usage-and-billing/
- Mozilla Readability (Node use, sanitising warning): https://github.com/mozilla/readability
- Hacker News API: https://github.com/HackerNews/API
- Wikimedia User-Agent policy: https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy
- File System Access API: https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker

## 13. Not verified

Safari status of the File System Access API (page table did not load); Uber Eats deep-link formats and Uber terms on automation; Apple Music/MusicKit requirements; GitHub unauthenticated limit; Open-Meteo CORS and key policy; whether the Google ICS endpoint sends CORS headers; iOS standalone OAuth return behaviour; Netlify free-plan credit amount; Netlify function timeout and response size limits; Hacker News API CORS; robots.txt and terms of service questions for each reused site; exact Spotify 2026 dev-mode changes; the cost of Google's CASA assessment; whether the Calendar scopes are sensitive.
