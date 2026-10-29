# Photo reel: design (issue 113)

Status: design only, nothing is built. Read first: `docs/real-world.md` section 3, `issues/113-photo-reel-experiment.md`. Code read: `src/game/sync/io.ts` (the file-chooser pattern), `src/input/text-entry.ts`, `src/game/achievements/draw.ts` and `feature.ts` (the pause screen and its pages), `src/game/activities/make-track.ts` (a free-form activity), `src/render/colors.ts`, `art/palette.json`, `scripts/check-dist.mjs`.

## 1. Summary
Pictures from Marc's device are chosen **once**, on a **PHOTOS page of the pause screen**, made tiny and palette-only the moment they are chosen, and kept in IndexedDB. The big originals are never stored, nothing is uploaded, nothing is in the repo, the bundle or the sync blob. In the world, a new sofa task **"Scroll through photos"** (only present once there are pictures) shows them as a slow slideshow on a phone-screen panel, with now and then a deadpan line. No photos means no change to the game at all.

**Recommendation in two lines:** pixelate to at most 64 x 48 (or 48 x 64) with the game's own 22 colours and a light ordered dither, add them on a pause-screen page (the picker clunk happens once, in the "device stuff" corner), and show them through a sofa task, not a new object. Build in five small stages, the first two with no UI at all.

## 2. Pixelate: the look at game scale
The view is 320 x 192 (desktop) or 224 x 208 (phone), one tile 16 px. A stored picture of **64 x 48** shown at **2x** is 128 x 96 on screen: four tiles by three, a good "phone screen" size on both views, and every source pixel stays a crisp 2 x 2 block. (Portrait pictures are 48 x 64, shown 96 x 128, which fits the 192 and 208 heights.)

`pixelate(rgba, width, height, opts) -> { w, h, px }` is a **pure function** in `src/game/reel/pixelate.ts` (no canvas, no DOM; it takes `Uint8ClampedArray` pixels, so tests run in plain node). Steps:
1. **Crop** the centre to 4:3 if the source is landscape or square-ish, 3:4 if portrait (decided: a fixed pair of shapes keeps the slideshow layout simple; no letterbox bars). Crop is centred, and faces are not detected (no ML, no library).
2. **Shrink by box average** to 64 x 48 (the mean of every source pixel that lands in a cell). Box averaging, not the canvas's smoothing, so the result is the same in every browser and testable.
3. **Auto-levels**: stretch the 2nd to 98th percentile of brightness to the full range (a phone photo is rarely contrasty enough for 22 colours; this is what makes it read as a picture rather than mud).
4. **Map to the palette** with a 4 x 4 **Bayer ordered dither** at low strength, nearest colour by a weighted RGB distance ("redmean", cheap and close enough to look right). Output is **one palette index per pixel** (`Uint8Array`, 0 to 21), not colours.
5. Colours come from `art/palette.json` through a tiny accessor next to `colors.ts`, so a palette change changes the look and the stored indices stay valid as long as the order of the file is kept (a reorder or a removed colour is a stored-data break: `px` is stored with a `palette` version number, and a mismatch just re-renders as best it can, or the page offers REMOVE ALL; it is a stated limit).

**Why the full 22 colours, not a 4-tone ramp:** it is the game's own look and costs nothing. **Known weakness:** the palette is warm-brown heavy with few skin tones (`tan`, `cream`, `blush`), so skin may go orange-grey; Stage 5 is a tuning pass on a real device (dither strength, a possible `contrast` step) before anything is called done. Flat (no dither) is the fallback look if the dither is noisy; see question 2.

**Size on disk:** 64 x 48 = 3,072 bytes per picture as one byte per pixel (a 5-bit pack would be 1.9 KB; not worth the code). A hundred pictures is about 300 KB.

