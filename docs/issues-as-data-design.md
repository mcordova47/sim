# Issues as data: a design note (issue 128)

Status: design only. Nothing here is built, enforced or migrated. Written 2026-11-15 against `main` at `a5af32e`. Every number below was counted from the repo on that day unless it says otherwise.

## 1. Summary

**The recommendation.** Keep the issue files as Markdown with front matter, and add a small number of optional fields to the front matter. Write one zero-surprise Node script (`scripts/issues.mjs`, no server, no framework) that reads `issues/*.md` (and, read-only, the answered-question lines in `docs/*-design.md`) and produces: a static HTML site with the home, thread and "needs you" screens; a generated `PLAN.md` table; and an `issues.json` that an agent can read instead of 165 files. The thread screen is **not authored**: its branches ("What shipped", "Decisions you made", "Still open", "Not verified") are queries over the child issues' fields. The body of each issue stays free prose; its `##` and `###` headings become a drill-down tree for one issue, for free. Build it in five stages, each useful alone. The first stage (quote the 72 broken titles once, add one `yaml` devDependency, a validator, a generated `PLAN.md` table) needs no new fields and ends the hand edits and the drift. Be candid about what is not worth it: a dependency graph, a timeline, a glossary page, and any backfill of old issues' decisions and summaries beyond the live threads.

**What the data cannot do.** The briefing that inspired this had a voice: "the short version", "a bug I caused", honest caveats. A generator gives the structure and the honesty fields (`unverified`), not the voice. Design for that: keep an agent-written briefing as something you can still ask for, but make it cheap (the agent reads `issues.json`, a few KB, not 165 files).

**Two findings that change the plan.** (1) The existing front matter is not valid YAML in 72 of 165 files (checked with Ruby's strict YAML parser): titles contain `: ` unquoted, for example `title: Issues as data: a schema ...`. A one-time mechanical quoting commit comes first, so there is one real parser from the start and no throwaway tolerant one (sections 6 and 9). (2) **Ids are strings that look like numbers.** In YAML `id: 007` is the number 7 and `id: 010` is octal 8 (109 of 165 ids start with `0`; Ruby's parser gives `[7, "009", 8]` for the list `[007, 009, 010]`). The parser must read every scalar as a string and the check must reject a numeric id (section 4.1).

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
| `short` | optional | planner or backfill | A hand-shortened title for the generated `PLAN.md` table and narrow cards. Today about 50 of the 165 table rows use a title shorter than the issue file's (for example 117, 120, 128); a generated table would otherwise change all of them. Fallback: `title`. The table shows `short` when present, so those 50 rows keep their wording and only get a one-time `short:` line each (written by the migration script from the current table, section 9). |
| `summary` | required for new issues, optional for old | filer, then the finishing agent | The **headline**: one line, at most about 120 characters, no status words in it ("Photos behave like a phone gallery", not "Photos, shipped"). Fallback when absent: `title`. |
| `changelog` | optional (issue 160) | filer, then the finishing agent | The **release-notes sentence**: one line for players, at most 140 characters, or `none` to leave the issue out of the notes. Read by `npm run changelog`, which lists done `build` and `fix` issues (the sentence, else `summary`) and any issue that has a sentence. Checked by the validator. |
| `kind` | optional | filer | One of `design`, `build`, `research`, `fix`, `umbrella`, `chore`. Lets a view say "design done, build issues filed" without free text. Derivable as `umbrella` when children exist. |
| `thread` | optional | derived by default | Id of the issue that groups this one. **Default: the id minus its trailing letter** (`117c` is in thread `117`), so the 41 existing sub-issues need nothing. Written only for subjects with no shared id (049, 095, 026 and similar). Must point at an existing issue. |
| `area` | optional | filer or backfill | List of tags from a short closed list kept in `scripts/issues.mjs` (proposal: `art`, `music`, `ui`, `mobile`, `flashcards`, `sync`, `process`, `docs`, `engine`). The list is chosen when the backfill is written, from the corpus; I did not derive it here. |
| `needs` | optional | filer, finishing agent, planner; removed when resolved | **Who must act next, and how.** A list of `{who, kind, why, since}`. `who`: `marc`, `planner`, `agent`, or `other` (external). `kind`: `decide`, `do`, `try`, `review`, `wait` (a closed set of five; the pill on a card is exactly this word, and there is no "later" kind). `why`: one plain line, public. `since`: a date, shown quietly, never as "overdue". For `wait`, add `on:` (what is awaited). A *state*, not a history: when resolved the entry is deleted, so an empty or missing `needs` is the calm state. |
| `decisions` | optional | the planner and agents, as they ask and as Marc answers | The structured form of what is today a numbered prose list. Item: `id` (`d1`, unique in the issue), `who` (who must answer; default `marc`), `q` (one-line question), `options` (optional list of short labels), `recommendation` (one line), `status` (`open`, `answered`, `defaulted`, `dropped`), `answer`, `by`, `on` (date), `doc` (link to the design doc section holding the long form). `answer`, `by` and `on` are required when status is `answered` or `defaulted`. An **open** decision whose `who` is `marc` appears in "What needs you" automatically, so it is not also written under `needs`. |
| `unverified` | optional | `work-issue` step 6 and `review-issue` already produce this list in prose | List of one-line things nobody has checked ("Safari behaviour of the File System Access API"). Never deleted silently: when checked, move to the log. |
| `links` | optional | filer | Pull requests, docs and outside pages: `{title, url}`. Doc paths in the repo go in `docs:` (a list of paths). A lint refuses hosts that are not on a short allow-list (section 11). |
| `superseded_by` | optional | planner | Id of the issue that replaced this one (113e by 117g today). The issue stays; views dim it, and it is ignored when a thread's status is derived (4.3). `issues:check` requires the target to exist and not to be itself superseded in a loop; it does not require the superseded issue to be `done`. |
| `note` | optional | planner | A short status note, the only free text in the generated table (replaces the 11 table rows that have a parenthetical today). |

