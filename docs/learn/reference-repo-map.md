# One page map of the repo

[Back to the index](README.md)

```
PLAN.md                  working rules and the issue table. Do not edit it by hand (the planner does).
issues/NNN-slug.md       one file per issue: goal, acceptance criteria, progress log
docs/                    how things work (activities, tasks, state, decor, music, sync, mobile ...)
art/src/*.sprite         every picture, as text (a grid of palette letters); art/palette.json is the palette
public/sprites/*.png     BUILT from art/src by `npm run sprites`; committed
scripts/                 sprites.mjs, tools.mjs (`npm run tools` lists them), check-dist.mjs, brand.mjs
netlify/                 the sync server (a Netlify Function); you will rarely touch it
index.html, music-lab.html   the game page; the dev-only music lab page
src/main.ts              the glue: makes the canvas, keyboard, Game, features and starts the loop
src/game/
  loop.ts                fixed-timestep loop (you have read it)
  game.ts                the Game hub: owns the player, state, interaction, events, layers, dialogs
  config.ts              nearly every tunable number and table (SOUND, MUSIC, REEL, TIME_OF_DAY, ...)
  state.ts, state-vars.ts   ApartmentState (named bounded numbers) and the list of variables
  tasks.ts               every task, as data (CONTENT, STATE_RULES, LOOKS, GOOD_HOURS, EXTRA)
  apartment.ts           the three room maps and which objects offer which tasks
  tilemap.ts, level.ts   turns a map plus a legend into a Level (pieces, props, doors, variants)
  interaction.ts         the system that finds what you face, starts a task, pays it
  activity.ts            the Activity interface, BaseActivity and the registry
  activities/            wait, cutscene, typing, notes, sleep, make-track, flashcards, reel, ...
  events.ts, features.ts the event list and the one place features are switched on
  achievements/          the pause screen, saved progress, achievement data, toasts, stats
  sound/, music/         the synth, sound feature, `.track` parser; music/tracks/*.track are the records
  time-of-day/, particles/   two more features (light; sparkles)
  decor*.ts, deliveries.ts, encounters*.ts   decor items and gifts, packages, ad encounters
  reel/                  the photo reel and gallery (never real photos in tests: synthetic-pic.ts)
  side-project*.ts/.txt  the side project: its config file, parser and composer
  sync/                  save merge and sync client
  golden/                recorded drawing logs for the golden frame tests
src/render/              canvas, camera, hud, sprites, fonts, room painter, dialog box, touch editor
src/input/               keyboard, controls, touch layer, clipboard
src/lab/                 the music lab (dev only)
```
Tests sit beside the code as `x.test.ts` (about 160 files). There is no separate test folder.

---

[Back to the index](README.md)
