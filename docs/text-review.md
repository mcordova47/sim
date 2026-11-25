# Text review

Every player-visible string in the game as of 2026-10-23, for Marc to mark. Issue 037.

**How to mark** (one standard format; start `npm run issues:serve` and open **Text review** in its menu: it shows one line at a time and writes the mark into this file for you; writing it by hand works just as well). On a list line, after the text and a dash: `- text - keep`, `- text - soften: note` (the note is optional) or `- text - rewrite: the new text`. In a table, the "mark" column holds `keep`, `soften: note` or `rewrite: the new text`. A bare dash at the end of a line (`- text -`) or an empty cell means "not marked yet". A list line that holds several strings, each followed by a dash, is marked one string at a time: `A. - keep / B. - / C. - rewrite: new`. Keep a note or a replacement on one line (a table note cannot contain a `|`; in a multi-string line, not a ` / `). Nothing is changed in the game until it is marked, and then an agent applies the marks in a batch. Task names and prompts also lose their "the" (Marc's rule: "Write in journal", "Water plant"); that part needs no mark. The list under "State variable meanings" is internal and is not part of the walkthrough.

> **No rush (Marc, 2026-10-29):** new lines pile up in the sections below over time. There is no deadline and nothing waits on them; mark them whenever you feel like it, a few at a time, or never. An occasional friendly reminder is fine.

Strings added later (mood in 038, the mirror in 041, the gallery view in 040) are not in this list yet.

## Pause screen title (issue 116)
The product name is Simagotchi (Marc, 2026-10-29). The pause screen's header used to read "PAUSE  ACHIEVEMENTS 3/26"; it now reads "SIMAGOTCHI  3/26" (title in butter, count in mist). The full old line plus the name would run into the good-hour legend at the right, so the word ACHIEVEMENTS and the word PAUSE are gone from the header; the list below is the achievements and the PAUSE pill/hints still name the screen. Wired in `src/game/achievements/draw.ts`. Marc to mark: keep / rewrite (e.g. "SIMAGOTCHI  ACHIEVEMENTS 3/26" if the legend is moved). Not added: any in-game title such as "Siminal Crossing" (undecided).
- SIMAGOTCHI - keep
- 3/26 - keep

## Side-project picture (issue 101)
"Work on side project" view, the four lines (Marc rewrote the last three on 2026-10-28; the glitch line calls out the deliberate picture glitch: the tiny figure stands on the desk, facing out). Wired in `src/game/side-projects.ts`. Marc to mark: keep / soften / rewrite.
- A small version of this room, on a small screen. Someone is at the desk. - keep
- It looks like the tiny person is... standing on top of the desk? Gotta remember to fix that. - keep
- Their screen shows another little room with another little guy. - keep
- You wonder if you're just a little guy on someone else's screen, and the silly notion gives you a good chuckle. - keep

## PHOTOS page (issue 113c)
The pause-screen page where pictures are added and removed. The first five lines are the design note's (`docs/photo-reel-design.md` section 7); the rest were written with the build. No line mentions resolution, size or pixels (Marc's rule). Wired in `src/game/achievements/photos-draw.ts` and `src/game/reel/photo-add.ts`. Marc to mark: keep / soften / rewrite.
- Page text (one paragraph): Pick some pictures. They will be kept on this device. The originals are not kept. Nothing leaves this device. - keep
- Nothing stored: No pictures yet. The sofa has nothing to scroll. (the sofa task is issue 113d; until it is built the line points at nothing) - keep
- Count: 12 pictures on this device / 1 picture on this device - keep
- Progress: Making picture 3 of 12 - keep
- Added: 12 pictures added. / 1 picture added. / No pictures added. - keep
- Already stored (new): 2 were already here. / 1 was already here. - keep
- Not readable: 2 could not be read. - keep
- Over the cap: Room for 60. The rest stayed where they were. - keep
- Storage trouble (new): This browser could not keep them all. / This browser could not read the pictures. / This browser could not remove them all. - keep
- No storage in this browser: This browser will not keep pictures. - keep
- Buttons: ADD PHOTOS, REMOVE ALL, SURE? REMOVE ALL, BACK. Pause screen: PHOTOS (touch button), O: PHOTOS (desktop hint). - keep
- After REMOVE ALL: The pictures are gone. The originals were never here. - keep
- Sofa task (issue 113d, wired): name and prompt "Scroll through photos"; unmet reason NO PICTURES (never shown to the player in practice: with no pictures the task is not listed). The task has no flavor line. - keep
- Sofa scene (issue 117e, replaces the 113d slideshow and its five captions; pools are `REEL.phoneLines` and `REEL.closeupLines` in `src/game/config.ts`, plain lists, so a "rewrite" or a deletion is a one-line change; no line mentions resolution, size or pixels or claims anything about what a picture shows, and a test checks that). Marc to mark each: keep / soften / rewrite.
  - Fixed phone-view line (one is chosen when the scene starts and shown under the grid for the whole session): You scroll for a while. Why did you open your phone, again? - keep / There is a lot of it, and it is all yours. - / Mostly the same few places. - / You have taken a lot of pictures of this. - / You were there for most of these. - / Nothing here needs an answer. -
  - Close-up caption (one is chosen each time a close-up opens): Ah, memories. - keep / You remember this. Mostly. - / Look at that. - / Good times, probably. - / You were there. - / Was it always like that? - / You could look at this all day. You do not. -
  - Scene chrome: title PHOTOS; hints E: CONTINUE   ESC: LEAVE (wide), buttons CONTINUE and LEAVE (narrow), E: DONE in the close-up (A: DONE on the touch layer). - keep

## Tasks

