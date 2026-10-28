# Deploying the game (issue 084)

The game is a static Vite bundle (`npm run build` writes `dist/`). Host: Netlify. Config: `netlify.toml`. Nothing here needs the repo on GitHub; you deploy from this machine with the Netlify CLI. An agent never runs `netlify login` or `netlify deploy`: you do, and you approve each one.

## Auto-deploy (Marc, 2026-10-27)
The Netlify site is connected to the GitHub repo (`mcordova47/sim`) and **deploys automatically**: a push to `main` builds and publishes https://sim.mcord.dev/. So anything on `main` that is pushed goes live; the CLI steps below are for a draft URL or a manual deploy only. The pre-deploy checks (`npm test`, `npm run build`, `npm run check:dist`) are therefore worth running before a push, since there is no manual gate; planners and agents never push, Marc does. Netlify branch deploy previews (`*.netlify.app`) are available for branches and pull requests: Study Spanish with a key does not work on those addresses (the progress endpoint allows `*.mcord.dev` only) but the guest mode does.

## Production branch (proposed by Marc, 2026-10-28)
Idea: Netlify's production branch is a separate branch, `production`, instead of `main`. Pushing `main` then only makes a free branch deploy (a preview at `main--<site>.netlify.app`), and pushing documentation, issues or `PLAN.md` changes no longer costs a production deploy (about 15 credits). To go live: `git push origin main:production` (or merge `main` into `production`), after `npm test`, `npm run build` and `npm run check:dist`. Netlify setting, done by Marc: Site configuration, Build & deploy, Branches and deploy contexts, Production branch = `production`; keep branch deploys on for `main`. **Manual deploy button (issue 110):** GitHub, Actions, "Deploy to production", Run workflow (optionally a commit or tag). It runs `npm ci`, `npm test`, `npm run build` and `npm run check:dist` and only then pushes the commit to `production` (a plain push: it is refused, never forced, if `production` is not an ancestor). Needs no Netlify secret. Marc runs it; agents never do. Until that setting is changed, a push to `main` still deploys production, as described above. The sync function uses the preview Blobs store on branch deploys, so a `main` preview never touches real sync data.

## What is already set up
- `netlify.toml`: build `npm run build`, publish `dist`, Node 22 (also `.nvmrc`).
- Headers: `/assets/*` (hashed by Vite) cache for a year; `/`, `/index.html`, `/sprites/*` and the root PNGs revalidate, so a new build shows up. Every page also sends `X-Robots-Tag: noindex, nofollow`.
- `index.html` head: title, description, favicon, apple touch icon, theme colour, Open Graph and Twitter tags, plus a `noindex` meta tag. A visually hidden line (for screen readers) says the controls, that progress is saved in the browser and that a keyboard is best. The canvas and the style block are untouched.
- `public/favicon.png`, `public/apple-touch-icon.png`, `public/social.png` are generated from the game's own sprites and palette by `npm run brand` (no photos, nothing personal; the figure is the game's player sprite). `node scripts/brand.mjs --check` fails if they are out of date.
- Vite `base` is the default `/` (no `vite.config`), sprites load from `/sprites/<name>.png`.
- `og:image` is `https://sim.mcord.dev/social.png` (an absolute URL, which link previews need). It only resolves once the domain is live (stage B); until then previews on a `*.netlify.app` address show no image.
- Search engines: **noindex** until you say otherwise. There is deliberately no `robots.txt` with a `Disallow`: a crawler that is told not to fetch a page never sees its `noindex`. To allow indexing later, delete the `X-Robots-Tag` block in `netlify.toml` and the `robots` meta tag in `index.html`.
- Dev shortcuts (`?own`, `?days`, `?deliver`, `?encounter`, `?flashcards=demo`, `?set`, `?hour`, `?room`, `?dialogvoice`) are dev-server only. `npm run check:dist` verifies the built bundle does not read them and has no email address or local path in it.
- Analytics: none.

