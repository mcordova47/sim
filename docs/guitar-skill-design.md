# Guitar skill: from single notes to fingerstyle (issue 114 design)

Status: design only, nothing built. Decisions are marked **decided** with a reason; section 11 has the questions that need Marc.

## 1. Summary

Playing the guitar gets richer the more you have played it, with no number to chase. The skill is **derived from the count of finished guitar sessions the save already keeps** (`stats.taskCounts.guitar`), so there is **no new saved field and nothing new to merge**: the sync rule "per task, the larger" already does the right thing across devices. Four levels, as data: single notes (first session), then chords after 4 sessions, strumming patterns after 12, and a looping bass-and-harmony groove with the arrows playing melody over it after 30. Pitch, key and voices stay as they are (A major, steel or nylon from issue 108); everything new is built as pure functions (`key -> notes`) plus one small scheduler for the groove, driven by the audio clock like the record player. Skill is never lost, never shown as a bar; at most one deadpan line appears on the pause screen after the first session. One skill for all instruments.

## 2. What exists today (read first)

- `NotesActivity` (`src/game/activities/notes.ts`) shows a random line of arrows (6 by default, max 14); each has `NOTES.window` 1.2 s to be pressed, `gap` 0.3 s between. Quality = hits / notes. It plays no sound itself.
- Sound is made by `SoundFeature` (`src/game/sound/feature.ts`): on a key press while the `notes` activity runs it plays `noteEffect()` at `pitch = noteKeys[dir] / 440`. `noteKeys` is A major's triad: left A, right C#, up E, down the E below (`config.ts`). Voices: `SOUND.guitarVoices` / `SOUND.instruments` (steel default, nylon), chosen by the item in the `guitar` decor slot (not placed in the real game yet; `?guitarvoice=` previews).
- The guitar task (`tasks.ts`): "Play three chords", 5 min, 55 points, flavor "Same three chords. Different, slightly worse, song." It already counts in `stats.taskCounts.guitar` whenever it is completed (a backed-out session is not counted).
- `Synth.play(def, options, delay)` plays an effect after a delay on the effects bus (capped at `SOUND.maxVoices` 28, all-or-nothing). `Synth.voice(voice, start, options, bus)` schedules a single voice at an exact audio-clock time on any bus; the **music** bus is not counted against the voice cap. `MusicPlayer.update(synth)` shows the pattern for timing: no timers, it schedules whatever falls in the next `MUSIC.lookahead` (0.25 s) each frame.
- Sync (`docs/sync.md`, `src/game/sync/merge.ts`): `taskCounts` merge per task by max; other stats by max; world vars come whole from the newest-played device.

## 3. Skill growth (decided)

**Rule: skill is a pure function of lifetime finished guitar sessions, `n = stats.taskCounts.guitar`.** A level is the highest whose threshold is `<= n`.

Why this and not a new stat or play-time:
- **Nothing to save, load, normalise or merge.** `taskCounts` is already saved, capped, tolerant on load and merged by max. A new field would touch `Stats`, `normaliseStats`, the merge table and docs for no gain. If Marc later wants "keys pressed" instead, it is one more max-merged number (section 9, risks).
- **It cannot fall** (counts only rise; reset clears everything, as for every stat). It cannot be ground: sessions cost game time and the task has a normal pay curve, so the player never needs to chase it, and the levels are a handful of sessions apart, not hundreds. Nothing is lost for stopping.
- A session is a few seconds of real time (about 6 notes at roughly a second each), so the thresholds below mean minutes, not hours, across a game of normal length.
- **Quality does not matter.** Fumbled sessions count as much as clean ones: you get better by playing, not by performing (deadpan, and no pressure).
- A cancelled session does not count (it does not count today either).

**Levels as data** (new `GUITAR_SKILL` in `config.ts`; all tunable, these are first guesses to be heard and adjusted):