One row per task that has something to review: its id, name (the menu and the award popup), prompt (the short line at the object), the reasons it can be unmet (the blocked message, which the game does show) and the mark. Tasks that are only plain commands with no blocked message were removed from the table (Marc, 2026-11-21). The one-line flavor jokes the tasks used to carry were never drawn and were dropped (issue 146); the ones marked keep below are parked in `docs/ideas.md`.

Issue 174 (2026-11-24): the word "the" is gone from every task name and prompt and from the swap prompts ("Make bed", "Do dishes", "Change coffee gear"). Rows already marked keep kept their marks, because only the article changed and the meaning did not; the rows that changed are make-bed, open-blinds, close-blinds, sort-records, sort-records-fav, work, drink-coffee, work-sofa, fridge-stare, recycle-boxes, dishes, flatten-boxes and the Takeout line "Eat takeout". Marc: say if any of them now reads badly ("Work from couch", "Stare into fridge" and "Open fridge" are the likeliest).

| id | name | prompt | unmet reasons | mark |
|---|---|---|---|---|
| make-bed | Make bed | Make bed | BED IS MADE | keep |
| open-blinds | Open blinds | Open blinds | BLINDS ARE OPEN | keep |
| close-blinds | Close blinds | Close blinds | BLINDS ARE CLOSED | keep |
| sort-records | Alphabetize records | Alphabetize records | TRY ANOTHER ORDER | keep |
| sort-records-year | Arrange records by year | Records by year | TRY ANOTHER ORDER | keep |
| sort-records-fav | Rank records by favorites | Records by favorites | TRY ANOTHER ORDER | keep |
| sort-records-color | Arrange records by color | Records by color | TRY ANOTHER ORDER | keep |
| work | Answer emails | Work at desk | TOO TIRED TO WORK | keep |
| coffee | Make pour-over coffee | Make coffee | NO CLEAN PLATES; COFFEE IS WAITING | keep |
| drink-coffee | Drink coffee | Drink coffee | NO COFFEE MADE | keep |
| reheat | Reheat leftovers | Reheat leftovers | NO CLEAN PLATES | keep |
| eat-dinner | Eat dinner | Eat dinner | NO CLEAN PLATES | keep |
| work-sofa | Code from couch | Work from couch | TOO TIRED TO WORK | keep |
| nap | Take a nap | Take a nap | NOT SLEEPY ENOUGH | keep |
| work-bed | Work in bed | Work in bed | TOO TIRED TO WORK | keep |
| guitar | Play three chords | Play guitar |  |  |
| fridge-stare | Stare into fridge | Open fridge |  | keep |
| recycle-boxes | Take out recycling | Take out recycling | FLATTEN THE BOXES FIRST, NO BOXES TO TAKE OUT | keep |
| cook | Cook dinner | Cook dinner | NO CLEAN PLATES | keep |
| dishes | Do dishes | Do dishes | NO DIRTY DISHES | keep |
| flatten-boxes | Flatten boxes | Flatten boxes | NO BOXES TO FLATTEN | keep |
| sit | Take a moment | Take a moment |  | keep |
| sleep | Go to sleep | Go to sleep | NOT TIRED YET | keep |
| contemplate | Contemplate | Contemplate |  | keep |

## State variable meanings

- dishes: Dirty dishes in the sink, a count.
- bedMade: 1 if the bed is made, 0 if not.
- energy: How awake you are. Falls with time and work, sleep restores it.
- battery (issue 088): The charge of your phone. Only the charge-your-phone task raises it; nothing drains it and no task depends on it.
- clock: Time of day in hours since midnight (8.5 is 8:30 AM).
- blinds: 1 if the blinds are open, 0 if closed (the one window that has blinds).
- mug: 1 if a full mug of coffee is waiting to be drunk, 0 if not.
- recordSort: Which way the records get sorted next: 0 alphabetical, 1 by year, 2 by favorites, 3 by color, then round to 0.

## Dialogs (contemplate and task dialogs)

- (prompt) Contemplate what? - keep
  - (label) Existence - keep
    - (prompt) Which part? - keep
      - (label) Why anything exists - keep
        - (text) Why is there something rather than nothing? You think about it for a while. The answer is probably the dishes.
      - (label) Why it is like this - keep
        - (text) It could have been otherwise. It could have been worse. It could have been a Tuesday.
      - (label) Never mind - keep
  - (label) The state of democracy - keep
    - (text) You open a tab to check. You open eleven more. By the time you close them it is dark out and nothing is settled.
  - (label) Late stage capitalism - keep
    - (text) You subscribe to a service that helps you cancel your other subscriptions. It is $4.99 a month. You feel nothing.
  - (label) The impermanence of everything - keep
    - (text) The mug will break. The couch will sag. The song you wrote last week will be forgotten, and so will this thought. Still, the coffee was good.
  - (label) Nothing, actually - keep

### contemplate
- (prompt) Contemplate what? - keep
  - (label) Existence - keep
    - (prompt) Which part? - keep
      - (label) Why anything exists - keep
        - (text) Why is there something rather than nothing? You think about it for a while. The answer is probably the dishes.
      - (label) Why it is like this - keep
        - (text) It could have been otherwise. It could have been worse. It could have been a Tuesday.
      - (label) Never mind - keep
  - (label) The state of democracy - keep
    - (text) You open a tab to check. You open eleven more. By the time you close them it is dark out and nothing is settled.
  - (label) Late stage capitalism - keep
    - (text) You subscribe to a service that helps you cancel your other subscriptions. It is $4.99 a month. You feel nothing.
  - (label) The impermanence of everything - keep
    - (text) The mug will break. The couch will sag. The song you wrote last week will be forgotten, and so will this thought. Still, the coffee was good.
  - (label) Nothing, actually - keep

