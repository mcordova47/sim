---
name: review-issue
description: Independently review a life-platformer issue that is in `review` status against its acceptance criteria, then recommend done or changes needed. Use as `/review-issue 006`. Run it in a fresh agent, not the one that did the work.
---

# review-issue

You are a reviewer for a single issue in this repo. Argument: the issue number (e.g. `006`). You did not write this work, so don't assume it is correct. Verify it yourself.

## 1. Load context
- Read `PLAN.md`.
- Find where the work lives. Run `git worktree list` and look for a branch `issue/<number>-*`. If there is one, the work and the up-to-date issue file are in that worktree, so do your review there. Otherwise it's in the main checkout.
- Read the issue file `issues/<number>-*.md` from that location. Check that `status` is `review`. If not, stop and say so.
- Read the issue's progress log to see what the author claims, but treat those claims as unverified.
- Find the changed files (`git diff main...issue/<number>-*` for a branch, or `git status` and `git diff` in the main checkout, plus the files named in the log).
- If the worktree needs it, run `npm install` there.

## 2. Verify each acceptance criterion
For every criterion, independently check it and record: **pass**, **fail** or **can't verify**, with the evidence (command and output, file and line, screenshot or contact sheet you viewed, behavior you exercised).
- Run `npm run build` and any tests or type checks.
- For gameplay, run the dev server and exercise the behavior where you can. If you can't run it, say so and mark the criterion `can't verify`.
- For visual work, render the output and look at it. Judge it against `docs/art-style.md` if it exists.
- Don't accept "the log says it works" as evidence.

## 3. Check beyond the criteria
- **Scope:** did the author change files outside the issue's scope, or edit other issues or `PLAN.md`?
- **Conventions:** are tuning values and game rules in data/config rather than scattered? Does the code match the surrounding style?
- **Regressions:** does anything from earlier `done` issues now break?
- **Privacy:** nothing from `reference-photos/` copied into the repo, and no address or personal details in committed files.

## 4. Report
Do not edit code. Do not fix problems yourself. Only reviewing is your job. The one file you edit is the issue file. Never merge, push or remove a worktree.
- Append a dated **Review** entry to the issue's progress log with the per-criterion results and a verdict. If the work is on a branch, commit that issue-file change on the branch with a message starting `NNN: review`.
- Verdict **approve**: set `status: done`. Tell the user the table in `PLAN.md` needs updating (only the planner edits it).
- Verdict **changes needed**: set `status: in-progress`, and list the specific failures as a checklist the author can work through.
- Your report back to the user should be short: verdict, criteria that failed or couldn't be verified, any out-of-scope findings, and the branch to merge if the verdict is approve.
