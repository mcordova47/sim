# Mobile (design note, issue 049)

Status: a note for Marc to pick from. No game code is written yet. It answers Marc's two questions of 2026-10-27: is mobile a separate game or the same game with added controls, and is it played in portrait or landscape. Marc likes portrait and suggested a Game Boy style: screen on top, controls below like a handheld. **The primary recommendation is therefore portrait with a handheld-style shell (section 2.5); landscape is the secondary option.** Section 12 lists what Marc decides.

Facts this note rests on (checked in the code on 2026-10-27):
- The view is a constant: `VIEW` in `src/game/config.ts`, 20 x 12 tiles of 16 px = **320 x 192 game pixels** (5:3). The camera scrolls inside a room.
- `createScreen` (`src/render/canvas.ts`) sets the CSS size to the largest **whole CSS-pixel** factor, minimum 1, from `window.innerWidth/innerHeight`. It ignores `devicePixelRatio`.
- All input is the keyboard. `Keyboard` (`src/input/keyboard.ts`) records `keydown`/`keyup` on `window` by `KeyboardEvent.code`. `readControls` turns that into `Controls`: `dir` (held), `dirPressed` (one menu step per press), `interactPressed` (E), `cancelPressed` (Escape or X), and the raw `keys`, `keysDown`, `keysReleased` that the typing, notes, track editor and flashcards activities read.
- Other things listen to `window` key events themselves: the cycle (`Tab` or `Q`, `interaction.ts`), the L list screen and its keys (`KeyL`, `KeyD` voice, `KeyB` ad blocker, Shift+`KeyR` then `KeyY` reset), mute (`KeyM`), and the sound unlock.
- The HUD is drawn inside the canvas: `HUD_BOX` is 152 x 38 top left, `STATUS_BOX` is 76 x 50 top right (`src/render/layout.ts`).

## 1. Same game with a touch layer, or a separate mobile game

**Recommendation: the same game, with a touch layer that feeds the same `Controls`.** One codebase, one save, one set of tasks and art. A phone is only another way to press the same eight or so keys.

| | Same game plus a touch layer | Separate mobile game sharing assets and logic |
|---|---|---|
| What it is | A DOM overlay (or a second canvas) that raises the same key events. `Game`, activities, dialogs, rendering are untouched. | A new front end (own view size, own HUD, own menus, own input model) over the shared `game/` logic and sprites. |
| Cost | Small: roughly 200 lines (touch pad, layout switch, viewport meta, tests) for stage 1. | Large: a second renderer and UI to keep in step with every new activity, dialog and HUD change. Every issue after this one pays twice. |
| Risk | The 5:3 picture is small in portrait (section 2). Typing games are awkward (section 4). | Drift: a task added to the game must be re-done in the mobile UI. |
| Gain | Marc plays his own game on a phone this week; fixes land everywhere. | A layout and controls designed for thumbs from the start (tap anything, big text, portrait view). |

What would justify separate: (a) the phone version needs a different **view size or camera** (for example a portrait 12 x 20 tile window, where the rooms would have to be redrawn or the camera would show other things), (b) the **interaction model** changes to tap-to-walk or tap-an-object instead of walk, face, E (this breaks the first design pillar), or (c) the phone version needs to be **much simpler** (no text-entry activities at all) and the shared `Game` keeps pulling it back. None of these is true today. Even then the right split is a second `main.ts` entry with its own shell, still importing `Game`; a fork is never the answer.

The one change that touches shared code in any plan: how the canvas is sized and what is drawn around it (section 2), and, if Marc picks portrait, where the HUD is drawn (section 2.4, issue 048).

## 2. Portrait, landscape, or both

### 2.1 The scaling arithmetic

The rule today: an integer factor so pixel art stays crisp. The question is which unit the integer is in.

Phones have a `devicePixelRatio` (DPR) of 2 to 3 (iPhone 3, most Android 2.6 to 3, SE 2). A game pixel is crisp when it covers a **whole number of device pixels**, not a whole number of CSS pixels. Counting in device pixels gives more factors: at DPR 3, one game pixel can be 3, 4, 5, 6 device pixels (1.0, 1.33, 1.67, 2.0 CSS px). Counting in CSS pixels allows only 1, 2, 3 and wastes up to half the screen.

Computed with `scale_dev = floor(min(W*dpr/320, H*dpr/192))` against the CSS-integer rule `floor(min(W/320, H/192))` (script kept outside the repo; usable size is the viewport after safe areas and browser bars; the CSS sizes are the typical figures named in the issue):

| Phone and mode | usable W x H (CSS px) | DPR | CSS-integer rule | device-integer rule | game size (CSS px) | free W x H (CSS px) | exact fit |
|---|---|---|---|---|---|---|---|
| SE class, portrait, Safari bars | 375 x 553 | 2 | 1x = 320 x 192 | 2 dev = 1.00 css | 320 x 192 | 55 x 361 | 1.17 |
| Android 360 x 800, portrait | 360 x 740 | 3 | 1x | 3 dev = 1.00 | 320 x 192 | 40 x 548 | 1.13 |
| iPhone 14 390 x 844, portrait, standalone (safe top 47, bottom 34) | 390 x 763 | 3 | 1x | 3 dev = 1.00 | 320 x 192 | 70 x 571 | 1.22 |
| same, Safari with bars | 390 x 664 | 3 | 1x | 3 dev = 1.00 | 320 x 192 | 70 x 472 | 1.22 |
| iPhone Pro Max 430 x 932, portrait, standalone | 430 x 839 | 3 | 1x | **4 dev = 1.33** | 427 x 256 | 3 x 583 | 1.34 |
| Pixel 412 x 915, portrait | 412 x 915 | 2.625 | 1x | 3 dev = 1.14 | 366 x 219 | 46 x 696 | 1.29 |
| iPhone 14 landscape 844 x 390, full height | 844 x 390 | 3 | 2x = 640 x 384 | 6 dev = 2.00 | 640 x 384 | 204 x 6 | 2.03 |
| same, standalone (safe left/right 47, bottom 21) | 750 x 369 | 3 | 1x | **5 dev = 1.67** | 533 x 320 | 217 x 49 | 1.92 |
| same, Safari with bars (~340 tall) | 844 x 340 | 3 | 1x | **5 dev = 1.67** | 533 x 320 | 311 x 20 | 1.77 |
| Android landscape 800 x 360 | 800 x 360 | 3 | 1x | **5 dev = 1.67** | 533 x 320 | 267 x 40 | 1.88 |
| iPhone Pro Max landscape 932 x 430 | 932 x 430 | 3 | 2x | 6 dev = 2.00 | 640 x 384 | 292 x 46 | 2.24 |