### cutscene record-play

### cutscene admire-art

## Typing text

### Code
- const energy = 0;
- if (coffee) ship();
- while (!done) wait();
- // TODO: sleep
- git commit -m 'fix'
- npm run build
- return null;
- let agents = 4;
- await agent.done();
- console.log('ok');
- if (tired) { nap(); }
- import { luck } from 'x';

### Email
- Per my last email,
- Circling back on this.
- Thanks for your patience!
- Happy to hop on a call.
- Looping in the team.
- Sorry for the delay.
- Please see attached.
- Let me know if that works.
- Following up on my note.
- Just a quick question:
- Hope you had a good weekend!
- Best, Marc

### Mixed
- Re: Re: Re: standup notes
- git commit -m 'reply all'
- Sent from my bed.
- if (inbox) panic();
- Thanks, will look tomorrow.
- npm run build (in bed)
- // TODO: get up
- Quick question for you:

## Ad encounters (issue 043 stage B)

The copy of the ad encounters, in the voice of real marketing (deadpan and sincere: the only joke is that it happens to you as an encounter). All of it lives in `src/game/encounter-ads.ts`, one place, so a change is one edit. Mark each line `keep`, `soften` or `rewrite` (and a replacement) after a dash, like the lists above: "- keep".

**Rules the copy follows:** real giant platforms may be named (Instagram, Gmail, Amazon, Facebook Marketplace) or a plain text message; shops, brands and sellers are invented; no real person; every line at most 46 letters; only characters the pixel font has (lower case is drawn as capitals). The prices are for show: nothing in the game costs anything.

**To check once:** the invented brand names do not point at a real small business: Little Fern Prints, Garnet Lane Florals, Oakline Home Goods, Northfield Studio, Maple Row, Hollis Candle Co., Saltmarsh Prints.

### The seven ads
Each ad: where it appears, the invented brand, the item it sells (an item from the decor catalog, so a purchase turns up at the door like a gift), then the exact text on the card.


**1. Little Fern Prints** (social post, Instagram; sells `art-robin`; unsubscribe difficulty 0 of 2; arrives 12 game hours after the order)
- Header: INSTAGRAM / SPONSORED - keep
- From: @LITTLEFERNPRINTS - keep
- Subject or caption: NEW: THE ROBIN PRINT - keep
- Body: Archival paper. Numbered edition of 200. - keep
- Body: Free shipping on orders this week. - keep
- Button: SHOP NOW - keep
- Look closer: ROBIN PRINT, 8 X 10 IN - keep
- Look closer: 4.8 stars from 212 reviews. - keep

**2. Garnet Lane Florals** (email, Gmail; sells `plant-dried`; unsubscribe difficulty 2 of 2; arrives 8 game hours after the order)
- Header: GMAIL / PROMOTIONS - keep
- From: GARNET LANE FLORALS - keep
- Subject or caption: Still thinking about it? Your cart is waiting. - keep
- Body: You left DRIED FLOWERS in your cart. - keep
- Body: A small bunch that never needs watering. - keep
- Body: Complete your order today. - keep
- Button: COMPLETE ORDER - keep
- Look closer: Dried flower bunch, glass jar. - keep
- Look closer: $24. Free returns. - keep

**3. Oakline Home Goods** (social post, Facebook Marketplace; sells `lamp-warm`; unsubscribe difficulty 0 of 2; arrives 24 game hours after the order)
- Header: FACEBOOK MARKETPLACE / OAKLINE HOME GOODS - keep
- Subject or caption: Table lamp, warm shade - $18 - keep
- Body: Like new. Works great. Pickup or delivery. - keep
- Body: Listed 3 days ago. Is this still available? - keep
- Button: MESSAGE SELLER - keep
- Look closer: Linen shade, brass base. Bulb included. - keep
- Look closer: Delivery is $6 within 10 miles. - keep
- Narrator (instead of the usual): A LISTING HAS APPEARED. - keep

**4. Northfield Studio** (email, Amazon; sells `art-starry-night`; unsubscribe difficulty 1 of 2; arrives 24 game hours after the order)
- Header: AMAZON / RECOMMENDED - keep
- From: Amazon.com - keep
- Subject or caption: Recommended for you: Starry Night print - keep
- Body: Because you viewed wall art. - keep
- Body: Northfield Studio. 4.6 stars, 312 ratings. - keep
- Body: FREE delivery Thursday. - keep
- Button: VIEW ITEM - keep
- Look closer: Starry Night, framed, 12 X 16 IN - keep
- Look closer: In stock. Sold by Northfield Studio. - keep

**5. Maple Row** (text message, Messages; sells `lamp-stool-lamp`; unsubscribe difficulty 1 of 2; arrives 8 game hours after the order)
- Header: MESSAGES / MAPLE ROW - keep
- Message: Maple Row: Your stool lamp is back in stock. - keep
- Body: Limited quantities. Shop before it's gone. - keep
- Body: Msg & data rates may apply. STOP to opt out. - keep
- Button: SHOP NOW - keep
- Look closer: Stool lamp, oak, with shade. - keep
- Look closer: $39. Ships in 2 days. - keep

**6. Hollis Candle Co.** (email, Gmail; sells `lamp-candle`; unsubscribe difficulty 1 of 2; arrives 8 game hours after the order)
- Header: GMAIL / PROMOTIONS - keep
- From: HOLLIS CANDLE CO. - keep
- Subject or caption: 20% off ends tonight - keep
- Body: Hand-poured soy candle. 40-hour burn. - keep
- Body: Use code EVENING20 at checkout. - keep
- Body: Offer ends at midnight. - keep
- Button: SHOP THE SALE - keep
- Look closer: Evening candle, soy wax, 8 OZ. - keep
- Look closer: $22 $17.60 - keep