| level | id | from session | what you hear |
|---|---|---|---|
| 1 | `notes` | 0 (the very first) | one note per arrow (today) |
| 2 | `chords` | 4 | one chord per arrow |
| 3 | `strum` | 12 | a strummed pattern per arrow |
| 4 | `groove` | 30 | a bass and harmony loop underneath; the arrows play melody over it |

Each level also carries a deadpan `name` for the pause line (section 8). The thresholds are `n` values, so the first session you ever play is level 1 and the fourth completed session is the first one that sounds like chords (n=4 means four finished sessions behind you).

**One skill for all instruments (decided).** Skill is about the player, not the guitar; per-instrument skill makes a nylon guitar a reset button, which fights "no grind, no scarcity". Instruments change the timbre only (issue 108 data). An instrument may later be limited by data (`maxLevel`, e.g. a future ukulele with no groove), which needs no change to the rule; not built now.

**Level changes are quiet.** No toast, no fanfare, no popup. The next session just sounds different. (The deadpan pause line, section 8, is the only place it shows, and only if Marc wants it.)

## 4. Key, scale and tempo (decided)

Everything lives in **A major** because the notes game already is: left A, right C#, up E, down E (low) is the A major triad. The levels only add notes that agree with it.

- **Key:** A major (A2 = 110 Hz as the chord root reference; melody an octave or two above). A single `GUITAR_KEY` constant (`root: 440` Hz reference, semitones as the unit) so it can be moved.
- **Chord set (diatonic, four chords):** I A, IV D, V E, vi F#m. They are the "three chords" of the task name, plus the one everybody forgets. Voicings are interval lists from the chord root in semitones (open-position style, 5 or 6 strings, low to high), data in config:
  - A (root A2): `[0, 7, 12, 16, 19]` (A E A C# E)
  - D (root D3): `[0, 7, 12, 16]` (D A D F#)
  - E (root E2): `[0, 7, 12, 16, 19, 24]` (E B E G# B E)
  - F#m (root F#2): `[0, 7, 12, 15, 19, 24]` (F# C# F# A C# F#)
  Stage 114b fixes the final numbers; the test checks every note is in A major, matches the chord's quality, and nothing is below A2.
- **Scale for melodies:** A major pentatonic (A B C# E F#). Over A, E, F#m and D every pentatonic note is either a chord tone or a safe passing tone, so a melody cannot clash (nothing that sounds "wrong", on a game with no fail state).
- **Tempo:** one constant, `GUITAR_TEMPO = 92` bpm (beat 0.652 s), a slightly slow, unhurried strum. **Swing:** a single `swing` number (0 = straight, 0.12 = a lazy shuffle on the off-eighths: the off-beat is delayed by `swing * eighth`). Start at 0.1 for strum and groove: a touch of lilt is the cheapest way to sound like a person. It applies to the accompaniment only; **the melody is never quantised or delayed**, so a keypress is always instant (latency feels like a broken game).
- **Humanise:** each scheduled accompaniment note gets a tiny seeded timing and volume wobble (about 8 ms and 8%), from the game's existing seeded random (tests pass a fixed one).

## 5. The levels and their pure functions

Put these in `src/game/sound/guitar-skill.ts` (pure, no audio, no DOM) so they can be tested to death. Types sketched:

```ts
type Dir = "up" | "down" | "left" | "right";
type Level = "notes" | "chords" | "strum" | "groove";
interface Note { semis: number; at: number; gain: number }   // semis from A4 (0 = 440 Hz); at in seconds after the trigger
function skillLevel(sessions: number, levels = GUITAR_SKILL.levels): Level;   // highest threshold <= sessions
function playKey(level: Level, dir: Dir, ctx: { bar: number; beat: number }, seed: number): Note[];
function chordFor(dir: Dir): ChordName;                                  // fixed table, section below
function strumNotes(chord: ChordName, pattern: string, tempo: number, swing: number, seed: number): Note[];
function groove(bar: number): { bass: Note[]; harmony: Note[]; chord: ChordName };   // one bar of the loop
```

`playKey` returns notes with offsets (seconds) from the press; the sound feature plays them with `Synth.play(def, {pitch, gain}, at)` (existing, on the effects bus). Everything is a list of `{semis, at, gain}`, so a level is "a function from a key to a list of timed notes", which is exactly what makes it testable without audio.

### Level 1: notes (exists)
`playKey("notes", dir)` = `[ {semis: noteKeys[dir], at: 0, gain: 1} ]`. Today's behaviour, exactly. Nothing changes below level 2.

### Level 2: chords
Arrow to chord, **fixed and learnable** (decided): left = A (I, home), down = D (IV, below), up = E (V, up and away), right = F#m (vi, the odd one). One press = the whole voicing, plucked with a roll of about 12 ms per string from low to high (almost together, not a laser-sharp stack), the root a little louder. Chord notes are all the chord's own voicing, so no key pressed is ever wrong. (Honest cost: 4 to 6 notes per press; voice budget in section 9.)

### Level 3: strum
Same chord per arrow, but a press plays a **one-bar strum pattern** starting at the press: a string of 8 slots (eighths) like `D . D U . U D U` (D = down-strum low to high, U = up-strum high to low with fewer strings and softer, `.` = rest, `x` = muted chop, a short noise tick; optional). Patterns are data (`GUITAR_SKILL.strums`), a few of them; which one is used per session is picked with the session's seeded random once, so one song-ish groove per session ("same chords, a different, slightly worse, song"). A new press **cancels the unplayed rest of the previous pattern** (the already struck chord keeps ringing) and starts a new one on its chord, so the strum always follows the player and never queues up. All offsets are relative to the press, so a press is always "in time with itself".

### Level 4: groove (fingerstyle feel)
Two layers:
1. **The accompaniment**, a looping pattern that starts at the first press of the session and stops when the session ends (or is cancelled; its notes ring out on their own decay): a Travis-style picking pattern, thumb on bass (root, then fifth, alternating) on beats and fingers on the upper strings of the chord on the off-beats, one chord per bar, progression **I V vi IV** (A E F#m D), 4 bars, then around. Patterns are data (a bar is eight slots of `{string, gain}`), the bass is one octave under the harmony.
2. **The melody**, the arrows: each arrow plays a note **relative to the chord sounding at that moment**: left = chord root (octave up), right = the chord's third, up = fifth, down = the sixth/second step of the pentatonic (a gentle passing tone). Every one is a chord tone or a pentatonic neighbour, so it always fits, and because the chord underneath changes each bar, the same four arrows move through the changes by themselves. Plays immediately on the effects bus, the same voice as today; the groove plays on the music bus, quieter (about 0.55 of the melody gain), pan-less.

The scheduler for the groove is the only piece with time in it, section 6.

## 6. Scheduling the groove in time with the melody (decided)

The record player's trick, reused: no timers; each frame `update(synth)` schedules the groove events that fall in the next `GUITAR.lookahead` (0.25 s, same as `MUSIC.lookahead`) on the audio clock.

- **Anchor:** the groove's beat grid starts at the first accompanied moment (the first press of a level-4 session, plus a lead-in of 0.05 s as `MusicPlayer` has). From then the grid is `origin + k * eighth`, with swing applied to odd eighths. The bar index is `floor(k / 8) % 4`.
- **Melody stays free.** The press plays at once at its own moment. Because the groove is a steady background and the melody is sparse (a note every 0.3 to 1.5 s), the melody never has to land on the grid to sound right; and no quantising means no input lag. The only coupling is read-only: at press time the melody asks the scheduler "which chord is it?" (from the current bar index at `synth.now`), so the note is a chord tone of the harmony you hear at that instant (a press just before a bar change picks the old chord, which is correct: it is what is sounding).
- **Late frames.** Same rule as `MusicPlayer.skipLate`: events later than 0.08 s are skipped, and a long stall (tab in the background) jumps whole bars forward instead of playing a burst.
- **Buses.** Groove on `music` (not counted in the voice cap and cannot starve other effects; the guitar melody keeps the effects bus and the cap headroom measured in issue 108). **Muted means silent** via the synth's existing mute; the record player is not affected (the groove stops while the notes game is not running).
- **Where it lives.** `GuitarGroove` class in `src/game/sound/guitar-groove.ts` (like `MusicPlayer`; constructor takes the bus; `start()`, `stop()`, `update(synth)`, `chordNow(now)`); `SoundFeature` owns one, starts it on the first notes keypress at level 4, stops it when the activity is no longer `notes`. It uses the pure `groove(bar)` for what to play.
- **While a record is playing:** the record player is not stopped; the guitar then is a second layer. Possible clash of keys (the tracks are in many keys). Accepted: recommended behaviour for level 4 is to **duck the record to 30% while the groove plays** (same mechanism the sleep scene uses to fade buses). Decide at build time (114e) by ear; see risks.

## 7. Where the level is read (decided)

`SoundFeature` needs `n`. It does not know the stats today. Options: pass a `getGuitarSessions(): number` callback from `Game` (where the stats live) when the sound feature is built, read **once when a notes activity starts** (not per key). That also means a level cannot change in the middle of a session (nobody notices anyway; the session that earns level 2 still sounds like level 1 until the next one, which also keeps the reveal for the next time you pick up the guitar).

The notes activity itself does not change (same arrows, same window and gap, same scoring); skill changes only sound, so the minigame never gets harder because you improved (zen rule: progress adds richness, never pressure).

## 8. How skill shows (decided: barely)

- Nowhere in the world and no toast.
- **One line on the pause screen's stats**, only once `taskCounts.guitar >= 1`, deadpan: `GUITAR: "STILL THREE CHORDS"` at level 1, then `"A FOURTH CHORD, TECHNICALLY"` (chords), `"STRUMMING, ON PURPOSE"` (strum), `"FINGERS, SOMEHOW"` (groove). Wording lives in the level data and is Marc's to rewrite. It is a "meaningless stat" in the sense of `docs/decor.md`: it describes, it unlocks nothing, no task, ad, achievement or score reads it.
- No numeric progress ("3 of 4 sessions to next"), no bar, no achievements tied to it at first (an achievement later, if any, should be a quiet one like "A Fourth Chord", never "Master Guitarist").
- The whole line can also be omitted; the skill works without it (see question 3).

## 9. Save and sync (decided: nothing new)

- **Saved data:** none. Skill reads `stats.taskCounts.guitar`. Reset clears it with the rest (as everything).
- **Sync merge:** per task max, already in the merge table. A phone at 9 sessions and a laptop at 5 merge to 9 on both: the skill is the better of the two, never lost, never added up (adding would let two devices double-count the same past). Commutative, associative and idempotent already hold because the merge function already does.
- **Task id rename risk:** the skill depends on the task id `guitar`. If the task is ever split or renamed, the id list in `GUITAR_SKILL.taskIds` (an array, data) says which task counts it; a test asserts the ids exist in the task list.
- **If the count turns out to be the wrong measure** (for example once sessions get fast and the thresholds feel like nothing), the fallback is a dedicated stat `guitarNotes` (keys pressed in the notes game): add to `StatsData`, `Stats.load` (a `count()` read), `emptyStats`, the max-merge list and docs/sync.md section 4, with the property tests that already cover "every counter is at least both inputs'". Cheap and mechanical. The levels are defined as thresholds on a number, so switching the number does not change anything else.

## 10. Dev shortcuts and tests

**Dev shortcuts** (dev server only, `import.meta.env.DEV`, dead in a build, as `?guitarvoice=`):
- `?guitarskill=1..4` forces the level without touching the save (or counts).
- Console: `auditionGuitarSkill(level)` plays a short fixed demonstration of that level (a few presses of the arrows 1 s apart, for level 4 a four-bar run), like `auditionGuitar`. `?guitarskill=` composes with `?guitarvoice=` so any level can be heard in any voice.
- Optionally `?guitar=N` to pretend N sessions (so the real thresholds can be tested end to end).

**Tests** (vitest, no audio hardware; same fake audio context as `guitar-voice.test.ts`):
- `skillLevel`: each threshold, one below and one at it; 0, negative, NaN, huge, non-integer; the thresholds are strictly increasing; level ids unique.
- Data: the table is complete (a name for every level, patterns well-formed: 8 slots; chord voicings in the key; every chord in the progression exists; tempo, swing and humanise in range).
- `playKey`: level 1 equals today's `noteKeys` (regression); every arrow has a chord at level 2 and 3; all notes' `semis` are in A major; offsets are non-decreasing; the fixed arrow-to-chord table; a down-strum goes low to high, an up-strum high to low; `.` produces no notes; a re-press truncates the earlier strum's remaining events (scheduler test).
- Melody (level 4): for each of the four chords and each arrow the note is a chord tone or pentatonic neighbour; the same press in different bars gives different notes; the chord of bar k is `[A, E, F#m, D][k % 4]`.
- Scheduling: with a fake clock, the groove schedules each event once, in order, within the lookahead; loops after 4 bars; swing delays only odd eighths; a long stall skips whole bars and does not burst; `stop()` schedules nothing more; muted is silent; the groove is on the music bus and the melody on effects; a press at 70 ms spacing still plays all notes (the issue-108 "no drop" check holds with a groove running).
- Level read once per session: changing the count mid-session does not change that session.
- Save/sync: a property test that `mergeSaves` keeps `taskCounts.guitar` the max (already covered generally; add one example with `guitar`), and that no new key appears in the progress group.
- Determinism: the same seed gives the same accompaniment.
- Not testable by an agent: how it sounds. Every stage's acceptance says "Marc listens and approves", as 108 did.

## 11. Staged build plan (small issues)

All stages are independent of the save format. Each ends with `npx vitest run`, `npx tsc --noEmit`, `npm run build` and Marc listening.

- **114a: the skill rule and the data.** `GUITAR_SKILL` in config (levels, thresholds, names, key, tempo, swing, chord voicings, strum patterns, groove patterns as empty/placeholder), `skillLevel`, wiring `Game` to hand the session count to `SoundFeature`, read once per session, the dev override `?guitarskill=`. At level 1 it changes no sound. Tests: the level function and the data checks.
- **114b: chords (level 2).** `chordFor`, `playKey` for chords, the roll, scheduling the offsets through `Synth.play(..., delay)`. Dev audition. Tests: chords.
- **114c: strumming (level 3).** Strum patterns, down/up, seeded pattern choice per session, cancel-on-next-press. Tests: strum.
- **114d: the groove (level 4, accompaniment only).** `GuitarGroove` scheduler on the music bus, the progression, a travis pattern, tempo and swing, stop on end, mute. Dev audition of the loop alone. Tests: scheduling.
- **114e: the melody over the groove.** Arrow to chord tone against the chord sounding now, the duck-the-record decision, the no-drop test with the groove on, the voice cap check. 
- **114f (optional): the pause-screen line.** The deadpan stat line and its test; only if Marc says yes (question 3).
- **114g (optional, later): `maxLevel` per instrument,** and an achievement, if wanted.

Order: a, b, c, d, e (f any time after a). b is the first thing Marc can really hear, so he can say early whether four chords and the arrow mapping feel right before the heavier d and e.

## 12. Risks

- **It might sound bad.** Pure Web Audio plucks stack: a six-string chord in the steel voice is 18 voices (3 each) of the 28 cap. Mitigations: strum and chord notes use fewer partials (a `light` voice variant: just the fundamental plus the pick tick, data), cap the stacked strings at 4 for chords and 3 for upper picking, and reuse the 108 "no-drop" test across spacings with chords. Honest: this is the biggest risk and it can only be settled by ear.
- **Voice cap.** Level 2 and 3 at fast pressing can drop other effects (a chime). The groove avoids it by using the music bus. Mitigation as above plus lower priority for strum notes; test with the 70/100/150 ms spacings.
- **Latency.** Scheduling by `Synth.play(delay)` is sample-accurate on the audio clock; nothing waits for a frame, only the lookahead for the groove (the melody does not use it).
- **Key clash with the record player** (tracks are in other keys). Duck or stop the record while level 4 plays; by ear.
- **Skill by session count feels fast or slow.** The thresholds are data; tune after listening. Fallback stat in section 9.
- **A hidden surprise is easy to miss:** a player who stops at level 1 never hears the rest. That is fine (no pressure), and the pause line, if added, is the nudge.
- **Docs drift:** `docs/sleep.md` still says "the 14 voice cap" (noted in the 108 review); fix when touching sound docs.

## 13. What I decided myself, and why

1. **Skill = a function of finished guitar sessions, not a new stat.** Zero save and sync work; merge by max is already right.
2. **No decay and no bar.** Zen garden rule: nothing to lose, nothing to fill.
3. **Quality does not matter** for growth; only playing does.
4. **One skill for every instrument; timbre only varies with the instrument.**
5. **A major, four chords I IV V vi, pentatonic melody, one tempo (92 bpm), light swing on the accompaniment only.** Fits what the game already plays; nothing can clash.
6. **Fixed arrow-to-chord table** (left A, down D, up E, right F#m): learnable, so playing feels like playing.
7. **Strum is per press, relative to the press**; **groove is a free-running loop on the audio clock with the melody unquantised.** The player never feels lag, and the only coupling is "which chord now".
8. **Groove on the music bus** (outside the voice cap).
9. **Level read once per session**; skill never changes difficulty, only richness.
10. **The notes game itself is unchanged.**
11. **The pause line is optional and last.**

## 14. Open questions for Marc (most important first)

1. **How fast should the levels come?** My recommendation: chords after 4 sessions, strumming after 12, groove after 30 (a few minutes of real play in total; quick enough that a short visit hears something new). Options: (a) that; (b) slower, about 8 / 25 / 60, so the groove feels earned across days; (c) show every level in the first visit (just a demo of the idea). 
2. **Level 4: which "fingerstyle" do you mean?** Recommendation: the persistent loop underneath with the arrows playing melody over it (it is the more musical and it is what "sounds complex"). Options: (a) that; (b) each keypress plays a short rolled arpeggio of 3 to 4 notes, no background loop (simpler, fewer new parts, more like a flourish); (c) both, as a level 4 (arpeggio presses) and a level 5 (the loop).
3. **Should the skill show anywhere?** Recommendation: one deadpan line on the pause screen after the first session ("STILL THREE CHORDS" and so on), no numbers. Options: (a) that; (b) nowhere, you only hear it; (c) the line plus a quiet achievement at the top level.
4. **While a record is playing, what does the groove do?** Recommendation: duck the record to about a third while you play at level 4. Options: (a) duck; (b) stop the record while the guitar is out; (c) play over it untouched.
5. **Is the first-session sound still the old plain note?** Recommendation: yes, level 1 stays exactly today's single note (it is the joke's start: "play three chords" and it is one note). Options: (a) yes; (b) start at chords but with the clumsy strum (one flat chord per press), and make single notes only a dev preview.

## Marc's answers (2026-10-28)
- **Q2, what fingerstyle means: (a)** the persistent bass and harmony loop with each keypress playing a melody over it. "Let's try it and see how it feels."
- **Decided by the planner without Marc (easy to change, all in config):** level 1 stays today's single note; the record ducks to about a third while the groove plays; skill shows as one deadpan pause line after the first session (114f, optional); level pace 4 / 12 / 30 sessions.
- **Build order:** 114a (rule, data, chords, strumming: levels 1 to 3) first, then 114b (the groove and the melody over it: level 4) so Marc can hear and feel each step; 114c (the pause line) any time after 114a.