Reading it:
1. **Device-pixel counting is better, clearly, in five of eleven cases** (the Pixel row and the bold ones): it turns a 1x picture into 1.33x or 1.67x on a big phone or in a landscape with browser bars, a 33% to 67% larger picture, still perfectly crisp. In the others it ties. Nothing is lost, so do it.
2. **The catch:** a CSS size of 533.33 px is not a whole number, and browsers round it, which can make an uneven pixel (one game pixel 4 device pixels wide, the next 5). The robust way: set the canvas **backing store to device pixels** (`width = 320 * scale_dev`, `height = 192 * scale_dev`), keep the game's own 320 x 192 drawing on an offscreen canvas, copy it up with `drawImage` and smoothing off each frame, and size the element with `width: calc(backing / dpr)`. One `drawImage` per frame, trivial cost. Also read `devicePixelRatio` again on `resize` (it changes on zoom and when a window moves screens). A fractional DPR (Pixel 2.625, some Androids 2.75) makes `W*dpr` fractional; floor it.
3. **Portrait gives a small picture** (1.0 to 1.33 CSS px per game pixel; the whole 320 px view is about 50 mm wide on a 163 ppi phone, and the 7 px glyph is about 1.1 mm tall). It is readable (a GBA screen was this size) but small, and it only ever uses 82% to 100% of the phone's width. Landscape gives **1.67 to 2.0**: text is 12 to 14 CSS px, comfortable.
4. **Fractional fills are rejected.** Scaling 320 to exactly 390 (1.22) or 844 x 390 to 1.92 blurs or doubles some pixel columns. The free margin (the "free" column) is the price of crisp pixels and the place the controls go.

Browser chrome: iOS Safari's visible height changes as the toolbar hides, so `window.innerHeight` changes while scrolling. With scrolling disabled (section 5) it is stable. Installed as a home-screen app (section 5) there is no toolbar and the sizes marked standalone apply. Use `100dvh` (dynamic viewport height) in CSS and read `visualViewport` in JS, not `100vh`.

### 2.2 The three options

**A. Landscape only (game fills the screen, controls overlay the corners).** The best picture: 640 x 384 CSS on an iPhone 14 at full height, 533 x 320 with bars. The picture fills nearly all the height, so the free space is at the **sides**, 100 to 150 CSS px each (16 to 23 mm), too narrow for a d-pad beside the picture at a comfortable size, so the controls overlay the game's lower corners, semi-transparent.

```
iPhone 14 landscape, full height with the insets ignored, 844 x 390 CSS, DPR 3 (scale 6 dev = 2.0 css)
+-------------------------------------------------------------+   (notch/safe inset 47 px each side not drawn on)
| [HUD 152x38 game px]                       [status 76x50 gpx]|
|                                                             |
|            GAME 640 x 384 CSS  (320 x 192 game px)          |
|                                                             |
|  ( d-pad  )                                     (B)  (A)    |
|  ( 132 px )  <-- drawn over the bottom-left     (cycle)     |
+-------------------------------------------------------------+
The controls cover about 66 x 66 game px (4 x 4 tiles) in the two lower corners.
```
Costs: the controls hide part of the room (the sofa wall, bottom 2 to 3 tiles at the edges); the player can walk under a button. Mitigation: 35% opacity while idle, and shift the camera deadzone (`CAMERA` in `config.ts`) so the player is not kept behind a control (a small change, stage 3). A thumb resting on the bottom edge of a landscape phone is a common, comfortable grip, so reach is good: both thumbs, both corners.

