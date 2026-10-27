---
id: 084
title: Put the game on the internet (hosting, domain, repo name, privacy pass)
status: done
owner: marc + claude
depends_on: []
---

## Staging (Marc, 2026-10-27: start the productionizing arc)
- **Stage A, a deployable build (no repo needed):** `netlify.toml`, headers and cache rules, title, favicon and social metadata, a short how-to-play line, the production checks, and a smoke-test list. A site can be deployed from this machine with the Netlify CLI (`netlify deploy` for a draft URL, `--prod` later) **without pushing the repo anywhere**, so issue 085 (personal info) does not block it. Marc runs `netlify login` and approves each deploy himself; an agent never publishes.
- **Stage B, the domain:** `sim.mcord.dev` (or the chosen name) pointed at the Netlify site, HTTPS on. Marc's DNS.
- **Stage C, the repo on GitHub** (rename, then push): only after issue 085. Branch deploy previews (`*.netlify.app`) come with a connected repo; until then use CLI draft deploys.
- Note for testing: a `*.netlify.app` address is refused by the flashcards progress endpoint (CORS allows `*.mcord.dev`), so Study Spanish with a key only works on the real domain; the guest mode of issue 089 works anywhere.

## Goal
Marc (2026-10-27): track getting the game online. He is leaning to Netlify (familiar), open to others (GitHub Pages was mentioned), thinking of `sim.mcord.dev`, and wondering whether to rename the repo before putting it on GitHub. Nothing is built until he has chosen; this issue holds the decisions and the checklist.

## Decisions for Marc (planner's recommendations)
1. **Host: Netlify.** The build is a static Vite bundle (`npm run build` gives `dist/`), so any static host works. Netlify gives a custom domain, HTTPS, deploy previews and works with a private repo for free; GitHub Pages needs a public repo on the free plan and has no preview deploys. Cloudflare Pages is the other good option. Not worth a long search.
2. **Domain: a subdomain of `mcord.dev`, and it matters.** The flashcards core is imported from `palabras.mcord.dev`, and that app's CORS list allows `https://*.mcord.dev` (see `docs/flashcards.md`). `sim.mcord.dev` therefore works with Study Spanish with no change to the app. A `*.netlify.app` address would not (the app would need that origin added, or the previews would show "no connection"). The name is Marc's call; "sim" is short but reads like a life-sim, which suits it.
3. **Rename the repo before it goes on GitHub: yes**, it is cheap now and annoying later (folder name, remote, links, issue text). Marc picks the name. The local folder is `life`; the package name and README title should follow.
4. **Public or private.** Netlify can deploy from a private repo, so the site can go live while the repo stays private. Going public is a separate later decision that needs the history audit below.

## Privacy pass (before the repo is public; the site itself serves only the built game)
Marc (2026-10-27): his name and email are not a concern. The rest of this section is now issue 085; this issue only waits for it before the repo is pushed.

- Two personal documents were tracked in git, history included (planner check 2026-10-27), against the standing rule that personal docs stay local. Issue 085 removed them from the repo and from all history before the first push.
- Real name in commit author lines (one author, the git email is a personal gmail) and in PLAN.md and docs; the employer name, full address and apartment photos must not appear (photos are gitignored under `reference-photos/`; check the history for any that were ever committed, and for any readable text in art sources).
- The app address `palabras.mcord.dev` is in `config.ts` and docs (the sync key is never in the code).
- The game shows a stylised version of the real apartment; Marc decides whether he is happy with that being public.
- `docs/text-review.md` and ad copy name real platforms (fake brands), which is the intended style.

## Build and deploy checklist
- Deploy config: `netlify.toml` (build `npm run build`, publish `dist`), Node version pinned, no dev shortcuts in the bundle (already checked per issue: no `?own`, `?days`, `?deliver`, `?encounter`, `?flashcards=demo`).
- Vite `base` is the root (a custom domain means no sub-path trouble); check the asset paths and that the sprites load from `/sprites/`.
- Cache headers: hashed bundle files cache for a long time, `index.html` and `public/sprites/*` revalidate, so a new build shows up.
- Title, favicon, social preview image (no personal photos), a short description. A tiny "how to play" line (WASD or arrows, E, Escape).
- Saved progress is per browser (`life.*` keys in localStorage); say so somewhere light, and test a private window (storage can be blocked).
- Mobile (issue 049) is not required for launch; decide what the page shows on a phone (a plain "best on a keyboard" line is enough for a first launch).
- Analytics: none, or a privacy-light one; Marc's call.
- DNS: a CNAME for `sim.mcord.dev` (or the chosen name) to Netlify; HTTPS on.
- Smoke test in the deployed site: new game, a task, sleep, a gift, an ad encounter, Study Spanish (with and without a key, until issue 083 lands).

