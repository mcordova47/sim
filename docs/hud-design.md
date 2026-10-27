# HUD and status panel space (design note, issue 048)

Status: a note for Marc to pick from. No game code is written. It is designed **together with the portrait handheld shell of the mobile note** (issue 049, `docs/mobile.md` section 2.5, which lives on its own branch and is not merged yet), as Marc asked on 2026-10-27: on a phone the picture is on top and a status strip of about 320 x 56 sits in the shell body, so one HUD design has to render into two places: (1) over the 320 x 192 picture on desktop and landscape, in a small corner that does not cover the action, and (2) as a strip that is not part of the picture.

Marc's answers so far (2026-10-27): he has an **iPhone** (Safari, notch and safe-area insets, no vibration, so haptics are out of scope for him); a **small 1.0x to 1.33x portrait picture is fine to start with**; on the shell's look he said "surprise me" (see section 9).

## 1. How the HUD is built today (checked in the code, 2026-10-27)

- `VIEW` is 20 x 12 tiles of 16 px, **320 x 192**. `HUD_BOX` is 152 x 38 at (0, 0); `STATUS_BOX` is 76 x 50 at (244, 0) (`src/render/layout.ts`). `Hud.draw` (`src/render/hud.ts`) paints a 60% ink panel inside each box (a 4 px margin) and draws everything with text labels in the 5 x 7 pixel font.
- Left panel, 144 x 30 at (4, 4): `SCORE` label and the score at 2x, `COMBO` label and `X1.0` at 2x (grey until the multiplier is above 1, then butter with a 46 x 2 bar for the time left, `SCORING.comboWindow` 25 s). Right panel, 68 x 42 at (248, 4): the clock as `9:40 AM`, then `ENERGY` and a 52 x 3 bar (brick below `ENERGY.lowBelow` 25, else leaf), then `MOOD` and a bar (brick below `MOOD.lowBelow` 25, else butter).
- Together the two panels cover 4320 + 2856 = **7176 px, 11.7% of the picture**, and they are labels, not icons.
- Other things that know where the HUD is: `placeLabel` and `fitBox` keep prompts, progress bars and popups out of `HUD_BOX` (`world-ui.ts`); `Game` also passes `STATUS_BOX` to the popup avoid list (`game.ts`); achievement toasts start under `STATUS_BOX` (`toasts.ts`, `STATUS_BOX.y + STATUS_BOX.h + 2` = y 52); `drawStopHint` centres "ESC TO STOP" in the gap between the two boxes. A new layout has to keep those four working (section 7).
- The HUD is drawn after the world and before the activity picture and dialogs, so a full-picture activity or dialog covers it.

### 1.1 Where the picture is empty: the top 32 px

A world smaller than the view is **sat at the bottom** (`camera.ts` `clampY`: "so the strip above it is free for the HUD"). All three rooms are 10 tiles tall or less, so the world starts at y = 32 and the band y 0 to 31 shows only the ink background:

| Room | World size | Where it is drawn |
|---|---|---|
| main | 19 x 10 tiles = 304 x 160 | x 8 to 312, y 32 to 192 (the top row is the wall row with the paintings) |
| kitchen | 13 x 10 = 208 x 160 | centred, x 56 to 264, y 32 to 192 |
| bath | 9 x 6 = 144 x 96 | centred, y 96 to 192 |

The two panels are taller than that band: the right one reaches y 46 and the left y 34. In the main room the paintings sit on the wall row at map columns 2 to 3 (`pp`), 7 to 8 (`qq`) and 14 to 16 (`uuu`), which is x 40 to 72, 120 to 152 and **232 to 280**, y 32 to 48. So today the status panel (x 248 to 316, y 4 to 46) covers **the right part of the `uuu` painting (x 248 to 280, y 32 to 46), including the mood bar at y 43 to 46**, which is what Marc saw. The left panel nicks the other two paintings by 2 px. (Worked out from `MAIN_MAP` and the camera code, not from a rendered frame.) One character is 8 px in these maps (`=` the panel, `#` wall row, `P` painting, `X` panel over painting, `.` floor):

```
today: panels over the picture (1 char = 8 px, 40 x 24 chars = 320 x 192)
==================            =========
===================            =========
===================            =========
===================            =========
=xxxxXXXXxxxxxxXXXX##########PPXXXXxxxx=
 ####PPPP######PPPP##########PPXXXXxxxx=
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
```

**The first finding is that the overlap is not a space problem but a height problem: any HUD that stays inside y 0 to 31 touches nothing in any of the three rooms.** A larger scrolling room later would put the world under the band, so the HUD should stay small and low-contrast-neutral anyway, but today a 32 px band is free.

## 2. What must be shown, and how often it matters

Rates come from `config.ts`: `CLOCK.minutesPerSecond` 2 (one game hour = 30 s of play, a day = 12 min), `ENERGY.fallPerHour` 4, `MOOD.driftPerHour` 3 toward 50.

