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
- No readable text in sprites, no real artist or band names, no employer, full name or address in the repo.
- Photos from the photo reel never leave the device and nothing about their content is in the repo, the save or sync.
- `main` should never make the live game worse than what is deployed (`docs/deploy.md`).
- New player-visible words go into `docs/text-review.md` so they can be marked later (no rush).

## Worked example: the encounter track (issue 091d)
The encounter music's loop is a plain `.track` file, so replacing it is a good first change.
- Worktree: `../sim-worktrees/091d-encounter-real-track`, branch `issue/091d-encounter-real-track`.
- Compose in the music lab (`npm run lab`). The lab's `== intro ==` and `== loop ==` markers are a lab feature; a system track holds only the loop. The entrance's buzz, rising pulse and hit chord (`ENCOUNTERS.entrance.sounds` in `src/game/config.ts`) stay as they are, and the loop starts on the hit at frame 32, in G, like the entrance's pulse run.
- Replace `src/game/music/system/encounter-battle.track` with the loop text.
- `npm test` has a guard for system tracks: it must parse, no note may run past the loop end, and the first note is on the downbeat.
- Listen in the real encounter: `npm run dev`, open `/?encounter=ad-candle&again=1`, press a key. Gain and fades are `ENCOUNTERS.music` in `config.ts`.
- Commit, set `status: review` in `issues/091d-encounter-real-track.md`, then ask for the review.

## Useful places
- `docs/learn/README.md`: a self-paced walkthrough of the codebase with small tasks (no deadlines, works without Claude).
- `PLAN.md`: the issue table and the working rules.
- `docs/music-lab.md`, `docs/make-tracks.md`, `docs/music.md`: music.
- `docs/art-style.md`: sprites and the palette.
- `docs/deploy.md`: CI, the production branch and the deploy button.