**B. Portrait, handheld shell (primary, Marc's pick of 2026-10-27; drawn in full in section 2.5).** The 5:3 picture sits at the top, and the rest of the screen (about 470 to 580 CSS px of height) is free for the HUD and large controls.

```
iPhone 14 portrait, standalone: 390 x 763 CSS usable (already after safe top 47 and bottom 34), DPR 3, scale 3 dev = 1.0
(a rough sketch; section 2.5.1 has the exact coordinates)
+------------------------------+  y=0
| GAME 320 x 192 CSS (in a     |  centred, 35 px of margin each side
| 216 px frame)                |
+------------------------------+  y=234
| STATUS PANEL  (issue 048)    |  56 px: clock, energy, mood, score, combo
+------------------------------+  y=298
|                              |
|  [ d-pad ]          (B) (A)  |  about 465 px of controls and decoration,
|  [ 150 px ]         [cycle]  |  buttons 7 to 11 mm
|                              |
+------------------------------+  y=763
```
Costs: the picture is the smallest of all options (1.0x on most phones); nothing is hidden by controls; one-handed play is possible (right thumb on A and B, the left holding, or d-pad on the left). The game draws its HUD inside the canvas top left and top right, so a portrait layout either keeps the in-canvas HUD (then the area below the picture holds only controls) or moves the HUD out (section 2.4).

**C. Both, one responsive layout.** The shell chooses by aspect ratio: `aspect > 1.2` landscape (option A), otherwise portrait (option B). The game logic and the canvas do not care; only the shell (scale, where the touch pad sits, whether the HUD is below) changes. Marc can rotate mid-game and nothing in `Game` reacts (a `resize` event, the same canvas, a new scale). The cost is only the shell code and testing both on a real phone.

| | Landscape (A) | Portrait (B) | Both (C) |
|---|---|---|---|
| Picture size (iPhone 14) | 1.67 to 2.0 CSS px per game px | 1.0 | both |
| Free space | 100 to 150 px each side, or over the picture | 470 to 580 px below | both |
| Controls hide the picture | partly (corners) | never | depends on orientation |
| One-handed play | no (two thumbs) | yes, with effort (reach on a large phone is the top of the d-pad) | yes in portrait |
| Status panel room (048) | none extra (HUD stays in the picture) | a whole strip | both |
| Extra build cost | overlay layout | a second layout and the HUD decision | A plus B plus a switch (the switch is small) |

**Recommendation (revised after Marc's note): C, with portrait and the handheld shell as the primary layout, built first, and landscape as the secondary layout.** Portrait with a shell is what Marc wants, it is the way most people hold a phone, it leaves the picture unobstructed (no controls over the room), and the shell gives the status panel (048) a home. The price is the small picture (1.0x to 1.33x, section 2.1); the shell is designed to make that feel intentional (a small handheld screen, as a real handheld's was) and the screen window is always at the largest crisp scale. Landscape is the secondary layout for players who rotate: the same shell turned, or controls overlaid (section 2.5.6), which has the biggest picture (1.67x to 2.0x). Both share one code path: only the shell changes, `Game` does not. Do not lock the orientation with the Screen Orientation API in a plain browser tab (not supported on iOS Safari); a manifest `orientation` setting only works for an installed app.

### 2.3 Thumb reach and left-right hand

Controls sit where the thumbs rest: d-pad lower left, A and B lower right, about 8 to 12 mm from the bottom edge and from the side edge (more on the notch side, which the safe-area inset takes care of). A "left-handed" switch swaps the two (a settings flag stored with the other settings, section 5; default right-handed d-pad on the left, which is the common gamepad layout, so the switch is for people who want it mirrored). The cycle button and the E/Escape buttons are reachable from the same thumb as A.

### 2.4 Portrait and issue 048 (the status panel): design them together (the shell body is where the panel goes)

Yes. Both issues ask the same question: where do the clock, energy, mood, score, combo and maybe a phone battery live, and how much room do they get. In portrait there is a whole strip under the picture; in landscape there is nothing extra. A layout chosen for 048 for the 320 x 192 view only will not use the portrait strip, and a portrait strip designed without 048 will invent a second HUD that drifts from the desktop one. So:
- **048 should decide the content and the priorities** (what is always shown, what only when low or changed, what lives in the L screen).
- **049 portrait decides only where the panel is drawn on a phone.** The cheap, consistent way: the in-canvas HUD stays exactly as 048 designs it (same code, same pixels) and portrait simply leaves the controls strip below. A second version where the HUD is drawn below the picture (a taller logical canvas, for example 320 x 288 with the world at the top, so the HUD pixel font is drawn once and scales with the picture) is optional, and a mobile-only change in `render/hud.ts` and `layout.ts`. If 048 ends up with a compact HUD (small icons, bars that appear when low), the in-canvas HUD costs the picture very little, and portrait needs nothing more.
- Do not start the portrait stage until Marc has picked in 048, or build the two in the same branch order (048, then 049 stage 3).

### 2.5 The handheld shell (portrait, primary)

The idea: the page is a generic handheld console of our own, seen from the front, filling the phone. The game picture is its screen, a d-pad on the left, two round buttons on the right (A is E, B is Escape), a small row of pill buttons under the screen (the choice cycle, the L list, sound), a status panel in the body, and a speaker grille as decoration. No real console's shape, colours, name, logo, button lettering or artwork is copied: it is a rounded rectangle, a plus-shaped pad, two round buttons on a diagonal, pills and slots, all in the game's own palette, and the "brand" strip says LIFE in the game's pixel font (or nothing).

**2.5.1 Layout at real sizes (CSS px, standalone web app, DPR 3).**

```
iPhone 14, 390 x 844 phone. The shell body is painted behind the notch and the home indicator,
but everything below sits inside the usable area, 390 x 763 (844 - 47 - 34). y starts at the top
of the usable area. Screen scale 3 dev = 1.0 css.
x: 0         35                      355        390
y=0   +-----------------------------------------+
      |  LIFE                       (power LED)  |  label strip, 18 px
y=18  | +-------------------------------------+ |
      | |  bezel 12 px                        | |  window frame 344 x 216 (x 23..367)
y=30  | |  ###############################    | |
      | |  # GAME SCREEN 320 x 192 css   #    | |  the picture, crisp 1.0x
      | |  ###############################    | |  (x 35..355, y 30..222)
y=222 | |  bezel 12 px                        | |
y=234 | +-------------------------------------+ |
y=242 |   +-------------------------------+     |  status panel 320 x 56, a second small
      |   | ENERGY ##### MOOD ##   09:40  |     |  "screen" (issue 048 decides what is here)
y=298 |   +-------------------------------+     |
y=345 |    [  ^  ]                    (A)       |  d-pad 150 x 150, x 30..180, y 345..495
      |  [ < ][ > ]                             |  A: 68 px, x 290..358, y 361..429 = E
y=418 |    [  v  ]           (B)                |  B: 64 px, x 206..270, y 418..482 = ESC
y=495 |                                         |  (A upper right, B lower left of it,
      |                                         |   the diagonal that thumbs find easily)
y=520 |  [CHOICE]    [LIST]    [SOUND]          |  pills 88 x 44 at x 30, 151, 272: Tab, L, M
y=564 |                                         |
y=600 |            \\\\ grille (CSS)          |  decoration, 90 px tall, dropped first
y=690 |                                         |
y=763 +-----------------------------------------+  (the home indicator inset lies below this line)
```
The 390 phone's numbers are the diagram's: the d-pad spans x 30..180 (150 px), B x 206..270 and A x 290..358 (64 and 68 px, a 20 px gap between them, 3 mm); the buttons are staggered (A higher than B) as on a handheld. All tap targets are at least 44 x 44 CSS px (7 mm), the main ones 64 to 72 (10 to 11 mm), section 3.

**Pro Max, 430 x 932 (usable 430 x 839), scale 4 dev = 1.33 css: screen 427 x 256, bezel only 1.5 px at the sides.** The side bezel is whatever the phone gives (full-bleed), the frame is drawn above and below only; the rule is "largest crisp scale, the frame takes what is left" (a fixed minimum bezel of 4 px would force the 430 phone back down to 1.0x, which is worse). Controls start at y about 400 and everything has 40 px more air.

**Small or short viewports** (SE 375 x 553, Safari with bars 390 x 664): the shell drops things in this order until it fits: the speaker grille, the label strip, the status strip (the in-canvas HUD is then the only HUD, as on desktop), then shrinks the controls down to 48 px targets. The screen itself is never shrunk below 1x. Minimum usable height (already inside the safe areas) for the full shell: about 18 + 216 + 8 + 56 + 330 = 628 (the 763 of the iPhone 14 leaves 135 px to spare, so the grille and pills fit with room); the screen frame plus controls alone need about 216 + 330 = 546 (the SE's 553 fits only by dropping the label and status strips).

**2.5.2 Where the status panel goes (issue 048).** Three places, cheapest first:
1. **Nothing extra.** The in-canvas HUD stays exactly as 048 designs it, drawn on the picture; the strip under the screen is then used for a hint line (DOM text, for example "E: USE  ESC: BACK") or left out. Zero coupling; this is stage 1.
2. **A strip below the screen** (the mock above): a second small canvas, 320 x 56 game pixels, drawn by the same HUD code (`render/hud.ts` given a second context and the strip's size), so bars, clock, score and combo get 56 more pixels of height. On the desktop the same bars stay in the picture; on a phone they move down, freeing the corners of the picture. This is where the clutter in 048 can go, and 048's pick should be designed to be drawable into a 320 x 56 strip as well as the in-picture boxes (`HUD_BOX` and `STATUS_BOX`).
3. **Beside the screen** does not exist in portrait (the screen fills the width); in the turned landscape shell (2.5.6) it goes in the side panels.
A phone battery gag (048) fits a body LED or a segmented battery drawn in the shell's label strip, free of cost and not a state variable; that is 048's decision.

**2.5.3 Pixel art in the game's palette.** The shell is built from a handful of small sprites, drawn with the same pipeline as the room art (`scripts/sprites.mjs`, palette from issue 006 and the warm greys of 058, shared by everything so the shell looks like part of the game):
- body: a 9-slice (corner, edge, fill) of about 16 x 16 shell pixels, a rounded top, a one-pixel highlight on the top-left and a shade on the bottom-right edges, in a warm grey or a game colour (Marc picks; a dark colour makes the picture pop, a warm grey matches the walls);
- screen frame: 9-slice, darker, with a thin inner shade;
- d-pad: one sprite of about 48 x 48 shell pixels (a plus with a dimple) and four pressed states (or one pressed overlay per arm); A and B: a round button sprite 22 x 22, up and down states; pills: 29 x 14, up and down;
- label: the pixel font ("LIFE") in a stamped colour; speaker grille: six diagonal slots;
- a power LED, on while the game runs, dimmed while sleeping or hidden (free).
The shell is a different pixel grid from the screen: the controls need to be big enough to press (a 150 px d-pad), so shell pixels are **3 CSS px** (a d-pad of 50 shell pixels) while the screen's pixel is 1.0 to 1.33 CSS px. That is how a sprite drawn bigger looks in any game and it is fine; but both grids are whole device pixels (3 CSS px x DPR 3 = 9 dev px; on a DPR 2 phone 6 dev px; at a fractional DPR floor to whole device pixels). Sprites are sized with `image-rendering: pixelated` and CSS `width: calc(n * var(--u))`, where `--u` is the shell pixel in CSS px, so nothing is blurred. The cost is a small art task (about ten sprites), which could be its own art issue; a flat CSS version (boxes, `box-shadow` stepped edges) comes first so the layout can be tried before any art exists.

**2.5.4 Scaling rules.** Two numbers set the whole layout, both in device pixels (section 2.1):
- `scaleDev` for the screen window: the largest integer so that `320 * scaleDev / dpr` fits the usable width, and the height left after the minimum controls (about 330 CSS px) also fits `192 * scaleDev / dpr` plus the frame. Portrait is almost always width limited, so on a 390 phone the window is 1.0x, on a 430 phone 1.33x, and the leftover height goes to the controls zone (more air, not bigger buttons, beyond a 1.2x cap on button size).
- `--u` for the shell: `floor(3 * dpr) / dpr` CSS px (a whole number of device pixels).
Everything else (positions, spacing) is expressed in `--u` or CSS px, with `env(safe-area-inset-*)` added to the top and bottom. The same `fitScale` function table-tested in section 8 returns both.

**2.5.5 Decoration that costs nothing.** The speaker grille (a CSS `repeating-linear-gradient` of slots, or six rotated divs), the power LED (a 4 px square that changes with game state or just blinks once at start), screw heads in the shell corners (a 3 x 3 sprite), a small label under the screen ("LIFE" and a shell-pixel logo of our own, such as the apartment's door), contour lines moulded into the body, a faint scuff or wear texture. Any of them are plain CSS or a tiny sprite, all hidden first when the viewport is short. None should add extra tap targets.

**2.5.6 Landscape, the secondary option.** Two ways, with one rule to choose:
- **The shell turned** (a landscape handheld: d-pad panel left, the screen in the middle, A and B panel right, the pills under or beside them, status on a side). It needs side panels of at least 120 CSS px each at the biggest scale: true on 844 x 340 (Safari bars: scale 5, sides 155 each) and 932 x 430 at scale 5 (sides 199 each; at scale 6 they would be 146), not on 750 x 369 standalone (scale 5, sides 108) nor at 844 x 390 with scale 6 (sides 102).
- **Controls overlaid** on the picture's lower corners (option A in 2.2), translucent, at the biggest scale. The thumbs cover the lower corners of the room, but the picture is as large as it can be (640 x 384 css, 2.0x).
Rule: use the largest scale; if each side has at least 120 CSS px at that scale, put the controls beside the picture (the turned shell); otherwise overlay. If the beside layout only works one scale down (1.33x instead of 1.67x), prefer the overlay. The status panel in landscape stays in the picture (the HUD is already there). The mode switches on `resize` and orientation change, mid-game, with no change to `Game`.

**2.5.7 Why the shell and not just buttons below the picture.** It gives the controls a visual home (players know where to put their thumbs), makes the small screen read as intended, uses the free vertical space well (the status strip, the hint line, decoration) and costs only CSS and a few sprites. The risk is looking like a copy of a specific console: avoid its proportions (the long vertical body with a wide screen bezel and offset speaker), its two-tone colours, its button letters and any logo. Marc reviews the first rendering.

## 3. Controls

The touch layer is a small module (`src/input/touch.ts`) plus a DOM overlay in `index.html`/CSS. It raises **synthetic `KeyboardEvent`s on `window`** with the same `code`s, so `Keyboard`, `readControls` and every feature listening to key events (cycle, L list, mute, sound note pitch, achievements) need no change. Synthetic events are not "trusted" gestures, so the audio unlock is called directly from the real `pointerup` (section 5).

| Control | Touch | Sends | Notes |
|---|---|---|---|
| Walk | d-pad: hold a direction | `KeyW/A/S/D` down while held, up on release or when the thumb slides into another direction | Four directions (a dead zone in the middle, no diagonals). One `pointerdown` on the whole pad with `setPointerCapture`; work out the direction from the angle, so sliding the thumb from left to up changes direction without lifting (needed to keep walking round furniture). The grid-step rule (turn on a quick tap, step if held 0.08 s, `WALK` in config) is in `Player`, so a held key is all that is needed. |
| Menus up/down | d-pad tap | one `keydown`/`keyup` per tap, no repeat | `dirPressed` fires on keydown only, so a tap is one entry. A held d-pad in a menu moves one entry (same as the keyboard); an optional key-repeat in menus is a follow-up. |
| Interact and choose (E) | A button | `KeyE` | The big button. |
| Back, stop an action (Escape) | B button | `Escape` | Also stops a running activity (046). Hold-to-skip is not needed. |
| Cycle the choice (039) | a small button, shown only while the prompt offers more than one choice | `Tab` | Shift+Tab (backward) is a long press (400 ms) on the same button: Shift down, then Tab on a later frame (Shift must be held across at least one frame, since `cycleStep` reads `keysDown`), then both up. The button reads `game` state via a callback (stage 3); in stage 1 it is always shown. |
| L list screen, mute | two small buttons in a top corner (a "menu" cluster) | `KeyL`, `KeyM` | Inside the L screen the toggles (`KeyD` voice, `KeyB` ad blocker, Shift+`KeyR` then `KeyY` reset) need on-screen entries: stage 3 makes the L screen's rows tappable; until then they stay keyboard only (skipped on phones at first). |
| Tap a dialog/menu option | tap on the canvas | cursor plus `KeyE` | Needs the menu's entry rectangles in game pixels (`DialogRunner.view` has the cursor but not the boxes). Stage 3: expose the rectangles from the dialog renderer, convert `clientX/Y` to game pixels with the current scale and offset, send one `dirPressed` run and `KeyE`. Until then the d-pad and A button work. Tapping text to advance (`say`) is just A; the whole canvas may map to A while a `say` is open, a safe shortcut. |

**Tap target sizes.** A fingertip is about 9 to 10 mm wide; Apple recommends 44 pt (about 7 mm) minimum, Google 48 dp (about 9 mm). A CSS px is about 0.156 mm on iPhone (163 ppi) and about 0.159 mm on Android (160 dp per inch), so 1 mm is about 6.3 CSS px. Proposed sizes:
- d-pad: 144 to 156 CSS px across (23 to 25 mm), each arrow zone at least 48 px (7.5 mm) wide, with the dead zone 36 px.
- A and B: 64 px (10 mm), A slightly larger (72 px) because it is pressed most; at least 16 px apart (so a thumb does not hit both).
- cycle: 56 px (9 mm). Menu cluster (L, M): 44 px (7 mm), top corner, away from the thumbs on purpose, so they are not hit by accident.
- Size scales with the viewport short side (clamp 0.8x to 1.2x) so a small phone does not lose play area and a tablet does not get tiny pads.

**Handedness.** One stored flag swaps the d-pad and the buttons (section 2.3); first release: right-handed only is acceptable, the flag is one CSS class (`.mirror`) and a settings entry, a stage 3 item.

**Haptics.** `navigator.vibrate(10)` on a button press: **supported on Android Chrome, not on iOS Safari** (no `vibrate` at all, and no real haptic API; the one trick is that iOS 17.4 and later give a haptic tick when a switch-style checkbox, `<input type=checkbox switch>`, is toggled, which a hidden control can do on a tap; it is undocumented behaviour, so treat it as a bonus, not a feature). So: a 10 ms tick on A, B and the d-pad edge change where available, behind a setting (default on, and off when `prefers-reduced-motion` is set or the sound mute is on), never required to play. It is a stage 3 nicety; nothing depends on it.

**Visual feedback:** pressed state (a lighter fill); the buttons use the game's palette and pixel look (drawn with CSS `image-rendering: pixelated` sprites or flat CSS shapes), 35% opacity idle and 70% pressed in landscape overlay, so the picture is not hidden.

**No ghost taps.** Use `pointerdown` and `pointerup` with `touch-action: none` on the pad and buttons, never `click` (300 ms delay and double-tap zoom on old iOS). Multi-touch must work (walk with one thumb, A with the other): each control tracks its own `pointerId`. Mouse and pen events are accepted too, so the overlay is testable on a desktop (section 8).

**When the touch layer shows.** Only on touch devices: `matchMedia("(pointer: coarse)")` and `navigator.maxTouchPoints > 0` (not `ontouchstart`, which laptops with touch screens also have). It hides again the moment a real `keydown` arrives from a physical keyboard (an iPad with a keyboard), and a `?touch=1` / `?touch=0` dev parameter forces it on or off. A hybrid laptop does not see it unless it is touched.

## 4. Activities that need a keyboard: what mobile does

The inputs read from `Controls` are: `keys` (a key went down this frame, by code), `keysDown`, `keysReleased` (raw keys). Three families:

| Activity | Reads | What mobile does at first | Later |
|---|---|---|---|
| **Answer emails (typing, `typing.ts`)** | any typing key advances one character (mashing); the text is fixed, so the letters do not matter | **A simple on-screen version: a big tap area (the whole canvas) or the A button, each tap counts as one typed key.** Because only the count matters, no keyboard is needed. Quality comes from speed (`TYPING.fastCps`/`slowCps`): a thumb taps about 5 to 7 times a second against a keyboard's 8 to 10, so the speed window needs a phone setting (config) or the task grades on the same scale and is a little harder. Make it ask for taps, not typing (the screen text says TAP). | A decorative tap-pad of 4 large keys. |
| **Notes (guitar, `notes.ts`)** | `dirPressed`: press the arrow on the screen | **Works as is with the d-pad**; a touch player tapping the arrows. The timing window (`NOTES.window`) may need to be a little longer on touch (config value, measure on a phone), and the d-pad must report a press on `pointerdown` without a 200 ms delay. | Larger touch arrows drawn in the activity. |
| **Track editor (`make-track.ts`)** | arrows (cursor, pitch), `E` (place or clear), `1 2 3` (channel), `T P - = , . N S D C V`, typed track name | **Skipped on phones at first**: the editor is a keyboard tool (about 15 keys) and the piano roll cells are 16 px tiles (a fat thumb covers 3). The record player and demos still play. The task shows "needs a keyboard" on a touch device without one (section 5, a physical keyboard check). | A tap-to-place piano roll (tap a cell: place or clear; d-pad scrolls), a button row for the commands (play, save, tempo, length) and the OS keyboard for naming (below). A real design task: its own issue. |
| **Track name, flashcards key and any typed text** | typed `keys` codes and `Backspace`, `Enter`, Ctrl+V paste | **The OS keyboard through a hidden `<input>`**: when an activity says it wants text (a new `Controls` flag or host call, `wantsText`), the shell focuses a real input element (visually hidden, `font-size: 16px` so iOS does not zoom in); its `input` and `keydown` events are turned into the same key codes (letters to `KeyX`, space to `Space`, backspace, enter), and its `paste` event feeds the paste path. iOS only opens the keyboard from a real tap, so the focus call must run inside the user's tap on A (an activity cannot open it by itself later). | Done properly in stage 3; the track name and the sync key share it. |
| **Flashcards cards (`flashcards.ts`)** | `Space`/`E` to flip, `Digit1`/`Digit2` or E to grade, Enter to continue, Escape | **Works with A and the d-pad** (A flips, then the d-pad left/right chooses a grade and A confirms, the existing selected-grade path, line 158 of `flashcards.ts`). Add buttons for "again" and "got it" in the touch layer only if the d-pad choice feels slow. | Two tap buttons over the card. |
| **Flashcards key (the first-time pairing)** | paste a link, or 32 characters, Enter, Backspace | **Paste through the hidden input**: the clipboard-read button (`navigator.clipboard.readText`, needs a user tap; supported on Chrome, asks permission on Safari) or the OS keyboard's paste. The key is long, so typing it on a phone is not realistic. The note for Marc: pair the phone once, via the pairing link opened in the phone (`?pair=<key>`), if the app supports it, so no pasting is needed (check `flashcards.md`). | |
| **Everything else** (dialogs, menus, record player, sleep, doors) | `dirPressed`, E, Escape | **Works with d-pad, A, B.** | tap-to-pick (section 3). |

Skipped on phones at first: the track editor, the L screen's key toggles, typing a track name (until the hidden input), the dev-only query parameters.

## 5. The platform bits

**Stop the browser reacting to touches.**
- CSS: `html, body { overscroll-behavior: none; touch-action: none; overflow: hidden; position: fixed; inset: 0; }` stops pull-to-refresh and scroll chaining; add `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none` (no text selection or the iOS long-press menu); `-webkit-tap-highlight-color: transparent`.
- Zoom: the viewport meta `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`. iOS Safari ignores `user-scalable=no` since iOS 10 for accessibility, so also `touch-action: none` on the game area (stops double-tap zoom and pinch there) and, as a backstop, `preventDefault` on `gesturestart` and on `touchmove` with more than one touch. Inputs use `font-size: 16px` so focusing the hidden input does not zoom.
- Context menu: `contextmenu` event `preventDefault` (long-press on the canvas).
- The canvas keeps its current CSS: `image-rendering: pixelated`.

**Safe areas.** With `viewport-fit=cover` the page draws under the notch and home indicator; `env(safe-area-inset-top|right|bottom|left)` give the insets (iPhone 14 landscape: left and right about 47, bottom about 21; portrait: top 47 to 59, bottom 34). The scaling rule uses the area **inside** the insets, and the touch pad's padding is `max(12px, env(safe-area-inset-*))`. Without `viewport-fit=cover` browsers letterbox for you; safest first step is to **not** use cover until the layout code reads the insets.

**Fullscreen or installable.** In a normal tab, iOS Safari shows its toolbars and the visible height changes (a 390 x 844 phone gives about 664 of height, section 2.1), and there is no Fullscreen API on iPhone. An installable web app removes the chrome: a `manifest.webmanifest` (`name`, `short_name`, `display: "standalone"` or `"fullscreen"`, `orientation: "any"`, `background_color: "#111"`, 192 and 512 px icons from the apartment sprites) plus `<meta name="apple-mobile-web-app-capable" content="yes">`, `apple-mobile-web-app-status-bar-style` and an `apple-touch-icon`. Changes in the viewport: no toolbar, so the full 844 x 390 or 390 x 844 minus the safe areas (the "standalone" rows of the table; landscape scale 5 rather than 6 once the left/right insets are subtracted, section 2.1), and no pull-to-refresh at all. A service worker is **not needed** for installability on iOS and is optional on Android (older Chrome install prompts wanted one; current ones do not); skip it: offline play was abandoned for flashcards (026) and the game needs the network for flashcards anyway. Cost: the manifest and the icons (about an hour); on iOS it is "Share, Add to Home Screen" (a manual step to tell players about). Installing is a stage 4 item; the game works fine in a tab without it. Note: an installed iOS web app has its own storage (see persistence).

**Wake lock.** `navigator.wakeLock.request("screen")` keeps the screen on; it is supported in Chrome, and in Safari 16.4 and later (also for installed apps after a fix in 18.4). It needs a secure context (HTTPS or localhost, so the dev server on a LAN address does not have it, section 8) and a user gesture or a visible page; the lock is released when the tab hides, so listen for `visibilitychange` and request it again. Wrap in try/catch and feature-detect; if missing, nothing happens (the screen dims after the system timeout, as for any web page). The game has idle parts (the sleep sequence, a long wait) with no touches, which is exactly when a phone would sleep, so request the lock on the first touch and drop it when the page hides.

**iOS audio unlock.** The sound engine creates and resumes the `AudioContext` in `unlock()` on a key press. A phone has no key press: the first real `pointerup` (iOS wants a `touchend` or `click`-class gesture; whether `pointerup` alone counts is unconfirmed, so also unlock on `touchend` and `click`) on the touch layer must call `engine.unlock()` directly, because the synthetic key events are not trusted gestures and the context would stay suspended. It must be called on **every** touch until `ctx.state === "running"` (the context also gets suspended when the page is hidden, and iOS interrupts it after a call). The iPhone's ring/silent switch silences Web Audio unless a media element is playing, so a phone on silent may play no sound at all; say so in the settings (a muted-looking state is not a bug). Also resume on `visibilitychange` back to visible.

**Saved progress.** Progress is in `localStorage` (009c, `life.*` keys, flashcards key). On a phone, Safari can clear the storage of a site not visited for about seven days (Intelligent Tracking Prevention) unless it is an installed home-screen app, and private tabs and "clear website data" erase it. One line for the player: a save is only as safe as the phone browser's storage; installing the game to the home screen protects it from the seven-day clearing (but an installed iOS app has its own empty storage at first install), and a later export/import (a text code to copy) is the real answer if saves matter (a separate issue; `navigator.storage.persist()` is a cheap extra request, a no-op on iOS tabs).

**Performance and battery.** The loop (`startLoop`) draws every frame at the display rate, up to 120 Hz on a Pro phone, even when nothing changes. Costs: heat and battery over a long session, and the integer-scaled backing store is bigger at DPR 3 (a 1920 x 1152 canvas at scale 6 is 2.2 million pixels, a `drawImage` of a 320 x 192 offscreen canvas, fine for any phone from the last six years). Options, cheapest first: (1) render at most 60 frames a second (the fixed step is 1/60 already, so skip frames when the display runs at 120 Hz); (2) pause the loop when `document.hidden`; (3) draw fewer frames while an idle wait or sleep sequence shows nothing but a clock tick (a 30 fps cap, with alpha interpolation off); (4) a battery-saver setting. Measure before doing more than 1 and 2 (stage 1 includes them).

**Stray-key gates (issue 081).** `Game.strayKeysPossible`, `keysGate` and `DIALOG.strayWindow` stop a menu from hearing the keys a player is still pressing right after a typing, notes or flashcards game. They are driven by `controls.keysDown`, `keys`, `dir` and `dirPressed`, so they work for touch **because the touch layer raises ordinary keys**: a thumb still on the d-pad after a notes game counts as a held direction, and the gate waits for it to lift (`DIALOG.gateMaxSeconds` caps the wait). Two things to check on a phone: (1) tap-to-count in the typing game ends with a stream of A taps (`KeyE` is in `keys`), so the gate must treat a press of the typing tap area as a "real" key (`real` in `game.ts` filters out some codes; verify E counts); (2) lost `pointerup`s (a thumb sliding off the screen edge, a system gesture, a call) leave a key stuck down: the touch layer must release everything on `pointercancel`, on `blur`, on `visibilitychange` and `touchcancel` (the existing `Keyboard` blur handler handles only real blur events). A stuck key would otherwise hold the gate until `gateMaxSeconds`. Add a test for each.

## 6. Mocks at real size

Sizes are CSS pixels; the game is 320 x 192 game pixels. `#` is the game picture.

**A. Landscape overlay, iPhone 14 in a tab (Safari bars), 844 x 340, scale 5 dev = 1.67 css.**
```
x: 0                                                     844
   +-----------------------------------------------------+ y=0
   |        |HUD|            533 x 320                    | 
   |        |                                              |
   |  free  |        THE GAME (320 x 192 gpx)    |  free   |
   | 155 px |                                    | 156 px  |
   |  (  <) |                                    | (B)(A)  |  d-pad 132 px in the left free space
   | ( ^ v )|                                    |         |  A and B in the right free space
   +-----------------------------------------------------+ y=340
```
Here the free sides (155 px = 24 mm) are wide enough for the d-pad and A/B **beside** the picture (nothing hidden). At 844 x 390 with the insets ignored (scale 6, 640 wide) the sides are only 102 px; honoring the 47 px insets (750 x 369 standalone) the scale is 5 and the sides are 108 px and the controls overlay the picture.

**B. Portrait, handheld shell (primary):** drawn to size in section 2.5.1 for a 390 x 763 usable iPhone 14 (screen 1.0x) and described for the 430 x 839 Pro Max (screen 1.33x, 427 x 256). On an Android 360 x 740 usable phone (already after the insets; screen 1.0x, 20 px of body each side; same y convention as 2.5.1): label strip y 0..18, screen frame y 18..234, status strip y 242..298, d-pad 144 px at x 20..164 (y 330..474), B 60 px at x 196..256 (y 400..460) and A 64 px at x 280..344 (y 350..414), a 24 px gap between B and A, pills 80 x 44 at y 500, the grille at y 560 and below (dropped on a short phone).

**C. Landscape (secondary):** the overlay diagram in option A of section 2.2, and the turned shell when the sides are at least 120 px wide:
```
iPhone 14 landscape in Safari, 844 x 340 usable, scale 5 dev = 1.67 css (533 x 320)
+-------------------------------------------------------------------+
|  +--------+   +-----------------------------------+   +--------+  |
|  | status |   |                                   |   |   (A)  |  |
|  |  ^     |   |   GAME SCREEN 533 x 320 css       |   | (B)    |  |
|  | < >    |   |                                   |   |        |  |
|  |  v     |   |                                   |   | [CHOICE]|  |
|  +--------+   +-----------------------------------+   +--------+  |
|   155 px                                                 155 px     |
+-------------------------------------------------------------------+
```

(A rendered PNG was not made: the project's mockup scripts draw rooms from sprites, not a phone shell, and the dimension diagrams carry what is needed. Stage 1 gives a real screenshot at any phone size through the browser's device emulation.)

## 7. Staged build plan (smallest first)

**Stage 1: a touch layer on the existing layout, in a plain (flat CSS) portrait shell, behind the touch check (the first thing Marc can try).**
- `src/input/touch.ts`: the pad and buttons (DOM elements built in code), the pointer to key mapping, the "show only on touch" rule, the synthetic key events, release-all on cancel/blur/hidden.
- `createScreen`: scale in device pixels (backing store in device pixels, `drawImage` from an offscreen 320 x 192), `devicePixelRatio` and `resize`/`visualViewport` handling, safe-area insets, `100dvh`.
- `index.html`: viewport meta, the no-scroll/no-zoom CSS, the `pointerup` audio unlock.
- Pause the loop when hidden; cap at 60 fps.
- Works: walking, E, Escape, menus, dialogs, notes, flashcards cards, the typing game (tap A). Skipped: the track editor, the L screen toggles, names and keys.
- The portrait shell in flat CSS (rounded body, screen frame, d-pad, A, B, three pills, no art yet): the picture on top, the controls below, the in-canvas HUD unchanged, the status strip empty or a hint line. Landscape in this stage is the simple overlay (the same buttons over the picture's corners), so rotating works from day one.

**Stage 2: the shell in pixel art and both orientations properly.** The ten shell sprites in the game's palette (its own small art issue), the `--u` shell pixel and `fitScale`, the status strip drawn by the HUD code once 048 has picked, the turned landscape shell when the sides allow it, a left/right-handed flag, the manifest and icons, wake lock, `prefers-reduced-motion` for haptics.

**Stage 3: text and menus.** Hidden input for names, keys and paste; the cycle button shown only when there is a choice; tap-to-pick in dialogs and menus (menu rectangles exposed by the renderer); a tappable L screen; haptics; the typing tap area tuned.

**Stage 4: the heavy ones, each its own issue.** A tap-based track editor; export/import of the save; a portrait HUD below the picture (a taller canvas) if 048 wants it.

## 8. Test plan

Automated (vitest, no browser; the project has no jsdom today, so the logic is kept in pure functions and driven by a fake event target, like `FakeAudio` and `FakeStorage`):
1. **Mapping (the core test):** a `TouchPad` with a fake `EventTarget` and a recording `Keyboard`. Pointer down on A gives `KeyE` down, up gives `KeyE` up; B gives `Escape`; cycle gives `Tab`, long press gives Shift down, then Tab on a later frame, then both up, asserting that Shift is in `keysDown` on the frame Tab is in `keys`, and that the synthetic Shift+R (the reset, `achievements/feature.ts`) carries `shiftKey: true` on the event; the menu buttons give `KeyL` and `KeyM`. Then through `readControls`: a d-pad hold gives `dir`, a tap gives `dirPressed` once, `interactPressed` once per tap, `keys` contains the code on the first frame only.
2. **D-pad geometry:** point to direction for each quadrant, the dead zone, sliding from left to up releases left and presses up in the same event (never both down), the edge between two zones, a point outside the pad when captured.
3. **Release-all:** `pointercancel`, `blur`, `visibilitychange` hidden and lost `pointerup` leave no key held (`keysDown` is empty and a `keysReleased` was reported once).
4. **Multi-touch:** two pointers (D-pad and A) are independent; a second finger on the same control does not double-press; releasing one does not release the other.
5. **Scale rule:** a pure `fitScale(width, height, dpr, insets)` function table-tested against section 2.1 (every row), including fractional DPR (2.625), tiny screens (scale 1 minimum), the insets, a window that is too small for 1x (still returns 1 and the picture is cropped by CSS, never zero), and the offscreen and CSS size results (`css = scale / dpr`).
6. **Visibility rule:** `touchLayerVisible({coarse, maxTouchPoints, sawRealKey, override})` table test.
7. **Stray keys with touch:** one `Game`-level test, in the style of `stray-keys.test.ts`: a notes game ending with the d-pad held then a menu opening ignores the held direction until released; a typing game ended by A taps; a lost `pointerup` is released by the cancel path and the gate does not wait `gateMaxSeconds`.
8. **Audio unlock:** the first `pointerup` calls `engine.unlock()` (with `FakeAudio.resumed` counting) and the synthetic key events alone do not.
9. Golden frame and sprite tests are unaffected (the picture is drawn at 320 x 192 by the same code); `npm test` and `npm run build` must pass.

Manual (a real phone; what automation cannot judge): the feel of the d-pad (does walking round the sofa work with a slide), button size and spacing, the thumb covering the picture, haptics, the iOS unlock with the silent switch, wake lock, pull-to-refresh and pinch, rotation mid-game, the safe areas on a notched phone, battery after 15 minutes, installed vs tab storage.

**Trying it on a real phone from the dev server over the network.**
1. `npm run dev -- --host` (Vite prints a `Network: http://192.168.x.x:5173/` address); the phone must be on the same Wi-Fi. If it does not load, check the Mac's firewall prompt and that the Wi-Fi does not isolate clients.
2. Open that address on the phone. **Caveats:** it is plain HTTP on a LAN address, so it is **not a secure context**: no wake lock, no `navigator.clipboard.readText`, no service worker, and `localStorage` is a different one from `localhost`'s (progress starts empty). The flashcards backend is the real app, which only allows `https://*.mcord.dev` origins, so Study Spanish will not connect from a LAN address (use the `?flashcards=demo` dev deck, which needs no network).
3. For a secure context from the dev machine: a tunnel (`cloudflared tunnel --url http://localhost:5173` or `ngrok http 5173`) gives an HTTPS address that works with wake lock and the clipboard (and Vite needs `server.allowedHosts` for it), or the Netlify deploy from issue 084 once it exists (the best test). Flashcards only reach the progress endpoint from the production `sim.mcord.dev`: a `*.netlify.app` preview, a tunnel address and a LAN address are all refused by its CORS list (`docs/flashcards.md`, issue 084). A guest (issue 083) works anywhere, because the core file allows any origin.
4. Desktop first: Chrome DevTools device mode (Cmd+Shift+M) with `?touch=1` shows the layer with mouse events and lets Marc try the sizes in section 2.1 before using a phone; it does not reproduce Safari's toolbars, safe areas or audio.
5. Add to Home Screen from Safari (Share menu) to see the standalone sizes (needs the manifest from stage 2 to get the icon and name).

## 9. Risks and things not decided here
- **Small picture in portrait** (1.0x to 1.33x). If playing in portrait feels too small, a taller phone-only logical canvas could re-lay out the HUD, but the world view stays 320 x 192 unless the rooms are redrawn.
- **Browser chrome varies** (Android Chrome's bar, iOS 26 Safari's floating bar and its changing insets). The layout reads `visualViewport`, never fixed numbers; the table in 2.1 is typical, not exact.
- **A fingertip hides 3 tiles** at 1.0x (a thumb covers about 9 mm, the picture is 50 mm wide). This is why the shell keeps the controls below the picture, never over it, and why landscape gets an overlay only when there is no room beside the picture.
- **Android back button and iOS edge-swipe back** leave the page; a `beforeunload` guard is not reliable. The game saves as it goes (009c), so nothing is lost; do not try to capture the gesture.
- **Accessibility:** the touch layer is also useful for a mouse; button labels need `aria-label`s; a setting for larger buttons is cheap (the size multiplier).
- Not in scope: gamepad support (an open question in PLAN.md), tablets (they work through the same rules), and a native app.

## 10. What each option costs (summary)

| Option | Build | Lasting cost | Picture | Verdict |
|---|---|---|---|---|
| Same game, portrait handheld shell | stage 1 flat, stage 2 art, about two days plus the sprites | one shell module and its sprites | 1.0 to 1.33x, plus a status strip | **recommended (primary)** |
| Same game, landscape (overlay or turned shell) | part of stage 1, finished in stage 2 | a second layout to keep tested | 1.67 to 2.0x | recommended secondary |
| Landscape only | stage 1 | none | best | the fallback if Marc wants one orientation and a big picture |
| Portrait bare (buttons under the picture, no shell) | stage 1 | none | 1.0 to 1.33x | the first step of the primary option |
| Separate mobile game | weeks | double maintenance on every issue | any | only if the view or interaction model must change |

## 11. Files this would touch (for planning)
`src/render/canvas.ts` (scale, DPR, offscreen copy), `index.html` (meta and CSS), new `src/input/touch.ts` and `src/input/touch.test.ts`, `src/main.ts` (create the touch layer, the loop pause), `src/game/sound/feature.ts` or `engine.ts` (an unlock entry called from `pointerup`), stage 3: the dialog renderer, `src/game/activities/*.ts` (`wantsText`), `public/manifest.webmanifest` and icons. Not touched: `Game`, `Player`, `Controls` types, the golden frames.

## 12. Marc's answers and the recommendations they confirm (2026-10-27)
Marc has an **iPhone** (Safari: notch and safe-area insets, no vibration, no Fullscreen API, wake lock needs Safari 16.4+). The answers, with what each means for the build:
1. **Same game or a separate mobile game?** Answer: **the same game** with a touch layer (section 1).
2. **Portrait, landscape or both?** Answer: **portrait with the handheld shell first**; landscape is the secondary layout (overlay first, the turned shell when it fits).
3. **Is a 1.0x picture in portrait acceptable?** Answer: **yes**, 1.0x to 1.33x is fine to start. He will look at the flat stage 1 on his phone before any shell art is drawn.
3b. **The shell's look:** answer: **"surprise me".** Stage 2 sketches both a warm-grey body and a dark body, and he picks by looking. Grille, LED and LIFE label stay as proposed; nothing copies a real console.
3c. **Where does the status panel go?** Stage 1 leaves the HUD in the picture; stage 2 moves it to the strip under the screen once 048 is picked (recommendation, not yet decided by Marc).
4. **048 and portrait designed together?** Taken at the recommendation: yes. 048 decides the content, drawable into a 320 x 56 strip; the shell decides where it sits. Stage 1 does not wait.
5. **Day-one features:** taken at the recommendation: d-pad, A, B, the choice cycle, wake lock, no scroll or zoom. Not on day one: the track editor, handedness, installability (stage 2).
6. **Installable home-screen app:** answer: **yes, after stage 1** (manifest, no service worker); tell players to use Add to Home Screen.
7. **Typing games and the track editor on a phone:** answer: **simplify.** Typing (Answer emails) becomes tap-to-count; notes and flashcard cards use the d-pad and A; names and the flashcards key use a hidden input that raises the OS keyboard; the track editor is skipped on phones at first.
8. **Flashcards pairing on the phone:** answer: **the least friction, by pasting.** In the flashcards app, the `...` panel's "Sync another device" shows a QR code and the `?pair=<key>` link behind it. On the phone Marc copies the link (or the bare key) from the app and pastes it into the game's key field. The game's `keyFromText` already accepts both, so no game change is needed for the format. The field is a hidden input, which gives the iOS paste bubble; an optional Paste button can use `navigator.clipboard.readText` (HTTPS only). **A QR scan inside the game is left as an optional later idea:** it needs camera access and a decoder (the app uses `jsQR`, about 47 KB gzipped, as an iOS fallback), and it cannot scan the phone's own screen.
9. **Left-handed layout:** taken at the recommendation: later (stage 3), mirrored with one class.
10. **Saves:** taken at the recommendation: "your save lives in this browser" is enough; an export/import code only if a save is ever lost. An installed iOS app starts with its own empty storage (section 5).
11. **Haptics and the frame rate:** haptics are moot on iPhone (no `vibrate`; the checkbox-switch tick is an undocumented bonus); the 60 fps cap is a setting.
12. **Which phone:** an iPhone. The table in 2.1 has the iPhone rows (390 x 844 and 430 x 932 portrait, 844 x 390 and 932 x 430 landscape); ask for the exact model before choosing which to test first.
