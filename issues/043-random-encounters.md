---
id: 043
title: Random encounters (explore the idea)
status: todo
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

## Acceptance criteria
- A short design note in `docs/random-encounters.md` with three or four concrete ideas (for example: walking the floor sometimes triggers a thought, a text from a friend, a neighbour noise, a pigeon at the window, an unexpected delivery), what each does (a dialog, a small choice, an effect on mood or energy), how often, and how it avoids being annoying. Marc picks.
- If Marc picks one: a minimal build (a rate per step or per tile zone, a short dialog from a list, a cooldown, a way for the player to turn them off), using the dialog system and state.
- Tests for the rate and cooldown; `npm test` and `npm run build` pass.

## Progress log