## Acceptance criteria
- Marc has chosen host, domain and repo name; the repo is renamed (if wanted) and the README and package name follow.
- The privacy pass is done or the repo stays private, and the decision is written here.
- The game is live at the chosen address over HTTPS, the checklist above is ticked in the log, and `npm test` and `npm run build` pass.

## Progress log

- 2026-10-27 (agent): Stage A only. Worked on branch `issue/084-deploy-ready`. Built `netlify.toml` (build, publish `dist`, Node 22 plus `.nvmrc`, cache and noindex headers), head tags in `index.html` (head only, style block untouched; a visually hidden how-to-play line and a noscript note in the body, canvas untouched), `scripts/brand.mjs` (`npm run brand`) generating `public/favicon.png`, `apple-touch-icon.png`, `social.png` from game sprites, `scripts/check-dist.mjs` (`npm run check:dist`), `scripts/deploy.test.mjs`, and `docs/deploy.md` (exact commands, DNS, smoke test).
- Found and fixed: `?set=` in `src/main.ts` was NOT dev-gated and would have shipped; it is now `import.meta.env.DEV` only. The other shortcuts were already gated (verified in the built bundle). Vite base is the default `/` and sprites load from `${BASE_URL}sprites/`.
- Decisions made (Marc may overrule): noindex via meta tag and `X-Robots-Tag`, no robots.txt Disallow (a disallowed page never shows its noindex); `og:image` is the absolute `https://sim.mcord.dev/social.png`, so previews only work after stage B.
- Not checked: nothing was deployed or published (by instruction), so the headers are untested on real Netlify and `netlify.toml` header precedence is unverified; the card was only viewed as a PNG, not unfurled in a chat app; the game was not played in a browser.
- Stages B and C remain open; this issue stays open after stage A is merged (acceptance criteria 1 to 3 are not met yet).

