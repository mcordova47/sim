---
id: 043
title: Random encounters (explore the idea)
status: in-progress
owner: marc + claude
depends_on: []
---

## Goal
Marc's brother suggested random encounters, in the Pokemon sense. It isn't thought through, so this issue is to decide what it would mean in a studio apartment, then (only if it holds up) build a small version.

## Marc's idea (2026-10-25): ad encounters, tied to gifts and finds
Pokemon-style encounters with marketing emails and Instagram ads, and the positive outcome is buying the thing, like catching a Pokemon. Marc is unsure of the logic: you are trying to fight the ad off, yet the good outcome is buying it. Not fully thought out.

Planner's way to make the logic work (for the design note to test and Marc to pick from):
- It is a **standoff, not a fight**: neither outcome is a loss, which keeps the zen-garden rule (no pressure, no scarcity). The ad appears ("A sale appeared.") with its allure bar and your willpower; the choices are things like Ignore, Unsubscribe, Look closer, Add to cart. Resisting gives a calm small mood lift; giving in is the 'catch': you add it to the cart and **it arrives later as a delivery** (the gift and find source for decor stage 3 of issue 062, and plugins for 064). So 'buying' costs nothing in-game (no currency), and a purchase is a decor item turning up at the door.
- **Mood sets the odds** (no new system): at low mood the ad is stronger and an impulse buy is likelier; at high mood you shrug it off. Neither result is punished.
- **Where it happens:** a small apartment has no 'tall grass', so encounters fit the screens: while doomscrolling (the phone), working through emails at the desk, and on the laptop; maybe the mailbox by the door. A chance per task, with a cooldown, and an off switch.
- **Tone:** deadpan and sincere, in the voice of a dry narrator ('A promotional email has appeared. It is 20 percent off.'); never wink at the medium; no real brands, shops or company names; plain wording (issue 037 text pass reviews the lines).
- **Presentation:** a short full-screen scene like the art views (a `view` picture of a stylized email or ad card, then a small menu), not a battle UI; escapes cleanly (046).
- **Link to 062:** the delivery is the acquisition source for stage 3: each purchase becomes an owned item that arrives after a while, announced with one plain line. This keeps 'getting things' a quiet side effect.

## Two ways to pace what arrives (Marc, 2026-10-25), for the design note to compare
1. **Random chance, on screens only** (the encounters above). Repeats must be allowed (an encounter can show something you already have, or offer a duplicate) so you do not collect everything too quickly; the odds, the cooldown and a daily cap set the rate.
2. **Fixed checkpoints.** Things arrive at set milestones (lifetime points, game days played, tasks done, achievements), so the rate of accumulation is under control and predictable.
Either feeds the same **delivery** mechanism (issue 062 stage 3a, built first): an item is queued, arrives after a delay, and is announced in one plain line. The note should recommend one or a mix (for example checkpoints guarantee a slow trickle, encounters add the occasional extra).

## Marc's decisions (2026-10-26), with the planner's recommendations for everything not changed
- **Pacing: both, in two stages.** Checkpoints first (a calm, guaranteed, slow trickle: game days played, plus a few achievements as bonus gifts; for example the first gift after day 1, then one every 2 to 3 game days), then ad encounters as the occasional extra.
- **Only new things arrive.** A delivery never contains something you already own (`deliver` already refuses owned items; checkpoints always give something new until the list runs out). A displayed item is in at most one place; items you own but are not showing sit in an **inventory** and can be placed again (issue 073 changes the swap so placing a displayed item into another slot swaps the two).
- **Encounters may offer something you already own,** but then it is just an ad you ignore: the encounter resolves by itself (a one-line 'you already have one' dismissal or the card simply goes away), no choice and no delivery.
- **Where and how often:** while doomscrolling on the sofa and while answering emails at the desk; about one encounter per 4 to 5 completed tasks there, with a cooldown of a few game hours and a cap of one or two per game day. **Mood sets the odds** (low mood: stronger ads and a likelier impulse buy; high mood: you shrug it off); nothing is punished.
- **Choices:** Ignore, Unsubscribe, Look closer, Add to cart. Ignore or a successful Unsubscribe gives a small calm mood lift; Add to cart queues a delivery (`game.deliveries.deliver`). **Unsubscribe can fail** (it was not successful: they keep sending emails): a chance, set by mood and the ad's persistence, and a failed unsubscribe makes the next encounter come sooner (it never punishes beyond that).
- **An off switch, framed as an ad blocker:** a key in the achievements list screen (L) toggles 'Ad blocker: ON/OFF', saved. (An ad blocker could later become an item in issue 062.)
- **Voice and names:** real-sounding ads. The joke is the combination of a real-sounding ad with a Pokemon-style encounter, so the copy must not be quirky or obviously jokey; deadpan and sincere, in the voice of real marketing emails and posts (subject lines, 'limited time', 'your cart is waiting'). **Real platforms, fake brands:** real giant platforms may be named (Instagram, Gmail, Amazon, Facebook Marketplace, and similar); products and shops are invented brand names (a clothing brand, a coffee subscription, and so on) made up so as not to point at real small businesses. It is not a commercial game. No real people.
- **Look:** a short full-screen card like the art views (a stylized email, social post or text message card), then a small menu; no battle UI.
- Marc leaves ad concepts to the planner to draft; he will edit them in the text pass (037).

## Acceptance criteria
- A design note `docs/random-encounters.md` with: the two-stage plan; the checkpoint schedule (the first ten milestones with items from the real set: the other gallery wall pieces as swap-in paintings, the robin print, a second plant, the stool, a small lamp, and so on, in a sensible order; only new things); the encounter flow (trigger, odds by mood, the standoff, the already-own dismissal, unsubscribe failure, caps and cooldowns, the ad blocker switch) with all the numbers in one table (config); five to eight ad concepts in the 'real platforms, fake brands' voice, each with a card type (email, social post, text), a platform, an invented brand and the product it sells (an item from the catalog), and the exact copy (subject or caption, two or three lines of body, the button labels); the card art needs (palette-only full-screen cards, or one template plus text) and mockups of the card and the menu at 320x192 in the pixel font; the data model (catalog, schedules, saved state: milestones fired, last encounter time, ad blocker flag; tolerant saves); how it plugs into the delivery function and the decor inventory; a staged build plan; and open questions for Marc.
- Then, after Marc picks: stage A builds the checkpoint source with the real item list (needs 073 and the stage 4 art for each item); stage B builds the encounters.
- Tests for the rates and cooldowns, the already-own dismissal, unsubscribe failure and the ad blocker (when built); `npm test` and `npm run build` pass.

## Progress log
- 2026-10-27 (design note updated with Marc's answers): all open questions answered with the recommendations; question 4 changed so the impulse buy and the unsubscribe success follow mood smoothly (impulse = clamp((60 - mood) / 60, 0, 1) * 0.40; unsubscribe 50 percent at mood 0 to 90 percent at mood 100, minus 10 points per persistence, clamped 5 to 95). Tables, flow text, config table, test list and section 12 updated in docs/random-encounters.md. Status stays in-progress.
