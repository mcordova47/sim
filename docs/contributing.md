# Contributing (how to make a change yourself)

For Marc, or anyone, doing a change by hand instead of through an agent. It is the same flow the agents use, so the planner can review and merge it like anything else. Nothing here is urgent, and none of it is a rule you have to remember: this page is the memory.

## The short version
1. **Make a worktree** for the change (from the main checkout):
   ```
   git worktree add ../sim-worktrees/NNN-slug -b issue/NNN-slug main
   cd ../sim-worktrees/NNN-slug
   npm install
   ```
   `NNN-slug` is the issue's id and a short name, for example `091d-encounter-real-track`. Every change lives in its own worktree and branch; `main` is never edited directly.
2. **Make the change.** Run the game with `npm run dev`, or the tools with `npm run tools` (it lists them: `lab` for the music lab, `pixel` for the pixel looks page, and more).
3. **Check it** before you commit:
   ```
   npm test
   npx tsc --noEmit
   npm run build
   npm run check:dist
   ```
   If you touched art, `npm run sprites` rebuilds the PNGs from `art/src`; commit the result.
4. **Commit on the branch** (a normal message; only agent-written commits carry the Claude trailer). Then, in the issue file (`issues/NNN-slug.md`), add a dated line to its progress log and set `status: review`.
5. **Ask for the review and merge.** Tell the planner "review NNN". A fresh agent reviews the branch against the issue's acceptance criteria and writes its own entry in the issue file; then the planner merges (`/merge-issue NNN`: checks the record, merges without committing, builds and tests, commits, updates the table, removes the worktree and branch).

You never need to push for any of this. Releasing is separate (`docs/deploy.md`): `git push origin main:production`, or the GitHub "Deploy to production" button.

## Rules worth knowing (the full list is in PLAN.md)
- `reference-photos/` is private and gitignored: never commit it, copy from it into the repo, or write a caption from it.
- No readable text in sprites, no names of real artists, bands or other people who lived within the last hundred years or so (people who died long ago, like Van Gogh or Rimbaud, are fine to mention; Marc, 2026-11-16), no employer, full name or address in the repo.
- Photos from the photo reel never leave the device and nothing about their content is in the repo, the save or sync.
- `main` should never make the live game worse than what is deployed (`docs/deploy.md`).
- New player-visible words go into `docs/text-review.md` so they can be marked later (no rush).

## Where the state lives, and how to read it
- **`main` (the main checkout) is the record.** The issue files on `main`, the table in `PLAN.md` (generated from them) and the pages from `npm run issues:site` all show `main` and nothing else.
- **A branch is work in progress.** Each issue is worked on a branch `issue/NNN-slug` in its own worktree under `../sim-worktrees/NNN-slug`, which is just a second checkout of that branch. The agent edits its own issue file there (status, log, `unverified`, `needs`), and none of that is visible on `main` until the planner merges it. You only go into a worktree to try something (`npm run dev` there); you never need to edit in one.
- **To read the current state:** run `npm run tools -- issues` (builds the pages and opens `dist-issues/index.html`). It reads `main`. Add `--branches` (`npm run tools -- issues --branches`) to also list issues whose branch has moved past `main` (local branches only).
- **Record before asking.** Anything waiting on Marc is written on `main` first (an open `decisions` entry on the issue, or a `needs` entry), and only then asked in conversation, so a question can be forgotten and found again on the "What needs you" page. When an agent's hand-back says something needs a look or a decision, the planner records it on `main` right away, before telling Marc, and removes it when it is answered or the branch is merged. The planner keeps these on the issue file on `main`; at merge it takes the branch's version of the front matter and drops the now-resolved entries.

## The issue files are data
Each issue is a Markdown file with front matter (`id`, `title`, `status`, `owner`, `depends_on`, always strings in quotes where needed). To file one, copy an old issue. Optional fields are `summary` (a one-line headline), `short` and `note` (used by the `PLAN.md` table), `thread` and `kind`, `needs` (what is waiting on someone: `who`, a `kind` of `decide`, `do`, `try`, `review` or `wait`, a plain `why`, and `since`; delete the entry when it is resolved, since an empty list is the calm state), `unverified` (things nobody has checked) and `superseded_by`. `npm run issues:check -- --validate` checks them with plain messages; `npm run issues` regenerates the table in `PLAN.md` (never edit that block by hand); `npm run issues:site` builds the pages into `dist-issues/` (open `dist-issues/index.html`; not committed). The design is in `docs/issues-as-data-design.md`.

