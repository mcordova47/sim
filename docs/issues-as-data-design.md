# Issues as data: a design note (issue 128)

Status: design only. Nothing here is built, enforced or migrated. Written 2026-11-15 against `main` at `a5af32e`. Every number below was counted from the repo on that day unless it says otherwise.

## 1. Summary

**The recommendation.** Keep the issue files as Markdown with front matter, and add a small number of optional fields to the front matter. Write one zero-surprise Node script (`scripts/issues.mjs`, no server, no framework) that reads `issues/*.md` (and, read-only, the answered-question lines in `docs/*-design.md`) and produces: a static HTML site with the home, thread and "needs you" screens; a generated `PLAN.md` table; and an `issues.json` that an agent can read instead of 165 files. The thread screen is **not authored**: its branches ("What shipped", "Decisions you made", "Still open", "Not verified") are queries over the child issues' fields. The body of each issue stays free prose; its `##` and `###` headings become a drill-down tree for one issue, for free. Build it in five stages, each useful alone. The first stage (a validator plus a generated `PLAN.md` table) needs no new fields and ends the hand edits and the drift. Be candid about what is not worth it: a dependency graph, a timeline, a glossary page, and any backfill of old issues' decisions and summaries beyond the live threads.

**What the data cannot do.** The briefing that inspired this had a voice: "the short version", "a bug I caused", honest caveats. A generator gives the structure and the honesty fields (`unverified`), not the voice. Design for that: keep an agent-written briefing as something you can still ask for, but make it cheap (the agent reads `issues.json`, a few KB, not 165 files).

