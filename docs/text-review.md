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
"Work on the side project" view, the four lines (Marc rewrote the last three on 2026-10-28; the glitch line calls out the deliberate picture glitch: the tiny figure stands on the desk, facing out). Wired in `src/game/side-projects.ts`. Marc to mark: keep / soften / rewrite.
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
  - Fixed phone-view line (one is chosen when the scene starts and shown under the grid for the whole session): You scroll for a while, because why not. - rewrite: You scroll for a while. Why did you open your phone, again? / There is a lot of it, and it is all yours. - / Mostly the same few places. - / You have taken a lot of pictures of this. - / You were there for most of these. - / Nothing here needs an answer. -
  - Close-up caption (one is chosen each time a close-up opens): Ah, memories. - keep / You remember this. Mostly. - / Look at that. - / Good times, probably. - / You were there. - / Was it always like that? - / You could look at this all day. You do not. -
  - Scene chrome: title PHOTOS; hints E: CONTINUE   ESC: LEAVE (wide), buttons CONTINUE and LEAVE (narrow), E: DONE in the close-up (A: DONE on the touch layer). - keep

## Tasks

| id | name | prompt | flavor | unmet reasons | mark |
|---|---|---|---|---|---|
| make-bed | Make the bed | Make the bed | It will be undone in eleven hours. Worth it. | BED IS MADE |  |
| open-blinds | Open the blinds | Open the blinds | The outside is still there. Good to know. | BLINDS ARE OPEN |  |
| close-blinds | Close the blinds | Close the blinds | Now it is a cave. A cozy one. | BLINDS ARE CLOSED |  |
| water-plant | Water the snake plant | Water the plant | It has survived worse owners. It has not had worse owners. |  |  |
| sort-records | Alphabetize the records | Alphabetize records | By artist. Then by mood. Then by artist again. | TRY ANOTHER ORDER |  |
| sort-records-year | Arrange records by year | Records by year | Oldest first. Then the reissues start a fight. | TRY ANOTHER ORDER |  |
| sort-records-fav | Rank the records by favorites | Records by favorites | Number one changed three times while you did it. | TRY ANOTHER ORDER |  |
| sort-records-color | Arrange records by color | Records by color | It looks great. You can no longer find anything. | TRY ANOTHER ORDER |  |
| work | Answer emails | Work at the desk | Per my last email, you are doing great. | TOO TIRED TO WORK |  |
| tidy-desk | Clean the desk | Clean the desk | It was a pile. It is now several smaller piles. |  |  |
| journal | Write in the journal | Write in the journal | Dear diary, I made coffee. It was a lot. |  |  |
| record-play | Flip the record | Flip the record | Side B is the one you actually like. |  |  |
| coffee | Make pour-over coffee | Make coffee | Weigh, grind, bloom, wait. Peak civilization. | NO CLEAN PLATES; COFFEE IS WAITING |  |
| drink-coffee | Drink the coffee | Drink the coffee | Still hot. Then suddenly not. Peak civilization, brief. | NO COFFEE MADE |  |
| reheat | Reheat leftovers | Reheat leftovers | Thirty seconds more. Thirty seconds more. Cold in the middle. | NO CLEAN PLATES |  |
| eat-dinner | Eat dinner | Eat dinner | Eaten while watching something you have already seen. | NO CLEAN PLATES |  |
| doomscroll | Doomscroll | Doomscroll | One more. Okay, one more. Where did forty minutes go. |  |  |
| work-sofa | Code from the couch | Work from the couch | Your back files a complaint. | TOO TIRED TO WORK |  |
| nap | Take a nap | Take a nap | Twenty minutes, said the plan. The light has moved. | NOT SLEEPY ENOUGH |  |
| admire-art | Admire the art | Admire the art | Nobody asked you to look at it this long. |  |  |
| work-bed | Work in bed | Work in bed | A mistake you make on purpose. | TOO TIRED TO WORK |  |
| guitar | Play three chords | Play guitar | Same three chords. Different, slightly worse, song. |  |  |
| fridge-stare | Stare into the fridge | Open the fridge | Nothing new has appeared since the last check. |  |  |
| humidifier | Refill the humidifier | Refill the humidifier | The air is now 4% less crunchy. |  |  |
| take-trash | Take out the trash | Take out the trash | The bag was not full. You took it out anyway, out of spite. |  |  |
| recycle-boxes | Take out the recycling | Take out the recycling | Down the stairs, into the bin, and the corner of the kitchen is yours again. | FLATTEN THE BOXES FIRST, NO BOXES TO TAKE OUT |  |
| cook | Cook dinner | Cook dinner | Smoke alarm: silent, but judging. | NO CLEAN PLATES |  |
| dishes | Do the dishes | Do the dishes | The pile regrows when you look away. | NO DIRTY DISHES |  |
| flatten-boxes | Flatten the boxes | Flatten boxes | You have been meaning to do this since spring. | NO BOXES TO FLATTEN |  |
| brush-teeth | Brush teeth | Brush teeth | Two full minutes. Honest. |  |  |
| sit | Take a moment | Take a moment | Phone battery: 41%. Phone battery: 33%. |  |  |
| shower | Take a shower | Take a shower | Best ideas of the day, all forgotten by the towel. |  |  |
| sleep | Go to sleep | Go to sleep | Just five minutes. It was not five minutes. | NOT TIRED YET |  |
| contemplate | Contemplate | Contemplate |  |  |  |
| charge-phone (issue 088) | Charge your phone | Charge your phone | One hundred percent. You will not need it. |  |  |

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