**7. Saltmarsh Prints** (social post, Instagram; sells `art-water-lilies`; unsubscribe difficulty 0 of 2; arrives 12 game hours after the order)
- Header: INSTAGRAM / SPONSORED - keep
- From: @SALTMARSHPRINTS - keep
- Subject or caption: Water Lilies - keep
- Body: Giclee print, matted and ready to hang. - keep
- Body: Rated 4.9 by 40,000 customers. - keep
- Button: SHOP NOW - keep
- Look closer: Water Lilies, 12 X 16 IN - keep
- Look closer: $48. Free shipping over $35. - keep

### Narrator and menu lines, by kind of card
| card | menu label for the second choice | narrator when it appears | after Ignore | after an unsubscribe that works | after one that fails | mark |
|---|---|---|---|---|---|---|
| email | UNSUBSCRIBE | A PROMOTIONAL EMAIL HAS APPEARED. | YOU CLOSE THE EMAIL. | YOU HAVE BEEN UNSUBSCRIBED. WE ARE SORRY TO SEE YOU GO. | UNSUBSCRIBE FAILED. PLEASE ALLOW 10 BUSINESS DAYS FOR YOUR REQUEST TO BE PROCESSED. | keep |
| social post | HIDE AD | A SPONSORED POST HAS APPEARED. (a listing: A LISTING HAS APPEARED.) | YOU SCROLL PAST IT. | AD HIDDEN. | THANKS FOR YOUR FEEDBACK. YOU MAY STILL SEE THIS AD. | keep |
| text message | REPLY STOP | A TEXT MESSAGE HAS ARRIVED. | YOU LEAVE IT UNREAD. | YOU HAVE BEEN UNSUBSCRIBED. | REPLY STOP AGAIN TO CONFIRM. | keep |

### Lines for every card
- Menu: IGNORE, LOOK CLOSER, ADD TO CART - keep
- Extra narrator line at low mood: IT IS HARD TO LOOK AWAY. - keep
- Extra narrator line at high mood: YOU ARE NOT INTERESTED. - keep
- You already have the item (the card stays until you close it): YOU ALREADY HAVE ONE. - keep
- The item is already ordered or waiting at the door: IT IS ALREADY IN YOUR CART. - keep
- The delivery queue is full: YOUR CART IS FULL. - keep
- An Ignore that turned into a purchase: YOU TAP IT WITHOUT MEANING TO. ADDED TO CART. - keep
- After an order: ORDER CONFIRMED. ARRIVES LATER TODAY. (6 game hours or less) / ORDER CONFIRMED. ARRIVES TOMORROW. - keep
- Under the sender of an email: TO: ME - keep

### The ad blocker (achievements list, key B)
- Hint line, alone: B: AD BLOCKER OFF   L: CLOSE   SHIFT+R: RESET (and ON) - keep
- Hint line with the voice key as well (shorter so it fits): B: AD BLOCK OFF  D: VOICE  L: CLOSE  SHIFT+R: RESET - keep
- Shown for a moment after the key: AD BLOCKER: ON / AD BLOCKER: OFF - keep

## Product-line ads (issue 163)

Shops that sell a kind of thing and show whichever item of that kind the draw gives them (`src/game/encounter-lines.ts`). `{name}` is the item's name in capitals (for example ROBIN PRINT, PEACOAT, MOKA POT). Rules: shops invented and generic, no real brand or platform (the platform line is just MAIL, FEED or MESSAGES); every line at most 46 letters with a 22 letter name; prices only where they cannot clash with an item. Mark each line `keep`, `soften` or `rewrite` after a dash.

**To check once:** the shop names do not point at a real small business: Birchwood Frame Co., Penny Press Gallery, Fernhill Plant Shop, Dimwell Lighting, Linden Row Clothing, Slow Pour Supply, Underfoot Rug Co., Odds and Ends Shop, Reedbed Music.

**Frames** (social; sells art; hide-ad difficulty 0; arrives in 12 hours): FEED / SPONSORED; @BIRCHWOODFRAMES; "New on the wall: {name}"; "Printed on thick paper. Ready to hang."; "Free shipping on orders this week."; SHOP NOW; look closer: "{name}", "Framed, 12 X 16 IN. 4.7 stars."
**Gallery** (email; art; 1; 24 hours): MAIL / PROMOTIONS; PENNY PRESS GALLERY; "This week's pick: {name}"; "A small run, signed on the back."; "Only a few left in this size."; "Order by Friday for free delivery."; VIEW PRINT; look closer: "{name}", "Unframed, 12 X 16 IN. Ships in a tube."
**Plants** (social; plant; 0; 12): FEED / SPONSORED; @FERNHILLPLANTS; "{name} is back in the shop"; "Packed with care. Care card in the box."; "Ships Tuesday, in a box with air holes."; SHOP NOW; look closer: "{name}", "Care card in the box. Free returns."
**Lamps** (text message; lamp; 1; 8): MESSAGES / DIMWELL; "Dimwell: {name} is in stock."; "Bulb included. Returns for 30 days."; "Msg & data rates may apply. STOP to opt out."; SHOP NOW; look closer: "{name}", "Warm light, soft shadows. Ships in 2 days."
**Clothing** (email; outfit; 2; 24): MAIL / PROMOTIONS; LINDEN ROW CLOTHING; "Just in: {name}"; "Soft, sturdy and made to be worn a lot."; "Free returns within 30 days."; "Sizes run true. Mostly."; SHOP NEW; look closer: "{name}", "Machine washable. Ships in 2 days."
**Coffee gear** (email; coffee; 1; 24): MAIL / PROMOTIONS; SLOW POUR SUPPLY; "Morning upgrade: {name}"; "Makes a cup worth getting up for."; "Beans sold separately. Opinions included."; "Free shipping this week."; SHOP BREWERS; look closer: "{name}", "Makes one to four cups. Ships in 2 days."
**Rugs** (email; rug; 1; 24): MAIL / PROMOTIONS; UNDERFOOT RUG CO.; "The {name} is in stock"; "Flat woven. Rolls up for easy storage."; "Ties the room together."; "Free shipping over $35."; SHOP RUGS; look closer: "{name}", "Spot clean only. Ships rolled, in 3 days."
**Trinkets** (social; trinket; 0; 12): FEED / SPONSORED; @ODDSANDENDSSHOP; "{name}. You did not need this."; "Small, strange and good on a shelf."; "Each one is a little different."; SHOP NOW; look closer: "{name}", "About 3 IN tall. Gift wrap on request."
**Instruments** (text message; instrument; 1; 24): MESSAGES / REEDBED; "Reedbed: {name} just came in."; "Come try it. Nobody is watching."; "Msg & data rates may apply. STOP to opt out."; SEE IT; look closer: "{name}", "Tuned and ready. Layaway available."

