# Studying Spanish at the computer (issue 026)

The desk offers "Study Spanish". It is a front end for Marc's real flashcards app (Mil Palabras, palabras.mcord.dev): the cards, the schedule and the progress belong to that app, and the game never keeps its own copy. Answering a card here counts as answering it there.

## Stages

1. **Stage 1: the game side with a stand-in.** The key screen, the card screen, the points rule and the `StudyBackend` interface, all tested without a network. `demo.ts` is a built-in ten-card deck that accepts any well-formed key, sends nothing and pays nothing; `FLASHCARDS.backend = "demo"` in `config.ts` selects it.
2. **Stage 2 (this): the real backend** (`FLASHCARDS.backend = "real"`, the default). See below.
3. **Stage 3: mumblespeak.** Per-letter blips when the Spanish side is "spoken" (below).
4. **Later, optional: offline study** (cache the core and the last blob, sync when back).

## How it plays

- **Key.** The first time, a screen asks for the sync key. Paste the app's pairing link (`.../?pair=<key>`) or a bare key (32 characters of a-z and 0-9; the parser is the app's own rule, `keyFromText` in `flashcards/key.ts`). Enter confirms, Backspace deletes, Escape leaves. The key is kept in this browser's localStorage (`life.flashcards.v1`) only after the backend accepts it, and a key the server refuses is forgotten. It is never in the code, the bundle or the log. There is no "forget key" button yet; refusing a key forgets it, and clearing the site's data does too.
- **Cards.** E flips. Then left or right (or 1 and 2) picks Again or Got it, E confirms. A missed card comes back a few places on, in the session only. Escape leaves from anywhere.
- **Delivery.** Each answer is sent as it is given. If it cannot be delivered the screen says so, nothing is paid, and the answer is not kept, so the real schedule is never silently wrong.
- **Points.** `FLASHCARDS.pointsPerCard` (4) for each delivered "got it", at most `dailyCardCap` (20) per `capResetHours` (24) game hours. "Again" pays nothing; there are no streaks or penalties. The apartment's clock stands still while studying.

## The real backend

The game imports the app's own compiled core, `https://palabras.mcord.dev/core.v1.js` (`FLASHCARDS.origin`, `coreVersion`), and does not reimplement the scheduler, deck, grading or merge. `flashcards/core.ts` checks what it got (the `version` must equal `coreVersion`, and `session`, `card`, `grade`, `merge` and `requeue` must be functions) and fails with a message saying what is wrong. `flashcards/real.ts` runs the app's study loop against `GET/PUT <origin>/api/progress/<key>/es`:

- open: GET the blob (404 means no progress yet), then `core.session` for the queue;
- each answer: `core.grade`, GET again, `core.merge`, PUT. The local copy moves on only after the PUT succeeded, so an answer that could not be delivered is not kept anywhere;
- open results: a 400 means the key was refused (forgotten); a network error, a server error or a core that fails to load or check means "no connection"; a core that refuses what the server holds (a newer format, damage) means "the saved cards could not be read" and nothing is written.

The card screen shows `prompt`, then `answers` joined with commas, and `example` as a hint when there is one. Accents from the core are normalised to NFC so the font sees one letter. A build can point at another origin with `VITE_FLASHCARDS_ORIGIN`; the app's CORS list allows `https://*.mcord.dev` and Vite's dev server on `localhost:5173` and `127.0.0.1:5173`, so other origins (a Netlify preview URL) will be refused by the browser.

Only the self-graded vocabulary cards (the `es` blob) are used. The drills are not.

## Mumblespeak

The game never uses the browser's text-to-speech. When the Spanish side of a card appears it is "spoken" as a run of short soft blips, one per letter (`flashcards/mumble.ts`, tuned in `FLASHCARDS.mumble`): thirteen letters a second, vowels at distinct pitches, consonants wobbling below them, a space or a mark as a rest, at most 40 characters. An accented letter sounds like its plain one, and a word always sounds the same. The activity asks the host for each letter (`host.voice(pitch)`, the `voice` event), and the sound feature plays the `mumble` effect for it, so mute (M) and the voice cap work as for any effect.

A recognition card (the Spanish word is the prompt) speaks when it is shown; a production card (the English is the prompt) speaks its answer when it is turned over. R says it again while the Spanish is showing. Answering or leaving stops it.

## The IPA voice

A card with an IPA transcription is voiced phoneme by phoneme, in a chiptune manner, instead of letter by letter. The rhythm then follows how the word is said: `ch` is one sound, `h` is silent, `c` and `z` before `e` and `i` are an `s`. `flashcards/ipa.ts` reads a broad transcription (no slashes or brackets; stress with ˈ before the stressed syllable; `.` ignored; `ː` lengthens; a space is a pause; `tʃ` or `t͡ʃ` is one sound) and skips and reports any symbol it does not know. `flashcards/mumble.ts` turns it into a script of timed sounds and `Mumble` plays it.

