# Random encounters, ad encounters and checkpoint gifts (design note, issue 043)

Status: Marc answered the open questions on 2026-10-27 (section 12). Stage A (the checkpoint source) is built and merged. Stage B (the ad encounters) is built on branch issue/043-stage-b; where it differs from this note, section 13 says how. It sits on top of the delivery mechanism of issue 062 stage 3a (`game.deliveries.deliver(itemId, delayHours)`, the checkpoint list `src/game/delivery-checkpoints.ts`) and the decor inventory of issue 073.

Marc's decisions (2026-10-26) are the starting point, so this note does not reopen them: both pacing sources, in two stages (checkpoints first, then the ad encounters); only new things arrive; encounters on the sofa (doomscroll) and at the desk (emails); the choices Ignore, Unsubscribe, Look closer and Add to cart; unsubscribe can fail; an ad blocker switch in the L screen; real giant platforms by name and invented brands; a short full-screen card, not a battle screen. The ad copy is a draft for the text pass (issue 037).

## 1. The recommendation in one paragraph
**Build both, checkpoints first.** Stage A is the checkpoint source: a calm, guaranteed trickle (the first gift after game day 1, then roughly one every 2 to 3 game days, with three bonus gifts tied to achievements). Stage B is the ad encounters, the occasional extra: about one encounter for every 4 to 5 doomscroll or email tasks, with a cooldown and a daily cap, where "Add to cart" queues the same kind of delivery. Both feed `deliver()` and both obey one rule: **only new things arrive**. Mood only changes how strong the ad is, never what you lose, because you never lose anything.

## 2. The two pacing sources compared
| | Random chance on screens (encounters) | Fixed checkpoints |
|---|---|---|
| Rate | Set by odds, cooldown and a daily cap. Varies from day to day. | Set exactly by the list. Predictable. |
| Feel | A small surprise and a small choice. The joke lives here. | A quiet present. No choice. |
| Risk | Can hand out things too fast or not at all if the odds are off; needs tuning and a cap. | Feels like a schedule if it is the only source. |
| Cost to build | A new activity, three card templates, copy, odds, saved state, an off switch. | A data list and one small change to the milestone type. |
| Needs | Items that exist (art) to advertise. | Items that exist (art) to give. |
| Pressure | None, if nothing is punished and the blocker exists. | None. |

**Mix:** checkpoints guarantee a slow trickle (the game always moves forward gently), encounters add the occasional extra and the character. If only one is built, build the checkpoints: they need no new screen.

Rough numbers for one game day (12 minutes of real time, since the clock runs 2 game minutes a second): a checkpoint gift every 2 to 3 days is one gift per 24 to 36 real minutes. Encounters add at most 2 offers a day, and fewer real offers as you own more, so the whole thing stays well under three arrivals a day even for someone who buys everything.

## 3. Stage A: the checkpoint schedule
The checkpoint source already exists (`CHECKPOINTS`, empty in production). What stage A adds is the real list, plus two small changes to the milestone type (section 9).

Rules:
- **Only new things.** A checkpoint never gives something you own. If its item is already owned (bought from an ad first, for example), it gives **nothing** (Marc, 2026-10-27: duplicates in encounters exist only to slow the trickle, so a checkpoint that finds its item already owned is simply skipped, not replaced by the next item). It is still marked fired.
- Days are game days played (`days`, 24 game hours each, sleeping included). A day gift arrives 2 game hours after the day is reached (a minute of real time), so it turns up while you are still around.
- Achievement gifts arrive 2 game hours after the achievement is unlocked. They are bonus gifts, never a reason to chase the achievement: nothing says so on screen.
- No counter, no "next gift" hint, no list of what is missing.
- Only items that exist or are planned in issue 062 stage 4 are used, in an order that gives a different kind of thing each time (a painting, then a lamp, then a plant, and so on).

### The first ten milestones
Item ids start with their kind (rule from stage 1). "Art needed" is what stage 4 must draw before the checkpoint can go live. `art-robin` and the stool already have a sprite.

