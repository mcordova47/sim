# The track editor on phones (design note, issue 106)

Status: design only, nothing built. Builds on `docs/make-tracks.md` (the editor), `docs/mobile.md` (sections 3, 4 and 13: the touch layer, the hidden-input keyboard, the 224 x 208 narrow view) and issue 093 (tap targets, `hintLine`, `wantsText`).

## 1. Summary
- **Recommendation:** keep the editor's model and the keyboard path exactly as they are, and add a second, touch-only *look* of the same activity: a bigger grid (8 steps and 6 pitches at a time, cells of 25 x 20 game pixels), tabs, and a bar of four buttons plus a **More** menu, all as `tapTargets()` like the 093 screens. A tap on a cell moves the cursor there and places or clears (the same `placeOrClear` the E key runs).
- **Size:** medium. About 5 small issues (section 7), roughly 400 lines of new code (a layout function, drawing, the activity's touch methods, a `.track` paste path) and about 25 new tests. No change to the `.track` format, the storage, the parser or the desktop drawing, so the goldens do not move.
- **What stays desktop-only:** nothing needed to make, play, save, rename and delete. Only fine-tuning stays as it is (the tempo in steps of 1 is not offered; 4 bpm steps only, as today).

## 2. What is wrong today (from the code)
- `render/track-editor.ts` draws a 320 x 192 piano roll: **16 px wide cells, 8 px tall rows.** On a phone that is 19 x 10 CSS px (portrait, scaled 1.2) or 27 x 13 (landscape). A fingertip covers three rows.
- `activities/make-track.ts` reads only keys. It has no `tapTargets`, no `wantsText`.
- The help lines (`EDITOR_TEXT.help`) name E, T, P, N, S, D, C, V, `, .` and `- =`. Most of those keys do not exist on the touch layer (093 only maps E, Escape, Tab, L, M and the arrows). The footer line says "Escape leaves".
- The naming box takes typed key codes (`typeKey`), so the phone's keyboard would not feed it.
- `copy()` and `paste()` already work off a tap, but `paste()` falls back to "Press Ctrl+V", which a phone cannot.
- On the narrow view (224 x 208) a full 320 x 192 screen is only shown through `showsPicture` (blurry fractional scale, 13.3). For an editor that must be tapped, **we do not want that**: the picture would be 1.2x and the cells tiny. So the touch look draws in the live view (224 x 208 portrait, 320 x 192 landscape) with its own layout.

## 3. The recommended design

### 3.1 One layout function, two shapes
`touchEditorLayout(screen)` in a new `render/track-editor-touch.ts` returns rectangles for every part. The drawing and `tapTargets()` both read it, so what is drawn is what is tappable. It is used when `touchHints()` is true (the same switch 093 uses); otherwise the desktop drawing runs untouched.

**Portrait / narrow view, 224 x 208 (1.67x on a 390 phone, so 1 game px = 1.67 CSS px):**
```
y   0 +----------------------------------+ 12   B TO LEAVE hint (touch wording)
   12 | [ RAINY TUESDAY        ][-100 +]  | 30   name button 148 wide | tempo stepper 72
   30 | [1 MELODY][2 BASS ][3 BEAT ]     | 48   tabs, 74 wide each
   50 | C5 |  .  .  .  .  .  .  .  . |    |
      | B4 |  .  ## .  .  .  ## .  . |    |   6 pitch rows x 20 = 120
      | A#4|  ...                         |
      | A4 | ...                          |
      | G#4| ...                          |
  170 | G4 |  .  .  .  .  .  .  .  . |    |
  172 | [1-8][9-16][17-24][25-32]        |  188  page strip (a page is 8 steps)
  190 | [PLAY] [SAVE] [LENGTH 1] [MORE]  |  208  bottom bar, 4 x 56
      +----------------------------------+
```
- Grid: a 24 px pitch gutter, then 8 steps x 25 px = 200. A cell is **25 x 20 game px = about 42 x 33 CSS px** at 1.67x. Width meets the 44 CSS px rule to within a pixel; height is 33, under 44. That is the price of 6 rows in a 208 px view (see risks). Rows are the same chromatic pitches as the desktop (no scale filter in v1).
- Bar buttons are 56 x 18 game px (about 93 x 30 CSS px). Wide, a bit short.
- If 6 rows plus the bar do not fit in the final tuning, drop the page strip row first (pages by the pad's left and right and by the grid's edge arrows) before dropping a pitch row.

**Landscape / desktop view, 320 x 192 (on an 844 x 340 phone this is 1.67x, with the A/B and pad columns at the sides):**
```
  0 | [ RAINY TUESDAY     ][-100 +]   | 12..30   | panel x 220..316, 2 columns x 3 rows
 30 | [1 MELODY][2 BASS][3 BEAT]      | 30..48   |  [PLAY] [SAVE]
 50 | grid: gutter 24 + 8 x 24 = 216  | 50..170  |  [LENGTH 1] [MORE]
170 | [1-8][9-16][17-24][25-32]       |          |  [UNDO] [NEXT PAGE]
```
Same code, a different rectangle set (the panel is on the right instead of a bar at the bottom). The cell is 24 x 20 game px (40 x 33 CSS px).

### 3.2 Gestures
| Gesture | Does | Notes |
|---|---|---|
| Tap a cell | moves the cursor there, then place or clear (as E: the same row clears the note, another row replaces it) | plays a short blip of that pitch (existing `host.blip`). Runs on pointer-up, so a stray touch that slides off does nothing. |
| Tap a pitch label in the gutter | plays that pitch, places nothing | lets you find a note by ear |
| Tap a tab | switches channel (cursor row is kept per channel, as now) | |
| Tap a page button | shows that page of 8 steps | while playing, the page follows the play position unless you touched a page in the last 3 s |
| Tap `LENGTH` | cycles the note length 1, 2, 4. If the cursor sits on a note it changes that note, else the pen (same `changeLength` as T) | label shows the pen: `LENGTH 2` |
| Tap `PLAY` | play or stop (button reads `STOP` while playing) | a real pointer-up, so the audio unlock is available |
| Tap name | opens the phone keyboard (3.5) | |
| Tap the tempo stepper | left half minus 4 bpm, right half plus 4 bpm | two targets, each 36 x 18 |
| Pad and A (kept) | the pad moves the cursor and the window follows; A places or clears at the cursor | the existing key path, for people who like it; it costs nothing to keep |
| B | Escape: leaves at once, draft kept | unchanged |
| **Long press** on a cell (later, stage 5) | on a note: cycles that note's length; on empty: sets the pen from that gesture | needs a hold timer on the canvas (3.6). Not needed for the first version, because `LENGTH` already does it. |
| **Drag** across the beat channel (later, stage 5) | paints hits along the row | one-finger paint is the natural phone gesture for drum rows. |

### 3.3 The More menu
`MORE` opens the existing menu dialog (`openDialog`, already tappable and pad-driven since 093), so no new menu code and the targets are full rows:
`Track length (16 or 32)` / `Rename` / `Share` / `Copy` / `Paste` / `Delete` / `Undo` / `Back`.
Each entry calls the same method as its key (`changeSteps`, rename, `copy`, `paste`, `askDelete`). `Back` closes the menu. Because a menu is a dialog, the existing rule holds: Escape (B) closes the dialog first, and a second B leaves the editor.

Why four bar buttons and a menu, not ten buttons: the screen is 224 px wide. Play, Save, Length and More are used all the time; the other commands are used once per track.

### 3.4 Hints (093 rule: no hint names a key the player cannot press)
- Every editor text line that names a key goes through `hintLine`/`keyLabel`. On touch the key help lines are not drawn at all; the buttons are their own labels.
- The footer reminder becomes `B leaves at any time. Your draft is kept.` on touch (`B` from `keyLabel("ESC")`).
- The first time the editor opens on touch, the footer shows `Tap a square to add or remove a note` (once per session, then the usual reminder). Naming help: `Type a name. GO keeps it.` (the phone keyboard's Go sends Enter, as in 093).
- Messages in the code that name keys change too: `Press Ctrl+V to paste.` becomes `Tap Paste, then press and hold the box and choose Paste.` on touch. A test walks every message string and fails if a touch run shows `Ctrl`, `Press E` and the like.

### 3.5 Naming
Same as the sync key screen (docs/mobile.md section 4, `wantsText` in 093): the activity gets `get wantsText()` (true while `naming !== null`), `textValue()` and `setText(text)`. `setText` filters through `M.nameChars` and `M.nameMax` (drops bad characters, keeps the rest, so a keyboard that types a curly apostrophe still works through `normalizeText`). Tapping the name button sets `naming = title`; the tap runs in a real pointer-up, which iOS needs to open the keyboard. Enter (the keyboard's Go, or A) keeps it, the existing `typeKey` Enter branch; a name problem shows in the footer. The name stays on screen above the keyboard because the header is at the top (the keyboard covers the bottom of the page on iOS; the canvas must stay in the visible area: the page already scrolls the canvas into view for the key screen, so reuse that).

### 3.6 Playing
- PLAY calls `togglePlay` (the preview through `MusicPlayer`, as today). Editing while playing takes effect on the next loop, as today.
- The playhead column is drawn as now and the page follows it.
- A moving highlight needs no extra code; the touch look just draws it at the larger cell size.
- **Audio on iOS** needs a real tap (given) and may be silent when the ringer switch is off (not verified, see risks).

### 3.7 Saving, sharing and the `.track` text
- `SAVE` is the existing `save()`: reward, name checks, 12-track limit, footer messages (hint-free wording). On phones the edit draft is written after every edit as now, so closing the tab loses nothing.
- **Share** (new, touch only) calls `navigator.share({ title, text })` with the `.track` text from the click handler itself. That opens the phone's share sheet (Messages, Notes, AirDrop, Mail). If `navigator.share` is missing, it does `Copy`. **Copy** stays (a real tap on a canvas target runs `clipboard.copy` synchronously, which is allowed).
- **Paste** (`MORE`, then Paste): `clipboard.read()` first (Chrome allows it after a tap; Safari shows a small "Paste" bubble; both are allowed from a tap). If it returns null, the activity asks for text through the hidden field: `wantsText` is true in a `pasting` mode, the footer says `Press and hold the box, choose Paste`, and `setText(text)` hands the whole text to `importText` (once the text parses or looks like a track). A multi-line paste needs a `<textarea>` rather than an `<input>`: `touch-ui` gets a second hidden element for this mode, or the one field becomes a textarea (see open question 5, and the risk list).
- **`.track` text over a phone:** the format is plain ASCII text, so it survives Notes and Messages. Three real-world mangles to handle in `importText` before `parseTrack`: smart punctuation (curly quotes and dashes in `title:`, handled by `normalizeText`), non-breaking spaces and `\r\n` line endings, and a trailing signature line some apps add. Pasted text with unknown channels or waves is still rejected with the parser's message (as today); a hand-written record with `sawtooth` does not fit the editor and that is correct and says so.
- Sync (issue 095, docs/sync.md) already carries the made-track *list* between devices, so a track made on the phone can reach the laptop without any new code. Share is the one-off path for sending a single track to someone else.

### 3.8 Undo
One-level undo is worth adding on a phone: fat-fingered taps cost more than a keypress. The grid is small (`cloneGrid` exists), so `changed()` keeps the grid before the edit; `UNDO` restores it. Not in the key map on desktop (no change there) unless Marc wants it (it would be `Z`).

## 4. Tests
Same style as `flashcards-touch.test.ts`: build the activity with a fake host and store, set `touchHints(true)`, call `tapTargets(screen)` and run the target at a point.
- Layout: every rectangle is inside the view at 224 x 208 and at 320 x 192; none overlap; the grid cell rectangle for (step, pitch) maps back to the same (step, pitch); bar buttons are at least 50 x 18.
- Tap a cell places, taps again clears, another row replaces; a note blips; tapped cell on a page other than the first maps to the right step.
- Tabs, pages, tempo halves (clamped to 60 to 180), `LENGTH` (note under the cursor versus the pen), `PLAY` toggles, `SAVE` saves and pays once.
- More menu: each entry runs the same method as its key (compare the resulting grid to the key's).
- Naming: `wantsText` only while naming; `setText` filters, caps at 24; Enter keeps it. Paste mode parses a CRLF, NBSP, smart-punctuation track.
- **Touch-only run:** a test that makes a track, plays, saves, renames and deletes using only tap targets, the pad keys and A/B, with no other key code sent.
- **Hints:** a test collects every string the editor draws and every flash message with `touchHints(true)` and rejects the desktop key names (`E`, `T`, `N`, `S`, `D`, `C`, `V`, `P`, `Ctrl`, `Escape`, `Enter`) used as keys.
- Desktop: the existing editor tests and the `escape.test.ts` row run unchanged; a test that `touchHints(false)` draws the same pixels as now (the render is called with a stub context and compared by call list).
- Escape at every stage on touch: B in the grid, in the More menu, in the name field, in the delete confirm leaves the editor (a new row in `escape.test.ts` with touch on).

## 5. Risks
- **Grid height.** 33 CSS px rows are under the 44 px advice. If Marc's thumb misses on a real phone, the fall back is 5 rows (a 120 px grid becomes 110 px of 22 px rows, 37 CSS px) or the d-pad + A path. Only a real phone settles it.
- **Two views to draw and test.** Portrait and landscape share one layout function, so the cost is one more rectangle set, but every drawn thing must come from it or taps and pictures drift apart.
- **iOS keyboard.** The name box and the paste text field depend on the hidden input. 093 proved the single-line case. A textarea for multi-line paste is new and not verified on iOS.
- **Clipboard.** Reading the clipboard shows a "Paste" bubble on Safari and may be blocked; Android Chrome may ask. The fallback is the hidden field.
- **iOS silent switch / background tabs** may mute Web Audio, so PLAY might look silent. Not verified.
- **iOS clears site storage** for sites unused for about 7 days in a browser tab (not if added to the home screen). Made tracks and the draft are in `localStorage`. The sync (095) and Share are the way out; the design should say so in a one-line hint (`Share keeps a copy outside the game`).
- **Long press and drag** need pointer-down and move handling on the canvas, which `touch-ui.ts` only does as a tap today. Kept for stage 5 so that stages 1 to 4 do not depend on it.
- **Tablet and iPad with a keyboard:** the touch layer hides when a real key is pressed, and the desktop editor shows. Both paths stay valid; a test switches `touchHints` mid-edit and checks the grid is kept.

## 6. What I decided myself, and why
1. **Do not use the 320 x 192 full-picture trick for the editor.** It would put the editor at 1.2x on a phone. A dedicated layout in the live view is crisper and gives bigger cells.
2. **Keep the cursor model and the key path.** The tap just moves the cursor and runs the same function. That keeps desktop behaviour, the goldens and the existing tests as they are, and the pad and A still work.
3. **Chromatic rows, no scale lock, in v1.** Scale-locked rows would be easier on a phone but change what a track can be; it can come later as a toggle with no format change.
4. **Four buttons and a More menu**, because the dialog menu is already touch-ready and the screen is narrow.
5. **Share with the system share sheet** (text) instead of a file download. It is one call, fits "send a track to someone", and the `.track` format is plain text.
6. **Pages of 8 steps, not a free scroll.** Pages are simple to tap and to test. A 16-step track is two pages, 32 is four.
7. **Undo is in.** It is cheap here and the touch screen needs it more than a keyboard does.
8. **Long press and drag are a later stage**, not part of the first usable version.
9. **No change to the `.track` format or storage.** Everything on the phone saves to `life.tracks.v1` as before.

## 7. Staged build plan (small issues, each shippable)
1. **106a: touch layout and drawing.** `touchEditorLayout`, `drawTrackEditorTouch`, the live-view drawing in both shapes, hint wording through `hintLine`. Tests: layout and hint tests. About 150 lines. Desktop unchanged.
2. **106b: taps that edit.** `tapTargets` on the activity: cells, gutter pitch, tabs, pages, tempo, `LENGTH`, `PLAY`, `SAVE`. The playhead follows the page. Tests: the tap tests above.
3. **106c: name, More menu, delete.** `wantsText`, `textValue`, `setText`; the More menu; `Undo`. Tests: naming, menu equals keys, touch-only run through make, save, rename, delete.
4. **106d: sharing and paste.** `Share`, `Copy`, `Paste` with the hidden-field fallback, `importText` cleanup (CRLF, NBSP, signature). Tests: the mangled-text cases. Marc tries it on his phone here (first real check).
5. **106e: long press, drag paint, polish.** Hold timer and drag on the canvas, then tuning after Marc's phone test. Optional; skip if 1 to 4 feel fine.
Docs: update `docs/make-tracks.md` (a "On phones" section) and `docs/mobile.md` section 4 (the editor row, "Skipped on phones" line) when 106a lands. Close with the unverified list from section 5.

## 8. Open questions for Marc (one at a time, most important first)
1. **How tall should the grid cells be? ANSWERED by Marc 2026-10-28: (a) 6 rows of 20 game px.** 6 pitch rows of 20 game px (33 CSS px tall) shows more melody; 5 rows of 22 (37 CSS px) is easier to hit.
   - A (recommended): 6 rows, try it on the phone, drop to 5 only if you miss.
   - B: 5 rows from the start.
   - C: 4 rows of 26 (43 CSS px), the full tap-size rule, but a lot of scrolling.
2. **Which commands deserve a top-level button? ANSWERED by Marc 2026-10-28: (a) Play, Save, Length, More.** I put Play, Save, Length and More; the rest are in the menu.
   - A (recommended): Play, Save, Length, More.
   - B: Play, Save, Undo, More (Length in the menu, used less).
   - C: put tempo and name in the menu too, and give the screen a taller grid.
3. **Should tapping a note clear it, or select it first? ANSWERED by Marc 2026-10-28: (a) tap clears.**
   - A (recommended): tap clears (like E), Undo catches mistakes.
   - B: first tap selects, a second tap clears, and Length acts on the selected note (safer, one more tap).
   - C: tap places only; clearing is the `Erase` mode button.
4. **Share how? ANSWERED by Marc 2026-10-28: (a) share sheet, falling back to Copy.**
   - A (recommended): the system share sheet with the text, falling back to Copy.
   - B: Copy only.
   - C: also a `.track` file download (more code, and iOS handles downloads awkwardly).
5. **Paste on a phone: how much effort?**
   - A (recommended): try the clipboard first, then fall back to a hidden text box the player pastes into.
   - B: only the hidden text box (one path, always the same).
   - C: skip paste on phones for now; the laptop imports (sync 095 already moves tracks across).