**One finding that changes the plan.** The existing front matter is not valid YAML in 72 of 165 files (checked with Ruby's strict YAML parser): titles contain `: ` unquoted, for example `title: Issues as data: a schema ...`. A tolerant parser is therefore needed on day one, and a one-time mechanical quoting commit is worth doing before anything richer is added (section 9).

## 2. What exists today (counted)

- **165 files in `issues/`** (the brief says 164; the 165th is issue 128 itself). All 165 have exactly the keys `id`, `title`, `status`, `owner`, `depends_on`.
- Status: `done` 141, `todo` 15, `in-progress` 4, `review` 4, `blocked` 1. Owners: `claude` 102, `marc + claude` 30, `agent` 27, `marc + agent` 5, `marc` 1. `depends_on` is empty in 70 files.
- Headings: every file has `## Goal`; 162 have `## Progress log`, 159 `## Acceptance criteria`; the rest of the vocabulary is long-tail (`Notes` 18, `What to do` 10, then mostly one-offs such as "Marc's answers (2026-10-23)"). Median body is 39 lines, the longest 372. 616 progress-log lines start with a date.
- **Threads are only by name.** 41 sub-issues (`117a`, `111f`, ...) under 9 parents: 007, 009, 091, 106, 109, 111, 113, 114, 117. Several real subjects have no shared id: mobile (049, 087, 090, 092, 093, 094), sync (095, 102 to 104), flashcards (026, 082, 083, 089, 127), the music lab (059, 122, 123). Only `depends_on` links them.
- **`PLAN.md` is a second copy.** It has 165 table rows (one per issue) edited by hand and by `merge-issue`. Today **5 rows disagree with their issue file on status**: 009 (table done, file blocked), 065, 066 and 072 (table done, file still `review`), 113 (table todo, file done). Two more rows (091, 114) carry free-text statuses ("design done, build issues filed") that the file's five-value `status` cannot express. Only 11 rows have a parenthetical note at all.
- **"Needs Marc" is prose.** In issue bodies: "Marc picks" 16 files, "open questions" 17, "Marc decides" 4, "ANSWERED" 1. In `docs/*.md`: 15 design docs have a numbered questions section. Six of them (encounter music, inventory, photo reel, photo gallery, side-project config, track-editor phones) use one regular line shape, `N. **Question? ANSWERED by Marc 2026-10-29: (a) ...**`; that convention appeared from 2026-10-28 on. The other nine record answers some other way (a "answered" heading, a rewritten section) and would need a human or agent to read them.
- **"Not verified" is already a habit.** 137 of 165 issues mention unverified or can't-verify in prose. It is the most consistent honesty signal in the corpus and has no field.
- **Stale statuses on `main` are structural.** `work-issue` sets `in-progress` and `review` on the issue branch; `review-issue` sets `done` there; only `merge-issue` brings it to `main`. So `main` shows a file as `todo` while its branch is `done`. `gh pr list` shows one PR ever (#1, 091d); work happens in local worktrees, so GitHub does not know what is in flight either.
- Tools already in the repo: Node 22 (`.nvmrc`), `scripts/*.mjs` (zero-dependency scripts such as `check-dist.mjs` with `*.test.mjs` run by vitest), mdBook for `docs/learn` (`npm run learn`, local only, no CI), `ci.yml` running tsc, tests, build and `check:dist`. `package.json` has three devDependencies (typescript, vite, vitest) and one dependency.

## 3. Prior art

I fetched each page below with a summarising fetch tool, so what I report is the summary of the page, not a full read of the primary text. Where the page was silent I say so.

| Source | What I read | What it gets right | What to take or leave |
|---|---|---|---|
| GitHub issue forms ([syntax](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)) | Forms are YAML in `.github/ISSUE_TEMPLATE`; required `name`, `description`, `body`; element types `markdown`, `input`, `textarea`, `dropdown`, `checkboxes`. | Structured input at creation time. | It structures the *filing*, not the life of an issue, and lives on github.com. Take the idea of a closed set of kinds. |
| GitHub Projects fields ([single select](https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-single-select-fields)) | Only the single-select page: options with colour and description, up to 50, filter by `field:option`. I did not read the other field types or views. | Typed fields, filtered views. | A second tracker with its own state, off the repo and off a Claude-less laptop. It recreates the two-sources-of-truth problem. Leave. |
| Linear ([conceptual model](https://linear.app/docs/conceptual-model)) | Issues, projects (with milestones), cycles, initiatives (nestable); per-team workflow statuses. It did not cover sub-issues. | The ladder: issue, project, initiative is "thread of threads". | Our `thread` is one level (an issue that groups issues); that is enough for 165 issues. Leave cycles; they are urgency machinery. |
| Backstage descriptors ([format](https://backstage.io/docs/features/software-catalog/descriptor-format)) | Envelope `apiVersion`, `kind`, `metadata` (labels, annotations, tags, links), `spec`; **relations are derived by processors, not written in the descriptor.** | Derive relationships (parent, children, unblocks) instead of storing both ends. | Take derived relations. Leave the envelope: five flat keys we already have are friendlier than `apiVersion/kind/metadata/spec`. |
| ADR / MADR ([template](https://adr.github.io/madr/)) | Sections: context and problem, drivers, considered options, decision outcome, consequences; optional front matter `status`, `date`, `decision-makers`, `consulted`, `informed`. | A decision has a question, options, an outcome and a date; the status and date are in front matter so a list of decisions is cheap. | Take the shape of one decision. Leave one-file-per-decision: our decisions are small, 5 to 12 per design doc, and live beside the work. |
| Obsidian Bases ([help](https://obsidian.md/help/bases)) and Dataview ([docs](https://blacksmithgu.github.io/obsidian-dataview/)) | Bases: each note a row, properties columns; table, list, cards, kanban views; filters and formulas; data stays in Markdown. Dataview: a live index of front matter and inline fields; `TABLE`/`LIST` queries; only indexed fields are queryable. | Proof that "front matter plus saved views" is how people do this. | Needs Obsidian, does nothing in CI, on a phone without the app, or for Claude. Good as an optional extra on Marc's Mac because our front matter will be valid properties. Not the system. |
| mdBook ([markdown page](https://rust-lang.github.io/mdBook/format/markdown.html)) and Eleventy ([front matter](https://www.11ty.dev/docs/data-frontmatter/)) | mdBook: that page does not mention YAML front matter at all (I did not read further); it is chapter-per-file with a hand-written `SUMMARY.md`. Eleventy: front matter is part of a "data cascade", parsed with gray-matter; collections are a separate guide I did not read. | mdBook already renders `docs/learn`. Eleventy treats front matter as data. | mdBook has no aggregation (nothing builds a "needs you" page) without a custom preprocessor, which is as much code as our script. Eleventy brings a dependency tree for one page set. Leave both. |
| JSON Schema ([about](https://json-schema.org/understanding-json-schema/about)) | A declarative format for the structure of data; it **cannot check relationships that need arbitrary code**, so those need a separate semantic step. | Declarative field checks. | Our two kinds of check split exactly that way: shape (enum, required) and relationships (every `depends_on` id exists, no cycles). A 100-line validator does both with no schema library. I did not read Zod's docs. |
| Taskwarrior UDAs ([docs](https://taskwarrior.org/docs/udas/)) | User defined attributes: types `string`, `numeric`, `date`, `duration`, `uuid`; a string may be limited to a list of values; label, default; usable in reports. | Closed value lists with a label, added per project. | Same stance: a few typed, constrained fields, defined once, used by every view. |
| Org mode ([TODO extensions](https://orgmode.org/manual/TODO-Extensions.html)) | Overview only: custom TODO keyword sequences, states versus types, per-file settings. I did not read the subpages. | Status as a small configurable vocabulary. | We keep the five statuses we have; `needs.kind` is the second small vocabulary. |

What I did not read or verify: how GitHub renders invalid front matter in the file view (I recall an error banner on a broken block, from memory, not checked; it matters for the 72 files); `$GITHUB_STEP_SUMMARY` (I know it from memory, not fetched); the `yaml` npm package's own dependency list (believed to have none, not checked; no `node_modules` is installed in the worktree).

**What the prior art says about progressive disclosure and "what needs me".** None of these tools do "headlines first" by default. They all give a filtered table. The pattern that works in all of them is the same two moves: *typed fields* so a view is a query, and *derived relationships* so nobody writes the same fact twice. "Needs me" is a saved filter everywhere (a Linear "assigned to me", a Project view filtered on a field). The new idea here is only the presentation (calm, nested, one subject at a time), and that is a renderer question, not a data one.

## 4. The schema

Principle: **the five existing keys stay exactly as they are, every new key is optional, and anything that can be derived is never written.** A beginner writing an issue by hand (the `learn/*` audience, `docs/contributing.md`) can still write the old five keys and nothing else.

### 4.1 Fields

| Field | Required? | Who writes it | Purpose |
|---|---|---|---|
| `id` | required (exists) | whoever files | Stable key, `NNN` or `NNNx`. |
| `title` | required (exists) | filer | Long name. Must be quoted once files are made valid YAML (section 9). |
| `status` | required (exists) | skills (`work-issue`, `review-issue`, `merge-issue`) | One of `todo`, `in-progress`, `blocked`, `review`, `done`. Unchanged. |
| `owner` | required (exists) | filer | Who does the work. Unchanged. Distinct from `needs.who` (who must act next). |
| `depends_on` | required (exists) | filer | Ids that must be done first. Unchanged. |
| `summary` | required for new issues, optional for old | filer, then the finishing agent | The **headline**: one line, at most about 120 characters, no status words in it ("Photos behave like a phone gallery", not "Photos, shipped"). Fallback when absent: `title`. |
| `kind` | optional | filer | One of `design`, `build`, `research`, `fix`, `umbrella`, `chore`. Lets a view say "design done, build issues filed" without free text. Derivable as `umbrella` when children exist. |
| `thread` | optional | derived by default | Id of the issue that groups this one. **Default: the id minus its trailing letter** (`117c` is in thread `117`), so the 41 existing sub-issues need nothing. Written only for subjects with no shared id (049, 095, 026 and similar). Must point at an existing issue. |
| `area` | optional | filer or backfill | List of tags from a short closed list kept in `scripts/issues.mjs` (proposal: `art`, `music`, `ui`, `mobile`, `flashcards`, `sync`, `process`, `docs`, `engine`). The list is chosen when the backfill is written, from the corpus; I did not derive it here. |
| `needs` | optional | filer, finishing agent, planner; removed when resolved | **Who must act next, and how.** A list of `{who, kind, why, since}`. `who`: `marc`, `planner`, `agent`, or `other` (external). `kind`: `decide`, `do`, `try`, `review`, `wait`. `why`: one plain line, public. `since`: a date, shown quietly, never as "overdue". For `wait`, add `on:` (what is awaited). A *state*, not a history: when resolved the entry is deleted, so an empty or missing `needs` is the calm state. |
| `decisions` | optional | the planner and agents, as they ask and as Marc answers | The structured form of what is today a numbered prose list. Item: `id` (`d1`, unique in the issue), `q` (one-line question), `options` (optional list of short labels), `recommendation` (one line), `status` (`open`, `answered`, `defaulted`, `dropped`), `answer`, `by`, `on` (date), `doc` (link to the design doc section holding the long form). `answer`, `by` and `on` are required when status is `answered` or `defaulted`. An **open** decision whose `who` (default `marc`) is `marc` appears in "What needs you" automatically, so it is not also written under `needs`. |
| `unverified` | optional | `work-issue` step 6 and `review-issue` already produce this list in prose | List of one-line things nobody has checked ("Safari behaviour of the File System Access API"). Never deleted silently: when checked, move to the log. |
| `links` | optional | filer | Pull requests, docs and outside pages: `{title, url}`. Doc paths in the repo go in `docs:` (a list of paths). A lint refuses hosts that are not on a short allow-list (section 11). |
| `superseded_by` | optional | planner | Id of the issue that replaced this one (113e by 117g today). The issue stays; views dim it. |
| `note` | optional | planner | A short status note, the only free text in the generated table (replaces the 11 table rows that have a parenthetical today). |

**Derived, never written:** `opened` (first commit touching the file), `closed` (merge commit that set `done`), `updated`, `children`, `unblocks` (reverse of `depends_on`), `thread` default, "in flight on a branch" (local only, section 7), and the one-line headline for a child when `summary` is missing.

**Deliberately not fields:** priority, estimate, due date, assignee beyond `owner`, labels free-form, a "mood" or urgency, a count of anything. Each invites the to-do wall the project avoids.

### 4.2 Headings as depth (the body stays Markdown)

Yes, the heading structure can be the drill-down tree for a single issue, with no new body format:

- Each `##` heading is a top-level branch, each `###` a child, rendered as nested native `<details>` elements (one open at a time, plus an "Open everything" button), exactly the briefing's interaction.
- A branch's one-line label is the heading text; its first sentence (cut at about 140 characters) is shown beside it. Progress-log lines (616 begin with a date) become leaves: the first sentence is the label, the rest folds.
- A small **map of canonical heading names to roles** gives them icons and an order: `Goal` first and open; `Acceptance criteria`; `Decisions`/`Marc's answers`/`Marc's decisions...` (any heading starting with "Marc's" or "Decision"); `Notes`; `Progress log` last and closed. Unknown headings are shown as plain branches in file order. Nothing is rejected, so the 105 distinct `##` heading texts in the corpus (155 counting `###` and deeper) all render.
- **Honest limit.** First sentences make poor headlines (progress lines start with "2026-10-26 (reviewer, independent): **Verdict: approve.**"). That is why `summary` exists. And headings cannot give the *thread* screen: "What shipped", "Decisions you made, and why", "Still open", "The numbers" in the briefing are not in any one issue; they are built from the children. So: **headings give the issue page; fields give the thread and home pages.**
- Cheap convention for the future, not a rule: new issues use the headings `Goal`, `Decisions`, `Acceptance criteria`, `Unverified`, `Progress log`. The renderer never requires them.

## 5. Views

All views come from the same parsed data. Mockups are ASCII; width is about 38 columns for a phone and about 100 for desktop. Words in `[brackets]` are pills.

### 5.1 Home (phone), filled with the repo's real state

The content below is derived from the corpus, `PLAN.md` and git as they are today. My reading is stated where the data is silent (see the notes under the mockup).

```
+--------------------------------------+
| simagotchi: the work                 |
| Snapshot 2026-11-15, main a5af32e.   |
| If it disagrees with GitHub, GitHub  |
| is right.                            |
+--------------------------------------+
| THE SHORT VERSION                    |
| * The game is playable; 141 of 165   |
|   issues are done.   (see note 1)    |
| * Photos, side-project config and    |
|   the Spanish study screen are the   |
|   live threads.                      |
| * One design is open: this one.      |
| * Nothing is running on a branch.    |
+--------------------------------------+
| WHAT NEEDS YOU                       |
| +----------------------------------+ |
| | [Decide] Issues as data (128)    | |
| | The design note ends with a few  | |
| | questions. Jump to the questions |>|
| +----------------------------------+ |
| | [Try] Manual deploy button (110) | |
| | Run it once and say it deployed. | |
| | Whenever you are near the repo  >| |
| +----------------------------------+ |
| | [Later] Sync check (095)         | |
| | Try the server with netlify dev  | |
| | and two browsers.               >| |
| +----------------------------------+ |
| | [Later] Text pass (037)          | |
| | Mark docs/text-review.md.       >| |
| +----------------------------------+ |
| See everything that is waiting >     |
+--------------------------------------+
| WAITING ON SOMETHING ELSE            |
| [Wait] Spanish drills (127): the     |
| flashcards app's deploy comes first. |
+--------------------------------------+
| IN FLIGHT                            |
| Issues as data (128): the design     |
| note, on its branch.                 |
+--------------------------------------+
| THE THREADS                          |
| Photo gallery (117)    [In progress] |
|   Six of seven shipped; text review  |
|   and phone pass left.               |
| Side project config (111)            |
|                        [In progress] |
|   Parser to effects; two stages left.|
| Study Spanish (026, 127)  [Planned]  |
|   Cards shipped; verb drills next.   |
| Mobile (049)             [In progress]|
|   Design answered; builds shipped.   |
| Encounter music (091)    [In progress]|
|   Track shipped; docs left.          |
| Guitar skill (114)       [In progress]|
|   Levels 1 to 3 and groove shipped.  |
| Track editor on phones (106)         |
|                        [In progress] |
|   Four of five; the last is optional.|
| Customizable decor (062) [In progress]|
|   Stages 1 to 3a done.               |
| Codebase walkthrough (097)           |
|                        [In progress] |
| Everything else          [Shipped] > |
+--------------------------------------+
| Glossary | Plan | All issues         |
+--------------------------------------+
```

Notes on the mockup (what is derived and what is my reading):
1. The "141 of 165" count is **only in the short version**, as a plain fact, and I would drop it if it reads as a scoreboard; no count appears next to What needs you.
2. *Needs* here are my reading of the corpus: 128 (this note ends with questions); 110 (acceptance criteria end "Marc runs it once to confirm it deploys"; its file status is `review`); 095 (the `PLAN.md` row says "Marc still checks the server with netlify dev and two browsers"); 037 (its log says "Still to do: Marc marks it" for `docs/text-review.md`). The corpus has **no field** that says these, which is the point of `needs`. The "Later" pill is the default `kind` weight: nothing is marked urgent.
3. 127 is waiting on the flashcards app's deploy (issue 127, "Sequencing"); design questions for Marc come after the design note is written, so there is nothing to answer yet.
4. *In flight* is nearly empty because the only branch other than `main` and `production` is this one (`git branch -a`); no open PRs. With the local branch overlay (section 7) it would list the branch's issue.
5. The thread cards' one-liners are my paraphrases of the issue files' statuses and `PLAN.md` rows; with the schema they come from the root issue's `summary`.
6. Not shown on purpose: the **housekeeping** the data exposes (65, 66 and 72 sit at `review` in their files while the table says done; 009 says `blocked` though its four children are done; 113 says todo in the table but done in its file; 049's table note says "stage 1 build issue to write" although 087 exists and is done; I did not check that last one further). Those are *planner* tidying, not Marc's. They belong in the validator's output (CI log, local command), never on the home screen. Generating the table removes most of them at the source.

### 5.2 A thread (desktop), for 117

The branches are generated from the children and the root. One is open at a time.

```
+--------------------------------------------------------------------------------------------+
| < Photo gallery thread (117)                             < prev: Photo reel   next: ... >  |
| Photos behave like a phone gallery: browse, delete one, a close-up, a sofa scene.          |
| Status: six of seven stages shipped; one stage left.                  [ Open everything ]  |
+--------------------------------------------------------------------------------------------+
| v What it looks like now                                                                   |
|     Pause menu: manage mode (3 x 2 grid, close-up, delete one). Sofa: the scene. (from     |
|     the root's `## Goal` first paragraph)                                                  |
| > What shipped            117a looks and store - 117b core - 117c manage - 117d look      |
|                           switch - 117e sofa scene - 117f ad interrupt   (each a link)    |
| > Decisions you made, and why   5 answered (2026-10-29), 0 open                            |
| > Still open              117g text review, phone pass, docs (todo)                        |
| > Not verified            (the union of the children's `unverified`; none recorded today)  |
| > Superseded              113e (replaced by 117g)                                          |
| > All the detail          the 117 issue body, as a heading tree                            |
+--------------------------------------------------------------------------------------------+
  Opening "Decisions you made, and why":
  | d1  Looks: Crisp, Soft (default), Chunky      answered by Marc 2026-10-29: as recommended |
  | d2  Phone view shows: six random, no paging   answered by Marc 2026-10-29                 |
  | d3  After an ad the close-up returns          answered by Marc 2026-10-29: as recommended |
  | d4  E in the close-up pays, Esc does not      answered by Marc 2026-10-29: as recommended |
  | d5  The words                                 answered by Marc 2026-10-29: as recommended |
```

(The five decisions are the real answers in `docs/photo-gallery-design.md` section 14.) The briefing's "A bug I caused" and "The numbers" branches have no counterpart in the data; they stay in the issue body as ordinary headings and show up under "All the detail".

### 5.3 "What needs you" inbox (phone)

```
+--------------------------------------+
| What needs you                       |
| Nothing here is urgent. Newest first.|
+--------------------------------------+
| Decide                               |
|  Issues as data (128)                |
|  The design note's questions.        |
|  asked 2026-11-15                  > |
| Try                                  |
|  Manual deploy button (110)          |
|  Run the workflow once.              |
|  asked 2026-10-28                  > |
|  Sync across devices (095)           |
|  Server check, two browsers.       > |
| Do                                   |
|  Text pass (037)                     |
|  Mark docs/text-review.md.         > |
| Review                               |
|  (none)                              |
+--------------------------------------+
| Waiting on something else            |
|  Spanish drills (127): app deploy    |
+--------------------------------------+
```

Calm rules, as design requirements for this view (section 12 has the full list): grouped by kind in words, ordered newest first (not oldest first, which would read as a backlog), no total, no red, no "overdue", dates shown as plain "asked 2026-10-28". An empty state reads "Nothing is waiting on you." The page shows at most five cards on the home screen and links to this page for the rest.

### 5.4 Decisions log (desktop)

Everything answered, newest first, filterable by thread or area; each row: the question, the answer, who, when, and a link to the design doc section with the options. Sources: `decisions` in front matter, plus (read-only) the 30 lines in six design docs (25 answered by Marc, 5 decided by the planner) that already follow `**Question? ANSWERED by Marc DATE: answer**`. I counted 30 such lines (15 answered 2026-10-28 and 10 on 2026-10-29 by Marc, plus 5 marked "DECIDED by the planner") by regular expression over `docs/*.md`.

```
+----------------------------------------------------------------------------------------+
| Decisions                                          filter: [thread v] [area v] [who v] |
| 2026-10-29  Who writes the real encounter track?   (a) Marc composes; agent placeholder |
|             encounter music (091) - design doc section 11, question 1            Marc  |
| 2026-10-29  How long does battle music play?       four passes, then fade   the planner |
| 2026-10-29  Delete one picture: confirm how?       as recommended                 Marc  |
| 2026-10-28  Silhouettes in the inventory?          (b) only what the game showed  Marc  |
| ...                                                                                    |
+----------------------------------------------------------------------------------------+
```

### 5.5 Dependencies and timeline: not recommended as screens

I considered a dependency graph (95 issues have `depends_on`; most chains are short and inside a thread) and a timeline (dates come from git). My recommendation is **not** to build either as a primary view. Inside a thread screen the children's dependencies are already one line each ("after 117f and 117d"); across threads there is almost nothing. A graph of 165 nodes is a hairball that does not answer "what needs me". The generator already computes `unblocks`, so the cheap form is a text line on each issue page ("unblocks: 111e, 111f"), and `merge-issue`'s step 8 can use it. If Marc wants a timeline anyway, a per-thread strip of dated merge commits is a few dozen lines and can be added later.

### 5.6 `PLAN.md`'s table, generated

`PLAN.md` keeps its prose (pillars, stack, conventions, decisions). The table is replaced by a block between markers:

```
<!-- issues:table:start (generated by `npm run issues`; do not edit by hand) -->
| # | Issue | Owner | Status | Depends on |
|---|-------|-------|--------|------------|
| 117 | [Photos like a phone gallery](issues/117-photo-gallery.md) | marc + claude | done | 113 |
| 117g | [Photo gallery 7: text review, phone pass, docs](issues/117g-gallery-pass.md) | claude | todo | 117f, 117d |
<!-- issues:table:end -->
```

The generator writes rows from front matter on `main`; the status column is the file's `status`, plus `note` when present. Nobody (not the planner, not `merge-issue`) edits it. It cannot drift from the files because it *is* the files. CI re-runs the generator and fails if the committed block differs. Agents still never touch `PLAN.md` on a branch, so there are no merge conflicts: the block changes only on `main`.

### 5.7 What is built at generation time versus on the fly

Everything above is **static, generated**: `npm run issues` writes `dist-issues/` (gitignored): `index.html`, one HTML page per thread and per issue, `needs.html`, `decisions.html`, `issues.json`, and the `PLAN.md` block. No server, no JavaScript required (native `details`, plain links, one tiny script for "Open everything" and the previous/next keys, optional). It opens from the filesystem, works offline on a machine without Claude, and has a dark mode through `prefers-color-scheme`. "On the fly" means only the two things that need a live source: the in-flight overlay (local branches, section 7) and the snapshot stamp. I would not build anything dynamic.

## 6. The generator

**`scripts/issues.mjs`**, in the style of `scripts/check-dist.mjs`: plain ES module, Node 22, no framework, run with `node scripts/issues.mjs` and wrapped as npm scripts `issues` (build), `issues:check` (validate, also checks the `PLAN.md` block and exits non-zero) and `issues:open`. Unit tests in `scripts/issues.test.mjs` run by the existing `npm test`, like `deploy.test.mjs` and `privacy-guard.test.mjs`.

Pipeline: read files, parse front matter, parse body headings, derive (threads, children, unblocks, git dates), validate, then write HTML, Markdown and JSON. Roughly 400 to 600 lines including the HTML templates; this is my estimate, not a measurement.

**Parser choice, the one real fork.** The front matter the schema needs is a small YAML subset (scalars, flow lists like `[007a, 007b]`, block lists of flat maps, one level deep). Options:

- (a) **A hand-written subset parser** (about 100 lines): zero dependencies, fully under our control, can read today's invalid-YAML titles (split each line at the first `: `). Risk: subtle bugs, and it quietly defines a YAML-lookalike dialect that editors and GitHub treat as invalid.
- (b) **Quote the 72 titles in one mechanical commit, then use the `yaml` npm package as a devDependency.** Files become real YAML (GitHub's front matter table and every editor then work); the package parses the whole nested schema correctly; one more devDependency on a project that already has three. Cost: it is a dependency, and the one-time edit touches 72 issue files (a mechanical change that only wraps one line in quotes).
- **Recommendation: (b), with (a)'s tolerant first-colon split used only in the migration step** to read the old files before they are fixed. If Marc wants no dependency at all, (a) is workable, and I would then keep the schema's nesting to the single block list shape.

**Alternatives compared** (see also section 3):

| Option | Gets right | Costs | Verdict |
|---|---|---|---|
| Our script (static HTML + Markdown + JSON) | One source, works offline and in CI, no new runtime, produces exactly the views, can be tested | We maintain about 500 lines | Recommended |
| mdBook for issues | Already used for `docs/learn`; free navigation | No aggregation, no "needs" page, no front-matter support seen in its docs; needs a preprocessor, which is custom code anyway | No |
| Dataview or Bases (Obsidian) | Instant ad-hoc queries on Marc's Mac | Needs the app; not CI, not phone, not Claude; no progressive disclosure | Optional extra; our front matter will work in it |
| GitHub Action | Runs the script on every push to `main`, uploads the site as a build artifact, can print a short Markdown summary | It is a *runner*, not a design | Use it to run the script, not instead of it |
| Artifacts (private pages) | Sharing a snapshot to a phone with one link, no hosting setup | An agent must compose the page each time unless it publishes our generated HTML; private by default; a link in a public repo is a leak | Optional publishing target for the generated HTML, never committed |
| Eleventy or another static-site generator | Mature | A dependency tree and config for one small site | No |

**Where it is read.** Not decided; this is the first question for Marc (section 13). The cheapest honest answer is: locally with `npm run issues:open` and as a CI artifact. If he wants it on a phone, the same output can go to a Netlify deploy preview or GitHub Pages, but the site would then be a second public surface (the repo is already public; the existing game site sets `noindex`). I would not add it to the game's `dist` or to the production deploy.

## 7. Workflow fit

The three skills in `.claude/skills/` already produce most of the data in prose; the change is mostly *where it is written*. Nothing in the skills changes in this issue.

**`work-issue`.**
- Step 3 (start): also set a `summary` if the issue has none.
- Step 6 (finish): the "what you could not check" list becomes `unverified` entries in the front matter (it is already written to the log); anything Marc should look at becomes `needs: [{who: marc, kind: try, why: ...}]`.
- Step 8 (the three hand-off blocks, "nothing needs Marc's eyes" / "Try it" / "needs a decision") is a hand-written projection of exactly `needs`; with the field, the agent derives the block from it and the same data feeds the inbox.
- Hand-offs and questions asked in conversation get written as `decisions` with `status: open` *when the agent asks them*, and the planner flips them to `answered` with the answer, who and date.

**`review-issue`.** It already edits only the issue file. Add: it writes `unverified` for anything it could not check, and removes a `needs: {kind: review}` it was asked to resolve. Status rules unchanged.

**`merge-issue`.**
- Step 3's scope check keeps "PLAN.md is out of scope for a branch" (still true: the block only changes on `main`).
- Step 5 (verify the merged result) adds `npm run issues:check`.
- Step 6 changes from "update the issue's row in `PLAN.md`" to "run `npm run issues` and commit the regenerated block". No more sed on a table.
- Step 8's "what is now unblocked" is a query on `unblocks`.
- The check that `status: done` is on `main` stays; the generator then cannot show a `done` row that the file disagrees with.

**The in-flight overlay.** The branch-versus-main status drift is real and cannot be fully removed (statuses are born on branches). Two modes: **default** reads `main`'s files only, the truth anyone can reproduce; **`--branches`** (local only) also reads `issue/*` branch heads with `git show` and lists any whose front matter differs under "In flight". The snapshot stamp names the commit and whether branches were included. CI never has branch worktrees, so CI output is always the plain `main` view.

**A Claude-less machine** edits an issue exactly as `docs/contributing.md` describes: copy the five keys, add the optional ones only if wanted, run `npm run issues:check` for line-numbered, plain-language errors ("issue 117g: depends_on lists 117z, which does not exist"). I would add six lines to the contributing page when this ships. No pre-commit hook; the project does not use any today and CI is the backstop.

**CI.** Add one step to `ci.yml`: `npm run issues:check`. The rules:

- Errors (fail): every required key present; `status`, `needs.kind`, `needs.who`, `decisions[].status` and `area` values in their closed lists; `id` equals the file name's prefix and is unique; every `depends_on`, `thread`, `superseded_by` id exists; no dependency or thread cycle; `decisions[].id` unique; `answered` decisions have `answer`, `by`, `on`; dates are `YYYY-MM-DD`; `done` issues have no open `needs`; links only to allow-listed hosts; the generated `PLAN.md` block equals the committed one.
- Warnings (printed, do not fail): missing `summary`; `summary` longer than the limit; a `done` issue with `unverified` items (informational: it is a feature); a body heading that duplicates another.
- Not checked: the *quality* of a summary or the truth of an answer.

## 8. Worked examples

Three real issues rewritten in the proposed schema. Prose bodies are cut for length with `...`; they would stay as they are. `opened` and `closed` are shown as comments because they are derived, not written.

### 8.1 Small: issue 120

```yaml
---
id: 120
title: "Pause screen: the good-hour legend overlaps the header on the narrow view"
summary: The pause header's good-hour icon overlaps its text at 224 px wide
status: todo
owner: claude
depends_on: [116]
kind: fix
area: [ui, mobile]
# opened and closed come from git; thread defaults to none (no letter, no children)
---
## Goal
Found in review of 116: on the 224-wide view the good-hour legend icon ... (unchanged)
```
That is two new lines for a small issue, both optional. No `needs`, because nobody is waiting on Marc.

### 8.2 Staged feature with decisions: issue 117 (the root) and one child

```yaml
---
id: 117
title: "Photos like a phone gallery: browse, delete one at a time, a close-up scene"
summary: Photos behave like a phone gallery: browse, delete one, a close-up, a sofa scene
status: done
owner: marc + claude
depends_on: [113]
kind: umbrella
area: [ui, art]
docs: [docs/photo-gallery-design.md]
decisions:
  - id: d1
    q: The three looks and their values (Crisp, Soft, Chunky)
    recommendation: Yes as proposed, with Soft as the default
    status: answered
    answer: As recommended
    by: marc
    on: 2026-10-29
    doc: docs/photo-gallery-design.md#14-open-questions-for-marc-real-ones-only-most-important-first
  - id: d2
    q: Which pictures the phone view shows
    options: [all, paged six at a time; six at random, no paging]
    status: answered
    answer: Six random pictures on the first screen, zoom into one, no paging (manage mode still pages)
    by: marc
    on: 2026-10-29
  - id: d3
    q: After an ad, does the close-up come back as it was?
    recommendation: Yes, with no second ad that session
    status: answered
    answer: As recommended
    by: marc
    on: 2026-10-29
  - id: d4
    q: Does E in the close-up pay while Esc does not?
    recommendation: Yes (Esc is the back-out key everywhere)
    status: answered
    answer: As recommended
    by: marc
    on: 2026-10-29
  - id: d5
    q: Which phone-view lines and close-up captions
    status: answered
    answer: As recommended
    by: marc
    on: 2026-10-29
---
```

The existing prose (the "Answers so far", "Structure" and "Settings" paragraphs) stays in the body as the record of *how* it was decided; the front matter is the index. `117g` (the one open child) would carry:

```yaml
---
id: 117g
title: "Photo gallery 7: text review, phone pass, docs"
summary: Review the gallery's words, check it on a phone, update the docs
status: todo
owner: claude
depends_on: [117f, 117d]
kind: build
# thread: 117  (derived from the id)
needs:
  - who: marc
    kind: try
    why: Look at the gallery on your phone once the pass is merged
    since: 2026-10-30
---
```
(The `needs` entry above is illustrative of the field; the corpus does not say Marc owes that, so I would not backfill it. I show it to make the shape concrete.)

Everything the thread screen in 5.2 shows (what shipped, still open, decisions) follows from these fields on 117 and its children; no thread-level prose is written.

### 8.3 Research-style: issue 112

```yaml
---
id: 112
title: "Real-world effects: what is feasible (research)"
summary: Which real-world effects (email, photos, Uber Eats, ...) are feasible, safe and cheap
status: done
owner: marc + claude
depends_on: []
kind: research
area: [docs]
docs: [docs/real-world.md]
unverified:
  - Safari status of the File System Access API
  - Uber Eats deep-link formats and Uber's terms on automation
  - Apple Music (MusicKit) requirements
  - Open-Meteo CORS and key policy
  - Google Calendar ICS endpoint CORS
  - iOS standalone OAuth return behaviour
  - Netlify free-plan credit amount and function timeout
  - Hacker News API CORS
  - Spotify 2026 changes; CASA assessment cost
# decisions: none recorded. The note ends with 10 open questions (section 11) and
# the log says "Marc's decisions: none recorded yet".
---
```

The `unverified` list is lifted from the issue's own `## Unverified` section (cut here; the real list is longer). The example shows two honest gaps the schema would expose: ten questions whose answers were never recorded (a backfill would ask Marc, or mark them `dropped` if later issues such as 113 already settled them), and a long `unverified` list on a `done` issue, which is a feature, not an error.

## 9. Migration of the 165 issues

1. **Tolerant read first (stage 1).** The parser reads the five keys with a first-colon split, so all 165 files parse today, including the 72 whose titles are invalid YAML. Output of the first run: the table, plus a validator report listing the five mismatches and any bad ids. No file is edited yet.
2. **One mechanical commit** (stage 2): wrap the 72 unquoted titles in double quotes (escaping any inner quote) with a script, review the diff as a list of one-line changes, and let `issues:check` verify nothing else moved. From here front matter is valid YAML.
3. **Derived at no cost:** `thread` for the 41 sub-issues, `opened` and `closed` from git, `unblocks`, `kind: umbrella` for the 9 parents.
4. **Backfill by an agent, only where the views need it:**
   - `summary`: for the roughly 24 not-done issues, the 9 umbrellas and the 41 sub-issues (about 70 files, one line each). The other 95 old done issues fall back to `title` forever; their pages work.
   - `thread`: written for the non-id subjects (mobile, sync, flashcards, music lab: about 15 files). I derived the candidate groups from reading `depends_on` and doc references only; I did not check each.
   - `decisions`: **do not hand-backfill.** Parse the 30 marked lines of the six docs at generation time (read-only; the Decisions log works on day one); for the other nine docs, an agent drafts `decisions` for the issues still open (048, 049, 062, 091, 111f, 114) and Marc glances. Old closed decisions stay prose.
   - `unverified`: only for not-done issues and for the research issues, lifting what each file already lists.
   - `needs`: written fresh, by the planner, for what is truly waiting now (the four cards in 5.1); never reconstructed for the past.
5. **What stays as it is:** every issue body, every progress log, `docs/*-design.md`, old done issues' headlines. Most of the 165 are history; the point is the live threads.

## 10. Staged plan (each stage useful alone)

| Stage | What | New fields | Useful alone because | Rough size |
|---|---|---|---|---|
| 1 | The script's parser, the validator, `PLAN.md` generated between markers, CI check | none | Ends hand edits and the 5-row drift; catches bad ids and cycles; no schema change to learn | one issue, about 250 lines plus tests |
| 2 | Quote the 72 titles; add `summary`, `thread`, `needs`, `unverified`; the home screen, a thread page, the needs inbox, an issue page with a heading tree; `issues.json` | the four fields | The briefing-like read, and the cheap input for an agent briefing | one to two issues; templates are the bulk |
| 3 | `decisions`: the decisions log from parsed docs plus front matter; the "Decisions you made" thread branch | `decisions`, `docs` | The record of what Marc decided, finally listable | one issue |
| 4 | Skill edits: `work-issue`, `review-issue`, `merge-issue` write and use the fields; six lines in `docs/contributing.md` | none | Keeps the data from rotting (the real risk) | one small issue, edited by the planner (skills are planner files) |
| 5 | Agent backfill (section 9 item 4) and, if wanted, publishing to a phone-readable place | none | Fills the home with real summaries | one issue |

Do stage 4 *with* stage 2, not after it, or the fields go stale on the first day. If only one stage ever ships, ship stage 1.

## 11. Risks

- **Weight of the schema.** Mitigation: five keys are all anyone must write; the rest is optional and defaulted; validation messages are plain words. Test of the idea: if a beginner on a `learn/*` branch cannot file an issue by copying an old one, the design failed.
- **Two sources of truth.** Facts live in front matter and in prose (a decision is in `decisions` and in the design doc). Rule: front matter is the *index and the answer*, the prose holds the *options and reasoning*; the log line links to the section. The generated table, the thread screens and `unblocks` are never written, which removes the biggest duplicate (PLAN.md).
- **Rot.** A `needs` entry nobody removes makes a calm page dishonest. Mitigations: resolving is a deletion in the same edit that records the answer; `merge-issue` refuses (warns) when merging an issue whose `needs` still lists its own review; no automatic reminders.
- **Privacy (the repo and the pages are public).** The generator reads `issues/` and `docs/`; its output is gitignored. `links` are restricted to an allow-list of hosts (github.com, the game's own host, the flashcards app's host); `claude.ai` links and any other host fail the check, which keeps the private briefing's share link (and any artifact link) out. `needs.why` and `summary` are public text: no personal details, no addresses, same rules as the rest of the repo. Add the generated pages to the existing guard pattern in `scripts/privacy-guard.test.mjs` (the forbidden-words file also scans the generated files if they are ever committed). Do not add the site to the production deploy.
- **A page that looks authoritative but lags.** The snapshot stamp (commit and date, and "GitHub is right") is mandatory in every page footer and header, as in the briefing.
- **Scope creep into a tracker.** The project's rule, "a garden and not a backlog", is the defence: no priority, estimate or due date fields.

## 12. Tone: the calm "needs you" view

These are requirements for stage 2, not preferences:
- No total count of what is waiting, anywhere (no badge, no "5 items", not in the page title). Thread cards may say "six of seven shipped" because that describes progress, not obligation; the home's "short version" may state plain facts.
- No urgency words (overdue, blocked on you, ASAP, stale), no red, no shake. Pills are neutral words: Decide, Try, Do, Review, Wait, and a default Later.
- Order is newest first, never oldest first, and dates are plain "asked 2026-10-28".
- Every card has a reason in one plain line and a link that jumps to the exact place (the decision, the thread).
- Empty state: "Nothing is waiting on you."
- Home shows at most five cards and a link for the rest; the "Waiting on something else" group is separated so it is clear that is not Marc's.
- The generator never sends, schedules or notifies anything.
- A decision with a recommendation shows the recommendation in the card, so an answer can be "as recommended".

## 13. Cost versus value, candidly

- **Worth it, clearly:** stage 1. It removes a real recurring error (5 of 165 rows wrong today), turns a hand edit in every merge into a command, and adds a validator that would have caught the stale `blocked` and `review` statuses. It needs no taste decisions.
- **Worth it, probably:** `needs`, `summary`, `unverified`, `thread` and the three screens. They are the actual goal. The value is mostly *for Marc reading*, and it is real only if the fields stay current, which is what stage 4 buys.
- **Worth it, modestly:** `decisions`. 30 marked lines already parse out of six docs; new decisions in front matter are cheap for agents because they already write the same sentences in prose. Historic backfill is not worth it.
- **Probably not worth building:** the dependency graph and timeline views, a project glossary page (`docs/learn/src/reference-glossary.md` already exists), per-thread authored narrative ("A bug I caused", "The numbers" belong in issue bodies), a decision file per decision, automatic reminders of any kind, a server.
- **What is lost:** the briefing's voice and its on-the-fly choice of what mattered. The generator's thread page is a faithful index, not an editor's view. The mitigation is `issues.json` so a briefing is a cheap on-demand ask.
- **Uncertain:** how much Marc will read a generated page versus ask Claude (this is the first question below); how well first sentences work as one-liners in practice (I did not render a prototype, by instruction; a prototype on 10 issues would answer it before stage 2); whether GitHub shows an error for the 72 invalid front matters (not checked).

## 14. Questions for Marc

Each one line, most important first, with my recommendation.

1. **Where will you read it: only on your Mac (a local file and a CI artifact), or hosted somewhere your phone opens?** Recommend local plus the CI artifact first; add hosting only if you find yourself wanting the phone.
2. **Build stage 1 now (generated `PLAN.md` table, validator, CI check, no new fields)?** Recommend yes; it is useful even if you never want the rest.
3. **Quote the 72 titles in one mechanical commit and add the small `yaml` package as a devDependency, or keep zero dependencies and a hand-written parser?** Recommend the quoting and the dependency (valid YAML, fewer bugs).
4. **Is `needs` (who, what kind, one plain line, no priority, no counts, newest first) the right way to say "waiting on Marc"?** Recommend yes, as the only hand-kept field you will actually see.
5. **Decisions: parse the six docs that already use the "ANSWERED by Marc" line, add `decisions` to front matter only for new questions, and do not backfill old ones?** Recommend yes.
6. **Keep the agent-written briefing as an on-demand ask (reading `issues.json`) rather than trying to generate its "short version" and caveats?** Recommend yes.
7. **Skip the dependency graph, the timeline and a glossary page?** Recommend skip all three for now; revisit one only if you miss it.