| # | When | Item (id, name) | Fits | Art needed |
|---|---|---|---|---|
| 1 | game day 1 | `art-robin` ROBIN PRINT | table wall, desk wall | **None.** The sprite `art-robin` (32x16, Marc's print) exists from issue 074. |
| 2 | game day 3 | `art-concert-poster` CONCERT POSTER | table wall, desk wall | **None.** Redrawn in issue 076 as a dark gig-poster impression (night sky, blush planet, glowing horizon). |
| 3 | game day 5 | `lamp-warm` WARM LAMP | lamp table | **1 new** 16x16 (second lamp, a warm shade; item `glow` as the table lamp) |
| 4 | achievement Green Thumb (water the snake plant 3 times) | `plant-dried` DRIED FLOWERS | shelf plant slot | **1 new** 16x16 (never grows; a plant that needs no water, as the 062 note says) |
| 5 | game day 8 | `art-snow-wagon` SNOW WAGON | table wall, desk wall | **None.** Issue 076, from Marc's winter yard print (32x16). |
| 6 | game day 10 | `lamp-stool-lamp` STOOL LAMP | lamp table | **None.** The sprite `stool-lamp` exists and the TEST item `lamp-test-stool-lamp` already has its glow (radius 24, alpha 0.2). Stage 4 renames the TEST item to a real one. |
| 7 | achievement Desk Job (every task at the desk) | `art-serenity-now` SERENITY NOW | table wall, desk wall | **None.** Issue 076, from Marc's canvas (32x16, tall frame; no text). |
| 8 | game day 13 | `art-canoes` CANOES | table wall, desk wall | **None.** Issue 076, from Marc's painting of two rowboats (32x16, tall frame). |
| 9 | achievement Record Keeper (sort the records all four ways) | `lamp-candle` CANDLE | lamp table | **1 new** 16x16, and the `flicker` option on `glow` from issue 062's candle note (slow, small, never strobing) |
| 10 | game day 16 | `art-great-wave` GREAT WAVE | table wall, desk wall | **None.** Issue 076, an impression of Hokusai's The Great Wave off Kanagawa (public domain, 32x16). |

Every piece of art here is drawn (issues 074 and 076); the new work is the data, the two lamps and plant (items 3, 4, 9, 6 as above), and one engine option (candle flicker). Marc's rule (2026-10-27): every additional artwork is a real thing: his own pieces or a famous public-domain work, and never a painting already on the gallery wall (it must not be in two places). So the bed wall (48x16) has no wide gift yet; `painting-wide` stays there until a wide real piece is drawn. If art is late, cut the list at the last ready item: the list is data.

Order logic: a painting first (the room's biggest visible change and the cheapest), then a different kind each time so the swap list for each slot grows at a steady, small pace. The three achievement gifts are matched to what you did (watering gives a plant, desk work a painting, records a candle) so they read as a little acknowledgement, not a reward. The day gifts land at days 1, 3, 5, 8, 10, 13, 16 (gaps of 2, 2, 3, 2, 3, 3); the achievement gifts come on top when they come.

**After the first ten** (the "later" list, for stage 4 to extend): `art-starry-night` (Van Gogh, 32x16), `art-water-lilies` (Monet, 32x16) and `art-sunflowers` (Van Gogh, 32x16, tall frame), all for the table and desk wall slots, all drawn in issue 076; a trailing plant for a windowsill slot (5 sprites if it grows), the recycling bin (issue 070), a pantry upgrade, the rug if Marc wants it (062 open question 9), the nylon guitar.

Only two narrow wall slots (table, desk) exist today, and this list has seven narrow paintings, so most will sit in the inventory. That is fine for a quiet collection (issue 073's inventory), but see open question 6.

## 4. Stage B: the encounter flow

### Where and when
- **Trigger.** When a **doomscroll** (anywhere it is offered: the sofa, or the bed) or **Answer emails** (`work`, at the desk) task is completed, the game rolls once. Code at the sofa (`work-sofa`) and in bed (`work-bed`) do not roll. Only completed tasks roll: a cancelled or quiet task never does.
- **Chance.** 22 percent per eligible completion (about one in 4.5).
- **Gates**, checked in this order before rolling:
  1. The ad blocker is OFF.
  2. At least game day 2 has been reached (so a fresh game is not ambushed before its first gift).
  3. The cooldown since the last encounter has passed (3 game hours; half that after a failed unsubscribe).
  4. Fewer than 2 encounters have happened this game day (the day is `floor(hours / 24)` of the delivery clock).
  5. Nothing else is open (a dialog, another activity).
- **When it appears.** Right after the task's award, in the same place the player is standing. The clock is held while it is open, like the swap list and the track editor: no pressure while it is up.

### What appears
1. One ad is picked: uniformly from the ad catalog (section 6), preferring not to repeat the last 3 ads shown.
2. **Already-own dismissal.** If the ad's item is owned, or already queued or waiting at the door, there is no choice: the card shows for about 2 seconds, one line says `YOU ALREADY HAVE ONE.` (or `IT IS ALREADY IN YOUR CART.` if it is queued), and it goes away. No delivery, no mood change. It still counts for the cooldown and the daily cap, so the rate stays steady, and as you own more things, fewer encounters offer anything.
3. Otherwise: the card (a full-screen picture with the ad's text), one narrator line in the dialog box, then the menu.

### The standoff
There is no battle, no meter and no loss. The four choices:

| Choice | What happens | Mood |
|---|---|---|
| **Ignore** | You move on. At low mood there is a chance it turns into a purchase (below). | +3 |
| **Unsubscribe** (labelled by card type: `UNSUBSCRIBE`, `HIDE AD`, `REPLY STOP`) | May succeed or fail (below). | +3 on success, 0 on failure |
| **Look closer** | A second page of the same card with two more lines (the price, the rating, the shipping), then the menu again without this choice. It adds to the chance of an impulse buy. | 0 |
| **Add to cart** | Queues the delivery: `deliver(item, delayHours)`. One line says the order is confirmed and when to expect it. The package turns up at the door as in stage 3a. | +2 |
| Escape | Leaves at once. Counts as Ignore with no mood change and no impulse buy. The clock and the room are untouched. | 0 |

**Mood sets the odds, smoothly** (the mood variable runs 0 to 100, starts at 60; doomscrolling takes 8 off it, so a long scroll pushes the odds up a little). There are no bands: both chances are formulas of the current mood, with their numbers in `ENCOUNTERS`.

- **Impulse buy on Ignore** = `clamp((MOOD_REF - mood) / MOOD_REF, 0, 1) * IMPULSE_MAX`, with `MOOD_REF` 60 and `IMPULSE_MAX` 0.40. It is 0 at mood 60 and above, and rises in a straight line as mood falls.
- **Unsubscribe success** = `clamp(lerp(UNSUB_AT_0, UNSUB_AT_100, mood / 100) - 0.10 * persistence, UNSUB_MIN, UNSUB_MAX)`, with `UNSUB_AT_0` 0.50, `UNSUB_AT_100` 0.90, `UNSUB_MIN` 0.05 and `UNSUB_MAX` 0.95. That is `0.5 + 0.004 * mood` before the persistence penalty.

| Mood | Impulse buy on Ignore | Unsubscribe success, persistence 0 / 1 / 2 |
|---|---|---|
| 0 | 40 percent | 50 / 40 / 30 percent |
| 25 | 23.3 percent | 60 / 50 / 40 percent |
| 50 | 6.7 percent | 70 / 60 / 50 percent |
| 60 | 0 | 74 / 64 / 54 percent |
| 100 | 0 | 90 / 80 / 70 percent |

- **Impulse buy:** on Ignore, the chance above, plus 15 points if you used Look closer first (only while mood is under `MOOD_REF`; at 60 or more it stays 0, and the sum is capped at 1). If it fires, the narrator says `YOU TAP IT WITHOUT MEANING TO. ADDED TO CART.` and the delivery is queued as with Add to cart. It is a gift, not a penalty: no mood loss, nothing taken.
- **Unsubscribe success:** the formula above (`persistence` is 0, 1 or 2; a cart-reminder email is 2). On success: a confirmation line and the calm lift. On **failure**: a plain line in the voice of real unsubscribe pages (`UNSUBSCRIBE FAILED. PLEASE ALLOW 10 BUSINESS DAYS FOR YOUR REQUEST TO BE PROCESSED.`), no mood change, and the next encounter comes sooner: its cooldown is halved and its chance is 50 percent for the next roll. That is the whole consequence. The daily cap still holds, so it can never pile up.
- A player with mood under 30 sees a second narrator line (`IT IS HARD TO LOOK AWAY.`); one at 80 or more sees `YOU ARE NOT INTERESTED.` (`toneLow` and `toneHigh` in the config; narration only, no odds change). It changes nothing but the tone, and it tells the player the odds without a number.

### The ad blocker
- A saved switch, shown and changed in the achievements list (L): the key `B` toggles it, and the hint line changes to say which state it is in (mockup in section 8). When it is ON, gate 1 fails and no encounter ever starts. Nothing else changes (checkpoint gifts still arrive).
- Saved with the settings (the `SettingsStore`, like mute), so **resetting progress does not turn it back on**: it is a preference, not progress. Default: OFF (ads allowed).
- It could later be a decor item (an ad blocker you "install") in issue 062 stage 4; the flag would then be set by owning it. Not planned now.

### Everything in one table (config)
All of this lives in `ENCOUNTERS` in `src/game/config.ts`, not in the engine.

| Setting | Value | Meaning |
|---|---|---|
| `tasks` | `["doomscroll", "work"]` | which completed tasks roll |
| `chance` | 0.22 | roll per eligible completion |
| `afterFailChance` | 0.5 | the roll right after a failed unsubscribe |
| `cooldownHours` | 3 | game hours between encounters |
| `afterFailCooldownHours` | 1.5 | the cooldown after a failed unsubscribe |
| `maxPerDay` | 2 | encounters per game day |
| `firstDay` | 2 | no encounters before this game day |
| `moodRef` | 60 | mood at and above which an Ignore never turns into a purchase (`MOOD_REF`) |
| `toneLow` / `toneHigh` | 30 / 80 | mood edges for the extra narrator line (tone only) |
| `impulseMax` | 0.40 | impulse buy chance at mood 0 (`IMPULSE_MAX`); falls in a straight line to 0 at `moodRef` |
| `lookCloserImpulse` | +0.15 | added after Look closer |
| `unsubscribe` | `{ at0: 0.5, at100: 0.9, min: 0.05, max: 0.95 }` | success at mood 0 and 100 (a straight line between), and its clamp |
| `persistencePenalty` | 0.1 per level | taken off success |
| `mood` | `{ ignore: 3, unsubscribe: 3, cart: 2, dismissal: 0 }` | mood changes |
| `delayHours` | per ad, 4 to 12 | arrival of an ad purchase |
| `recent` | 3 | ads not repeated (also the saved `seen` list cap) |
| `maxSeen` | 20 | most ad ids kept in the save |

The checkpoint numbers (days, delay 2 game hours) are in the list itself (`delivery-checkpoints.ts`).

## 5. How it plugs into delivery and the decor inventory
- **Delivery.** An ad purchase is `game.deliveries.deliver(ad.item, ad.delayHours)`, nothing more. It already refuses an owned, queued or waiting item and a full queue, so the encounter checks the same things first (that is what makes the dismissal) and also treats `deliver` returning false as the dismissal. The arrival is the existing line `A PACKAGE HAS ARRIVED.` and the box at the door.
- **Checkpoints** call the same function, and the skip rule (section 3: an owned item gives nothing) is the only new behaviour.
- **Inventory (073).** Everything that arrives is `owned` and either shown or in the inventory. The swap list shows where an item is displayed. Neither stage needs more from 073 than "owned items you are not showing sit in the inventory and can be placed", and **stage A needs 073** so that the first paintings can be put up without losing the old ones.
- **Mood.** Uses the existing mood variable and effects (`State.add`), through the same effects path other tasks use. No new system.
- **Clock.** The encounter and the delivery both use the game clock, so both pause with a dialog and resume after a reload.
- **Escape (issue 046).** The new activity is an Escape table row (cancels at once, pays nothing, no mood, no cooldown for the task; the encounter's own cooldown still applies as an encounter shown), and it is left out of the "every task" achievement like the swap list.

## 6. The ad concepts
Seven concepts, written to sound like real marketing. The voice is the voice of the real thing: subject lines, "limited time", "your cart is waiting", star ratings, "free shipping". The only joke is that it happens to you as an encounter. Nothing winks.

Rules for the copy: platforms are real giant ones (Instagram, Gmail, Amazon, Facebook Marketplace) or a plain text message; the brands, shops and sellers are invented, with generic names, and **must be checked once in the text pass (037) to confirm none points at a real small business**; no real people; every line is at most 46 letters (the card is 288 px wide inside, which is 47 letters in the 6 px font), and only characters the pixel font has (capitals, digits, `. , : ! ? ' ( ) / % $ & @ + -`; lower case is drawn as capitals; I checked each line against `src/render/font.ts`). Prices are for show only: nothing in the game costs anything.

Each ad also has a narrator line, one menu label for the second choice, a "Look closer" page, a confirmation line, a `persistence` (0 to 2) and a delivery delay.

| Card type | Menu label (2nd choice) | Narrator line | Unsubscribe fail line | Confirmation |
|---|---|---|---|---|
| email | `UNSUBSCRIBE` | `A PROMOTIONAL EMAIL HAS APPEARED.` | `UNSUBSCRIBE FAILED. PLEASE ALLOW 10 BUSINESS DAYS FOR YOUR REQUEST TO BE PROCESSED.` | `ORDER CONFIRMED. ARRIVES` + when |
| social | `HIDE AD` | `A SPONSORED POST HAS APPEARED.` (a listing: `A LISTING HAS APPEARED.`) | `THANKS FOR YOUR FEEDBACK. YOU MAY STILL SEE THIS AD.` | `ORDER CONFIRMED. ARRIVES` + when |
| text | `REPLY STOP` | `A TEXT MESSAGE HAS ARRIVED.` | `REPLY STOP AGAIN TO CONFIRM.` | `ORDER CONFIRMED. ARRIVES` + when |

Unsubscribe success lines: email `YOU HAVE BEEN UNSUBSCRIBED. WE ARE SORRY TO SEE YOU GO.`, social `AD HIDDEN.`, text `YOU HAVE BEEN UNSUBSCRIBED.` Ignore lines: email `YOU CLOSE THE EMAIL.`, social `YOU SCROLL PAST IT.`, text `YOU LEAVE IT UNREAD.` The "when" is `LATER TODAY` for a delay of 6 hours or less, otherwise `TOMORROW`.

Each concept below gives the card type, platform, brand, the item it sells, the exact on-card text, the Look closer page and the details.

**1. The Robin Print** (social post)
- Platform: Instagram. Brand: Little Fern Prints. Item: `art-robin`. Persistence 0, delay 12 hours.
- Header: `@LITTLEFERNPRINTS` and `SPONSORED`
- Headline: `NEW: THE ROBIN PRINT`
- Body: `Archival paper. Numbered edition of 200.` / `Free shipping on orders this week.`
- Card button: `SHOP NOW`
- Look closer: `ROBIN PRINT, 8 X 10 IN` / `4.8 stars from 212 reviews.`

**2. Dried flowers** (email)
- Platform: Gmail. Brand: Garnet Lane Florals. Item: `plant-dried`. Persistence 2 (a cart reminder keeps coming), delay 8.
- From: `GARNET LANE FLORALS`
- Subject: `Still thinking about it? Your cart is waiting.`
- Body: `You left DRIED FLOWERS in your cart.` / `A small bunch that never needs watering.` / `Complete your order today.`
- Card button: `COMPLETE ORDER`
- Look closer: `Dried flower bunch, glass jar.` / `$24. Free returns.`

**3. Warm table lamp** (social post, a listing)
- Platform: Facebook Marketplace. Seller brand: Oakline Home Goods. Item: `lamp-warm`. Persistence 0, delay 24.
- Header: `FACEBOOK MARKETPLACE` and `OAKLINE HOME GOODS`
- Headline: `Table lamp, warm shade - $18`
- Body: `Like new. Works great. Pickup or delivery.` / `Listed 3 days ago. Is this still available?`
- Card button: `MESSAGE SELLER`
- Look closer: `Linen shade, brass base. Bulb included.` / `Delivery is $6 within 10 miles.`

**4. Starry Night print** (email)
- Platform: Amazon. Brand: Northfield Studio. Item: `art-starry-night`. Persistence 1, delay 24.
- From: `Amazon.com` (the card header says `AMAZON`)
- Subject: `Recommended for you: Starry Night print`
- Body: `Because you viewed wall art.` / `Northfield Studio. 4.6 stars, 312 ratings.` / `FREE delivery Thursday.`
- Card button: `VIEW ITEM`
- Look closer: `Starry Night, framed, 12 X 16 IN` / `In stock. Sold by Northfield Studio.`

**5. Stool lamp** (text message)
- Platform: a text message (card header `MESSAGES`, sender `MAPLE ROW`). Brand: Maple Row. Item: `lamp-stool-lamp`. Persistence 1, delay 8.
- Message: `Maple Row: Your stool lamp is back in stock.` / `Limited quantities. Shop before it's gone.` / `Msg & data rates may apply. STOP to opt out.`
- Card button: `SHOP NOW`
- Look closer: `Stool lamp, oak, with shade.` / `$39. Ships in 2 days.`

**6. The evening candle** (email)
- Platform: Gmail. Brand: Hollis Candle Co. Item: `lamp-candle`. Persistence 1, delay 8.
- From: `HOLLIS CANDLE CO.`
- Subject: `20% off ends tonight`
- Body: `Hand-poured soy candle. 40-hour burn.` / `Use code EVENING20 at checkout.` / `Offer ends at midnight.`
- Card button: `SHOP THE SALE`
- Look closer: `Evening candle, soy wax, 8 OZ.` / `$22 $17.60`

**7. Water Lilies** (social post)
- Platform: Instagram. Brand: Saltmarsh Prints. Item: `art-water-lilies`. Persistence 0, delay 12.
- Header: `@SALTMARSHPRINTS` and `SPONSORED`
- Headline: `Water Lilies`
- Body: `Giclee print, matted and ready to hang.` / `Rated 4.9 by 40,000 customers.`
- Card button: `SHOP NOW`
- Look closer: `Water Lilies, 12 X 16 IN` / `$48. Free shipping over $35.`

The pool is the items that have art, so the pool grows as stage 4 lands. An ad can be written for any item once it exists; a catalog of 7 to 12 ads is enough, because owning an item turns its ad into a dismissal.

## 7. The card art
- **One template per card type, text drawn by code.** Three full-screen 320x192 pictures, palette only, in `art/src` like the other `view-` pictures: `view-ad-email` (a mail client: a header bar and a pale page), `view-ad-social` (a post frame with a picture area), `view-ad-text` (a message bubble on a dark screen). The listing and the sponsored post share the social template. The text in the mockups (platform, sender, subject, body, button) is drawn by the new activity in the pixel font from the ad data, so all the copy sits in one data file and the text pass edits one place.
- **The product picture is the item's own sprite**, drawn scaled 3x with smoothing off into the picture area (a 16x16 item becomes 48x48, a 32x16 painting becomes 96x48). That needs no per-ad art at all, and the picture is always what you get. The zoom step already draws scaled windows with whole-number scales, so the drawing exists; confirm in stage B.
- So the art budget for stage B is **three template pictures** (and for a placeholder the existing `view` fallback, a labelled panel, until then).
- The existing `view` cutscene step cannot draw text over a picture, so this is a dedicated activity (`encounter`), like `swap-decor` and `make-track`, not a cutscene. It reuses the dialog box and the choice menu code for the narrator line and the four choices.

## 8. Mockups at 320x192
One character is 6 px wide and 8 px tall (the pixel font's advance and line), so the mock is 53 columns by 24 rows and the widths are true to scale. The dialog box and the menu use the real layout rules (`textBoxRect`, `menuBoxRect`): the dialog box is 37 px tall at the bottom, the menu sits above it at the right. The picture area is a stand-in for the item sprite at 3x.

An email card with the menu:
```
+-----------------------------------------------------+
|==GMAIL=============================PROMOTIONS=======|
|                                                     |
|  HOLLIS CANDLE CO.                                  |
|  TO: ME                                             |
|                                                     |
|  20% OFF ENDS TONIGHT                               |
|  -------------------------------------------------  |
|  HAND-POURED SOY CANDLE. 40-HOUR BURN.              |
|  USE CODE EVENING20 AT CHECKOUT.                    |
|  OFFER ENDS AT MIDNIGHT.                            |
|                                                     |
|  +---------------+   [ SHOP THE SALE ]              |
|  |               |                                  |
|  | (CANDLE SPRITE|                   +-------------+|
|  |  DRAWN AT 3X) |                   |> IGNORE     ||
|  |               |                   |  UNSUBSCRIBE||
|  |               |                   |  LOOK CLOSER||
|  +---------------+                   |  ADD TO CART||
|                                      +-------------+|
| +-------------------------------------------------+ |
| | A PROMOTIONAL EMAIL HAS APPEARED.               | |
| | IT IS HARD TO LOOK AWAY.                        | |
| |                                                 | |
| +-------------------------------------------------+ |
+-----------------------------------------------------+
```

A social post (Instagram) card:
```
+-----------------------------------------------------+
|==INSTAGRAM===========================SPONSORED======|
|                                                     |
|  @LITTLEFERNPRINTS                                  |
|                                                     |
|  +-----------------------+  NEW: THE ROBIN PRINT    |
|  |                       |  ARCHIVAL PAPER.         |
|  | (ROBIN PRINT SPRITE   |  NUMBERED EDITION        |
|  |  DRAWN AT 3X)         |  OF 200.                 |
|  |                       |                          |
|  +-----------------------+  [ SHOP NOW ]            |
|                                                     |
|  FREE SHIPPING ON ORDERS THIS WEEK.                 |
|                                                     |
|                                      +-------------+|
|                                      |> IGNORE     ||
|                                      |  HIDE AD    ||
|                                      |  LOOK CLOSER||
|                                      |  ADD TO CART||
|                                      +-------------+|
| +-------------------------------------------------+ |
| | A SPONSORED POST HAS APPEARED.                  | |
| |                                                 | |
| |                                                 | |
| +-------------------------------------------------+ |
+-----------------------------------------------------+
```
(The mock wraps the body in the narrow right column; the real layout may instead put the body under the picture. A layout detail for stage B.)

A text message card:
```
+-----------------------------------------------------+
|==MESSAGES==========================MAPLE ROW========|
|                                                     |
|  +---------------------------------+                |
|  | MAPLE ROW: YOUR STOOL LAMP IS   |                |
|  | BACK IN STOCK. LIMITED          |                |
|  | QUANTITIES. SHOP BEFORE IT'S    |                |
|  | GONE.                           |                |
|  |                                 |                |
|  | MSG & DATA RATES MAY APPLY.     |                |
|  | REPLY STOP TO OPT OUT.          |                |
|  +---------------------------------+                |
|                                                     |
|    [ SHOP NOW ]                                     |
|                                      +-------------+|
|                                      |> IGNORE     ||
|                                      |  REPLY STOP ||
|                                      |  LOOK CLOSER||
|                                      |  ADD TO CART||
|                                      +-------------+|
| +-------------------------------------------------+ |
| | A TEXT MESSAGE HAS ARRIVED.                     | |
| |                                                 | |
| |                                                 | |
| +-------------------------------------------------+ |
+-----------------------------------------------------+
```
(The mock wraps the bubble at 33 letters and shortens the last line; the real wrap is by pixel width, and the real copy is in concept 5.)

After a failed unsubscribe (the card stays, the menu is gone, the dialog box speaks):
```
+-----------------------------------------------------+
|==GMAIL=============================PROMOTIONS=======|
|                                                     |
|  HOLLIS CANDLE CO.                                  |
|                                                     |
|                                                     |
|  20% OFF ENDS TONIGHT                               |
|                                                     |
|        ...                                          |
| +-------------------------------------------------+ |
| | UNSUBSCRIBE FAILED. PLEASE ALLOW 10 BUSINESS    | |
| | DAYS FOR YOUR REQUEST TO BE PROCESSED.          | |
| |                                                 | |
| +-------------------------------------------------+ |
+-----------------------------------------------------+
```

The menu is the existing choice menu: the cursor `>`, Up and Down to move, E to choose, Escape to leave. It is 86 px wide (the widest label, `LOOK CLOSER` or `ADD TO CART`, is 11 letters), 46 px tall for four choices, and sits above the dialog box at the right, so it never covers the dialog or the left of the card. The card keeps its content above y 100 or to the left of x 230.

The L screen with the ad blocker switch. The hint line is the only place with free room, so it gains the switch and drops `ARROWS: LOOK` (the arrows are obvious in the list):
```
ARROWS: LOOK   L: CLOSE   SHIFT+R: RESET       today
B: AD BLOCKER OFF   L: CLOSE   SHIFT+R: RESET  with the switch off
B: AD BLOCKER ON    L: CLOSE   SHIFT+R: RESET  with the switch on
```
The new line is 44 letters, 263 px, so it fits the 320 px screen centred. Pressing B also shows, for a moment, `AD BLOCKER: ON` in the existing message slot (the line the reset question uses).

## 9. The data model
All new text and numbers in data and config files.

**Files**
- `src/game/config.ts`: the `ENCOUNTERS` table from section 4.
- `src/game/encounter-ads.ts` (new): the ad catalog, and **all the card text** (one place for the text pass).
- `src/game/delivery-checkpoints.ts`: the real milestone list (section 3).
- `src/game/encounters.ts` (new): the pure logic with no drawing: roll, gates, pick an ad, resolve a choice, saved state. Takes the random function, the clock hours, the mood and the owned and queued checks as inputs, so it tests without a game.
- `src/game/activities/encounter.ts` (new): the full-screen activity that draws the card and runs the menu.
- `art/src/view-ad-email.sprite`, `view-ad-social.sprite`, `view-ad-text.sprite`: the templates.

**The ad catalog**
```ts
interface Ad {
  id: string;                 // "ad-candle"
  card: "email" | "social" | "text";
  platform: string;           // "GMAIL", "INSTAGRAM", "AMAZON", "FACEBOOK MARKETPLACE", "MESSAGES"
  brand: string;              // the invented name, for the sender or header
  item: string;               // a decor item id the ad sells
  from?: string;              // the sender or the handle line
  headline: string;           // the subject or the caption
  body: string[];             // two or three lines
  button: string;             // the button drawn on the card
  closer: string[];           // the Look closer lines (two)
  persistence: 0 | 1 | 2;     // how hard it is to unsubscribe
  delayHours: number;         // 4 to 12 (an ad purchase)
}
```
A startup check (a test) runs over the catalog: unique ids, the item exists, every line is at most 46 letters and uses only font characters, at most 3 body lines. An ad whose item has no sprite yet is not offered.

**Checkpoints**: the milestone type changes in two small ways (both in stage A):
```ts
interface Milestone {
  id: string;
  stat?: "points" | "days" | "tasks";   // as today
  achievement?: string;                  // new: fires when this achievement is unlocked (instead of a stat)
  atLeast?: number;                      // used with stat
  item: string | string[];               // new: a list is "the first one you do not own"
  delayHours: number;
}
```
The achievements feature already knows when an achievement unlocks, so it calls `deliveries.check` with it, as it already does for stats.

**Saved state**
- In the progress save, as one optional field like `decor` and `deliveries` (no version bump):
  ```
  "encounters": { "last": 61.5, "day": 2, "today": 1, "soon": false, "seen": ["ad-candle", "ad-robin"] }
  ```
  `last` is the game-hours total of the last encounter (the delivery clock, which is already saved and monotonic), `day` and `today` count the encounters in the current game day, `soon` is the after-a-failed-unsubscribe flag, `seen` is the last ads shown.
- **Milestones fired** are already saved in `deliveries.fired`; nothing new.
- **The ad blocker** is `adBlocker: boolean` in the settings store (not in progress), so a reset keeps it.
- **Tolerant** like the others: `parseEncounters` never throws; a bad shape, a negative or non-finite number, a repeated or over-long id is dropped; `seen` is cut to `maxSeen`; a `last` in the future of the clock is treated as the clock (no one is locked out by a bad save); an unknown ad id in `seen` is dropped; an old save with no field means a fresh start (no cooldown, `today` 0); `__proto__`-style ids are dropped.
- Resetting progress resets `encounters` (the cooldown and the seen list) and the fired milestones; it does not change the ad blocker.

## 10. Staged build plan

**Stage A: the checkpoint source.** Depends on 073 (inventory, swap rule) and on stage 4 art for each item.
- Add `item: string | string[]` and `achievement` to the milestone type, the achievements feature call, the skip rule, tests.
- Add the real items to `decor-data.ts` with their art, in the order of the list, as the art is ready (each line is a milestone and an item together, so no milestone ever names an item that does not exist; a test checks it, closing the note from the 062 review).
- Fill `CHECKPOINTS` with the first ten. Keep `DEV_CHECKPOINTS` and `?deliver=` until the TEST items go.
- Tests: each milestone fires once, in order, at its day or achievement; a checkpoint whose item is already owned gives nothing and is marked fired; nothing fires twice after a reload; the production list names only existing items; the order of gifts across 20 simulated days matches the schedule.

**Stage B: the encounters.**
- B1, the logic and the data (`encounters.ts`, `encounter-ads.ts`, `ENCOUNTERS`, saved state), with all the tests below. No screen yet.
- B2, the card: three templates, the `encounter` activity, the menu and lines, the Escape row. Look at it at 1x and 3x in the dev server for each card type.
- B3, the hook: roll after a completed doomscroll or `work` task, the clock held while open; the ad blocker key `B` in the L screen and the settings store.
- B4, the text pass (037) and a dev shortcut `?encounter=ad-candle` (dev server only) to show one ad.

**Tests (stage B)** with a fake random and a fake clock:
- The rate: over many seeded rolls the encounter rate is near `chance` for eligible tasks and zero for the others (`work-sofa`, a cancelled task); the cooldown blocks an encounter inside 3 game hours and allows one after; the daily cap of 2 holds across a day boundary and a sleep skip; `firstDay` holds.
- The already-own card: an owned item and a queued item give no menu, no delivery and no mood change, stay until closed (E or Escape), and still count for the cooldown.
- Unsubscribe: the success chance at mood 0, 25, 50, 60 and 100 for persistence 0, 1 and 2 (the values in the section 4 table, and the 5 and 95 percent clamps), with a seeded random checked on both sides of each chance; a failed unsubscribe halves the cooldown and sets the next chance, and the cap still holds; persistence lowers the odds.
- Mood: the impulse chance at mood 0, 25, 50, 60 and 100 (40, 23.3, 6.7, 0 and 0 percent) and over many seeded rolls the rate lands within tolerance of each; it is exactly 0 at 60 and above even after Look closer; the chance falls smoothly (never rises as mood rises); Look closer raises it below 60; Look closer raises the impulse chance; Add to cart calls `deliver` once and a full queue or refused delivery shows a dismissal, not an error.
- The ad blocker: ON means no roll and no state change; it survives a progress reset; the L key toggles and saves; the hint line changes.
- Saves: `parseEncounters` with bad shapes, round trip, a future `last`, an old save.
- The catalog check from section 9, and Escape from every moment (card, menu, Look closer, the dismissal) leaves the clock, the lock and the room clean.
- `npm test` and `npm run build` pass.

## 11. Recommendation (what I would build)
- **Both, in two stages**: checkpoints first, then encounters.
- **Checkpoints:** the ten-item list above, with an owned item skipped (no replacement) and three achievement bonus gifts.
- **Encounters:** doomscroll and Answer emails, 22 percent, 3 game hour cooldown, 2 a day, from game day 2; the four choices, mood as the odds, impulse buys on Ignore that grow smoothly as mood falls (40 percent at mood 0, none from 60), Unsubscribe that can fail and brings the next ad sooner, nothing punished.
- **Look:** three card templates and the item's own sprite as the product picture, so no per-ad art.
- **The ad blocker** in L on the key B, kept across a reset.

## 12. Open questions for Marc: answered (2026-10-27)
Marc went with every recommendation. The decisions:
1. **Pacing numbers:** as written (checkpoints at game days 1, 3, 5, 8, 10, 13, 16, plus three achievement gifts).
2. **A checkpoint item already bought:** give **nothing** (changed by Marc, 2026-10-27: duplicates in encounters are there only to slow the trickle, so a checkpoint whose item was already bought is skipped, and the next item is not given in its place).
3. **Menu labels:** by card type (`UNSUBSCRIBE`, `HIDE AD`, `REPLY STOP`).
4. **Impulse buys:** yes, but **continuous in mood, not bands**: the chance rises smoothly as mood falls (`clamp((60 - mood) / 60, 0, 1) * 0.40`), and Unsubscribe success is a straight line from 50 percent at mood 0 to 90 percent at mood 100, minus 10 points per persistence level, clamped 5 to 95 percent. All numbers are in the `ENCOUNTERS` table.
5. **Mood numbers:** fine (Ignore +3, Unsubscribe +3, Add to cart +2, failure 0, dismissal 0).
6. **Narrow wall pieces:** add one more slot later (not in stage A).
7. **First encounter day:** game day 2.
8. **An unopened package:** does not turn other ads into dismissals (only an ad for the item that is itself queued or waiting).
9. **Ad blocker:** stored in the settings (a progress reset keeps it), key `B`.
10. **Brand names:** check them in the text pass (issue 037).
11. **Prices on the cards:** keep the dollar prices.
12. **Package-tracking card ("Your order is on its way"):** not planned now; a possible later card type. Marc (2026-10-27): when mail becomes a thing in the game, it could be another **source of encounters** (junk mail, flyers, a bill with an offer inside), with the same standoff.

## 13. What stage B built, and where it differs from the note
- **Files:** `ENCOUNTERS` in `src/game/config.ts`; `src/game/encounter-ads.ts` (the seven ads and every word); `src/game/encounters.ts` (the pure logic and the saved field); `src/game/activities/encounter.ts` (the activity); `src/render/encounter-card.ts` (the card layout and drawing); the three templates `art/src/view-ad-email.sprite`, `view-ad-social.sprite`, `view-ad-text.sprite`. The copy for the text pass is in `docs/text-review.md`.
- **How it starts.** After a task completes (`Game`'s completion hook), `Encounters.roll` checks the gates in the note's order and rolls. If it hits, the game starts the encounter activity through `InteractionSystem.begin` as a stand-in task (`id: "encounter"`, in no room, pays nothing, always ends quietly). The encounter is not offered by any object, is not in "every task", and has no points and no cooldown of its own. The activity gets everything it needs (owned, queued, deliver, mood, random) as a small `EncounterDeps` object, so it tests without a game, and `ActivityHost` is unchanged.
- **Choices** use the ordinary dialog menu: the narrator line is the menu's prompt, so the box and the menu show together as in the mockups. After Look closer the card shows the two details lines in place of the body and the menu comes back without that choice (no prompt box).
- **The failed-unsubscribe flag (`soon`)** halves the cooldown for the next encounter and sets the chance to 50 percent for the next roll made; making that roll (a hit or a miss) uses the flag up. The daily cap still holds.
- **Game day** for `firstDay` and the daily cap is `floor(hours / 24)` of the delivery clock, counted like the checkpoint days, so `firstDay: 2` means two game days (48 game hours) have been played. A `last` from the future of the clock is treated as the clock once, so a damaged save cannot lock anyone out.
- **The ad blocker** is `adBlocker` in the sound settings store (the only settings store; the sound feature loads and saves it and hands it to the game as `game.adBlockerOn` and `game.setAdBlocker`). Key `B` in the L screen. A progress reset keeps it. The hint line shows the state; with the voice key as well the line is too long, so it reads `B: AD BLOCK OFF  D: VOICE  L: CLOSE  SHIFT+R: RESET` (shorter name, tighter gaps).
- **Dev shortcut:** `?encounter=ad-candle` (any ad id, or `random`) shows that encounter in the dev server; it ignores the gates and does not count for them. The built game ignores it. Since issue 080 it waits for the first key press (a browser keeps audio locked until then, so the entrance sound would be silent on load): `PRESS ANY KEY` shows at the foot of the screen, the sound feature's key listener unlocks audio, then the encounter starts and that key does nothing else. Add `&again=1` (`/?encounter=ad-candle&again=1`) to wait for another key press after each encounter ends, to replay the entrance with no reload. A mouse click does not unlock audio in this game, so only keys start it.
- **Not built:** a mood-lift sound or other effect for the encounter (the existing task start and menu sounds play), an ad blocker as a decor item, mail as a source of encounters (open question 12).
- **Entrance and exit (issue 080).** The card comes in like a battle: a short buzz (a one-pixel shake), two flashes, then eight alternating bars slide across and part to show the card (48 frames, 0.8 s), with a battle-start sound (below). E skips it after 6 frames; the menu opens when it ends. After the last line a quicker wipe (12 frames) takes it back to the room. Escape ends it at once at every moment, with no wipe. With `prefers-reduced-motion` it is a plain fade (12 in, 8 out) and nothing flashes or shakes. Timeline and drawing are in `src/game/encounter-transition.ts` (tuning in `ENCOUNTERS.entrance`); the shake copies the canvas onto itself, so the room moves with no camera API.
- **The entrance sound (issue 080).** It is played a cue at a time from a schedule, so E (or Escape) simply stops the rest. It is all data: the schedule is `ENCOUNTERS.entrance.sounds`, a list of `[frame, cue, semitones]` (60 frames a second; 0 to 47); `exitCue` and `softCue` name the exit echo and the reduced-motion note; `SOUND.cues` maps each cue to an effect in `SOUND.effects` (`encounterBuzz`, `encounterPulse`, `encounterHit`, `encounterExit`, `encounterSoft`), whose voices hold the waves, pitches, lengths and levels. Today: one rattling phone buzz under the shake (frame 0; six quick rough squares (140 and 164 Hz) about 28 a second, alternating loud and soft, with a little noise rumble, about 0.2 s: it was one low thump twice before, which sounded like two hits), then eight square pulses two frames apart climbing from the same note up 16 semitones while the bars close in (frames 16 to 30), then a bright three-note chord with a snap of noise as the bars part (frame 32, a quarter second, so it ends with the entrance). The exit has a quiet falling two-note echo; reduced motion has one soft note and nothing else. To retune, change the frames, the semitone steps or the voices; a test checks that the buzz comes first, the run rises, the hit is last and everything ends inside the entrance. It is an original gesture (urgent pulse, rise, hit), not a copy of any game's tune.