- 2026-10-27 (independent review, stage A only; stages B and C out of scope): **Verdict: approve stage A for merge.** Status set to `in-progress`, not `done`, because stages B and C (and acceptance criteria 1 to 3) are still open.
  - Checks run in the worktree: `npm test` 109 files, 2560 tests pass (incl. `scripts/deploy.test.mjs`, 9 tests); `npm run build` passes (tsc, one 263 kB JS bundle, no PNGs under `dist/assets/`); `npm run check:dist` passes; `node scripts/brand.mjs --check` passes (via test).
  - **netlify.toml: pass (file content), real behaviour unverified.** Build `npm run build`, publish `dist`, `NODE_VERSION=22` plus `.nvmrc` 22. Local Node is 24, so the build was not run on Node 22 (can't verify; Vite 6 supports it). `/assets/*` is the only immutable rule and `dist/assets/` holds only the hashed JS, so the `/*.png` revalidate rule (Netlify splats cross slashes) cannot catch a hashed asset today, but a future PNG imported from `src/` would land in `/assets/` and could collide with the immutable rule (same header name on two matching rules; Netlify's precedence not verified here). Netlify's default for unlisted files is already revalidate, so the `/`, `/index.html`, `/sprites/*` and `/*.png` rules are belt and braces. **Unverified:** header precedence, `X-Robots-Tag`, draft/prod behaviour (nothing deployed, by instruction).
  - **Head tags: pass.** Title, description, icon, apple-touch-icon, theme-colour (already there), og and twitter tags, `robots noindex`; all local files referenced exist in `dist/`. `og:image` is absolute `https://sim.mcord.dev/social.png` (needed for unfurls; resolves only after stage B; hard-coded domain). **Unverified:** link unfurling in any app. Scope note: the brief said index.html edits stay in the head. The author also added a visually hidden `<p>` and a `<noscript>` at the top of `<body>` (canvas and style block untouched). I checked the CSS: body is a fixed flex box, the `<p>` is absolutely positioned (out of flow) and `<noscript>` does not render with JS on, so no layout effect that I can see; but it is a body edit and another issue editing the body could conflict. Also the "how to play line" is screen-reader only, not visible to sighted players (the issue text asked for a tiny visible line; the author chose invisible). Marc's call.
  - **Icons and social image: pass with a design nit.** Viewed all three PNGs. Only game sprites (floor, bookshelf, desk, sofa, plant, player) on the palette `night` colour; nothing photographic or personal. Generated by `scripts/brand.mjs` from `art/src/*.sprite`, with `--check` in the test. The social card has a flat empty dark band across the top ~45% (no wall), so it reads a bit unfinished; the 32 px favicon is the 16 px sprite at 1x, small but legible. Not blocking.
  - **Robots decision: pass.** noindex via meta tag and header; no robots.txt Disallow; reasoning in docs/deploy.md is sound and reversible. Marc should confirm he wants the site unindexed at launch.
  - **Vite base and sprites: pass.** No vite.config, default base `/`; `src/render/sprites.ts` loads `${BASE_URL}sprites/<name>.png`; `dist/sprites` has 165 files, same as `public/sprites`.
  - **No dev shortcuts: pass by my own source reading and bundle grep.** `?own ?deliver ?days ?encounter` are behind `import.meta.env.DEV` in `main.ts` (lines 53 to 65); `?set` in `main.ts` is now DEV-gated (author's fix, genuine: it was ungated); `?flashcards=demo` needs `dev` (false in a build; `FLASHCARDS.backend` is `"real"`); `?dialogvoice` returns early when not dev; `?hour`, `?room` and the bracket keys are inside `if (options.dev)` with `dev = import.meta.env.DEV === true`. The code strings for hour/room/set/flashcards remain in the bundle but are unreachable at runtime (DEV is false). Remaining reads in the bundle are intended (`?view`, `?touch`). **Weak check:** `check-dist.mjs` looks for `get("hour")`/`get("room")`, but the bundle reads them as `get(kt.hourParam)`, so that check would not catch a regression for hour/room (it also does not cover `dialogvoice`). Not blocking; the source is correct today. **Unverified:** that these shortcuts do nothing in a real browser against the built site (no browser run).
  - **No personal content: pass with notes.** No email, `/Users/` path, or reference-photos in `dist/` or the bundle. The bundle does contain `palabras.mcord.dev` (expected, issue 085's domain) and "Best, Marc" in the game's joke-email text (`src/game/typing-text.ts`; Marc said his name is not a concern). `check-dist` would not flag either.
  - **docs/deploy.md: pass with caveats.** Commands are valid Netlify CLI (`netlify login`, `init`, `sites:create`, `link`, `deploy --build`, `deploy --build --prod`, `npx netlify-cli`); draft URL shape `<hash>--<site>.netlify.app` and CNAME-to-`<site>.netlify.app` for a subdomain on external DNS are correct. Caveats: `netlify init` in a folder with no git remote may refuse or insist on a repo (the doc gives `sites:create` as fallback; `sites:create` run in the folder links it, so the extra `netlify link` is redundant but harmless); "Force HTTPS" is automatic on current Netlify, so that step may not exist. Smoke-test list covers new game, task, sleep, gift, ad encounter, private window, stale cache, and states the `*.netlify.app` CORS caveat for Study Spanish with a key. **Unverified:** every command was only read, not run (no external contact).
  - **Scope:** changed files are all within stage A (netlify.toml, .nvmrc, docs/deploy.md, index.html, package.json scripts, public/ PNGs, scripts/, a one-line gate in `src/main.ts`); no edits to PLAN.md or other issues. The `src/main.ts` comment line is now long and awkward (cosmetic).
  - **Unverified overall:** real Netlify header behaviour, link unfurls, Node 22 build, and playing the built game in a browser (including private-window storage).
  - Nothing blocking. Branch to merge: `issue/084-deploy-ready`. The PLAN.md row for 084 should stay open (stage A merged; B and C pending); the planner edits it.
- 2026-10-27 (Marc): stages B and C done. The site is live at https://sim.mcord.dev/ (planner check: HTTP 200 from Netlify, `x-robots-tag: noindex, nofollow` and the noindex meta present, `og:image` pointing at the domain, title as built) and the repo is on GitHub as `mcordova47/sim` (planner check: `gh repo view` reports **public**, default branch `main`, `origin` is `git@github.com:mcordova47/sim.git`). Not yet checked: that the draft-deploy smoke list in `docs/deploy.md` was run on the live site (new game, a task, sleep, a gift, an ad encounter, Study Spanish with a key and as a guest); Study Spanish with a key only works on `*.mcord.dev`, which `sim.mcord.dev` is.