- (prompt) Contemplate what?
  - (label) Existence
    - (prompt) Which part?
      - (label) Why anything exists
        - (text) Why is there something rather than nothing? You think about it for a while. The answer is probably the dishes.
      - (label) Why it is like this
        - (text) It could have been otherwise. It could have been worse. It could have been a Tuesday.
      - (label) Never mind
  - (label) The state of democracy
    - (text) You open a tab to check. You open eleven more. By the time you close them it is dark out and nothing is settled.
  - (label) Late stage capitalism
    - (text) You subscribe to a service that helps you cancel your other subscriptions. It is $4.99 a month. You feel nothing.
  - (label) The impermanence of everything
    - (text) The mug will break. The couch will sag. The song you wrote last week will be forgotten, and so will this thought. Still, the coffee was good.
  - (label) Nothing, actually

### contemplate
- (prompt) Contemplate what?
  - (label) Existence
    - (prompt) Which part?
      - (label) Why anything exists
        - (text) Why is there something rather than nothing? You think about it for a while. The answer is probably the dishes.
      - (label) Why it is like this
        - (text) It could have been otherwise. It could have been worse. It could have been a Tuesday.
      - (label) Never mind
  - (label) The state of democracy
    - (text) You open a tab to check. You open eleven more. By the time you close them it is dark out and nothing is settled.
  - (label) Late stage capitalism
    - (text) You subscribe to a service that helps you cancel your other subscriptions. It is $4.99 a month. You feel nothing.
  - (label) The impermanence of everything
    - (text) The mug will break. The couch will sag. The song you wrote last week will be forgotten, and so will this thought. Still, the coffee was good.
  - (label) Nothing, actually

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
- Shown for a moment after the key: AD BLOCKER: ON / AD BLOCKER: OFF -

## Flashcards progress page (issue 082)
Shown at the desk when no cards are left to review. The pixel font is capitals only, so these draw in capitals.
- Title: Study Spanish
- Known: 127 of 1000 words known
- Met: 312 of 1000 words met
- Due now: 12 cards due now. (1 card due now.)
- Nothing due: Nothing is due. That is all for now.
- Next: The next one is due in 5 hours. (under a minute, N minutes, N hours, N days)
- Soon: 9 cards within a day.
- This visit, only if something was answered: This time: 8 got it, 2 again.
- Without figures (the app has not added the function yet, or it could not be read): Nothing is due. Come back later.
- Hint: E: leave