**Ids are always strings.** Applies to `id`, `depends_on`, `thread`, `superseded_by` and `needs`/`decisions` references. The parser is told to treat every scalar as a string (the `yaml` package has a `failsafe` schema that does this; I believe so from its documentation and did not install or run it, so the first stage verifies it with a test over all 165 files). The generator then converts dates and enums itself. Belt and braces: `issues:check` re-reads the raw `id:` line and requires it to equal the file name's prefix (`^\d{3}[a-z]?$`), so a number-coerced id (7 for 007) can never join the wrong issues, and it rejects any id that does not match that pattern. Other tools that read the files as plain YAML (editors, GitHub's table) will still show 7 for `007`; that is cosmetic and an existing property of the files.

**Writing `needs` by hand (a Claude-less machine).** Use one line per entry in flow style, the documented form: `needs: [{who: marc, kind: try, why: "Run the workflow once", since: 2026-10-28}]`. Block lists work but are easy to break with indentation; the check reports the line and says what it expected. Quote `why` (it often contains commas or colons).

**Derived, never written:** `opened` (first commit touching the file), `closed` (merge commit that set `done`), `updated`, `children`, `unblocks` (reverse of `depends_on`), `thread` default, the thread's status (4.3), "in flight on a branch" (local only, section 7), and the one-line headline for a child when `summary` is missing.

**Deliberately not fields:** priority, estimate, due date, assignee beyond `owner`, labels free-form, a "mood" or urgency, a count of anything. Each invites the to-do wall the project avoids.

### 4.2 Headings as depth (the body stays Markdown)

Yes, the heading structure can be the drill-down tree for a single issue, with no new body format:

- Each `##` heading is a top-level branch, each `###` a child, rendered as nested native `<details>` elements (one open at a time, plus an "Open everything" button), exactly the briefing's interaction.
- A branch's one-line label is the heading text; its first sentence (cut at about 140 characters) is shown beside it. Progress-log lines (616 begin with a date) become leaves: the first sentence is the label, the rest folds.
- A small **map of canonical heading names to roles** gives them icons and an order: `Goal` first and open; `Acceptance criteria`; `Decisions`/`Marc's answers`/`Marc's decisions...` (any heading starting with "Marc's" or "Decision"); `Notes`; `Progress log` last and closed. Unknown headings are shown as plain branches in file order. Nothing is rejected, so the 105 distinct `##` heading texts in the corpus (155 counting `###` and deeper) all render.
- **Honest limit.** First sentences make poor headlines (progress lines start with "2026-10-26 (reviewer, independent): **Verdict: approve.**"). That is why `summary` exists. And headings cannot give the *thread* screen: "What shipped", "Decisions you made, and why", "Still open", "The numbers" in the briefing are not in any one issue; they are built from the children. So: **headings give the issue page; fields give the thread and home pages.**
- Cheap convention for the future, not a rule: new issues use the headings `Goal`, `Decisions`, `Acceptance criteria`, `Unverified`, `Progress log`. The renderer never requires them.

### 4.3 A thread's status and the pill words

A thread is a root plus its members (children by id letter, plus any issue whose `thread` names the root). The root's own `status` is **ignored when it has members**: today the roots of 106, 111, 113 and 117 are `done` while some children are todo, so the root file cannot say where the thread is. Members that are `superseded_by` something are left out. Then, over the members that remain:

| Thread pill | When |
|---|---|
| `Shipped` | every member is `done` |
| `Planned` | every member is `todo` |
| `Paused` | every member that is not `done` is `blocked` |
| `In progress` | anything else (some done and some not, or any `in-progress` or `review`) |