## 3. Storage and limits
- **IndexedDB** database `life.reel.v1`, one store `pics` (key: auto id), record `{ id, w, h, px, palette: 1 }`. No timestamp, no file name, no EXIF (all dropped at decode, so no date, place or camera ever exists in the record).
- `ReelStore` is a small **interface** (`list`, `add`, `remove`, `clear`) with two implementations: IndexedDB (browser) and in-memory (tests and when IndexedDB is missing). Tests never need a fake-IndexedDB package (no new dependency).
- **Cap: 60 pictures** (decided: enough for a quiet slideshow, under 200 KB, and a number a person can curate). Choosing more than room allows adds the first that fit, and the page says so in one line.
- **Duplicates:** a picture whose `px` equals one already stored is skipped (cheap hash), so choosing the same batch twice does nothing.
- **Not synced, by design:** the sync document (`docs/sync.md` section 2) is built from `life.progress.v1` and `life.tracks.v1` only; `life.reel.v1` is never read by it. A test asserts the sync document has no reel field. Safari clearing site data (about seven days away, `docs/mobile.md` section 5) removes the pictures; the world then simply has none, and the PHOTOS page is where they are added again. `navigator.storage.persist()` is requested best effort after the first add (whether Safari grants it is **unverified**).
- **No IndexedDB** (private window, blocked data): the page says "This browser will not keep pictures." and the task never appears.
- **RESET PROGRESS** does not touch photos (decided: a different thing; REMOVE ALL is its own control).

## 4. The iPhone flow
- The **tap on ADD PHOTOS** creates the hidden `<input type="file" accept="image/*" multiple>` and clicks it in the same call stack (iOS refuses a file chooser opened later; this is exactly the existing `pickFile` rule in `sync/io.ts`, and the new `PhotoIO.pickImages()` sits beside it).
- On iPhone Safari that opens the system sheet (Photo Library, Take Photo, Choose Files); the player ticks many pictures and taps Add. **Multi-select with `multiple` is expected to work (unverified here, no device).** With `accept="image/*"` iOS normally hands over HEIC photos as JPEG (**unverified**); if a HEIC ever arrives and cannot be decoded, that one is skipped and counted.
- **Decode** one file at a time, never all at once (12 MP photos are about 48 MB of pixels each): `createImageBitmap(file, { resizeWidth, resizeQuality: "low" })` with `imageOrientation: "from-image"` so a rotated phone photo comes out upright; fallback is an `<img>` from an object URL (modern iOS applies the EXIF rotation to images by default, **unverified**). Draw to a canvas no larger than about 256 px on the long side, read `getImageData`, then `pixelate`. The decoded bitmap and the object URL are released after each file.
- The page shows progress in place ("Making picture 3 of 12") and stays responsive between files; the originals are never held after their turn.
- **Cancel:** the chooser may never answer on a cancel (as with the sync file chooser); the page simply stays as it was. Nothing is lost.
- The **install-to-home-screen** iPhone app has its own storage: pictures added in Safari are not there (same limit as saves, `docs/mobile.md`). The page text does not explain this; the doc does.