## The sync server (issue 103)
`netlify/functions/sync.mjs` answers `/api/sync` (logic in `netlify/lib/sync-handler.mjs`, see `docs/sync.md` section 8) with Netlify Blobs: stores `sync` (production) and `sync-preview` (every other context). It needs no environment variable, secret or Netlify setting: Blobs access is given to a function at runtime, and the `[functions]` block in `netlify.toml` only names the folder. The rate limit (60 requests a minute per IP) is in the function's own config.
- `npm run dev` and `npm run preview` serve a fake of it (the same handler over an in-memory store, in `vite.config.ts`, cleared on restart). A second browser profile on the same address is "the other device". `npm run check:dist` fails if the fake or the server code is in the build.
- `netlify dev` runs the real function against a local Blobs sandbox (Marc runs it; agents do not).
- After a deploy, the function's log is under Logs and metrics, Functions, `sync`. The code logs nothing.

## Before every deploy
```
npm install
npm test
npm run build
npm run check:dist
npm run preview        # open the printed address, play for a minute
```

## Stage A: a draft URL (you run these)
One time:
```
npm install -g netlify-cli      # or: npx netlify-cli <command> for each command below
netlify login                   # opens a browser; you approve
netlify init                    # in this folder: "Create & configure a new project", team, a site name
                                # (when asked about a repo, choose not to connect one for now;
                                #  if it insists on a git remote, use `netlify sites:create` and then `netlify link` instead)
```
Each deploy:
```
netlify deploy --build          # builds with npm run build, uploads dist/ as a DRAFT, prints a "Website draft URL"
```
That URL (`https://<hash>--<site>.netlify.app`) is private-ish (unguessable, not linked) and does not touch the live site. Check it:
```
curl -sI https://<draft-url>/ | grep -i -E "cache-control|x-robots"     # revalidate + noindex
curl -sI https://<draft-url>/sprites/bed-made.png | grep -i cache-control  # max-age=0, must-revalidate
curl -sI https://<draft-url>/assets/<the index-*.js name from view-source> | grep -i cache-control  # immutable
```
Then play it (list below). When happy, publish to the site's main URL:
```
netlify deploy --build --prod
```

## Stage B: sim.mcord.dev (your DNS)
1. Netlify: Site configuration, Domain management, Add a domain, `sim.mcord.dev`. Choose "I'll configure DNS myself" (the domain is not on Netlify DNS).
2. At the DNS host for `mcord.dev`: add `CNAME  sim  ->  <site-name>.netlify.app` (Netlify shows the exact target).
3. Back in Netlify, Domain management, HTTPS: "Verify DNS configuration", then "Provision certificate" (Let's Encrypt). It takes a few minutes. Turn on "Force HTTPS".
4. Check: `curl -sI https://sim.mcord.dev/` returns 200 over HTTPS, and a link pasted in a chat shows the preview image.
5. Studying Spanish with a key now works there (see below).

## What to test on the deployed site
Use a normal window, then a private window (storage can be blocked; the game must still start).
- **New game:** it loads with no console errors (the sprites come from `/sprites/`; a missing one shows as a labelled box), the room draws, you can walk, the favicon and tab title are right.
- **A task:** do one (make coffee), points and popup appear, the score is kept after a reload (saved in this browser).
- **Sleep:** the sleep sequence plays, the clock jumps, the morning payout lands.
- **A gift:** receive and open a delivery box (it needs the days to pass; sleeping a few times does it).
- **An ad encounter:** keep playing until one interrupts (entrance flash and bar wipe), then dismiss it.
- **Study Spanish with a key:** will NOT work on a `*.netlify.app` address, because the progress endpoint's CORS only allows `*.mcord.dev`. Expect "no connection" there. Test it on `sim.mcord.dev` after stage B.
- **Study Spanish as a guest** (issue 089, in progress): should work anywhere once it merges.
- **Phone:** the touch layer (issues 087, 090, 092) if they have merged; otherwise it is a keyboard game.
- **Stale cache:** deploy twice; the second deploy shows up on a normal reload (no hard refresh).

## Later
Stage C (rename the repo, push to GitHub, connect it to Netlify for branch previews) waits for issue 085 (personal info). Do not push before that.
