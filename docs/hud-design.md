# HUD and status panel space (design note, issue 048)

Status: Marc has picked (layout B, built in stages; section 10). No game code is written yet. It is designed **together with the portrait handheld shell of the mobile note** (issue 049, `docs/mobile.md` section 2.5, which lives on its own branch and is not merged yet), as Marc asked on 2026-10-27: on a phone the picture is on top and a status strip of about 320 x 56 sits in the shell body, so one HUD design has to render into two places: (1) over the 320 x 192 picture on desktop and landscape, in a small corner that does not cover the action, and (2) as a strip that is not part of the picture.

Marc's answers so far (2026-10-27): he has an **iPhone** (Safari, notch and safe-area insets, no vibration, so haptics are out of scope for him); a **small 1.0x to 1.33x portrait picture is fine to start with**; on the shell's look he said "surprise me" (see section 9).

## 1. How the HUD is built today (checked in the code, 2026-10-27)

- `VIEW` is 20 x 12 tiles of 16 px, **320 x 192**. `HUD_BOX` is 152 x 38 at (0, 0); `STATUS_BOX` is 76 x 50 at (244, 0) (`src/render/layout.ts`). `Hud.draw` (`src/render/hud.ts`) paints a 60% ink panel inside each box (a 4 px margin) and draws everything with text labels in the 5 x 7 pixel font.
- Left panel, 144 x 30 at (4, 4): `SCORE` label and the score at 2x, `COMBO` label and `X1.0` at 2x (grey until the multiplier is above 1, then butter with a 46 x 2 bar for the time left, `SCORING.comboWindow` 25 s). Right panel, 68 x 42 at (248, 4): the clock as `9:40 AM`, then `ENERGY` and a 52 x 3 bar (brick below `ENERGY.lowBelow` 25, else leaf), then `MOOD` and a bar (brick below `MOOD.lowBelow` 25, else butter).
- Together the two panels cover 4320 + 2856 = **7176 px, 11.7% of the picture**, and they are labels, not icons.
- Other things that know where the HUD is: `placeLabel` and `fitBox` keep prompts, progress bars and popups out of `HUD_BOX` (`world-ui.ts`); `Game` also passes `STATUS_BOX` to the popup avoid list (`game.ts`); achievement toasts start under `STATUS_BOX` (`toasts.ts`, `STATUS_BOX.y + STATUS_BOX.h + 2` = y 52); `drawStopHint` centres "ESC TO STOP" in the gap between the two boxes. A new layout has to keep those four working (section 7).
- The HUD is drawn after the world and before the activity picture and dialogs, so a full-picture activity or dialog covers it.

### 1.1 Where the picture is empty: the top 32 px

A world smaller than the view is **sat at the bottom** (`camera.ts` `clampY`: "so the strip above it is free for the HUD"). All three rooms are 10 tiles tall or less, so the world starts at y = 32 and the band y 0 to 31 shows only a plain fill (`ink` when the tileset painter is active, otherwise `night`, `game.ts` render):

| Room | World size | Where it is drawn |
|---|---|---|
| main | 19 x 10 tiles = 304 x 160 | x 8 to 312, y 32 to 192 (the top row is the wall row with the paintings) |
| kitchen | 13 x 10 = 208 x 160 | centred, x 56 to 264, y 32 to 192 |
| bath | 9 x 6 = 144 x 96 | centred, y 96 to 192 |

The two panels are taller than that band: the right one reaches y 46 and the left y 34. In the main room the paintings sit on the wall row at map columns 2 to 3 (`pp`), 7 to 8 (`qq`) and 14 to 16 (`uuu`), which is x 40 to 72, 120 to 152 and **232 to 280**, y 32 to 48. So today the status panel (x 248 to 316, y 4 to 46) covers **the right part of the `uuu` painting (x 248 to 280, y 32 to 46), including the mood bar at y 43 to 46**, which is what Marc saw. The left panel nicks the other two paintings by 2 px. (Worked out from `MAIN_MAP` and the camera code, not from a rendered frame.) One character is 8 px in these maps (`=` the panel, `#` wall row, `P` painting, `X` panel over painting, `.` floor):

