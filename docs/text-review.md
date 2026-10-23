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
| cook | Cook dinner | Cook dinner | Smoke alarm: silent, but judging. | NO CLEAN PLATES |  |
| dishes | Do the dishes | Do the dishes | The pile regrows when you look away. | NO DIRTY DISHES |  |
| flatten-boxes | Flatten the boxes | Flatten boxes | You have been meaning to do this since spring. |  |  |
| brush-teeth | Brush teeth | Brush teeth | Two full minutes. Honest. |  |  |
| sit | Take a moment | Take a moment | Phone battery: 41%. Phone battery: 33%. |  |  |
| shower | Take a shower | Take a shower | Best ideas of the day, all forgotten by the towel. |  |  |
| sleep | Go to sleep | Go to sleep | Just five minutes. It was not five minutes. | NOT TIRED YET |  |
| contemplate | Contemplate | Contemplate |  |  |  |

## State variable meanings

- dishes: Dirty dishes in the sink, a count.
- bedMade: 1 if the bed is made, 0 if not.
- energy: How awake you are. Falls with time and work, sleep restores it.
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