## 5. The pause-screen page
The pause screen (key L, or the touch menu button) already has SYNC. **PHOTOS** is one more button there, and the page is one more screen of the same layer and the same rule (the drawn list is the tap list; `pauseButtons`-style `photoButtons(view)` shared by draw and tap, so a tap and the picture cannot disagree). Contents:
- A short deadpan line and a line of fact (section 8).
- **ADD PHOTOS** (opens the chooser), **REMOVE ALL** (two taps: the first turns the button into "SURE? REMOVE ALL", a second tap within the page does it; Escape or any other button cancels), **BACK**.
- A **small row of the stored pictures as thumbnails** at 1x (each is already tiny), and a count ("12 pictures on this device"). The count lives on this page only, never in the world (the issue's quiet-extra rule is about the world). Tapping a thumbnail is not needed in v1.
- Keyboard: A add, R remove all (then confirm key), Escape back, as the sync page does it. The page is reachable only from the pause screen, so it never interrupts a task.

## 6. In the room: where, and what triggers it
**Decided: no new object.** A new sofa task, **"Scroll through photos"**, next to Doomscroll (`tasks.ts` line 77; Doomscroll already sits on the sofa and uses the phone). It is **present only while the store has at least one picture** (with none, the task list is exactly today's, so the game is unchanged; the room golden test must still pass).
- It is a free-form activity, `ReelActivity` in `src/game/activities/reel.ts`, modelled on `make-track.ts`: `cancellable`, `readsKeys`, no time pressure. It shows a phone-screen panel (a `paper` bezel, the picture at 2x, one caption row) over the room, advances itself every **4 seconds**, and **Right / tap** goes to the next one early. Escape (or tap outside) leaves. It finishes by itself after the pictures run out of one pass of up to 6 (decided: a session is short and ends).
- **Order:** shuffled, no repeats within a pass, using the game's existing random source so tests can fix it.
- **Pays:** a small fixed number of points (5), no mood change, no cooldown beyond the usual (decided: it is a quiet extra; nothing to collect, no streak, no count). It is not an achievement source.
- **Open item for Stage 4 to confirm in code:** how a task is made conditional on state. I did not read that mechanism closely (`tasks.ts` has conditions such as the sofa-only rule at line 302 and state-variable availability); if there is no clean hook, the one-line fallback is a derived state variable `hasPhotos` set at load from the store, which is how `guitarOut` already works.
- The phone sprite is not new: the panel is code-drawn from palette colours with `drawButton`/rect helpers, so **no art issue is needed.**

## 7. The deadpan text
Rules: short, no pressure, no mention of Marc's actual pictures (the game never knows what is in them). Texts go through the usual text review. Proposed:
- **On the sofa task prompt:** "Scroll through photos".
- **Caption pool** (one shown now and then, never on every picture; the pool is generic and fixed):
  - "You look at the pictures. They are low resolution, which seems fair."
  - "The photo looks the way you remember it, but squarer."
  - "You were there. Now it is a small grid."
  - "You zoom in. There is nothing more in there."
  - "You almost recognize the room."
  - "A person is in this one. About eleven pixels."
  - "Nice light, as far as you can tell."
- **PHOTOS page:** "Pick some pictures. They will be made small and kept on this device. The big ones are not kept." / "Nothing leaves this device." / progress "Making picture 3 of 12" / done "12 pictures added. They look about right." / skipped "2 could not be read." / over the cap "Room for 60. The rest stayed where they were." / none stored "No pictures yet. The sofa has nothing to scroll."
- **Remove all:** button "REMOVE ALL", confirm "SURE? REMOVE ALL", result "The pictures are gone. The big ones were never here."

## 8. Remove all
`ReelStore.clear()` deletes every record (and the database is dropped if possible). It runs only from the confirmed second tap, shows the result line, and the sofa task disappears at once (the task list re-reads the store). A test checks the store is empty afterwards and the task is gone. There is no undo (decided: it is the point; the originals are on the phone anyway).

## 9. Tests
- `pixelate.test.ts` (pure, node): output size is 64 x 48 landscape and 48 x 64 portrait; square input is landscape; a flat colour gives one index everywhere; every index is in 0..21 and maps to a palette colour; same input gives the same output (deterministic); a black-and-white gradient is monotonic left to right; the dither does not turn a flat mid-grey into noise worse than two adjacent colours; auto-levels leaves a full-range image alone; a source smaller than the target is handled (no crash, no divide by zero); crop is centred (a marker in the centre survives, one at the edge is cut).
- `reel-store.test.ts`: add, list order, remove, clear, cap of 60 with the "first that fit" rule, duplicate skipped; the IndexedDB implementation is tested against the same cases through a thin adapter fake (no dependency).
- `photo-add.test.ts`: the add flow with a fake `PhotoIO` and a fake decoder: many files, one undecodable (skipped and counted), over the cap, cancel (null), and **nothing but pixelated indices ever reaches the store** (the fake decoder's raw bytes are not found in any stored record).
- `photos-page.test.ts` / `photos-draw.test.ts`: the buttons drawn are the buttons tapped; the two-tap REMOVE ALL (first tap arms, Escape disarms, second tap clears); the page is unreachable during a task.
- `reel-activity.test.ts`: advance every 4 s, early advance, ends after a pass, Escape leaves paying nothing, order never repeats inside a pass, finishing pays 5 and changes no mood.
- Game tests: with an empty store the task list and the room golden frames are unchanged; with one picture the task is present; the sync document has no reel data; `check:dist` unchanged and passing (no image files are added to `art/` or `public/`).
- **By hand (Stage 5, on an iPhone):** multi-select, a HEIC photo, a portrait photo comes out upright, a large batch, cancel, and the look.

## 10. Staged build plan (small issues)
| Stage | Issue | What | Done when |
|---|---|---|---|
| A | 113a | `pixelate` (pure) + palette accessor + tests | All pixelate tests pass; a dev script is not needed (tests use synthetic images; no photos in the repo) |
| B | 113b | `ReelStore` interface, in-memory and IndexedDB versions, cap and dedupe + tests | Store tests pass; nothing wired into the game |
| C | 113c | PHOTOS page on the pause screen: `PhotoIO`, decode, add flow, thumbnails, REMOVE ALL, texts + tests | Works on desktop; add and remove all work; game otherwise unchanged |
| D | 113d | `ReelActivity` and the conditional sofa task + tests | With pictures the task plays; with none the game is exactly as before (golden) |
| E | 113e | On-device pass on an iPhone: tune dither, contrast, caption frequency; text review; docs and PLAN.md | Marc tries it and says whether the picker feels clunky |

A and B are independent; C needs both; D needs B (and A through C's content). Each is one agent session.

## 11. Risks
- **The picker still feels clunky on iPhone** (the issue's worry). Mitigation: it happens once, in a pause page; if it still annoys, the fallback is nothing worse than "not worth it", and the code is easy to delete (one feature folder).
- **Faces look bad at 64 x 48 in 22 colours.** Mitigation: Stage 5 tuning and the flat fallback; the stored `px` cannot be re-rendered with a different look (originals are not kept), so a look change means re-adding. Stated limit, and the price of "originals are never stored".
- **Pictures vanish when Safari clears storage.** Accepted; re-adding is one page.
- **Memory and time on big batches** on an old phone. Mitigation: one file at a time, small decode via `resizeWidth`, progress line.
- **HEIC, EXIF rotation and multi-select behaviour on iOS are unverified** from here. Mitigation: skipped-and-counted, and the Stage 5 hand check.
- **Privacy slip:** a photo, a file name or EXIF value reaching the repo, a log, a test fixture or the sync blob. Mitigation: no metadata is read; tests use synthetic images only; the sync-doc test; nothing in `art/` or `public/`.
- **Task availability hook** (section 6) may need a derived variable. Small.

## 12. What I decided myself, and why
- 64 x 48 / 48 x 64, shown at 2x, centre-cropped: the phone-screen size that fits both views.
- Box-average shrink, auto-levels, Bayer dither, nearest-palette in redmean: deterministic, pure, no library.
- Stored as palette indices, no metadata: tiny, and nothing personal can be in a record.
- Cap 60; dedupe by pixels; reset does not remove photos; photos never sync.
- A sofa task, not a new object: no art, no map change, and the task simply is not there with no photos.
- One pass of up to 6, 4 seconds each, 5 points, no mood effect: quiet, no pressure, no count in the world.
- Count and thumbnails only on the PHOTOS page.
- No fake-indexeddb dependency: the store is an interface with an in-memory twin.
- No HEIC library: rely on the browser's conversion; skip what cannot be read.

## 13. Open questions for Marc (most important first)
1. **Where does the reel play? ANSWERED by Marc 2026-10-28: (a) the sofa task.** Recommend **the sofa task "Scroll through photos"** (no art, nothing present without photos). Options: (a) sofa task [recommended]; (b) the laptop at the desk (but that is the track editor's place); (c) a framed picture on a wall that cycles (needs a sprite and a slot, and reads as decor you can see without acting).
2. **What look? ANSWERED by Marc 2026-10-28: full 22 colours, light dither (strength 20), stored size 48 x 36 (portrait 36 x 48) instead of 64 x 48, after trying art/tools/pixel-looks.html.** Recommend **the full 22 colours with a light dither**. Options: (a) that [recommended]; (b) 22 colours, flat (no dither), cleaner and more "pixel art"; (c) a 4-tone single-hue ramp (very Game Boy, loses all colour). Stage 5 can still tune either of the first two on his phone.
3. **How many pictures? ANSWERED by Marc 2026-10-28: (a) 60.** Recommend **a cap of 60**. Options: (a) 60 [recommended]; (b) 24, a very curated reel; (c) 150, about 450 KB.
4. **Does a reset take the photos with it?** Recommend **no**, REMOVE ALL is separate. Options: (a) no [recommended]; (b) yes, RESET PROGRESS wipes everything on this device.
5. **Captions?** Recommend **a generic pool shown now and then** (section 7). Options: (a) that [recommended]; (b) none, just the pictures; (c) one fixed line per session.