## Answering a decision from the command line
Instead of hand-editing an issue's front matter, run one command from the main checkout. It changes only the lines it has to (the order of keys, comments, quoting and the rest of the file stay exactly as they were), checks the result with the same rules as `npm run issues:check -- --validate`, and refuses with a plain message if anything is wrong, such as an unknown issue or decision, a decision that is already answered, or an answer that is not one of the listed options.

```
npm run issues -- answer 134 d1 b                 # a letter, an option's text, or "as recommended"
npm run issues -- answer 134 d1 "something else" --other
npm run issues -- drop 134 d2 "no longer needed"   # the reason is optional
npm run issues -- defer 134 d3 "ask me after the demo"   # stays open, with a dated note
npm run issues -- ask 134 "Should it?" --option yes --option no --recommend yes
npm run issues -- need add 134 --who marc --kind try --why "Look at the pages"
npm run issues -- need resolve 134 "look at the"    # a number, or words from its why
```

Add `--dry-run` to see the change (a few lines of diff) without writing anything. After a real edit it regenerates the `PLAN.md` table if that changed. If the checkout is on `main` and has no other uncommitted changes, it also commits just that file with your own git name and email and a message like `134: answered d1`; otherwise it edits the file only and says why it did not commit (`--no-commit` always skips the commit). It never pushes.

An answered decision looks like this in the file:

```
    status: answered
    answer: "b: Keep it open"
    by: marc
    on: 2026-11-15
```

## Answering from the pages
`npm run issues:serve` (or `npm run tools -- issues --serve`) builds the issue pages and serves them on this computer only (127.0.0.1, a free port that it prints and opens in your browser). Pages opened this way show an **Answer** box on each open decision (choose an option or write your own answer, plus **Drop** and **Keep open** with an optional note) and a **Resolve** button on each need of an issue. They use the same functions as the command above, so the file edit, the validation and the commit are identical. The static pages, and pages opened from disk, have none of this and are unchanged.

Run it from the main checkout. A change is refused, with a plain message on the page and nothing written, if the checkout is not on `main`, if the issue file has uncommitted edits, or if the file changed since the page was loaded (reload the page and try again). Every change also needs the key that only this run's pages carry, so another tab or site cannot write. As with the command, it commits only when the rest of the checkout is clean, never pushes, and serves nothing but the generated pages. Stop it with Ctrl+C. It takes `--no-open` (do not open the browser) and `--branches` (as for the static pages).

## Walking through the text review
`npm run issues:serve` also serves a **Text review** page (the link appears in the menu of the served pages only; the static pages do not have it). It shows one line of `docs/text-review.md` at a time, newest sections first: the string large (in the game's pixel font when it can draw every character and the string is short, otherwise plain text), with its section and where it appears beneath. Choose **Keep**, **Soften** or **Rewrite** (the last two ask for a note or the replacement text), **Skip** (the line comes back later in the same visit), or **Back** to the previous line, where its mark can be changed or cleared with **Clear the mark**. Keys: K, S, R, left arrow for Back, right arrow for Skip.

Each mark is written into `docs/text-review.md` in place (nothing else in the file changes) and committed on `main` under the same rules as an answer: refused with a plain message if the checkout is not on `main`, if the file has uncommitted edits, or if it changed since the page loaded; the commit is skipped, and the page says so, when anything else in the checkout is uncommitted. Nothing is pushed, and nothing in the game changes: an agent applies the marks later in a batch.

A line that appears twice in the document (the dialog tree is under both Dialogs and contemplate) is shown once, and its mark is written to every copy in the same commit. A copy that already carries a different mark (or none, when the first copy is marked) is left alone and shown as a card of its own. That is one switch, `DUPLICATE_POLICY` in `scripts/text-review-page.mjs` (`'once'`, or `'separately'` to ask about each copy); it waits on decision d1 of issue 141.

## Ideas
Have a loose idea? Add a few lines to `docs/ideas.md` (no status, no owner, no deadline); it only becomes an issue when you decide to do it.

## Useful places
- `docs/ideas.md`: parked ideas, a garden and not a backlog.
- `docs/learn/src/README.md`: a self-paced walkthrough of the codebase with small tasks (no deadlines, works without Claude).
- `PLAN.md`: the working rules and the issue table. The table is generated from the issue files (`npm run issues`); never edit it by hand. `npm run issues:check -- --validate` checks your issue file's front matter and says what is wrong in plain words.
- `docs/music-lab.md`, `docs/make-tracks.md`, `docs/music.md`: music.
- `docs/art-style.md`: sprites and the palette.
- `docs/deploy.md`: CI, the production branch and the deploy button.