## Flashcards progress page (issue 082)
Shown at the desk when no cards are left to review. The pixel font is capitals only, so these draw in capitals.
- Title: Study Spanish - keep
- Known: 127 of 1000 words known - keep
- Met: 312 of 1000 words met - keep
- Due now: 12 cards due now. (1 card due now.) - keep
- Nothing due: Nothing is due. That is all for now. - keep
- Next: The next one is due in 5 hours. (under a minute, N minutes, N hours, N days) - keep
- Soon: 9 cards within a day. - keep
- This visit, only if something was answered: This time: 8 got it, 2 again. - keep
- Without figures (the app has not added the function yet, or it could not be read): Nothing is due. Come back later. - keep
- Hint: E: leave - keep

## Flashcards guest mode (issue 089)
The pixel font is capitals only, so these draw in capitals. The first two choice lines are the wording from the design note.
- Choice screen title: Study Spanish - keep
- Choice, first item: Study without a key - keep
- Choice, second item: Enter a sync key - keep
- Choice note (two lines): Without a key, progress is saved / in this browser only. - keep
- Choice hint: Up, Down, E: pick   Esc: back - keep
- Done screen, guest, under the figures: Saved in this browser only. - keep
- Done screen, guest, when storage could not keep answers: Progress was not kept. - keep
- Done screen controls, guest: E: leave   K: use a key - keep
- Done screen controls, key holder: E: leave   K: other key   G: no key - keep
- Blocked storage, top left of every card: NOT SAVED - keep
- Blocked storage, on the front of a card: Progress will not be kept. - keep
- Saved cards refused (same screen for a key holder, without the options): The saved cards could not be read. - keep
- Start again, first: S: start again - keep
- Start again, after S: Erase them and start again? Y: yes - keep
- The game's reset question is unchanged and already says everything: RESET ALL PROGRESS? Y: YES - keep

## Touch layer wording and the pause screen (issue 093)
The pixel font is capitals only, so these draw in capitals. On the touch layer a hint names the buttons (A, B, PAD, PAUSE, CHOICE) instead of keys; on the desktop every line above is unchanged.
- Pause screen title: PAUSE, with the section line ACHIEVEMENTS n/N beside it (the pill that opens it is PAUSE, not LIST). - keep
- Pause screen buttons (touch): AD BLOCKER: ON / OFF, DIALOG VOICE: <setting>, RESET PROGRESS, CLOSE, PAGE 1/2 - keep
- Reset question (touch): RESET ALL PROGRESS? with the buttons YES, RESET and NO - keep
- Pause screen hint (touch): PAD: LOOK   PAUSE: CLOSE - keep
- Stop hint (touch): B TO STOP - keep
- Decor list footer (touch): PAD: LOOK   A: PUT UP   B: BACK - keep
- In-world prompt key cap (touch): A - keep
- Pills while the key screen is up: KEYBOARD and PASTE (in place of CHOICE and SOUND) - keep
- Choice screen hint (touch): TAP, OR PAD AND A: pick   B: back - keep
- Key screen, touch only: Tap the box to type or paste; hint A: ok   B: back - keep
- Card front hint (touch): TAP OR A: flip - keep
- Card buttons (touch): SAY IT (and the voice name in the practice deck) - keep
- Done screen buttons (touch): OTHER KEY, NO KEY (a key holder); USE A KEY (a guest); hint A: leave - keep
- Start again (touch): START AGAIN, then "Erase them and start again?" with YES, ERASE and NO - keep