(A map cell is marked if a panel touches any part of it, so the left panel's 2 px below y 32 shows as a whole `x` cell on the wall row.)

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
| Clock and time of day | `formatClock`; tint keys at 4.5, 6, 7.25, 9.5, 16.5, 18, 19.5, 21, 22.5 | the minute digit changes about twice a second | deciding: good hours (x1.5 points), bedtime (late is 22 to 5); the world's light already hints at it | Yes, but the minutes are the loudest thing on the screen |
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

Legend for all mock crops: `:` the 60% ink panel, `k` ink (bar track), `W` paper text, `G` leaf, `Y` butter, `R` brick, `O` tangerine, `.` the picture behind (in the 1 char = 8 px picture maps: `#` the wall row, `P` a painting, `x` wall row under a panel, `X` a panel over a painting, `=` a panel over the empty band). Crops are 1 char = 1 px at the real size, from the same pixel code as the HUD font (no text shadow drawn, for clarity). Coordinates are in game pixels of the 320 x 192 picture.

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

All items in one row, 11 px tall (y 3 to 14), in two small chips: score and combo left (x 4 to 80), clock and meters right (x 236 to 316 at rest). At rest the energy, mood and phone are **icons only** (the face and bolt themselves are the meter: three faces, bolt normal or low). A 30 x 3 bar slides out beside an icon for about 4 seconds when its value jumps by 3 or more (a task finished, sleep) and stays out, in brick, while the value is low. Hold a key (recommended `H`, free in the code today) to show all bars while held. The left chip is sized for a score of up to **5 digits** (99999) before the score meets the combo text at x 52; a bigger score widens the chip to the right (the model reports the width). Covered: 76 x 11 + 80 x 11 = **1716 px, 2.8%**, all inside y 3 to 14.

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
kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
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

**Sprites** (all small `icon-*` sprites, not on the 16 px grid, in the warm palette; `art/src/icon-*.sprite`, drawn by the existing pipeline and loaded by name with a text fallback, as `icon-good-hour` is): `icon-sun`, `icon-dusk` (dawn and dusk share it), `icon-moon`, `icon-bolt`, `icon-bolt-low`, `icon-face-happy`, `icon-face-flat`, `icon-face-sad`, `icon-star`, and later `icon-phone` and `icon-plug`. Eleven 7 x 7 sprites in all (nine for stages 1 and 2, `icon-phone` and `icon-plug` with the phone slot), about 5 minutes each; the section 4 sheet shows ten of them (no plug yet). If a sprite is missing, the widget falls back to the one-letter label the HUD has today, so nothing breaks.

**Code:**
- `src/render/hud-model.ts` (new, pure): from `Scoreboard`, `ApartmentState` and a small timer table, returns the items with value, level, `changedRecently` and `visible`. Tests: no canvas needed.
- `src/render/hud.ts`: `Hud.update(dt, score, state)` (the bar timers are the Hud's own memory, **not game state**); `draw` becomes `drawOverlay(ctx, model)` plus `drawStrip(ctx, model, size)` sharing one `drawWidget(ctx, item, x, y, scale)`; `drawStopHint` takes its position from the container.
- `src/render/layout.ts`: `HUD_BOX` and `STATUS_BOX` become the two chips from one `HUD_BAND` height of 32: left 76 x 11 (80 x 14 with its margin), right 80 x 11 at rest (84 x 14 with margin). The right chip **grows to 112 x 11 while one bar is out**, so the avoid box that popups, labels and toasts use must be the grown extent, about 116 x 14, not the resting 84 (the model reports the current width; `hudBoxes` returns it); export `hudBoxes(mode)` returning `[]` for the strip. `game.ts` and `toasts.ts` read it (the toasts can then start at y 16, inside the free band, if it is wanted).
- `src/game/config.ts`: a `HUD` table: bar reveal seconds (4), change threshold (3), face thresholds (70 and `MOOD.lowBelow`), the chip padding. Rules and numbers stay in data.
- `Controls`/key: `H` peek (hold), one line in the L screen help.
- Tests: the model (rest, change, low, combo active or not, sleep jump), the layout boxes (nothing taller than the band, nothing overlapping the three painting rectangles in the main room), toasts and popups still avoid the chips; the golden frame test is unaffected if the HUD is not in it (check) or re-recorded after looking at it.

### Staged build plan (smallest first)

1. **Stage 1, ribbon with icons and always-on small bars (layout A shape in one row)**: new icons, `HUD_BAND`, chips instead of panels, keep everything else. Fixes the painting overlap. Marc looks.
2. **Stage 2, the model and the reveal rule**: `hud-model.ts`, bars only on change or low, `H` peek, combo only when active, the low icons.
3. **Stage 3, the strip container**: `drawStrip` at 2x into a 320 x 56 canvas, and `hudBoxes('strip')`; the portrait shell (049 stage 2) places it. Needs the 049 shell to exist; until then it can be tried in a test page.
4. **Stage 4, the phone slot** (section 8: a gag icon and a charge-your-phone task), as its own issue.
5. **Stage 5, the detail view (layout D)** as a page of the `L` screen, only when there is something that does not fit in the HUD.

## 8. The phone battery: decided, a gag plus a charge task

**Marc's answer (2026-10-27): kind of a gag, plus a task to charge the phone; whether it later affects phone tasks stays open.** The note had recommended a real but gentle variable; Marc chose the lighter route, which is the cheaper one and closes nothing.

The facts it rests on: the game has two state vars (energy and mood), the phone tasks exist (`doomscroll` mood -8; the earlier task ideas planned check phone, text, hum into a phone), and the pillars say no pressure, no scarcity, collecting is a quiet side effect.

What it is:
- A **phone icon with a small bar** in the ribbon's fourth slot (and in the strip's second row), shown like the other meters: icon at rest, the bar out for 4 seconds when the level changes or when it is low. It is a phone, not a battery shape, so it is never confused with the player's real phone battery, which the game never reads (Safari does not allow it anyway).
- A **"charge your phone" task** (a plug and an outlet by the bed or desk, `icon-plug`) that fills it in a few seconds.
- **No effect on any other task for now.** It does not block, score or change mood.
- Whether it **drains** (with phone tasks, which fits the doomscroll joke, or with the clock) or only decorates, and whether a dead phone should one day refuse phone tasks, is for the follow-up issue to decide with Marc; the stored level and the slot make either possible later.

Cost: small to medium. A saved `battery` level (0 to 100) so the icon survives a reload (a state var like 038's, but with no effects wired anywhere), one task and its prop and sprite, `icon-phone` and `icon-plug`, one HUD slot, tests, and a line in `docs/tasks.md`. If a pure gag with nothing saved is wanted instead, a cheaper variant is the phone as a **lamp in the shell** (mobile note 2.5.2 and 2.5.5: a body LED or a segment in the label strip), but it would not show on the desktop picture, so it is not recommended.

What the earlier options were, for the record: not in the game at all; a gag with nothing saved (an icon that falls with the clock and refills with an animation, no task); a real variable that drains with phone tasks and refuses them at 0 (about one issue, and a chore risk if it blocks). Marc's pick sits between the last two: a saved level and a task, no effects.

**Update (issue 094, Marc's answers after trying 088):** the battery now drains a little with each completed Doomscroll (6) and slowly with game time (1 per game hour, half that through sleep and naps, so a full phone lasts about four game days, or roughly 48 minutes of play; a game hour is 30 seconds). The phone icon plus bar is replaced by a **horizontal four-segment battery** drawn from rectangles (a 13 x 7 outline with a 1 x 3 nub; segments 2 px wide with 1 px between, one per quarter of charge, rounded up, so any charge lights one). Leaf above 50, tangerine from 20 to 50, brick under 20. A small bolt shows over the segments for 4 seconds after a charge. The slot is 20 px (it was 23), so the narrow view's 8-digit score limit is easier to keep. A percentage readout is not drawn: the pause screen or the future peek key is the better home. Still open and postponed: a dead phone refusing phone tasks or the encounter ads. The unused `icon-phone` and `icon-plug` sprites stay in the art folder.

## 9. The shell's look (for 049 stage 2, Marc: "surprise me")

Plan to sketch **both** a warm-grey body (the apartment's walls, palette `putty` and `taupe`) and a dark body (`night` and `slate`, which makes the picture pop) as two themes of the same sprites (one palette swap each) in the shell's stage 2, and let Marc pick by looking at both on his iPhone. The HUD strip is ink in both. This costs one extra palette row, not extra art.

## 10. Open questions for Marc: answered (2026-10-27)

Asked one at a time, most important first. Each line is the question, the recommendation, and Marc's answer.

1. **Is B the pick** (ribbon, a bar only on change or low, `H` to peek), built in stages? Recommended: yes, starting with the always-on small bars. **Answer: B is the pick, built in stages** (always-on small bars first so he can see it, then the show-on-change rule, then the strip container for the portrait shell).
2. **Is the top 32 px band the rule for the HUD** (nothing taller, so nothing ever covers the room)? Recommended: yes. **Answer: yes.**
3. **The phone battery: real, gag or none?** Recommended: real but gentle, later. **Answer: kind of a gag, plus a charge-your-phone task; effects on phone tasks left open for later** (section 8).
4. **The portrait shell's empty top band** (the HUD moved to the strip): keep, use or crop? Recommended: keep it for now. **Answer: it stays an ink stripe until Marc sees the shell on his iPhone; cropping the 320 x 192 view is a 049 decision.**
5. **Time as `9:40` with an icon, or `9:40 AM`?** Recommended: `9:40` and the icon. **Answer: `9:40` with a sun, dusk or moon icon, no AM/PM.**
6. **The peek key `H`?** Recommended: `H`, and a tap on the phone. **Answer: `H`.**
7. **Is the minute digit too busy?** Recommended: leave it. **Answer: leave it.**
8. **A detail view (D) at all?** Recommended: later, as a page of the `L` screen. **Answer: later, as a page of the `L` screen.**

Nothing is open. The build (stage 1, always-on small bars in the top band) can be written as its own issue.

Review note: after the independent review of 2026-10-27 this file was edited for its eight nits and to record Marc's answers (a docs-only text change, no re-review).