| Item | Range and source | How often it changes | When it matters | Needs to be always visible? |
|---|---|---|---|---|
| Score | counts up to the real score (`Hud.update`) | on every finished task, every 10 to 60 s | right after finishing a task (the count-up is the reward); otherwise rarely | No: a glance now and then |
| Combo | `X1.0` to `X3.0`, 25 s window | only inside a chain | only **while a chain is on** (above X1.0); at X1.0 it is noise | No: show only when active |
| Clock and time of day | `formatClock`; tint keys at 4.5, 6, 9.5, 16.5, 18, 22.5 | the minute digit changes about twice a second | deciding: good hours (x1.5 points), bedtime (late is 22 to 5); the world's light already hints at it | Yes, but the minutes are the loudest thing on the screen |
| Energy | 0 to 100, start 80, -4 per hour | about 1 point every 7.5 s plus task effects and sleep; from 80 to the tired line (25) takes about 7 minutes of play | when **low** (steps are 1.6x slower) and when choosing to sleep (below 60) | No: icon at rest, number on change or low |
| Mood | 0 to 100, start 60, drifts to 50 | task effects of -8 to +10, drift 1 point per 10 s | when **low** (a sigh once below 25) and as feedback right after a task | No: same |
| Phone battery (planned, section 8) | 0 to 100 if it is real | only with phone tasks | when low, and when plugging in | No: only when low or changing |
| Maybe later: flashcards due (`nextDueIn`, 082), packages at the door (066), plant thirst (063), decor money (062) | | slow | occasionally | **No**: these belong in a detail view or in the world (the box by the door), not the HUD |

Principle for the design: the HUD shows what changes within a minute of play and what the player can act on right now. Things you check occasionally go in the detail view (layout D).

## 3. One design, two places

The portrait strip and the picture corner are two **containers** for the same **widgets**. The widgets are drawn by one function from one model, with a size and a mode:

```
HudModel (pure, from Scoreboard + ApartmentState + Hud's own timers)
  items: score, combo?, clock, energy, mood, phone? (when real)
  each: value, level (low / ok / high), changedRecently, visible
Container "overlay": the 32 px band at the top of the picture, 1x, ribbon, bars only on change or low
Container "strip":   a 320 x 56 canvas, 2x text, 2x icons, every bar always shown, no panel needed
```

Sizes the two containers share: icons are 7 x 7 (the glyph height, `icon-*` sprites are allowed off the 16 px grid, `art-style.md`); drawn at 2x in the strip (14 x 14, nearest neighbour, whole pixels); text is the existing 5 x 7 font at 1x or 2x; bars are 3 px tall (6 px at 2x); palette only. The strip needs no panel: it is the shell's own little screen, filled ink.

Why 2x in the strip: on an iPhone at 1.0x (mobile note 2.1) a 1x glyph is 7 CSS px (about 1.1 mm); at 2x it is 14 CSS px, which reads. So the strip is not only a place for more, it is where the HUD is **more** readable than on the desktop picture.

## 4. The icons (7 x 7 sketches, game palette)

