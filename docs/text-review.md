# Text review

Every player-visible string in the game as of 2026-10-23, for Marc to mark. Issue 037.

**How to mark:** write `keep`, `soften` or `rewrite` (and a note or a replacement if you have one) in the "mark" column of the task table, or after a dash on the list lines below ("- text - soften"). Nothing is changed until it is marked. Task names and prompts also lose their "the" (Marc's rule: "Write in journal", "Water plant"); that part needs no mark.

Strings added later (mood in 038, the mirror in 041, the gallery view in 040) are not in this list yet.

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
- Header: INSTAGRAM / SPONSORED -
- From: @LITTLEFERNPRINTS -
- Subject or caption: NEW: THE ROBIN PRINT -
- Body: Archival paper. Numbered edition of 200. -
- Body: Free shipping on orders this week. -
- Button: SHOP NOW -
- Look closer: ROBIN PRINT, 8 X 10 IN -
- Look closer: 4.8 stars from 212 reviews. -

**2. Garnet Lane Florals** (email, Gmail; sells `plant-dried`; unsubscribe difficulty 2 of 2; arrives 8 game hours after the order)
- Header: GMAIL / PROMOTIONS -
- From: GARNET LANE FLORALS -
- Subject or caption: Still thinking about it? Your cart is waiting. -
- Body: You left DRIED FLOWERS in your cart. -
- Body: A small bunch that never needs watering. -
- Body: Complete your order today. -
- Button: COMPLETE ORDER -
- Look closer: Dried flower bunch, glass jar. -
- Look closer: $24. Free returns. -

**3. Oakline Home Goods** (social post, Facebook Marketplace; sells `lamp-warm`; unsubscribe difficulty 0 of 2; arrives 24 game hours after the order)
- Header: FACEBOOK MARKETPLACE / OAKLINE HOME GOODS -
- Subject or caption: Table lamp, warm shade - $18 -
- Body: Like new. Works great. Pickup or delivery. -
- Body: Listed 3 days ago. Is this still available? -
- Button: MESSAGE SELLER -
- Look closer: Linen shade, brass base. Bulb included. -
- Look closer: Delivery is $6 within 10 miles. -
- Narrator (instead of the usual): A LISTING HAS APPEARED. -

**4. Northfield Studio** (email, Amazon; sells `art-starry-night`; unsubscribe difficulty 1 of 2; arrives 24 game hours after the order)
- Header: AMAZON / RECOMMENDED -
- From: Amazon.com -
- Subject or caption: Recommended for you: Starry Night print -
- Body: Because you viewed wall art. -
- Body: Northfield Studio. 4.6 stars, 312 ratings. -
- Body: FREE delivery Thursday. -
- Button: VIEW ITEM -
- Look closer: Starry Night, framed, 12 X 16 IN -
- Look closer: In stock. Sold by Northfield Studio. -

**5. Maple Row** (text message, Messages; sells `lamp-stool-lamp`; unsubscribe difficulty 1 of 2; arrives 8 game hours after the order)
- Header: MESSAGES / MAPLE ROW -
- Message: Maple Row: Your stool lamp is back in stock. -
- Body: Limited quantities. Shop before it's gone. -
- Body: Msg & data rates may apply. STOP to opt out. -
- Button: SHOP NOW -
- Look closer: Stool lamp, oak, with shade. -
- Look closer: $39. Ships in 2 days. -

**6. Hollis Candle Co.** (email, Gmail; sells `lamp-candle`; unsubscribe difficulty 1 of 2; arrives 8 game hours after the order)
- Header: GMAIL / PROMOTIONS -
- From: HOLLIS CANDLE CO. -
- Subject or caption: 20% off ends tonight -
- Body: Hand-poured soy candle. 40-hour burn. -
- Body: Use code EVENING20 at checkout. -
- Body: Offer ends at midnight. -
- Button: SHOP THE SALE -
- Look closer: Evening candle, soy wax, 8 OZ. -
- Look closer: $22 $17.60 -

**7. Saltmarsh Prints** (social post, Instagram; sells `art-water-lilies`; unsubscribe difficulty 0 of 2; arrives 12 game hours after the order)
- Header: INSTAGRAM / SPONSORED -
- From: @SALTMARSHPRINTS -
- Subject or caption: Water Lilies -
- Body: Giclee print, matted and ready to hang. -
- Body: Rated 4.9 by 40,000 customers. -
- Button: SHOP NOW -
- Look closer: Water Lilies, 12 X 16 IN -
- Look closer: $48. Free shipping over $35. -

### Narrator and menu lines, by kind of card
| card | menu label for the second choice | narrator when it appears | after Ignore | after an unsubscribe that works | after one that fails | mark |
|---|---|---|---|---|---|---|
| email | UNSUBSCRIBE | A PROMOTIONAL EMAIL HAS APPEARED. | YOU CLOSE THE EMAIL. | YOU HAVE BEEN UNSUBSCRIBED. WE ARE SORRY TO SEE YOU GO. | UNSUBSCRIBE FAILED. PLEASE ALLOW 10 BUSINESS DAYS FOR YOUR REQUEST TO BE PROCESSED. |  |
| social post | HIDE AD | A SPONSORED POST HAS APPEARED. (a listing: A LISTING HAS APPEARED.) | YOU SCROLL PAST IT. | AD HIDDEN. | THANKS FOR YOUR FEEDBACK. YOU MAY STILL SEE THIS AD. |  |
| text message | REPLY STOP | A TEXT MESSAGE HAS ARRIVED. | YOU LEAVE IT UNREAD. | YOU HAVE BEEN UNSUBSCRIBED. | REPLY STOP AGAIN TO CONFIRM. |  |

### Lines for every card
- Menu: IGNORE, LOOK CLOSER, ADD TO CART -
- Extra narrator line at low mood: IT IS HARD TO LOOK AWAY. -
- Extra narrator line at high mood: YOU ARE NOT INTERESTED. -
- You already have the item (the card stays until you close it): YOU ALREADY HAVE ONE. -
- The item is already ordered or waiting at the door: IT IS ALREADY IN YOUR CART. -
- The delivery queue is full: YOUR CART IS FULL. -
- An Ignore that turned into a purchase: YOU TAP IT WITHOUT MEANING TO. ADDED TO CART. -
- After an order: ORDER CONFIRMED. ARRIVES LATER TODAY. (6 game hours or less) / ORDER CONFIRMED. ARRIVES TOMORROW. -
- Under the sender of an email: TO: ME -

### The ad blocker (achievements list, key B)
- Hint line, alone: B: AD BLOCKER OFF   L: CLOSE   SHIFT+R: RESET (and ON) -
- Hint line with the voice key as well (shorter so it fits): B: AD BLOCK OFF  D: VOICE  L: CLOSE  SHIFT+R: RESET -
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
- Choice screen title: Study Spanish
- Choice, first item: Study without a key
- Choice, second item: Enter a sync key
- Choice note (two lines): Without a key, progress is saved / in this browser only.
- Choice hint: Up, Down, E: pick   Esc: back
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
- Pause screen title: PAUSE, with the section line ACHIEVEMENTS n/N beside it (the pill that opens it is PAUSE, not LIST).
- Pause screen buttons (touch): AD BLOCKER: ON / OFF, DIALOG VOICE: <setting>, RESET PROGRESS, CLOSE, PAGE 1/2
- Reset question (touch): RESET ALL PROGRESS? with the buttons YES, RESET and NO
- Pause screen hint (touch): PAD: LOOK   PAUSE: CLOSE
- Stop hint (touch): B TO STOP
- Decor list footer (touch): PAD: LOOK   A: PUT UP   B: BACK
- In-world prompt key cap (touch): A
- Pills while the key screen is up: KEYBOARD and PASTE (in place of CHOICE and SOUND)
- Choice screen hint (touch): TAP, OR PAD AND A: pick   B: back
- Key screen, touch only: Tap the box to type or paste; hint A: ok   B: back
- Card front hint (touch): TAP OR A: flip
- Card buttons (touch): SAY IT (and the voice name in the practice deck)
- Done screen buttons (touch): OTHER KEY, NO KEY (a key holder); USE A KEY (a guest); hint A: leave
- Start again (touch): START AGAIN, then "Erase them and start again?" with YES, ERASE and NO