All of the sound design is data: `FLASHCARDS.voice.symbols` in `config.ts` maps each phoneme to an effect, a pitch and its length on the timeline, and the `voice*` effects in `SOUND.effects` are the sounds. Vowels are tones at distinct pitches (the stressed one is longer, louder and higher), unvoiced stops are short noise clicks, voiced stops a soft thump, `s f x` a hiss, nasals a low hum, `l` a short slide, a tap `ɾ` two quick pulses, a trill `r` three, `j` and `w` slides, and `tʃ` a click and a hiss. `FLASHCARDS.voice.like` maps look-alike symbols (other dialects, allophones) to one of those.

Where the transcription comes from: the real backend asks the app's core, `core.ipa(slug, dialect)` (`FLASHCARDS.dialect`, "es-MX"), for the card's own word, in both directions. A production card lists every word that shares its English as its answers, but its slug is the one word it is for, so that is the one voiced (the written answer still lists them all). Every one of the 1000 words has a transcription today; the seven rows that are a pair, a phrase or a `(se)` verb keep their ` / `, space or `(se)`, and the voice treats the first two as pauses and skips the optional `(se)`. The function is optional: a core without it, a `null`, an empty string or a throw means no transcription, and the card is voiced by spelling, as is the example sentence's hint (nothing is transcribed for sentences or verb forms). The practice deck carries hand-written ones. A card whose transcription gives no sounds falls back to spelling too.

### Making it sound less like a tune

The original IPA voice (style 1) tells vowels apart by pitch, and its pitches are the simple intervals of a chord (a third, a fifth, a fourth), so words come out as little melodies. Speech tells vowels apart by timbre and uses pitch only for small intonation moves, so the speech-like voice is built in three parts, each adding to the one before, to hear what each adds:

1. **Formants (style 2).** A vowel is two tones at its first two formant frequencies (`FORMANTS` in `config.ts`, the usual textbook values) over a low buzz (137 Hz), all at one pitch. Stress is length and loudness only. The two formants and the buzz of a vowel are not a simple ratio of each other (no octave, fifth, fourth and the like, to within 3 percent; a test checks it for every vowel), so nothing lines up into a chord inside a vowel. To get there the textbook formants are nudged by up to about 8 percent, which is within how much a formant varies between speakers.
2. **Intonation (style 3).** Pitch drifts down across the phrase, the stressed vowel gets a small bump and the last vowel falls (`FLASHCARDS.voice.intonation`, fractions of the pitch; a few percent each, never more than a few semitones).
3. **Jitter (style 4).** Every sound is a few percent off (`FLASHCARDS.voice.jitter`), in a fixed pattern seeded by its place in the word, so no two vowels are quite alike and a word still sounds the same every time.

In the practice deck V steps between the two voices being compared, `faster` and `fastest` (the tag shows which); add `&voices=all` to the address to step through every voice, in the order of `VOICE_CYCLE` (9 to 13, then 8 down to spelling), from wherever the current voice is in that list and R says the card again, so the parts can be heard against each other on the same card. `FLASHCARDS.voice.style` is the voice a card gets before V is pressed, for real cards too: 13 (fastest; 11, faster, is the slightly slower alternative), and the voices V steps between are `DEMO_VOICES` in `flashcards/demo.ts`.

### The source-filter voice (styles 5 and 6)

The formants voice above has a flaw: its two formant tones are real tones at real frequencies (a few hundred Hz and a few thousand), and the ear hears each as a pitch, so the vowels still step between notes, only less tidily. A throat does not work that way. It makes a buzz at one pitch (the vocal folds) and the mouth shapes which frequencies of the buzz come out (the resonances, the formants). The pitch is the buzz alone, and the vowel is only which resonances are open.

The filtered voice does exactly that (`FormantVoice` in `config.ts`, built in `sound/synth.ts`): a sawtooth at one pitch (`SOURCE_F0`, 125 Hz) goes through two band-pass filters at the vowel's formants. Every vowel has the same pitch, and the only difference between them is the filters. Intonation and jitter move the source's pitch only. Style 5 (`filtered`) is just that, slowed down by `FLASHCARDS.voice.slow` (1.15: every sound and every gap is stretched). Style 6 (`filtered+`) adds intonation and jitter on top.

What to turn, and what you will hear:

| Knob | Where | What it does |
|---|---|---|
| `SOURCE_F0` | `config.ts` | the one pitch of the voice: lower is a deeper voice, higher a thinner one |
| `FORMANTS` | `config.ts` | where each vowel's two resonances are; moving one changes the colour of that vowel |
| `SOURCE_FORMANT.q` | `config.ts` | how narrow the resonances are: low is a breathy blur, high is a ringing, whistly tone |
| `SOURCE_FORMANT.level` | `config.ts` | how loud each resonance is (the narrow filters are quiet, so these are turned up) |
| source `wave` | `filteredEffect` in `config.ts` | sawtooth is bright and buzzy (rich in harmonics for the filters to pick from); square is hollower |
| `FLASHCARDS.voice.slow` | `config.ts` | the speed of styles 5 and 6 |
| `intonation`, `jitter` | `config.ts` | the pitch drift, stress bump, final fall and wobble, as before (style 6 only) |
| consonants | `FLASHCARDS.voice.symbols` and the `voice*` effects | unchanged: clicks, hisses, hums and slides |

Both approaches have the same consonants and timing; only the vowels and the speed differ, so styles 2 and 5 are the fair pair to compare.

### Glides and murmurs (styles 7 and 8)

Listening to the filtered voice showed three things still made the old way, as separate tones, so they stood out from the vowels: the glides, the nasals and the voiced stop `b` (and `d`, `g`). Each is now made from the same source as the vowels, in two steps so each can be heard on its own (V steps `filtered+`, `glides`, `murmurs`):

- **Style 7, glides.** /j/ and /w/ were a 50 ms triangle tone sliding between two pitches, which is a high blip. A glide is really the mouth moving, so now it is the vowel resonances moving: a /j/ is a very short /i/ and a /w/ a very short /u/, and the filters slide between that and the next vowel's (`voiceGlideJToE` for the /j/ of `bien`) or, at the end of a diphthong, between the previous vowel's and that (`voiceGlideJFromA` for the /j/ of `aire`). The source never changes pitch, so a diphthong keeps one pitch from the glide into the vowel (the glide and the vowel are still two separate sounds, so how smooth the join is, is for the ear to judge). Two vowels in a row (`día`, `río`) are not glides and are unchanged, and a glide with no vowel next to it keeps its old sound. Timing: `FLASHCARDS.voice.glideLength`.
- **Style 8, murmurs.** The nasals were a 160 Hz sine and the voiced stops a 170 Hz triangle thump, close to the source's 125 Hz and far below every vowel resonance, which is the purr. Now the nasals are the vowel source through a low resonance (250 Hz, what a closed mouth lets out) with a faint higher resonance that says which nasal it is (`m` 1100, `n` 1600, `ñ` 2200 Hz), and the voiced stops are the same murmur, shorter, followed by a short burst of noise as the mouth opens (`b` 800, `d` 3200, `g` 1800 Hz). `FLASHCARDS.voice.murmurs` says which symbol uses which; the effects are `voiceFiltM`, `N`, `NY`, `B`, `D`, `G` in `config.ts`. Nothing else changes: the unvoiced stops, the hisses, the liquids and the tap and trill are as before.

- **The /l/ (style 8).** The /l/ was a 50 ms triangle tone sliding between two pitches, the worst consonant once the others were fixed. It is now the vowel source through a low resonance (360 Hz) and one around 1300 Hz (`voiceFiltL`).
- **Style 9, diphthongs.** In style 7 a glide and its vowel were two separate sounds back to back, so the join was discontinuous. Now a vowel with a glide before it (`bien`, `agua`), after it (`aire`, `hoy`) or both (the triphthong of `estudiáis`) is one sound whose resonances move from the first to the second, with one loudness for the whole thing. The movement is most of the sound: they reach the vowel 60 percent of the way into a glide-vowel, leave it 30 percent of the way into a vowel-glide, and the sound stays at full level until 85 percent of the way so the end of the movement is heard (`DIPHTHONG_SHAPE` in `config.ts`; an offline model of the first version showed a vowel-glide (`hoy`) as 150 ms of steady vowel with the glide only during the fade, 20 dB down, and a glide-vowel (`bien`) as a 50 ms sweep followed by 100 ms of steady vowel, which is why it sounded like one held vowel) (`voiceDiphJE`, `voiceDiphAJ`, `voiceDiphJAJ` and their `Stress` twins; 80 are generated from `FORMANTS`). Two vowels in a row (`día`, `río`) are a hiatus, two syllables, and stay two separate sounds, so they keep the break. A glide between two vowels (`aya`) goes with the vowel after it. A glide next to no vowel keeps its old sound.

### Timing variants (styles 10 to 12)

With the diphthongs fixed they sound longer and fuller than the single vowels around them. A diphthong is held at full level and is 0.16 to 0.28 s before the slowdown (0.18 to 0.32 s after it); a single vowel dies away at once, so it is audible for only about 50 to 100 ms whatever its length: stretching a vowel only lengthens the tail. Three variants to hear against style 9, each in `FLASHCARDS.voice.variants` and stepped to by V (tags `longer`, `faster`, `consfast`):