That is the whole closed set of four; the briefing's `Settled`, `Merged` and `Reference` are not used. A single issue with no members is a thread of one and gets the same pill from its own status. An issue's own words (the status in its row and card) are `todo`, `in progress`, `review`, `done`, `blocked`, shown as "not started", "in progress", "in review", "shipped", "paused". The validator **warns** (does not fail) when a `done` root has members that are not done (today 106, 111 and 117; 113 would also be on the list until 113e is marked `superseded_by` 117g, and 009 is `blocked` in its file, a different stale status the validator's table check reports), because the root closed early; a warning list that long on day one is expected and is cleared by the planner once, not nagged.

## 5. Views

All views come from the same parsed data. Mockups are ASCII; width is about 38 columns for a phone and about 100 for desktop. Words in `[brackets]` are pills.

### 5.1 Home (phone), filled with the repo's real state

The content is derived from the corpus, `PLAN.md` and git as they are today. My reading is stated where the data is silent (notes under the mockup). Pills are a **closed set**: for needs, `Decide`, `Try`, `Do`, `Review`, `Wait` (the `needs.kind` words, nothing else); for threads, `Shipped`, `In progress`, `Planned`, `Paused` (section 4.3 defines how they are derived).

```
+----------------------------------------+
| simagotchi: the work                   |
| Snapshot 2026-11-15, main a5af32e.     |
| If it disagrees with GitHub, GitHub    |
| is right.                              |
+----------------------------------------+
| THE SHORT VERSION                      |
| * The game is playable; most issues    |
|   are done.                            |
| * Live threads: photos, side project   |
|   config, Spanish study.               |
| * One design is open: this one (128).  |
| * Nothing runs on a branch except      |
|   that design.                         |
+----------------------------------------+
| WHAT NEEDS YOU                         |
| [Decide] Issues as data (128)          |
|   The note ends with questions.        |
|   Jump to the questions >              |
| [Try] Manual deploy button (110)       |
|   Run the workflow once.            >  |
| [Try] Sync across devices (095)        |
|   Server check, two browsers.       >  |
| [Do] Text pass (037)                   |
|   Mark docs/text-review.md.         >  |
+----------------------------------------+
| WAITING ON SOMETHING ELSE              |
| [Wait] Spanish drills (127)            |
|   The flashcards app's deploy first.   |
+----------------------------------------+
| IN FLIGHT                              |
| Issues as data (128): the design       |
| note, on its branch.                   |
+----------------------------------------+
| RECENTLY SHIPPED                       |
| Learn book (097)          2026-10-30   |
| Side project on phones (125) 10-29     |
| Encounter track (091d)       10-29     |
+----------------------------------------+
| THE THREADS                            |
| Photo gallery (117)                    |
|   [In progress] six of seven shipped   |
| Side project config (111)              |
|   [In progress] four of six shipped    |
| Study Spanish (026, 127)               |
|   [In progress] cards done, drills     |
| Mobile (049)                           |
|   [In progress] design answered        |
| Encounter music (091)                  |
|   [In progress] docs left              |
| Guitar skill (114)                     |
|   [In progress] last stage optional    |
| Track editor on phones (106)           |
|   [In progress] last stage optional    |
| Customizable decor (062)               |
|   [In progress] stages 1 to 3a done    |
| Codebase walkthrough (097)             |
|   [In progress]                        |
| Issues as data (128)                   |
|   [Planned] (main's file says todo)    |
| Everything else                        |
|   [Shipped]                         >  |
+----------------------------------------+
| Glossary | Plan | All issues           |
+----------------------------------------+
```

Notes on the mockup:
1. No count appears next to What needs you, and there is no count of threads. "Six of seven shipped" describes a thread's progress. The "See everything that is waiting" link appears only when more than five cards exist; today there are four, so it does not.
2. *Needs* here are my reading of the corpus: 128 (this note ends with questions); 110 (its acceptance criteria end "Marc runs it once to confirm it deploys"; its file status is `review`); 095 (the `PLAN.md` row says "Marc still checks the server with netlify dev and two browsers"); 037 (its log says "Still to do: Marc marks it" for `docs/text-review.md`). No field says these today; that is the point of `needs`. The same four are labelled the same way in 5.3: 110 and 095 are `Try`, 037 is `Do`, 128 is `Decide`. There is no "Later" pill: calm comes from the missing urgency, not from a label, and a card's age shows only as the plain "asked" date.
3. 127 is waiting on the flashcards app's deploy (issue 127, "Sequencing"); its design questions for Marc come after the design note is written, so nothing is answerable yet.
4. **In flight** is the 128 design branch, and only because this mockup was filled with the local branch overlay (section 7). From `main` alone (what CI sees) it would be empty and 128 would show as `Planned`, which is why the short version's last bullet says "except that design". `gh pr list` shows one PR ever (#1) and no open ones.
5. **Recently shipped** is the last few merge commits on `main` that closed an issue (`git log --merges`: 097 on 2026-10-30, 125 and 091d on 2026-10-29). It needs full git history in CI (section 7). It is quiet: no counts, no pills.
6. Thread pills come from the derivation rule, not from the root's own `status`. The photo-gallery root (117) is `done` in its file, but 117g is todo, so the thread is In progress. Thread 113 does not appear: its last child (113e) is `superseded_by` 117g and is ignored, so it is Shipped and sits under "Everything else".
7. The thread one-liners are my paraphrases of the issue files and `PLAN.md` rows; with the schema they come from the root's `summary`.
8. Not shown on purpose: the **housekeeping** the data exposes (65, 66 and 72 sit at `review` in their files while the table says done; 009 says `blocked` though its four children are done; 113's table row says todo though the file is done; 049's table note says "stage 1 build issue to write" although 087 exists and is done, which I did not check further). Those are planner tidying, not Marc's, and belong in the validator's output, never on the home screen. A generated table removes most of them at the source.

**A limit, stated plainly.** On `main`, "What needs you" can be empty while something waits on Marc: work-issue writes `status: review` and any `needs: try` on the issue *branch*, and Marc usually tries a branch before it is merged. Neither is on `main` until the merge, so the main-only view (the one CI and the hosted page show) cannot see a pre-merge trial. Three partial answers: (a) the local `--branches` overlay (section 7) lists them on Marc's machine; (b) the planner's "Try it" report message stays the channel for pre-merge trials, as today; (c) a `needs: try` recorded on `main` by the planner when it reports a branch is possible but would conflict with the branch's own edits of the same lines, so I do not recommend it. What the home screen does cover well is everything *after* a merge (decisions asked, post-merge tries such as 110 and 095, text passes) and everything the planner records.

### 5.2 A thread (desktop and phone), for 117

The branches are generated from the root and its children. One is open at a time. The status line is the derived thread status (4.3), not the root file's `done`.

```
+--------------------------------------------------------------------------------------------+
| < Photo gallery thread (117)                             < prev: Photo reel   next: ... >  |
| Photos behave like a phone gallery: browse, delete one, a close-up, a sofa scene.          |
| [In progress] six of seven stages shipped                             [ Open everything ]  |
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

Phone width, with one branch open and then another (a one-line branch list is the interesting case):

```
+----------------------------------------+
| < Photo gallery (117)                  |
| Photos behave like a phone gallery.    |
| [In progress] six of seven shipped     |
| [ Open everything ]                    |
+----------------------------------------+
| v What it looks like now               |
|     Pause menu: manage mode. Sofa:     |
|     the scene.                         |
| > What shipped                         |
| > Decisions you made, and why          |
| > Still open                           |
| > Not verified                         |
| > All the detail                       |
+----------------------------------------+
| < Photo reel        Next thread >      |
+----------------------------------------+
```

```
+----------------------------------------+
| < Photo gallery (117)                  |
+----------------------------------------+
| v What shipped                         |
|   117a Looks and the store             |
|   117b The gallery core                |
|   117c Manage mode, delete one         |
|   117d The LOOK switch                 |
|   117e The sofa scene                  |
|   117f An ad can interrupt             |
| > Decisions you made, and why          |
| > Still open                           |
+----------------------------------------+
```

(The five decisions are the real answers in `docs/photo-gallery-design.md` section 14.) The briefing's "A bug I caused" and "The numbers" branches have no counterpart in the data; they stay in the issue body as ordinary headings and show up under "All the detail".

### 5.3 "What needs you" inbox (phone)

```
+----------------------------------------+
| What needs you                         |
| Nothing here is urgent. Newest first.  |
+----------------------------------------+
| Decide                                 |
|  Issues as data (128)                  |
|  The note's questions.                 |
|  asked 2026-11-15                  >   |
| Try                                    |
|  Manual deploy button (110)            |
|  Run the workflow once.                |
|  asked 2026-10-28                  >   |
|  Sync across devices (095)             |
|  Server check, two browsers.       >   |
| Do                                     |
|  Text pass (037)                       |
|  Mark docs/text-review.md.         >   |
| Review                                 |
|  (none)                                |
+----------------------------------------+
| Waiting on something else              |
|  Spanish drills (127): app deploy      |
+----------------------------------------+
```

Calm rules, as design requirements for this view (section 12 has the full list): grouped by kind in words, ordered newest first (not oldest first, which would read as a backlog), no total, no red, no "overdue", dates shown as plain "asked 2026-10-28". An empty state reads "Nothing is waiting on you." The home screen shows at most five cards and links to this page only when there are more.

### 5.4 Decisions log (desktop and phone)

Everything answered, newest first, filterable by thread, area or who; each row: the question, the answer, who, when, and a link to the design doc section with the options. Sources: `decisions` in front matter, plus (read-only) the 30 lines in six design docs (25 answered by Marc, 5 decided by the planner) that already follow `**Question? ANSWERED by Marc DATE: answer**`. I counted them by regular expression over `docs/*.md`: 15 answered 2026-10-28 and 10 on 2026-10-29 by Marc, plus 5 marked "DECIDED by the planner".

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

```
+----------------------------------------+
| Decisions                              |
| [thread v] [area v] [who v]            |
+----------------------------------------+
| 2026-10-29  Marc                       |
|  Who writes the encounter track?       |
|  (a) Marc composes; agent drafts       |
|  Encounter music (091)           >     |
| 2026-10-29  the planner                |
|  How long does battle music play?      |
|  Four passes, then fade          >     |
| 2026-10-28  Marc                       |
|  Silhouettes in the inventory?         |
|  (b) only what the game showed   >     |
+----------------------------------------+
```


### 5.5 Dependencies and timeline: not recommended as screens

I considered a dependency graph (95 issues have `depends_on`; most chains are short and inside a thread) and a timeline (dates come from git). My recommendation is **not** to build either as a primary view. Inside a thread screen the children's dependencies are already one line each ("after 117f and 117d"); across threads there is almost nothing. A graph of 165 nodes is a hairball that does not answer "what needs me". The generator already computes `unblocks`, so the cheap form is a text line on each issue page ("unblocks: 111e, 111f"), and `merge-issue`'s step 8 can use it. If Marc wants a timeline anyway, a per-thread strip of dated merge commits is a few dozen lines and can be added later.

### 5.6 `PLAN.md`'s table, generated

`PLAN.md` keeps its prose (pillars, stack, conventions, decisions). The table is replaced by a block between markers:

```
<!-- issues:table:start (generated by `npm run issues`; do not edit by hand) -->
| # | Issue | Owner | Status | Depends on |
|---|-------|-------|--------|------------|
| 117 | [Photos like a phone gallery](issues/117-photo-gallery.md) | marc + claude | in progress | 113 |
| 117g | [Photo gallery 7: text review, phone pass, docs](issues/117g-gallery-pass.md) | claude | todo | 117f, 117d |
<!-- issues:table:end -->
```

The generator writes rows from front matter on `main`. The Issue column is `short` (else `title`). The status column is the file's `status` for a single issue and the **derived thread pill** (4.3) for a root that has members, so 117 reads `in progress` while 117g is todo, as on the home screen; `note` is appended when present. Nobody (not the planner, not `merge-issue`) edits it. It cannot drift from the files because it *is* the files. CI re-runs the generator and fails if the committed block differs. Agents still never touch `PLAN.md` on a branch, so there are no merge conflicts: the block changes only on `main`. The drift check (section 7) therefore runs only on `main`, never on branches or pull requests.

### 5.7 What is built at generation time versus on the fly

Everything above is **static, generated**: `npm run issues` writes `dist-issues/` (gitignored): `index.html`, one HTML page per thread and per issue, `needs.html`, `decisions.html`, `issues.json`, and the `PLAN.md` block. No server, no JavaScript required (native `details`, plain links, one tiny script for "Open everything" and the previous/next keys, optional). It opens from the filesystem, works offline on a machine without Claude, and has a dark mode through `prefers-color-scheme`. "On the fly" means only the two things that need a live source: the in-flight overlay (local branches, section 7) and the snapshot stamp. I would not build anything dynamic.

## 6. The generator

**`scripts/issues.mjs`**, in the style of `scripts/check-dist.mjs`: plain ES module, Node 22, no framework, run with `node scripts/issues.mjs` and wrapped as npm scripts `issues` (build), `issues:check` (exits non-zero; `-- --validate` checks the issue files only, `-- --table` also checks the generated `PLAN.md` block; section 7 says where each runs) and `issues:open`. Unit tests in `scripts/issues.test.mjs` run by the existing `npm test`, like `deploy.test.mjs` and `privacy-guard.test.mjs`.

The plan also adds `dist-issues/` to `.gitignore` in stage 1 (the generated site is never committed). Pipeline: read files, parse front matter, parse body headings, derive (threads, children, unblocks, git dates), validate, then write HTML, Markdown and JSON. My estimate (not a measurement, and the upper end is likelier): stage 1 alone (parse, validate with cycle detection, id checks, the docs-line parser, the table) 250 to 450 lines plus tests; the whole script with the HTML templates 600 to 900.

**Parser: one parser from the start.** The 72-title quoting commit is mechanical and, by the reviewer's re-check, makes all 72 parse (11 of the titles contain a double quote, so the script must escape it). So stage 1 begins with that commit and adds the `yaml` npm package as one devDependency, used with a string-only schema for ids (section 4.1). Nothing is built and thrown away. The alternative, no dependency at all with a hand-written subset parser of about 100 lines, is workable if Marc objects to the dependency, but it would define a YAML-lookalike dialect and has to be written to read the unquoted titles or be preceded by the same quoting commit anyway; I do not recommend it. I did not install `yaml` or check its own dependencies (believed none).

**Alternatives compared** (see also section 3):

| Option | Gets right | Costs | Verdict |
|---|---|---|---|
| Our script (static HTML + Markdown + JSON) | One source, works offline and in CI, no new runtime, produces exactly the views, can be tested | We maintain about 500 lines | Recommended |
| mdBook for issues | Already used for `docs/learn`; free navigation | No aggregation, no "needs" page, no front-matter support seen in its docs; needs a preprocessor, which is custom code anyway | No |
| Dataview or Bases (Obsidian) | Instant ad-hoc queries on Marc's Mac | Needs the app; not CI, not phone, not Claude; no progressive disclosure | Optional extra; our front matter will work in it |
| GitHub Action | Runs the script on every push to `main`, uploads the site as a build artifact, can print a short Markdown summary | It is a *runner*, not a design | Use it to run the script, not instead of it |
| Artifacts (private pages) | Sharing a snapshot to a phone with one link, no hosting setup | An agent must compose the page each time unless it publishes our generated HTML; private by default; a link in a public repo is a leak | Optional publishing target for the generated HTML, never committed |
| Eleventy or another static-site generator | Mature | A dependency tree and config for one small site | No |

**Where it is read.** Not decided; this is the first question for Marc (section 14). The cheapest honest answer is: locally with `npm run issues:open` and as a CI artifact. If he wants it on a phone, the same output can go to a Netlify deploy preview or GitHub Pages, but the site would then be a second public surface (the repo is already public; the existing game site sets `noindex`). I would not add it to the game's `dist` or to the production deploy.

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
- Step 5 (verify the merged result) adds `npm run issues:check -- --validate`.
- Step 6 changes from "update the issue's row in `PLAN.md`" to "run `npm run issues` and commit the regenerated block", then `npm run issues:check -- --table` must pass. No more sed on a table.
- Step 8's "what is now unblocked" is a query on `unblocks`.
- The check that `status: done` is on `main` stays; the generator then cannot show a `done` row that the file disagrees with.

**The in-flight overlay.** The branch-versus-main status drift is real and cannot be fully removed (statuses are born on branches). Two modes: **default** reads `main`'s files only, the truth anyone can reproduce; **`--branches`** (local only) also reads `issue/*` branch heads with `git show` and lists any whose front matter differs under "In flight". The snapshot stamp names the commit and whether branches were included. CI never has branch worktrees, so CI output is always the plain `main` view. This is the limit stated in section 5.1: a pre-merge `needs: try` is visible only in the overlay on the machine that has the branches. (If work moved to pull requests, CI could run the overlay on the PR's own file; the project does not use PRs for agent work today.)

**A Claude-less machine** edits an issue exactly as `docs/contributing.md` describes: copy the five keys, add the optional ones only if wanted (`needs` as the one-line flow form above), run `npm run issues:check -- --validate` for line-numbered, plain-language errors ("issue 117g: depends_on lists 117z, which does not exist"). I would add six lines to the contributing page when this ships. No pre-commit hook; the project does not use any today and CI is the backstop.

**CI.** The validation and the drift check have different homes, because agents change an issue's `status` on a branch and never touch `PLAN.md` there:

- **Every push and pull request** (add one step to `ci.yml`): `npm run issues:check -- --validate`. It checks only the issue files themselves, which a branch is allowed to change.
- **Only pushes to `main`** (an `if: github.ref == 'refs/heads/main'` step in the same workflow, or the same check run by `merge-issue` step 5): `npm run issues:check -- --table`, which regenerates the `PLAN.md` block and fails if it differs from the committed one. A branch or PR never runs it. (A merge commit and its regeneration commit are two commits on `main`, so the check would fail on the first one; `merge-issue` already commits the merge and then the table update, so run it after the second, or have the workflow tolerate the first by running on the tip only. I did not test this; stage 1 settles it.)
- **Git dates need history.** `actions/checkout@v4` is shallow by default, so `opened`, `closed` and the Recently shipped band do not exist in CI unless the step sets `fetch-depth: 0`. Only the generated pages use them; nothing CI *checks* depends on git dates.

Rules:
- Errors (fail): every required key present; `status`, `needs.kind`, `needs.who`, `decisions[].status` and `area` values in their closed lists; `id` equals the file name's prefix, is unique, and is a string of the form `NNN` or `NNNx` (a numeric id is rejected); every `depends_on`, `thread`, `superseded_by` id exists; no dependency, thread or supersede cycle; `decisions[].id` unique and `decisions[].who` valid; `answered` decisions have `answer`, `by`, `on`; dates are `YYYY-MM-DD`; `links` only to allow-listed hosts.
- Warnings (printed, do not fail): missing `summary`; `summary` longer than the limit; a `done` issue with open `needs` (a done issue should not be waiting on anyone, but a root may still carry a `try` for a post-merge check, so it is a warning, not an error, and the planner decides); a `done` root with members not done (4.3); a body heading that duplicates another; a `superseded_by` issue that is not `done` or `todo`.
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
    options: ["All, paged six at a time", "Six at random, no paging"]
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
# decisions: two answers are recorded in docs/real-world.md ("Marc's decisions so far");
# the note has 10 questions in section 11 and the issue log says none were recorded.
---
```

The `unverified` list is lifted from the issue's own `## Unverified` section (cut here; the real list is longer). The example shows two honest gaps the schema would expose: ten questions of which `docs/real-world.md` records only two answers (under "Marc's decisions so far (2026-10-28)": the in-game browser starts client-only, Instagram is not doable); the issue's own log says none were recorded, so the gap is real but smaller than the log suggests (a backfill would copy those two into `decisions` and ask Marc about the other eight, or mark them `dropped` where later issues such as 113 settled them), and a long `unverified` list on a `done` issue, which is a feature, not an error.

## 9. Migration of the 165 issues

1. **Quote first, inside stage 1.** A script wraps the 72 unquoted titles in double quotes (escaping the inner quote in the 11 titles that have one), the diff is reviewed as 72 one-line changes, and the new validator confirms nothing else moved. From then on every file is valid YAML and one parser (`yaml`, a devDependency from the start) reads all 165. There is no tolerant first-colon parser.
2. **Table titles.** The same script writes a `short:` line into the roughly 50 issues whose current `PLAN.md` row title differs from the file's `title`, copying the row's wording, so the generated table reproduces today's table. Without this the generated table would rewrite 50 rows (46 by my regex, 50 by the reviewer's count; the exact figure depends on how titles with brackets are matched). The 11 parenthetical notes become `note:` lines the same way.
3. **Derived at no cost:** `thread` for the 41 sub-issues, `opened` and `closed` from git, `unblocks`, `kind: umbrella` for the 9 parents, and thread status.
4. **Backfill by an agent, only where the views need it:**
   - `summary`: for the roughly 24 not-done issues, the 9 umbrellas and the 41 sub-issues (about 70 files, one line each). The other 95 old done issues fall back to `title` forever; their pages work.
   - `thread`: written for the non-id subjects (mobile, sync, flashcards, music lab: about 15 files). I derived the candidate groups from reading `depends_on` and doc references only; I did not check each.
   - `superseded_by`: 113e to 117g (named in PLAN.md's table row for 113e), and any others the planner knows.
   - `decisions`: **do not hand-backfill.** Parse the 30 marked lines of the six docs at generation time (read-only; the Decisions log works on day one); for the other nine docs, an agent drafts `decisions` for the issues still open (048, 049, 062, 091, 111f, 114) and Marc glances. Old closed decisions stay prose.
   - `unverified`: only for not-done issues and for the research issues, lifting what each file already lists.
   - `needs`: written fresh, by the planner, for what is truly waiting now (the four cards in 5.1); never reconstructed for the past.
5. **What stays as it is:** every issue body, every progress log, `docs/*-design.md`, old done issues' headlines. Most of the 165 are history; the point is the live threads.

## 10. Staged plan (each stage useful alone)

Sizes are guesses with a range; the risk is on the high side, because each stage's tests, edge cases (ids, cycles, doc-line parsing) and templates usually cost more than the first estimate.

| Stage | What | New fields | Useful alone because | Rough size |
|---|---|---|---|---|
| 1 | Quote the 72 titles; `yaml` devDependency; parser with string-only ids; the validator; `short` and `note` written from the current table; `PLAN.md` generated between markers; CI: validate on every push and PR, table check on `main` only; `dist-issues/` in `.gitignore` | `short`, `note` (copied from today's table) | Ends hand edits and the 5-row drift; catches bad ids and cycles; no schema to learn; useful even if nothing else ships | one issue (could split the quoting commit out); 250 to 450 lines plus tests |
| 2 | `summary`, `thread`, `needs`, `unverified`, `kind`, `superseded_by`; the home, thread, inbox and issue pages with a heading tree; `issues.json` | those fields | The briefing-like read, and a cheap input for an agent briefing | one to two issues; templates are the bulk, about 400 to 600 more lines |
| 4 | **Ships with stage 2:** edits to `work-issue`, `review-issue`, `merge-issue` so they write and use the fields; a few lines in `docs/contributing.md` | none | Keeps the data from rotting (the real risk): without it the fields go stale in a week | one small issue, edited by the planner (skills are planner files) |
| 3 | `decisions` and `docs`: the decisions log from parsed docs plus front matter; the "Decisions you made" thread branch | `decisions`, `docs` | The record of what Marc decided, finally listable | one issue |
| 5 | Agent backfill (section 9 item 4) and, if wanted, publishing to a phone-readable place | none | Fills the home with real summaries | one issue |

Stage 4 sits beside stage 2 on purpose (the numbering is the order I named them in, not the build order). If only one stage ever ships, ship stage 1.

## 11. Risks

- **Weight of the schema.** Mitigation: five keys are all anyone must write; the rest is optional and defaulted; validation messages are plain words. Test of the idea: if a beginner on a `learn/*` branch cannot file an issue by copying an old one, the design failed.
- **Two sources of truth.** Facts live in front matter and in prose (a decision is in `decisions` and in the design doc). Rule: front matter is the *index and the answer*, the prose holds the *options and reasoning*; the log line links to the section. The generated table, the thread screens and `unblocks` are never written, which removes the biggest duplicate (PLAN.md).
- **Rot.** A `needs` entry nobody removes makes a calm page dishonest. Mitigations: resolving is a deletion in the same edit that records the answer; `merge-issue` warns when merging an issue whose `needs` still lists its own review; no automatic reminders.
- **Privacy (the repo and the pages are public).** The generator reads `issues/` and `docs/`; its output (`dist-issues/`) is gitignored and added to `.gitignore` in stage 1. Note that `scripts/privacy-guard.test.mjs` only scans *tracked* files, so it does not cover a gitignored output; the `links` allow-list and the rule that nothing is committed from the generator except the `PLAN.md` table are the real defence. `links` are restricted to an allow-list of hosts (github.com, the game's own host, the flashcards app's host); `claude.ai` links and any other host fail the check, which keeps the private briefing's share link (and any artifact link) out. `needs.why` and `summary` are public text: no personal details, no addresses, same rules as the rest of the repo. Add the generated pages to the existing guard pattern in `scripts/privacy-guard.test.mjs` (the forbidden-words file also scans the generated files if they are ever committed). Do not add the site to the production deploy.
- **A page that looks authoritative but lags.** The snapshot stamp (commit and date, and "GitHub is right") is mandatory in every page footer and header, as in the briefing.
- **Scope creep into a tracker.** The project's rule, "a garden and not a backlog", is the defence: no priority, estimate or due date fields.

## 12. Tone: the calm "needs you" view

These are requirements for stage 2, not preferences:
- No total count of what is waiting, anywhere (no badge, no "5 items", not in the page title). Thread cards may say "six of seven shipped" because that describes progress, not obligation; the home's "short version" may state plain facts.
- No urgency words (overdue, blocked on you, ASAP, stale), no red, no shake. Pills are neutral words and a closed set: Decide, Try, Do, Review, Wait (needs) and Shipped, In progress, Planned, Paused (threads). There is no "Later" pill.
- Order is newest first, never oldest first, and dates are plain "asked 2026-10-28".
- Every card has a reason in one plain line and a link that jumps to the exact place (the decision, the thread).
- Empty state: "Nothing is waiting on you."
- Home shows at most five cards and a link for the rest (the link only exists when there are more than five); the "Waiting on something else" group is separated so it is clear that is not Marc's.
- The generator never sends, schedules or notifies anything.
- A decision with a recommendation shows the recommendation in the card, so an answer can be "as recommended".

## 13. Cost versus value, candidly

- **Worth it, clearly:** stage 1. It removes a real recurring error (5 of 165 rows wrong today), turns a hand edit in every merge into a command, and adds a validator that would have caught the stale `blocked` and `review` statuses. It needs no taste decisions.
- **Worth it, probably:** `needs`, `summary`, `unverified`, `thread` and the three screens. They are the actual goal. The value is mostly *for Marc reading*, and it is real only if the fields stay current, which is what stage 4 buys.
- **Worth it, modestly:** `decisions`. 30 marked lines already parse out of six docs; new decisions in front matter are cheap for agents because they already write the same sentences in prose. Historic backfill is not worth it.
- **Probably not worth building:** the dependency graph and timeline views, a project glossary page (`docs/learn/src/reference-glossary.md` already exists), per-thread authored narrative ("A bug I caused", "The numbers" belong in issue bodies), a decision file per decision, automatic reminders of any kind, a server.
- **What is lost:** the briefing's voice and its on-the-fly choice of what mattered. The generator's thread page is a faithful index, not an editor's view. The mitigation is `issues.json` so a briefing is a cheap on-demand ask.
- **Uncertain:** how much Marc will read a generated page versus ask Claude (this is the first question below); how well first sentences work as one-liners in practice (I did not render a prototype, by instruction; a prototype on 10 issues would answer it before stage 2); whether GitHub shows an error banner for the 72 invalid front matters (never checked; if it does, that strengthens the quoting commit).

## 14. Questions for Marc

Each one line, most important first, with my recommendation. (The dependency graph, the timeline and a glossary page are not questions: I recommend skipping all three, and will only revisit one if Marc says he misses it.)

1. **ANSWERED by Marc 2026-11-15: locally (a generated local page and a CI artifact); hosting later if wanted.** Where will you read it: only on your Mac (a local file and a CI artifact), or hosted somewhere your phone opens?** Recommend local plus the CI artifact first; add hosting only if you find yourself wanting the phone.
2. **ANSWERED by Marc 2026-11-15: "let's start it" (stage 1 is being built).** Build stage 1 now: quote the 72 titles in one mechanical commit, add the small `yaml` devDependency, a validator and a generated `PLAN.md` table, with no new fields?** Recommend yes; it is useful even if you never want the rest.
3. **DECIDED by the planner 2026-11-15 (Marc: start it; the recommendation is taken, and any of these can change later).** PLAN.md's titles: keep today's hand-shortened wording through a `short:` line in each of the roughly 50 issues that have one, or accept the issue files' full titles in the table?** Recommend `short`, so the table does not change on day one.
4. **DECIDED by the planner 2026-11-15 (Marc: start it; the recommendation is taken, and any of these can change later).** Is `needs` (who, what kind, one plain line, no priority, no counts, newest first) the right way to say "waiting on Marc", knowing a pre-merge trial of a branch is invisible on `main` and stays a planner message?** Recommend yes.
5. **DECIDED by the planner 2026-11-15 (Marc: start it; the recommendation is taken, and any of these can change later).** Decisions: parse the six docs that already use the "ANSWERED by Marc" line, add `decisions` to front matter only for new questions, and do not backfill old ones?** Recommend yes.
6. **DECIDED by the planner 2026-11-15 (Marc: start it; the recommendation is taken, and any of these can change later).** Keep the agent-written briefing as an on-demand ask (reading `issues.json`) rather than trying to generate its "short version" and caveats?** Recommend yes.


## Added idea (Marc, 2026-11-15)
The game could read the generated `issues.json` one day, as a dumb meta joke for the side project (the little game inside the game reading the repo's own issues). Parked in `docs/ideas.md`; nothing in this design depends on it, but `issues.json` being a stable, public-safe file is what would make it possible.