## Flashcards guest mode (issue 089)
The pixel font is capitals only, so these draw in capitals. The first two choice lines are the wording from the design note.
- Choice screen title: Study Spanish - keep
- Choice, first item: Study without a key - keep
- Choice, second item: Enter a sync key - keep
- Choice note (two lines): Without a key, progress is saved / in this browser only. - keep
- Choice hint: Up, Down, E: pick   Esc: back - keep
- Done screen, guest, under the figures: Saved in this browser only.
- Done screen, guest, when storage could not keep answers: Progress was not kept.
- Done screen controls, guest: E: leave   K: use a key
- Done screen controls, key holder: E: leave   K: other key   G: no key
- Blocked storage, top left of every card: NOT SAVED
- Blocked storage, on the front of a card: Progress will not be kept.
- Saved cards refused (same screen for a key holder, without the options): The saved cards could not be read.
- Start again, first: S: start again
- Start again, after S: Erase them and start again? Y: yes
- The game's reset question is unchanged and already says everything: RESET ALL PROGRESS? Y: YES

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
- BARN DRAWING: A BARN. IT HAS BEEN A BARN FOR A WHILE. - rewrite: BARN DRAWING: A RUSTIC-LOOKING BARN. YOUR UNCLE PAINTED IT. YOU WONDER WHERE IT IS...
- GOLD ABSTRACT: GOLD, MOSTLY. IT HAS NEVER EXPLAINED ITSELF. - rewrite: GOLD ABSTRACT: DEUS EX MESSINA.
- SILKSCREEN: A LONG PRINT. IT FILLS ITS WALL. - rewrite: SILKSCREEN: A SILKSCREEN PRINT. NUM. 1/12, WHICH YOU FEEL A STRANGE SENSE OF PRIDE ABOUT.
- SNAKE PLANT: A SNAKE PLANT. IT ASKS FOR VERY LITTLE. - keep
- LAMP: A LAMP. IT DOES THE ONE THING. - rewrite: LAMP: A LAMP. IT'S A GOOD LAMP, YOU THINK.
- CLEAR BINS: CLEAR BINS. YOU CAN SEE WHAT IS IN THEM. - rewrite: CLEAR BINS: YOU GUESS THESE WILL DO AS A PANTRY, FOR NOW.
- ROBIN PRINT: A BIRD ON A BRANCH. IT IS STAYING PUT. - rewrite: ROBIN PRINT: WHERE ARE YOU, ROBIN?
- CONCERT POSTER: A POSTER FOR A SHOW THAT HAPPENED. - rewrite: CONCERT POSTER: A POSTER FROM THAT SHOW YOU JUST WENT TO.
- WARM LAMP: A LAMP, BUT WARMER. - keep
- DRIED FLOWERS: DRIED FLOWERS. THEY ARE DONE, AND THAT IS FINE. - rewrite: DRIED FLOWERS: THEY LAST SO LONG IT FEELS ILLEGAL.
- SNOW WAGON: A WAGON. IT HAS SEEN SOME SNOW. - rewrite: SNOW WAGON: A LANDSCAPE OF YOUR AUNT'S YARD. +5 NOSTALGIA.
- STOOL LAMP: A SMALL LAMP ON A STOOL. A GOOD ARRANGEMENT. - keep
- SERENITY NOW: IT ASKS FOR CALM, NOT VERY CALMLY. - rewrite: SERENITY NOW: YOU DON'T MAKE A HABIT OF BUYING JOKE ART, BUT THE ARTIST SEEMED COOL.
- CANOES: SOME CANOES. NOBODY IS IN A HURRY. - rewrite: CANOES: JUST A COUPLE CANOES. EMPTY. HOW VERY RIMBAUD.
- CANDLE: A CANDLE. IT MOVES A LITTLE, ON ITS OWN. - rewrite: CANDLE: THE ORIGINAL LAMP.
- GREAT WAVE: A BIG WAVE. IT IS STILL ABOUT TO ARRIVE. - rewrite: GREAT WAVE: JUST BECAUSE IT'S IN EVERY COLLEGE DORM DOESN'T MAKE IT BAD.
- STARRY NIGHT: A NIGHT SKY. IT IS QUITE BUSY UP THERE. - rewrite: STARRY NIGHT: NOT YOUR FAVORITE VAN GOGH, BUT THERE IS A REASON IT'S A CLASSIC.
- WATER LILIES: LILIES ON WATER. VERY RESTFUL. - rewrite: WATER LILIES: PEOPLE TALK ABOUT CAPTURING A FLEETING MOMENT, BUT YOU JUST THINK IT'S PRETTY.
- SUNFLOWERS: SUNFLOWERS IN A VASE. THEY ARE HOLDING UP.

## THINGS page: the silhouette (issue 109c)
Capitals only. Shown for something an ad put in front of you that you did not take (ignored, hidden, or closed). The page draws a flat dark shape of it, and nothing else about it: no name, no source, no place, no hint how to get one, no count. If it later arrives, the shape simply becomes the item. Marc marks each: keep, soften or rewrite.
- Name line: ??? - keep
- Line under it: YOU HAVE SEEN ONE OF THESE. - keep

## PHOTOS page: gallery and delete one (issue 117c)
New lines on the PHOTOS page's grid and close-up. None mentions resolution, size or pixels. Wired in `src/game/achievements/photos-draw.ts` and `feature.ts`. Marc to mark: keep / soften / rewrite.
- After a delete: Picture deleted. The original was never here. - rewrite: After a delete: Picture deleted. Like it never happened.
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