- **Style 10, `longer`:** single vowels last `longerVowels` times as long (1.4), both the sound and the time it takes, and are held at full level at the diphthongs' level and hold (`voiceHeldA` and its `Stress` twin, with the plain vowel's resonances) so they sound as long as they are and sit with the diphthongs. Diphthongs and everything else keep their time. Words come out about 20 percent longer than style 9.
- **Style 11, `faster`:** style 10 with every time (sounds, gaps, the pauses between words) scaled by `faster` (0.82), which brings the words back to about as long as style 9's.
- **Style 12, `consfast`:** style 10 instead with only the consonants quicker, by `quickConsonants` (0.75): the sound and the time it takes. The vowels, diphthongs and the pauses between words keep their time. Keep this at 0.7 or above: the shortest sound, the burst of `b d g`, reaches the engine's attack time at about 0.7 and would stop being a sound of its own.

- **Style 13, `fastest`:** style 11 a little faster again, by `fastest` (0.74, about 10 percent quicker than `faster`), so words are about 74 percent of style 10's length and roughly 10 percent shorter than style 9's. Added when `faster` was liked and a slightly faster version was asked for. Everything is scaled alike, as in style 11, so the shortest sound (the burst of `b d g`) is 17 ms, still over the engine's attack time.

None of the three changes which sounds are made or at what pitch, only their shape and the time they take. `FLASHCARDS.voice.style` is 13 (fastest); 11 (faster) is the alternative.

### Turning the levels

- **Diphthongs:** `DIPHTHONG_SHAPE.level` in `config.ts` (0.11; 1.4 times that when stressed). It was 0.22, which with the held loudness made a diphthong about 9 dB louder than a vowel.
- **Nasals:** `gain` on `m`, `n` and `ɲ` in `FLASHCARDS.voice.murmurs` (0.8; 1 is as the effect is written).
- **The burst of `b d g`:** a voiced stop is a murmur (the voicing while the mouth is closed) followed by a short pop of noise as the lips or tongue let go. `BURST_GAIN` in `config.ts` (0.1) is how loud that pop is. A numeric model put it 16 to 20 dB under the vowels, so if the stops sound like a soft hum with no consonant in it, raise it (0.2 to 0.3); if they click too much, lower it.

Styles 0 to 8 are unchanged except for the /l/ and the nasal level in style 8, so each part can still be heard against the one before.

## Trying the screens and the voice without the app

In a dev build, open the game with `?flashcards=demo` (for example `http://localhost:5173/?flashcards=demo`). "Study Spanish" then uses the practice deck in `flashcards/demo.ts`: no server and no key screen, no key remembered and nothing paid. It is ignored in a production build. `FLASHCARDS.backend = "demo"` in `config.ts` does the same for every page load. The card screen is taller in the practice deck and shows each card's IPA under its Spanish side, in its own small lowercase pixel font (`render/ipa-font.ts`, since the main font is capitals only and IPA is case-sensitive). Tune the voice in `FLASHCARDS.voice`, `FORMANTS`, `SOURCE_F0` and the `voice*` effects (all in `config.ts`) and the page reloads.

The deck has four sets, in this order when you ask for all of them, or one with `&set=` (`?flashcards=demo&set=consonants`):

- **sentences:** phonetically rich sentences that between them use every sound the voice has, the audio equivalent of "the quick brown fox" (`El veloz murciélago hindú comía feliz cardillo y kiwi.` and `El chico pequeño juega con un perro rojo en la montaña.`). A test checks that every sound in the voice's table is in them.
- **diphthongs:** each glide pair (ai, ei, oi, au, eu, and ia, ie, io, iu, ua, ue, uo, ui), the triphthongs `estudiáis` and `Uruguay`, and two hiatus words, `día` and `río`, to hear against `Dios`: two vowels in a row sound different from a vowel and a glide.
- **consonants:** each consonant between two a's (`aba`, `ada`, `aga`, ...), the usual way to compare consonants. Both the tap (`ara`) and the trill (`arra`) are there.
- **words:** the first practice deck, single words, both card directions.

V steps between `faster` and `fastest` (the tag shows which; `&voices=all` for every voice, see above) and R says the card again, to hear them against each other on the same card.

## The interface

`flashcards/study.ts` is all the activity knows: `StudyBackend.open(key)` gives a `StudySession` with `queue()`, `card(slug)`, `requeue(queue, position, slug)` and `grade(slug, grade)` (resolves false when it could not be delivered). `flashcards/demo.ts` is the stand-in used by stage 1 and the tests.

## Text

The pixel font is capitals only. It now draws `Á É Í Ó Ú Ñ` (two rows of accent above the cap line); lowercase Spanish is drawn as capitals. `¿ ¡ Ü` are not drawn; the vocabulary deck does not need them.
