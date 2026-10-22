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

## 2. Start
- Set the issue's `status` to `in-progress` and add a dated first entry to its progress log saying what you plan to do.
- If something you need is missing and you can't find it in the repo, ask the user one question at a time. Do not guess at facts about the real apartment (dimensions, furniture, colors); ask for them or point to the photos.

## 3. Do the work
- Stay inside the issue's scope. If you find a needed change outside it, log it in the progress log and mention it in your report instead of doing it.
- Match the surrounding code's style. Follow the conventions in `PLAN.md` and, for art, `docs/art-style.md`.
- Edit only your own issue file (status and progress log) plus the code and assets the issue covers. Never edit other issues or `PLAN.md`.
- Keep game rules and tuning values in data/config files, not scattered through the engine.

## 4. Verify
- Go through the acceptance criteria one at a time. For each, say how you checked it (command run, screenshot or contact sheet viewed, behavior exercised).
- Run `npm run build` and any available tests or type checks if the project has them.
- For visual work, render the result and look at it before claiming it's done.
- If a criterion can't be met or checked, say so plainly. Do not mark it as passing.

## 5. Finish
- Set `status: review` (not `done`; the user or `/review-issue` closes it) and write a final progress-log entry: what changed, files touched, anything left over.
- Do not commit unless the user asked. If they did, make one commit for the issue, with a message starting `NNN:`.
- Your report back should be short: issue number, final status, criteria met or not met, files changed, open questions or follow-ups for the planner.