## Moving a save to another device: the transfer page (issue 102)
The pixel font is capitals only, so these draw in capitals. Opened from the pause screen: the touch button TRANSFER SAVE, or the key T on the desktop (the pause screen shows `T: TRANSFER SAVE` above its hint line when the list leaves the line free).
- Page title: TRANSFER SAVE - keep
- Explanation, five lines: MOVE YOUR SAVE TO ANOTHER BROWSER OR DEVICE. / COPY A CODE OR SAVE A FILE HERE, THEN PASTE / OR OPEN IT THERE. IMPORTING MERGES: IT NEVER / TAKES ANYTHING AWAY. A BROWSER CAN CLEAR A / SAVE, SO KEEP A FILE. - keep
- Buttons (touch) and keys (desktop): COPY CODE (C), PASTE CODE (V, or Ctrl+V), SAVE FILE (F), OPEN FILE (O), RESTORE BEFORE IMPORT (Shift+R), BACK (Esc) - keep
- Restore question: GO BACK TO BEFORE THE LAST IMPORT? with the buttons YES, GO BACK and NO (desktop: the same line then Y: YES) - keep
- Copy: CODE COPIED / COULD NOT COPY. THE CODE IS IN THE CONSOLE. / COULD NOT MAKE A CODE - keep
- File: FILE SAVED / COULD NOT SAVE A FILE / COULD NOT READ THAT FILE - keep
- Paste, when the browser will not give the clipboard: PRESS CTRL+V TO PASTE (touch: COULD NOT READ THE CLIPBOARD. TRY OPEN FILE.) - keep
- Import result: SAVE MERGED / SAVE MERGED. THE TRACK LIST IS FULL. / NOTHING NEW IN THAT SAVE - keep
- Import refused: NOT A SAVE FROM THIS GAME / THAT SAVE IS FROM A NEWER GAME / THAT SAVE COULD NOT BE READ / THAT SAVE IS TOO BIG - keep
- Restore result: BACK TO BEFORE THE LAST IMPORT / NOTHING TO GO BACK TO - keep
- Hint (touch): B: BACK - keep

## Sync page, status and automatic sync (issues 103 and 104)
Capitals only. Nothing animated, no counters, no "ERROR". A failure is a plain line, and the game says it will try again by itself.
- Status line, by state: SYNC: OFF / SYNC: ON / SYNC: WORKING... - keep
- Status, on, after one worked this visit: SYNC: ON. LAST SYNCED JUST NOW (or LAST SYNCED 5 MIN AGO, LAST SYNCED 2 H AGO) - keep
- Status, on, automatic sync switched off: SYNC: ON. AUTOMATIC SYNC IS OFF - keep
- Status, no network or the server is not answering: SYNC: NO CONNECTION. TRYING AGAIN LATER (with automatic sync off: SYNC: NO CONNECTION) - keep
- Status, the server does not know the key (automatic sync stops until you act): SYNC: KEY NOT FOUND. PASTE A NEW KEY - keep
- Status, other: SYNC: UNAVAILABLE / SYNC: UPDATE THE GAME / SYNC: SAVE ON THE SERVER IS UNREADABLE / SYNC: THE SERVER REFUSED THE SAVE - keep
- Button (the key A on a keyboard): AUTO SYNC: ON / AUTO SYNC: OFF - keep
- Message after pressing it: AUTOMATIC SYNC IS ON / AUTOMATIC SYNC IS OFF. SYNC NOW STILL WORKS - keep
- Messages after a manual sync (stage 2): SYNC IS ON / SYNCED / SYNC IS OFF / ONE MOMENT / PAIRED. SYNC IS ON / THAT IS NOT A SYNC KEY OR LINK / SYNC STOPPED. THE SAVED COPY IS DELETED / LINK COPIED - keep
- Questions: STOP SYNCING AND DELETE THE SAVED COPY? / SYNC WITH THE SAVE IN THIS LINK? - keep
- No message at all when a save from another device is picked up (decided: no "picked up where you left off"). - keep

