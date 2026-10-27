---
id: 084
title: Put the game on the internet (hosting, domain, repo name, privacy pass)
status: todo
owner: marc + claude
depends_on: []
---

## Goal
Marc (2026-10-27): track getting the game online. He is leaning to Netlify (familiar), open to others (GitHub Pages was mentioned), thinking of `sim.mcord.dev`, and wondering whether to rename the repo before putting it on GitHub. Nothing is built until he has chosen; this issue holds the decisions and the checklist.

## Decisions for Marc (planner's recommendations)
1. **Host: Netlify.** The build is a static Vite bundle (`npm run build` gives `dist/`), so any static host works. Netlify gives a custom domain, HTTPS, deploy previews and works with a private repo for free; GitHub Pages needs a public repo on the free plan and has no preview deploys. Cloudflare Pages is the other good option. Not worth a long search.
2. **Domain: a subdomain of `mcord.dev`, and it matters.** The flashcards core is imported from `palabras.mcord.dev`, and that app's CORS list allows `https://*.mcord.dev` (see `docs/flashcards.md`). `sim.mcord.dev` therefore works with Study Spanish with no change to the app. A `*.netlify.app` address would not (the app would need that origin added, or the previews would show "no connection"). The name is Marc's call; "sim" is short but reads like a life-sim, which suits it.
3. **Rename the repo before it goes on GitHub: yes**, it is cheap now and annoying later (folder name, remote, links, issue text). Marc picks the name. The local folder is `life`; the package name and README title should follow.
4. **Public or private.** Netlify can deploy from a private repo, so the site can go live while the repo stays private. Going public is a separate later decision that needs the history audit below.

## Privacy pass (before the repo is public; the site itself serves only the built game)
- `docs/about-marc.md` and `docs/tasks-v2.md` are **tracked in git, history included** (planner check 2026-10-27), although the standing rule is that personal docs stay local. Before the repo is public: decide to move them out of the repo and rewrite history (`git filter-repo`) or keep the repo private.
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
