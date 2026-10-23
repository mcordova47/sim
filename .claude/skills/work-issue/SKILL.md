---
name: work-issue
description: Work one local issue from issues/ for the life platformer. Loads PLAN.md and the issue, checks dependencies, does the work, verifies each acceptance criterion, and reports back. Use as `/work-issue 006`.
---

# work-issue

You are an agent assigned to a single issue in this repo. Argument: the issue number (e.g. `006`).

## 1. Load context
- Read `PLAN.md` for the design pillars, stack and working conventions.
- Read the issue file `issues/<number>-*.md`.
- Read the issue files listed in its `depends_on`. If any is not `status: done`, stop and report which dependency is unfinished. Do not start work.
- If the issue is `blocked`, stop and report what it is blocked on.

## 2. Choose where to work
Always work in a git worktree on its own branch. This keeps parallel agents from tripping over each other and means nothing reaches `main` until it has been reviewed. The only exception is if the user explicitly says to work in the main checkout.

If a worktree or branch for this issue already exists (`git worktree list`), reuse it instead of creating another.

To create the worktree, from the main checkout:
```
git worktree add ../life-worktrees/<NNN>-<slug> -b issue/<NNN>-<slug>
```
Then work only inside that directory, run `npm install` there if the project has a `package.json`, and use absolute paths. `reference-photos/` is gitignored, so it won't exist in the worktree. Read photos from the main checkout's `reference-photos/` by absolute path.

Never merge, push, rebase onto other branches or remove the worktree. Merging is the planner's job.

## 3. Start
- Set the issue's `status` to `in-progress` and add a dated first entry to its progress log saying what you plan to do.
- If something you need is missing and you can't find it in the repo, ask the user one question at a time. Do not guess at facts about the real apartment (dimensions, furniture, colors); ask for them or point to the photos.

## 4. Do the work
- Stay inside the issue's scope. If you find a needed change outside it, log it in the progress log and mention it in your report instead of doing it.
- Match the surrounding code's style. Follow the conventions in `PLAN.md` and, for art, `docs/art-style.md`.
- Edit only your own issue file (status and progress log) plus the code and assets the issue covers. Never edit other issues or `PLAN.md`.
- Keep game rules and tuning values in data/config files, not scattered through the engine.

## 5. Verify
- Go through the acceptance criteria one at a time. For each, say how you checked it (command run, screenshot or contact sheet viewed, behavior exercised).
- Run `npm run build` and any available tests or type checks if the project has them.
- For visual work, render the result and look at it before claiming it's done.
- If a criterion can't be met or checked, say so plainly. Do not mark it as passing.

## 6. Finish
- Set `status: review` (not `done`; the user or `/review-issue` closes it) and write a final progress-log entry: what changed, files touched, anything left over.
- Commit your work on the issue branch (including the issue file) so it can be merged. Use messages starting `NNN:`. If the user had you work in the main checkout instead, don't commit unless they ask.
- Your report back should be short: issue number, final status, criteria met or not met, files changed, branch name and worktree path if you used one, open questions or follow-ups for the planner.