## Browsable inventory: item lines (issue 109a)
Capitals only. One deadpan note and one source per real item, shown in the THINGS page (issue 109b). Marc marks each: keep, soften or rewrite. A new gift gets a line when it is added.
The entry also shows the where-now line (the slot's "where" text, or IN THE INVENTORY) and, for something you can change, CHANGE IT AT THE DINING TABLE (or the STANDING DESK, CUBE BOOKSHELF, LAMP TABLE, or "X OR Y" when two fit).
- Source, starting things: FROM: ALREADY HERE - keep
- Source, everything that arrives: FROM: A PACKAGE (fallbacks if a source is not written: A GIFT, A FIND, A DELIVERY, SOME BROWSING) - keep
- BARN DRAWING: A RUSTIC-LOOKING BARN. YOUR UNCLE PAINTED IT. YOU WONDER WHERE IT IS... - keep
- GOLD ABSTRACT: DEUS EX MESSINA. - keep
- SILKSCREEN: A SILKSCREEN PRINT. NUM. 1/12, WHICH YOU FEEL A STRANGE SENSE OF PRIDE ABOUT. - keep
- SNAKE PLANT: A SNAKE PLANT. IT ASKS FOR VERY LITTLE. - keep
- LAMP: A LAMP. IT'S A GOOD LAMP, YOU THINK. - keep
- CLEAR BINS: YOU GUESS THESE WILL DO AS A PANTRY, FOR NOW. - keep
- ROBIN PRINT: WHERE ARE YOU, ROBIN? - keep
- CONCERT POSTER: A POSTER FROM THAT SHOW YOU JUST WENT TO. - keep
- WARM LAMP: A LAMP, BUT WARMER. - keep
- DRIED FLOWERS: THEY LAST SO LONG IT FEELS ILLEGAL. - keep
- SNOW WAGON: A LANDSCAPE OF YOUR AUNT'S YARD. +5 NOSTALGIA. - keep
- STOOL LAMP: A SMALL LAMP ON A STOOL. A GOOD ARRANGEMENT. - keep
- SERENITY NOW: YOU DON'T MAKE A HABIT OF BUYING JOKE ART, BUT THE ARTIST SEEMED COOL. - keep
- CANOES: JUST A COUPLE CANOES. EMPTY. HOW VERY RIMBAUD. - keep
- CANDLE: THE ORIGINAL LAMP. - keep
- GREAT WAVE: JUST BECAUSE IT'S IN EVERY COLLEGE DORM DOESN'T MAKE IT BAD. - keep
- STARRY NIGHT: NOT YOUR FAVORITE VAN GOGH, BUT THERE IS A REASON IT'S A CLASSIC. - keep
- WATER LILIES: PEOPLE TALK ABOUT CAPTURING A FLEETING MOMENT, BUT YOU JUST THINK IT'S PRETTY. - keep
- SUNFLOWERS: SUNFLOWERS IN A VASE. JUST LOOK AT THOSE BRUSH STROKES. - keep
- POTHOS: ITS LEAVES HAVE STARTED FOR THE FLOOR. YOU ADMIRE THE AMBITION. -
- PAMPAS PLUMES: THEY SHED A LITTLE. THAT IS THE WHOLE COMMITMENT. -
- MONSTERA: THE HOLES ARE ON PURPOSE. YOU CHECKED. -
- LAVENDER BUNDLE: SMELLS LIKE A DRAWER THAT HAS NEVER HAD A BAD DAY. -
- SPIDER PLANT: IT KEEPS MAKING SMALLER ONES. NOBODY ASKED. -
- EUCALYPTUS JAR: STEMS IN A JAR. THE ROOM SMELLS LIKE A SPA THAT GAVE UP. -
- EVERYDAY CLOTHES (a starting thing, issue 152): THE USUAL. IT HAS WORKED SO FAR. -
- CASUAL CLOTHES: SOFT PANTS. THE OTHER PANTS HAVE LOST. -
- GOING OUT CLOTHES: FOR WHEN THE PLAN INVOLVES A DOOR. -
- PAJAMAS: THE DAY ENDS WHEN YOU SAY SO. -
- More clothes (issues 158 and 159; names are plain and say what the thing is, no outfit is for one gender):
  - CARDIGAN AND TEE: IT DOES UP. YOU HAVE DECIDED IT DOESN'T. -
  - GREY HOODIE: A POCKET FOR EVERYTHING EXCEPT THE KEYS. -
  - DENIM JACKET AND TEE: IT GOES WITH EVERYTHING. YOU HAVE CHECKED. -
  - JACKET AND SCARF: A SCARF MAKES ANY ERRAND LOOK PLANNED. -
  - BUTTON-UP SHIRT: EVERY BUTTON IS IN THE RIGHT HOLE. THIS TIME. -
  - BLAZER AND TEE: IT MAKES A TEE LOOK LIKE A DECISION. -
  - PEACOAT: WARM, AND NOBODY ASKS WHERE YOU ARE GOING. -
  - STRIPED PAJAMAS: NOTHING ABOUT THESE IS URGENT. -
  - BATHROBE: THE SHOWER WENT WELL. THE ROBE AGREES. -
- Rugs (issue 166; each FROM: A PACKAGE). Living area:
  - STRIPED RUG: ONE LONG OPINION ABOUT THE FLOOR, IN BLUE AND CREAM. -
  - KILIM RUG: EVERY ZIGZAG WAS A DECISION. YOU RESPECT THE COMMITMENT. -
  - SHAG RUG: YOUR FEET HAVE OPINIONS ABOUT IT. THEY ARE GOOD ONES. -
  - JUTE RUG: IT SCRATCHES A LITTLE. THAT IS ITS HONESTY. -
  - MEDALLION RUG: THE MEDALLION IS CENTERED. YOU MEASURED, THEN FELT BETTER. -
- Rugs, under the bed (each FROM: A PACKAGE):
  - GREEN BED RUG: A SOFT PLACE TO START A HARD DAY, ONE FOOT AT A TIME. -
  - BRAIDED BED RUG: SOMEONE BRAIDED THIS BY HAND. YOU SLEEP NEAR IT. -
  - DIAMOND BED RUG: THE DIAMONDS POINT AT THE BED. THE BED ACCEPTS THIS. -
  - COTTON BED RUG: WASHABLE, SOFT, AND IT NEVER ASKS ABOUT YOUR PLANS. -
  - VINTAGE BED RUG: WORN IN THE RIGHT PLACES. YOU TRUST IT WITH YOUR FEET. -
- Slot names in the swap list header: RUG (where line: ON THE FLOOR) and BED RUG (where line: UNDER THE BED); the swap task names and prompts: Change rug (at the sofa) and Change bed rug (at the bed) (issue 166)
- Slot name in the swap list header: CLOTHES; where line: WORN; the swap task name and prompt: Change clothes (issue 152; it replaces the placeholder "Change the outfit") -

## THINGS page: the silhouette (issue 109c)
Capitals only. Shown for something an ad put in front of you that you did not take (ignored, hidden, or closed). The page draws a flat dark shape of it, and nothing else about it: no name, no source, no place, no hint how to get one, no count. If it later arrives, the shape simply becomes the item. Marc marks each: keep, soften or rewrite.
- Name line: ??? - keep
- Line under it: YOU HAVE SEEN ONE OF THESE. - keep

## PHOTOS page: gallery and delete one (issue 117c)
New lines on the PHOTOS page's grid and close-up. None mentions resolution, size or pixels. Wired in `src/game/achievements/photos-draw.ts` and `feature.ts`. Marc to mark: keep / soften / rewrite.
- After a delete: Picture deleted. Like it never happened. - keep
- A delete that failed: This browser could not remove it. - keep
- Page number (top right, only with more than one page): PAGE 2 OF 10 - keep
- Grid buttons: OPEN (new, beside ADD PHOTOS, REMOVE ALL, BACK) - keep
- Close-up buttons (touch): DELETE / SURE? DELETE (turns orange after the first tap) / BACK, and < > for the other pictures - keep
- Close-up keys line (keyboard): DEL: DELETE  < >: OTHERS  ESC: BACK - keep
- Close-up question (keyboard): DEL: SURE? DELETE  OTHER KEY: CANCEL - keep

## PHOTOS page: the LOOK switch (issue 117d)
New lines for the LOOK switch on the PHOTOS page. None mentions pixels, resolution or the game. Wired in `src/game/achievements/photos-draw.ts` and `feature.ts`. Marc to mark: keep / soften / rewrite.
- Switch label (button, and key S on the keyboard): LOOK: CRISP / LOOK: SOFT / LOOK: CHUNKY (Soft is the default; the order is Crisp, Soft, Chunky) - keep
- Line under the grid (short, one row): New pictures only. - keep
- Line on the empty page (long, wraps): New pictures only. The ones you have keep their look. - keep
- If the browser cannot keep the choice (shown as a message, the choice lasts until the page is closed): This browser will not remember the look. - keep

## Takeout (issue 153)
New lines for ordering and eating takeout. The restaurant and the app are never named, so no brand appears. Wired in `src/game/tasks.ts` and `src/game/game.ts`. Marc to mark: keep / soften / rewrite.
- Task names and prompts: Order takeout / Eat takeout - keep
- Order refused while one is coming: THE TAKEOUT IS ON ITS WAY - 
- Order, Cook, Reheat and Eat dinner refused while the meal is on the table: TAKEOUT IS WAITING - 
- Eat refused with no meal: NO TAKEOUT - 
- Arrival line over the player: THE TAKEOUT HAS ARRIVED. - 
- Opening the box (one page): OPENED: TAKEOUT. IT IS ON THE TABLE. - 
- Opening the box with a plate still on the table (one page; the takeout stays in the box): THERE IS A PLATE ON THE TABLE. THE TAKEOUT CAN WAIT. - 

## Trinkets and display instruments (issue 167)
New items for the desk's right corner (slot `trinket-desk`, swap task "Change the trinket"). Names are plain (the worry doll is WORRY DOLL; its Spanish name is not used until the accent has been seen in the swap list), no brand appears, and every note is deadpan, capitals, 80 characters or fewer. Wired in `src/game/decor-data.ts`. Marc to mark: keep / soften / rewrite.
- Slot name: TRINKET ON THE DESK (where: ON THE DESK) -
- Task: Change the trinket -
- ALEBRIJE: A PAINTED WOODEN FOX WITH OPINIONS. IT KEEPS THEM TO ITSELF. -
- LITTLE TELESCOPE: FOR SMALL STARS. IT IS ALSO GOOD AT THE CEILING. -
- FINGER SKATEBOARD: TWO FINGERS, ONE KICKFLIP, NO WITNESSES. -
- PAINTED GOOSE EGG: SOMEONE PATIENT PAINTED IT. NOTHING IS HATCHING. -
- WORRY DOLL: IT TAKES THE WORRIES. YOU KEEP THE NAP. -
- RACCOON IN A CAN: NOBODY EXPLAINED THE CAN. THE RACCOON SEEMS FINE. -
- HARMONICA: FOR LOOKING AT. THE BLUES CAN WAIT. -
- KALIMBA: EVERY TINE IS A NICE NOTE. IT IS HARD TO PLAY WRONG. -
- JAW HARP: A SPRING IN A FRAME. THE SOUND IS A SMALL BOING. -
- MINI KEYBOARD: TWO OCTAVES. ENOUGH KEYS FOR ONE GOOD IDEA. -

## Coffee gear (issue 168)
New names and notes for the coffee apparatus, and the make-coffee wording that follows them ("Make french press coffee", "Make moka coffee"). No brand is named. Wired in `src/game/decor-data.ts` and `src/game/tasks.ts`. Marc to mark: keep / soften / rewrite.
- Task names and prompts (the word in the middle follows the apparatus): Make pour-over coffee / Make french press coffee / Make drip coffee / Make pod coffee / Make percolator coffee / Make moka coffee / Make briki coffee / Make stovetop coffee (the plain wording) - 
- POUR-OVER CONE: THE SLOW WAY. YOU SAY IT'S FOR THE FLAVOR. - 
- FRENCH PRESS: YOU PRESS IT SLOWLY, LIKE SOMEONE WITH NOTHING SCHEDULED. - 
- DRIP MACHINE: IT DOES THE WAITING FOR YOU. YOU WAIT ANYWAY. - 
- POD MACHINE: EVERY CUP COMES IN A LITTLE CAPSULE. THE CAPSULES ADD UP. - 
- PERCOLATOR: IT BUBBLES IN THE LITTLE GLASS KNOB. WATCHING IS THE POINT. - 
- MOKA POT: IT SPUTTERS WHEN IT'S DONE. YOU HAVE LEARNED TO TRUST THE SPUTTER. - 
- BRIKI: A TINY POT WITH A LONG HANDLE. THE FOAM IS NOT OPTIONAL. - 
- Slot names (swap list): COFFEE ON THE TABLE, COFFEE ON THE STOVE; where: ON THE TABLE, ON THE STOVE; prompt: Change coffee gear - 

## Outfit slots (issue 175)
Lines in the Change clothes list at the bookshelf, in the game's capitals. Marc asked for no explanatory text: the list is only names, WORN and the keys; no text or sound when your clothes change by themselves. Wired in `src/game/outfits.ts` (`OUTFIT_SLOTS`) and `src/game/activities/outfit-slots.ts`. Marc to mark: keep / soften / rewrite.
- List title: CLOTHES - 
- Slot names: EVERYDAY / PAJAMAS / ROBE / GOING OUT - 
- Tag on the slot you have on: WORN - 
- Outfit shown for an empty slot: a dash (-) - 
- Keys line: ARROWS: PICK   E: WEAR   ESC: BACK (touch: PAD: PICK   A: WEAR   B: BACK) - 