Characters: `Y` butter, `O` tangerine, `R` brick, `W` paper, `k` ink, `m` mist. Icons carry the **state** with a face or colour, never a flash: sun, dusk and moon for the time of day (the tint table already has those phases), a bolt for energy (brick when low), a face for mood (smile at 70 or more, flat in between, a drooping mouth in tangerine below 25), a small phone for the battery (a phone, **not** a battery silhouette, so it is never confused with the player's real phone battery in the status bar), a star for the score.

```
star     sun      dusk     moon     bolt     boltlow  happy    flat     sad      phone  
...Y...  ...Y...  .......  ..WWW..  ....YY.  ....RR.  ..YYY..  ..YYY..  ..OOO..  .WWWWW.
...Y...  .Y.Y.Y.  ...O...  .WW...W  ...YY..  ...RR..  .YYYYY.  .YYYYY.  .OOOOO.  .W...W.
YYYYYYY  ..YYY..  .O.O.O.  WW.....  ..YY...  ..RR...  YYkYkYY  YYkYkYY  OOkOkOO  .W...W.
.YYYYY.  YYYYYYY  ..OOO..  WW.....  .YYYYY.  .RRRRR.  YYYYYYY  YYYYYYY  OOOOOOO  .W...W.
..YYY..  ..YYY..  OOOOOOO  WW.....  ...YY..  ...RR..  YkYYYkY  YYkkkYY  OOkkkOO  .W...W.
.YY.YY.  .Y.Y.Y.  mmmmmmm  .WW....  ..YY...  ..RR...  .YkkkY.  .YYYYY.  .OkOOkO.  .WW.WW.
.Y...Y.  ...Y...  .......  ..WWW..  .YY....  .RR....  ..YYY..  ..YYY..  ..OOO..  .WWWWW.
```

These are sketches for the sprite round; the art pass redraws them.

## 5. The layouts

Legend for all mock crops: `:` the 60% ink panel, `k` ink (bar track), `W` paper text, `G` leaf, `Y` butter, `R` brick, `O` tangerine, `.` the picture behind. Crops are 1 char = 1 px at the real size, from the same pixel code as the HUD font (no text shadow drawn, for clarity). Coordinates are in game pixels of the 320 x 192 picture.

### Layout A: icons with small meters, always on (the current structure, with icons)

Same two corners as today, but icons replace the words `SCORE`, `COMBO`, `ENERGY`, `MOOD` and AM/PM; three rows at a 9 px pitch. Right panel x 262 to 316, y 3 to 32 (54 x 29); left panel x 4 to 120, y 3 to 29 (116 x 26). Total 54 x 29 + 116 x 26 = **4582 px, 7.5%** (today 11.7%); it fits the band, so nothing is covered.

```
right panel, 54 x 29 (clock row, energy row, mood row)
::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::
:::::::Y::::::::WWW:::::::::::W:::WWW:::::::::::::::::
:::::Y:Y:Y:::::W:::W::WW:::::WW::W:::W::::::::::::::::
::::::YYY::::::W:::W::WW::::W:W::W::WW::::::::::::::::
::::YYYYYYY:::::WWWW:::::::W::W::W:W:W::::::::::::::::
::::::YYY::::::::::W::WW:::WWWWW:WW::W::::::::::::::::
:::::Y:Y:Y:::::::::W::WW::::::W::W:::W::::::::::::::::
:::::::Y::::::::WWW:::::::::::W:::WWW:::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::YY::::::::::::::::::::::::::::::::::::::::::::
:::::::YY:::::::::::::::::::::::::::::::::::::::::::::
::::::YY:::::::GGGGGGGGGGGGGGGkkkkkkkkkkkkkkkkkkk:::::
:::::YYYYY:::::GGGGGGGGGGGGGGGkkkkkkkkkkkkkkkkkkk:::::
:::::::YY::::::GGGGGGGGGGGGGGGkkkkkkkkkkkkkkkkkkk:::::
::::::YY::::::::::::::::::::::::::::::::::::::::::::::
:::::YY:::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::YYY:::::::::::::::::::::::::::::::::::::::::::::
:::::YYYYY::::::::::::::::::::::::::::::::::::::::::::
::::YYkYkYY::::YYYYYYYYYYYYYYYYYYYYYkkkkkkkkkkkkk:::::
::::YYYYYYY::::YYYYYYYYYYYYYYYYYYYYYkkkkkkkkkkkkk:::::
::::YkYYYkY::::YYYYYYYYYYYYYYYYYYYYYkkkkkkkkkkkkk:::::
:::::YkkkY::::::::::::::::::::::::::::::::::::::::::::
::::::YYY:::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::
```
```
left panel, 116 x 26: star, score at 2x, combo X1.5 with its drain bar (the combo part is drawn only while active)
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:::::::Y::::::::::WW::::::::WWWWWW::::::WWWWWW::::::::::WW::::::::::::::::::::::Y:::Y:::Y:::::::::YYYYY:::::::::::::
:::::::Y::::::::::WW::::::::WWWWWW::::::WWWWWW::::::::::WW::::::::::::::::::::::Y:::Y::YY:::::::::Y:::::::::::::::::
::::YYYYYYY:::::WWWW::::::WW::::::WW::WW::::::WW::::::WWWW:::::::::::::::::::::::Y:Y::::Y:::::::::YYYY::::::::::::::
:::::YYYYY::::::WWWW::::::WW::::::WW::WW::::::WW::::::WWWW::::::::::::::::::::::::Y:::::Y:::::::::::::Y:::::::::::::
::::::YYY:::::::::WW::::::::::::::WW::::::::::WW::::WW::WW:::::::::::::::::::::::Y:Y::::Y:::::::::::::Y:::::::::::::
:::::YY:YY::::::::WW::::::::::::::WW::::::::::WW::::WW::WW::::::::::::::::::::::Y:::Y:::Y::::YY:::Y:::Y:::::::::::::
:::::Y:::Y::::::::WW::::::::::::WW::::::::WWWW::::WW::::WW::::::::::::::::::::::Y:::Y::YYY:::YY::::YYY::::::::::::::
::::::::::::::::::WW::::::::::::WW::::::::WWWW::::WW::::WW::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::WW::::::::::WW::::::::::::::WW::WWWWWWWWWW::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::WW::::::::::WW::::::::::::::WW::WWWWWWWWWW::::::::::::::::::::YYYYYYYYYYYYYYYkkkkkkkk:::::::::::::
::::::::::::::::::WW::::::::WW::::::::WW::::::WW::::::::WW::::::::::::::::::::::YYYYYYYYYYYYYYYkkkkkkkk:::::::::::::
::::::::::::::::::WW::::::::WW::::::::WW::::::WW::::::::WW::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::WWWWWW::::WWWWWWWWWW::::WWWWWW::::::::::WW::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::WWWWWW::::WWWWWWWWWW::::WWWWWW::::::::::WW::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
```

- Readability: good, icons are quick to read, bars are always there.
- Space: fits, but **a fourth meter (phone battery) does not fit a third row** (4 x 9 + padding = 40 px, the band is 32), so it needs a second column and the panel grows to about 100 px wide.
- Calm: fine, but three bars sit there all the time, a small constant "to do".
- Overlay and strip: the strip would just be the same three rows at 2x side by side, so it works; but it leaves the overlay's problem (always-on bars) in place.

### Layout B: one-row ribbon; icons at rest, a bar only when it changes or runs low

All items in one row, 11 px tall (y 3 to 14), in two small chips: score and combo left (x 4 to 80), clock and meters right (x 236 to 316 at rest). At rest the energy, mood and phone are **icons only** (the face and bolt themselves are the meter: three faces, bolt normal or low). A 30 x 3 bar slides out beside an icon for about 4 seconds when its value jumps by 3 or more (a task finished, sleep) and stays out, in brick, while the value is low. Hold a key (recommended `H`, free in the code today) to show all bars while held. Covered: 76 x 11 + 80 x 11 = **1716 px, 2.8%**, all inside y 3 to 14.

```
right chip at rest, 80 x 11 (x 236 to 316): sun and 9:40, bolt, face, phone
x 236..316, y 3..14 (80 x 11)
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:::::::Y:::::::WWW:::::::::::W:::WWW:::::::::::YY:::::::::YYY:::::::::WWWWW:::::
:::::Y:Y:Y::::W:::W::WW:::::WW::W:::W:::::::::YY:::::::::YYYYY::::::::W:::W:::::
::::::YYY:::::W:::W::WW::::W:W::W::WW::::::::YY:::::::::YYkYkYY:::::::W:::W:::::
::::YYYYYYY::::WWWW:::::::W::W::W:W:W:::::::YYYYY:::::::YYYYYYY:::::::W:::W:::::
::::::YYY:::::::::W::WW:::WWWWW:WW::W:::::::::YY::::::::YkYYYkY:::::::W:::W:::::
:::::Y:Y:Y::::::::W::WW::::::W::W:::W::::::::YY::::::::::YkkkY::::::::WW:WW:::::
:::::::Y:::::::WWW:::::::::::W:::WWW::::::::YY::::::::::::YYY:::::::::WWWWW:::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
```
```
energy just changed (4 s), 112 x 11 (x 204 to 316): only that bar is out
x 204..316, y 3..14 (112 x 11)
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:::::::Y:::::::WWW:::::::::::W:::WWW:::::::::::YY:::::::::::::::::::::::::::::::::::::::::YYY:::::::::WWWWW:::::
:::::Y:Y:Y::::W:::W::WW:::::WW::W:::W:::::::::YY:::::::::::::::::::::::::::::::::::::::::YYYYY::::::::W:::W:::::
::::::YYY:::::W:::W::WW::::W:W::W::WW::::::::YY:::::GGGGGGGGGGGGGGkkkkkkkkkkkkkkkk::::::YYkYkYY:::::::W:::W:::::
::::YYYYYYY::::WWWW:::::::W::W::W:W:W:::::::YYYYY:::GGGGGGGGGGGGGGkkkkkkkkkkkkkkkk::::::YYYYYYY:::::::W:::W:::::
::::::YYY:::::::::W::WW:::WWWWW:WW::W:::::::::YY::::GGGGGGGGGGGGGGkkkkkkkkkkkkkkkk::::::YkYYYkY:::::::W:::W:::::
:::::Y:Y:Y::::::::W::WW::::::W::W:::W::::::::YY::::::::::::::::::::::::::::::::::::::::::YkkkY::::::::WW:WW:::::
:::::::Y:::::::WWW:::::::::::W:::WWW::::::::YY::::::::::::::::::::::::::::::::::::::::::::YYY:::::::::WWWWW:::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
```
```
low energy and low mood, 80 x 11: the icons change (brick bolt, drooping tangerine face); no bar until something changes
x 236..316, y 3..14 (80 x 11)
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:::::::Y:::::::WWW:::::::::::W:::WWW:::::::::::RR:::::::::OOO:::::::::WWWWW:::::
:::::Y:Y:Y::::W:::W::WW:::::WW::W:::W:::::::::RR:::::::::OOOOO::::::::W:::W:::::
::::::YYY:::::W:::W::WW::::W:W::W::WW::::::::RR:::::::::OOkOkOO:::::::W:::W:::::
::::YYYYYYY::::WWWW:::::::W::W::W:W:W:::::::RRRRR:::::::OOOOOOO:::::::W:::W:::::
::::::YYY:::::::::W::WW:::WWWWW:WW::W:::::::::RR::::::::OOkkkOO:::::::W:::W:::::
:::::Y:Y:Y::::::::W::WW::::::W::W:::W::::::::RR::::::::::OkOOkO:::::::WW:WW:::::
:::::::Y:::::::WWW:::::::::::W:::WWW::::::::RR::::::::::::OOO:::::::::WWWWW:::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
```
```
left chip, 76 x 11 (x 4 to 80): star, score, combo X1.5 (the combo text is drawn only while a chain is on)
x 4..80, y 3..14 (76 x 11)
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:::::::Y::::::::W::::WWW:::WWW:::::W::::::::::::Y:::Y:::Y:::::::::YYYYY:::::
:::::::Y:::::::WW:::W:::W:W:::W:::WW::::::::::::Y:::Y::YY:::::::::Y:::::::::
::::YYYYYYY:::::W:::::::W:::::W::W:W:::::::::::::Y:Y::::Y:::::::::YYYY::::::
:::::YYYYY::::::W::::::W::::WW::W::W::::::::::::::Y:::::Y:::::::::::::Y:::::
::::::YYY:::::::W:::::W:::::::W:WWWWW::::::::::::Y:Y::::Y:::::::::::::Y:::::
:::::YY:YY::::::W::::W::::W:::W::::W::::::::::::Y:::Y:::Y::::YY:::Y:::Y:::::
:::::Y:::Y:::::WWW::WWWWW::WWW:::::W::::::::::::Y:::Y::YYY:::YY::::YYY::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
```

- Readability: the icons are as readable as A's; exact levels need the bar (4 s after a change, or `H`). In the middle of the range the bolt looks the same at 30 and at 70, which is the cost.
- Space: the smallest by far and it has room for a fourth and fifth icon (7 px + 6 px gap each).
- Calm: the best. At rest the screen is nearly clean; nothing blinks, nothing is red until something is actually low, and even then it is a quiet colour change.
- Overlay and strip: the overlay is this ribbon; the strip is **the same widgets with every bar out and at 2x** (section 3), so nothing is invented twice.

### Layout C: one meter, cycled with a key

The right chip holds the clock and **one** meter slot (icon and 30 x 3 bar) with three dots for which one; a key (`H`) cycles energy, mood, phone, and the slot jumps by itself to whichever changed or is low. 106 x 11 at x 210 to 316.

```
right chip, 106 x 11 (x 210 to 316): sun and 9:40, the energy slot, three position dots
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:::::::Y:::::::WWW:::::::::::W:::WWW:::::::::::YY:::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:::::Y:Y:Y::::W:::W::WW:::::WW::W:::W:::::::::YY::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::YYY:::::W:::W::WW::::W:W::W::WW::::::::YY:::::GGGGGGGGGGGGGGkkkkkkkkkkkkkkkk::::::::WWW:mm::mm::::::
::::YYYYYYY::::WWWW:::::::W::W::W:W:W:::::::YYYYY:::GGGGGGGGGGGGGGkkkkkkkkkkkkkkkk::::::::WWW:mm::mm::::::
::::::YYY:::::::::W::WW:::WWWWW:WW::W:::::::::YY::::GGGGGGGGGGGGGGkkkkkkkkkkkkkkkk::::::::WWW:mm::mm::::::
:::::Y:Y:Y::::::::W::WW::::::W::W:::W::::::::YY:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:::::::Y:::::::WWW:::::::::::W:::WWW::::::::YY::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
```

- Readability: one meter is large and clear, but you only ever see one: the comparison "I am tired and also down" is lost.
- Space: small (3.3%), constant size however many meters are added.
- Calm: fine, but it asks the player to operate the HUD (one more key to learn), which is the opposite of calm; the auto-jump moves things under the eyes.
- Overlay and strip: it works in the overlay, but it wastes the strip, where all of them fit at once; the strip would need a different layout (so not one design).

### Layout D: a quiet HUD and a detail view

At rest only the clock and the score are shown (x 4 to 80 and x 268 to 316); an energy or mood icon appears **only while low** (the sad face, the brick bolt). The full picture is in a **detail view** opened with a key (`H`, or as a page in the existing `L` list screen): large bars with plain words (rested, tired; calm, down), exact numbers, the combo timer, and the occasional things (cards due, a package at the door, the plant). Two chips at rest: 76 x 11 and 48 x 11.

```
right chip at rest, 48 x 11 (x 268 to 316): sun and 9:40 only
::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::
:::::::Y:::::::WWW:::::::::::W:::WWW::::::::::::
:::::Y:Y:Y::::W:::W::WW:::::WW::W:::W:::::::::::
::::::YYY:::::W:::W::WW::::W:W::W::WW:::::::::::
::::YYYYYYY::::WWWW:::::::W::W::W:W:W:::::::::::
::::::YYY:::::::::W::WW:::WWWWW:WW::W:::::::::::
:::::Y:Y:Y::::::::W::WW::::::W::W:::W:::::::::::
:::::::Y:::::::WWW:::::::::::W:::WWW::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::
```
```
with low energy and low mood, 76 x 11 (x 240 to 316): the two icons appear beside the clock
::::::::::::::::::::::::....::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::....::::::::::::::::::::::::::::::::::::::::::::::::
::::::::RR::::::OOO:::::....:::::::Y:::::::WWW:::::::::::W:::WWW::::::::::::
:::::::RR::::::OOOOO::::....:::::Y:Y:Y::::W:::W::WW:::::WW::W:::W:::::::::::
::::::RR::::::OOkOkOO:::....::::::YYY:::::W:::W::WW::::W:W::W::WW:::::::::::
:::::RRRRR::::OOOOOOO:::....::::YYYYYYY::::WWWW:::::::W::W::W:W:W:::::::::::
:::::::RR:::::OOkkkOO:::....::::::YYY:::::::::W::WW:::WWWWW:WW::W:::::::::::
::::::RR:::::::OkOOkO:::....:::::Y:Y:Y::::::::W::WW::::::W::W:::W:::::::::::
:::::RR:::::::::OOO:::::....:::::::Y:::::::WWW:::::::::::W:::WWW::::::::::::
::::::::::::::::::::::::....::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::....::::::::::::::::::::::::::::::::::::::::::::::::
```

- Readability: the detail view is the most readable of all, the HUD itself the least informative.
- Space: the smallest HUD (2 chips, 2.2%), and it scales to any number of future items because they live in the view.
- Calm: very calm, but a player who never presses the key never learns their energy until it is low; for a game with no goal that is arguably right, but it hides the feedback after a task.
- Overlay and strip: in the strip the detail view is just always on, so it is the weakest fit (the strip is a place for glanceable information, not a menu).

### 5.1 The portrait strip (for the recommendation, B)

The shell body holds a 320 x 56 strip (mobile note 2.5.1: y 242 to 298 of an iPhone 14, x 35 to 355). Same widgets, 2x: row 1 (y 8): star and score at 2x, combo (X1.5, only while a chain is on, with its 2 px drain bar), sun and clock at 2x aligned right; row 2 (y 32): energy, mood and phone, each an icon at 2x and a 78 x 6 bar, always out. Ink background, no panel. Shown at 1 char = 2 px (160 x 28 chars; `n` is the bar track, so every glyph and icon is on an even pixel and reads at 1:2):

```
kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkkkYkkkkkkkkWkkkkWWWkkkWWWkkkkkWkkkkkkkkkkkkkkkkkkkYkkkYkkkYkkkkkkkkkYYYYYkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkYkkkkkkkkWWWkkkkkkkkkkkWkkkWWWkkkkkkkkkkkkkk
kkkkkkkYkkkkkkkWWkkkWkkkWkWkkkWkkkWWkkkkkkkkkkkkkkkkkkkYkkkYkkYYkkkkkkkkkYkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkYkYkYkkkkkWkkkWkkWWkkkkkWWkkWkkkWkkkkkkkkkkkkk
kkkkYYYYYYYkkkkkWkkkkkkkWkkkkkWkkWkWkkkkkkkkkkkkkkkkkkkkYkYkkkkYkkkkkkkkkYYYYkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkYYYkkkkkkWkkkWkkWWkkkkWkWkkWkkWWkkkkkkkkkkkkk
kkkkkYYYYYkkkkkkWkkkkkkWkkkkWWkkWkkWkkkkkkkkkkkkkkkkkkkkkYkkkkkYkkkkkkkkkkkkkYkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkYYYYYYYkkkkkWWWWkkkkkkkWkkWkkWkWkWkkkkkkkkkkkkk
kkkkkkYYYkkkkkkkWkkkkkWkkkkkkkWkWWWWWkkkkkkkkkkkkkkkkkkkYkYkkkkYkkkkkkkkkkkkkYkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkYYYkkkkkkkkkkWkkWWkkkWWWWWkWWkkWkkkkkkkkkkkkk
kkkkkYYkYYkkkkkkWkkkkWkkkkWkkkWkkkkWkkkkkkkkkkkkkkkkkkkYkkkYkkkYkkkkYYkkkYkkkYkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkYkYkYkkkkkkkkkWkkWWkkkkkkWkkWkkkWkkkkkkkkkkkkk
kkkkkYkkkYkkkkkWWWkkWWWWWkkWWWkkkkkWkkkkkkkkkkkkkkkkkkkYkkkYkkYYYkkkYYkkkkYYYkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkYkkkkkkkkWWWkkkkkkkkkkkWkkkWWWkkkkkkkkkkkkkk
kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkYYYYYYYYYYYYYYYnnnnnnnnkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkkkkYYkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkYYYkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWWWWWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkkkYYkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkYYYYYkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWkkkWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkkYYkkkkkGGGGGGGGGGGGGGGGGGnnnnnnnnnnnnnnnnnnnnnkkkkYYkYkYYkkYYYYYYYYYYYYYYYYYYYYYYYYYYYYnnnnnnnnnnnkkkkkWkkkWkkkWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWnnnnnnnnkkkk
kkkkkYYYYYkkkGGGGGGGGGGGGGGGGGGnnnnnnnnnnnnnnnnnnnnnkkkkYYYYYYYkkYYYYYYYYYYYYYYYYYYYYYYYYYYYYnnnnnnnnnnnkkkkkWkkkWkkkWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWnnnnnnnnkkkk
kkkkkkkYYkkkkGGGGGGGGGGGGGGGGGGnnnnnnnnnnnnnnnnnnnnnkkkkYkYYYkYkkYYYYYYYYYYYYYYYYYYYYYYYYYYYYnnnnnnnnnnnkkkkkWkkkWkkkWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWnnnnnnnnkkkk
kkkkkkYYkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkYkkkYkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWWkWWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkYYkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkYYYkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWWWWWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
```

- The ESC TO STOP hint (046) is HUD text, not picture: in strip mode it is drawn in the strip's second row centre instead of over the picture. The overlay ribbon is not drawn at all in strip mode, and `placeLabel` and the toast avoid lists drop `HUD_BOX` and `STATUS_BOX` (they are not over the picture any more).
- The top 32 px band of the **picture** is empty in all three rooms (section 1.1). With the HUD in the strip it stays an ink stripe above the room. See question 4.
- The label strip, speaker grille and the rest of the shell are 049's business.

### 5.2 Where the overlay ribbon sits against the room

```
after: ribbon chips (=) in the free band, nothing over the paintings (1 char = 8 px)
=========                   ===========
==========                   ===========
                                        
                                        
 ####PPPP######PPPP##########PPPPPP#### 
 ####PPPP######PPPP##########PPPPPP#### 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
 ...................................... 
```

## 6. Comparison

| | A icons, always on | **B ribbon, bars on change or low** | C one cycled meter | D quiet HUD and detail view |
|---|---|---|---|---|
| Readability | good, all bars always | good icons; exact level on change or with `H` | one meter large; others hidden | detail view best; HUD poor |
| Picture covered | 7.5% (inside the band) | **2.8%** (inside the band) | 3.3% | 2.2% |
| Room for a 4th and 5th item | needs a second column | **yes** (13 px each) | yes (one slot) | yes (the view) |
| Calm, no pressure | bars always there | **nearly clean at rest** | a key to operate | very calm, but hides feedback |
| One design for overlay and strip | yes, 3 rows at 2x | **yes, same widgets, bars always out at 2x** | no | weak |
| Extra keys to learn | none | one optional (`H`, peek) | one (`H`) | one (`H`) |
| Build size | small | small to medium | medium | medium (a new view) |

## 7. Recommendation: B, and D as a later addition

**Layout B**, built on the one-model, two-containers structure of section 3.

Why: (1) it is the only one that is both the calmest on the picture (a clean top band with icons, no always-on bars) and the richest in the strip (all bars out at 2x, which is exactly when the player has room and a small screen needs big glyphs). (2) It fits the free 32 px band, so it fixes Marc's painting overlap by construction instead of by moving a box. (3) A fourth, fifth and sixth item (phone, cards due) cost one 13 px slot each. (4) It uses no new key to be playable; `H` is only a peek. (5) The ordering is cheap to start: the ribbon with always-visible bars is layout A and can ship first, the on-change rule is a small timer added next. Add **D** (the detail view as a page of the `L` list screen) later, when the occasional things (cards due, packages) need a home; do not build it for this issue.

Calm-tone rules that come with it: no flashing, no sound on low, no red bar until something is genuinely low, low is a colour and a face, never a warning text; the combo shows only while a chain is on and never says it is ending.

### What the pick needs

**Sprites** (all small `icon-*` sprites, not on the 16 px grid, in the warm palette; `art/src/icon-*.sprite`, drawn by the existing pipeline and loaded by name with a text fallback, as `icon-good-hour` is): `icon-sun`, `icon-dusk` (dawn and dusk share it), `icon-moon`, `icon-bolt`, `icon-bolt-low`, `icon-face-happy`, `icon-face-flat`, `icon-face-sad`, `icon-star`, and later `icon-phone` and `icon-plug`. Ten 7 x 7 sprites, about 5 minutes each. If a sprite is missing, the widget falls back to the one-letter label the HUD has today, so nothing breaks.

**Code:**
- `src/render/hud-model.ts` (new, pure): from `Scoreboard`, `ApartmentState` and a small timer table, returns the items with value, level, `changedRecently` and `visible`. Tests: no canvas needed.
- `src/render/hud.ts`: `Hud.update(dt, score, state)` (the bar timers are the Hud's own memory, **not game state**); `draw` becomes `drawOverlay(ctx, model)` plus `drawStrip(ctx, model, size)` sharing one `drawWidget(ctx, item, x, y, scale)`; `drawStopHint` takes its position from the container.
- `src/render/layout.ts`: `HUD_BOX` and `STATUS_BOX` become the two chips (76 x 14 and 84 x 14 including their margin) from one `HUD_BAND` height of 32; export `hudBoxes(mode)` returning `[]` for the strip. `game.ts` and `toasts.ts` read it (the toasts can then start at y 16, inside the free band, if it is wanted).
- `src/game/config.ts`: a `HUD` table: bar reveal seconds (4), change threshold (3), face thresholds (70 and `MOOD.lowBelow`), the chip padding. Rules and numbers stay in data.
- `Controls`/key: `H` peek (hold), one line in the L screen help.
- Tests: the model (rest, change, low, combo active or not, sleep jump), the layout boxes (nothing taller than the band, nothing overlapping the three painting rectangles in the main room), toasts and popups still avoid the chips; the golden frame test is unaffected if the HUD is not in it (check) or re-recorded after looking at it.

### Staged build plan (smallest first)

1. **Stage 1, ribbon with icons and always-on small bars (layout A shape in one row)**: new icons, `HUD_BAND`, chips instead of panels, keep everything else. Fixes the painting overlap. Marc looks.
2. **Stage 2, the model and the reveal rule**: `hud-model.ts`, bars only on change or low, `H` peek, combo only when active, the low icons.
3. **Stage 3, the strip container**: `drawStrip` at 2x into a 320 x 56 canvas, and `hudBoxes('strip')`; the portrait shell (049 stage 2) places it. Needs the 049 shell to exist; until then it can be tried in a test page.
4. **Stage 4, the phone slot**, only if Marc picks "real" in question 3 (section 8), as its own issue.
5. **Stage 5, the detail view (layout D)** as a page of the `L` screen, only when there is something that does not fit in the HUD.

## 8. The phone battery: a real state variable, or a gag?

The facts: the game already has two vars (energy and mood), the phone tasks exist (`doomscroll` mood -8; `tasks-v2.md` plans check phone, text, hum into a phone), and the pillars say no pressure, no scarcity, collecting is a quiet side effect.

| | A. Not in the game | B. A gag | C. A real variable, gentle |
|---|---|---|---|
| What it is | no phone slot | an icon that falls with the clock and is refilled by a plug-in animation; nothing saved, nothing affected | a `battery` var (0 to 100, saved), drained by phone tasks, refilled by a "plug in the phone" task and by sleeping |
| Effect on the player | none | none | only phone tasks: at 0 they say "battery dead", plugging in takes 5 s; below 15 a line of dialog; never blocks anything else |
| Cost | none | small: an icon and a timer, no state vars, no tasks | medium: a state var and `config` (like 038), drains on about 6 tasks, one task, a prop and a sprite (an outlet by the bed or desk), saves, tests, `docs/tasks.md`; about one issue |
| Risk | none | looks like a bug if it never matters | becomes a chore if it blocks (it must not block anything but the phone) |

**Recommendation: C, but not now.** Build the HUD first with the phone slot unused. Then add the battery as a small separate issue with these limits: drains only through phone tasks (doomscroll -15, text -3, check -1, hum -4), never with time; one quick plug-in task and a free full charge on sleeping in bed; at 0 only the phone tasks refuse, with a plain reason, and the plug-in task is right there; no score, no combo and no mood effect from the level itself. That makes the doomscroll joke land (the phone dies mid-scroll, which is a gentle nudge to stop), keeps the "mundane is the joke" tone, and stays pressure-free, because nothing outside the phone ever depends on it. The gag (B) is a fine fallback if Marc does not want a new thing to maintain, but a meter that is never tied to anything tends to read as a bug. Use a phone icon, not a battery shape, and never read the player's **real** phone battery (Safari does not allow it anyway).

## 9. The shell's look (for 049 stage 2, Marc: "surprise me")

Plan to sketch **both** a warm-grey body (the apartment's walls, palette `putty` and `taupe`) and a dark body (`night` and `slate`, which makes the picture pop) as two themes of the same sprites (one palette swap each) in the shell's stage 2, and let Marc pick by looking at both on his iPhone. The HUD strip is ink in both. This costs one extra palette row, not extra art.

## 10. Open questions for Marc (most important first, one at a time)

1. **Is B the pick** (ribbon with icons, a bar only when it changes or is low, `H` to peek), built in stages 1 to 3? Recommend: yes, starting with stage 1 (the always-on small bars) so you can see it on your screen before the reveal rule is added.
2. **Is the top 32 px free band the rule for the HUD** (nothing taller, so nothing ever covers the room)? Recommend: yes; it is free in all three rooms today.
3. **The phone battery: real (C), gag (B) or none?** Recommend: real but gentle, as its own issue after the HUD, and the HUD leaves the slot ready.
4. **In the portrait shell the picture's top 32 px band is empty** (the HUD moved to the strip). Keep it as an ink stripe, keep only the clock and score ribbon there in portrait too, or crop it away on the phone? Recommend: keep it for now and decide when you see the shell on your iPhone; cropping changes the 320 x 192 view and is a 049 decision.
5. **Time as `9:40` with a sun or moon, or keep `9:40 AM`?** Recommend: `9:40` and the icon (no AM or PM): it saves 18 px and the icon says which half of the day.
6. **The peek key: `H`?** Recommend: `H` (free in the code today); on the phone, a tap on the ribbon or the strip does the same.
7. **Is the clock's minute digit too busy?** It changes about twice a second. Recommend: leave it; try updating it every 5 game minutes only if it distracts.
8. **Do you want the detail view (D) at all**, and where? Recommend: later, as a page of the `L` screen, only once cards due or packages need a home.
