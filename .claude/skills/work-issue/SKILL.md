---
name: work-issue
description: Work one local issue from issues/ for the life platformer. Loads PLAN.md and the issue, checks dependencies, does the work, verifies each acceptance criterion, has an independent review agent check it, and reports back with what Marc should say to the planner. Use as `/work-issue 006`.
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
- If you changed how the main room looks on purpose (art, map, lighting, draw order), the golden frame test (`src/game/main-room-frames.golden.test.ts`) fails. Look at the rendered room, then re-record with `UPDATE_GOLDEN=1 npm test` and commit the new `src/game/golden/main-room-frames.json` with a line in your log about what changed. If it fails and you did not change the room, that is a bug.
- If a criterion can't be met or checked, say so plainly. Do not mark it as passing.

## 6. Finish
- Set `status: review` (not `done`; only the reviewer closes it) and write a progress-log entry: what changed, files touched, anything left over, and what you could not check (for example, how something feels in a browser).
- Commit your work on the issue branch (including the issue file) so it can be merged. Use messages starting `NNN:`. If the user had you work in the main checkout instead, don't commit unless they ask.

## 7. Get an independent review
Do this yourself, without waiting to be asked. Start a fresh review agent with the Agent tool (general-purpose, run in the foreground so you get its verdict) and have it follow `.claude/skills/review-issue/SKILL.md` for this issue number. Your prompt to it should give:
- the worktree path and branch, and the path to the review-issue skill in that worktree;
- the rules: it must not fix anything, may edit only the issue file (review entry and status) and commit that on the branch with a message starting `NNN: review`, and must not merge, push or remove worktrees;
- a request to write its own independent checks outside the repo, aimed at edge cases, and not just rerun yours;
- anything you could not verify (such as browser feel), so it records those as unverified instead of passing them;
- not to touch other worktrees, and to keep temp files outside the repo.

Do not tell the reviewer your conclusions ("this works", "all criteria pass") and do not argue its verdict into shape. A reviewer who is told the answer tends to agree with it.

When the verdict comes back:
- **Approve:** the reviewer has set `status: done` on the branch. Nothing more to change.
- **Changes needed:** work through its checklist on the same branch, tick items off in the progress log, set `status: review` again and commit. Then run a new review agent. Stop after two rounds and report instead of looping; ask Marc if a finding is a judgement call rather than a defect.
- If you can't start a subagent in your session, say so and tell Marc to run `/review-issue NNN` in a fresh session. Do not review your own work and call it independent.

## 8. Report, and tell Marc what to say to the planner
Marc relays your result to the planner (the main session that merges branches and updates `PLAN.md`), so your last message must make that easy. Keep it short and end with a ready-to-paste block. Include:
- issue number, final status, reviewer verdict, criteria met or not met, files changed;
- branch name and worktree path;
- anything the review couldn't verify, and open questions or follow-ups for the planner (for example, files likely to conflict with `main`, or new issues you think are needed);
- how Marc can try it himself, if the issue is something he should play or look at: the worktree path and the command to run (usually `npm run dev`), and what to try.

End with exactly one of these blocks, filled in:

If the review approved and nothing needs Marc's eyes:
```
Say to the planner: "Merge issue NNN (branch issue/NNN-slug, approved by an independent review). Update the table and remove the worktree."
```

If Marc should try it first:
```
Try it: cd <worktree path> && npm run dev   (what to look at: <one line>)
Then say to the planner: "NNN feels good, merge it."   or   "NNN: <what's off>."
```

If the review asked for changes you couldn't finish, or something needs a decision:
```
Say to the planner: "NNN is not ready. <the blocker or the decision needed>. Branch issue/NNN-slug is in its worktree."
```
