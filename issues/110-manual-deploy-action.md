---
id: 110
title: A manual "deploy to production" button on GitHub
status: todo
owner: claude
depends_on: []
---

## Goal
Marc (2026-10-28): after the Netlify production branch is `production` (docs/deploy.md, "Production branch"), a manual deploy action on GitHub.

## What to do
- A GitHub Actions workflow `.github/workflows/deploy.yml` with `workflow_dispatch` only (a Run workflow button, no automatic trigger). It checks out `main`, runs `npm ci`, `npm test`, `npm run build`, `npm run check:dist`, and only if all pass fast-forwards the `production` branch to that commit (`git push origin HEAD:production`, with `permissions: contents: write` and the built-in token; no force). Netlify then builds `production` as usual, so no Netlify token or secret is needed.
- Optionally a second input to deploy a chosen commit or tag, and a step summary that prints the commit and the live URL.
- Docs: add the button to docs/deploy.md; the manual `git push origin main:production` stays as the fallback. Agents never run the workflow; Marc does.
- Do this after Marc has switched the production branch in Netlify (his setting). Public repo: Actions minutes are free.

## Acceptance criteria
- The workflow file exists and is valid; a failing test stops the deploy; it never force-pushes; no secrets in the file; docs updated; Marc runs it once to confirm it deploys.
