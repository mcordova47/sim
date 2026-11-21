# Ideas

Loose ideas that are not planned work. There is no status, no owner and no deadline here, and nothing waits on any of it: a garden, not a backlog. Add an idea in a few lines when it comes up (date, whose idea, why it is interesting, what is open). When someone says "let's do this", or an idea has enough shape that it could be started, it **graduates**: it gets an issue (design first), its entry here is replaced by a one-line pointer to that issue, and it gets a row in the PLAN.md table. An idea that is tightly tied to a feature that already has an issue stays with that issue ("Later ideas" section) and is only linked from here.

Where other idea lists already live (not copied here): the decor wishlist in [decor.md](decor.md) ("Ideas backlog"), encounter card ideas in [random-encounters.md](random-encounters.md) (section 14), and the ranked real-world feeds (calendar, browser, music, delivery apps and so on) in [real-world.md](real-world.md).

## Cutscenes on the phone: a common aspect and screen chrome
*Marc, 2026-10-29.* Ideally every cutscene on the narrow (phone) view would share one aspect ratio and leave no empty band under the picture (full-screen pictures are 320 x 192 on a view that is otherwise 224 x 208, with a reserved gap above the controls). Because that may be hard, a likely middle path: a "screen" chrome (a device bezel) above the controls, with each cutscene picture centred in it and bars above and below. The side project picture already got its own taller layout (issue 125: a picture can ask for a taller view); that shows a painter that lays itself out against the live view size needs no engine change, while plain sprite pictures (ad cards, the gallery wall) would need a layout per size or bars. Start from `docs/mobile.md` section 13, `showsFullPicture` (`game.ts`), the reserve in `render/canvas.ts` and the `view-*` pictures. Open: one aspect for all, or bars; what the chrome looks like; the L list and the encounter cards.

## Framed photos (ads for frames, hung or shelved)
*Marc, 2026-10-29. On hold at his request.* Ads for framing a photo, so a framed photo can later hang on a wall or sit on the bookshelf; fits the decor system ([decor.md](decor.md): slots, gifts, ads from issue 043) and the zen-garden rule (no pressure, nothing to hoard). Things to settle, one question at a time: the ad (a fake frame brand; a frame arrives as a gift item like other decor); how a picture is chosen for a frame (from the close-up or the gallery); **what is stored**: the decor save must stay free of picture data (photos are device-only and never synced), so the decor record can only hold a reference such as a stored-picture id that may be missing on another device, which then shows an empty or generic frame; which slots take a framed photo (a wall slot, a bookshelf slot) and how it is drawn (the 48 x 36 pixels inside a frame sprite, 3x or 1x); what happens when the picture is deleted or REMOVE ALL runs; sync and reset behaviour; the THINGS page entry for the frame (issue 109). Privacy: no picture content in the repo, the save or sync. Builds on the photo gallery (issue 117).

## Guitar: a timing game (the notes, like a rhythm game)
*Marc, 2026-10-29. On hold at his request.* A separate activity, unlocked after a certain guitar skill level, that is the **only** mode with fingerstyle: the melody note must be pressed at the right moment, guitar-hero or DDR style. It needs no scrolling lane if that is hard; it only has to tell the player (a) which key they will press and (b) when. The level 6 groove already has fixed rest slots (about every 0.52 s), so the "when" is known in advance: cues could be a quiet flash or tick on the approaching slot and the arrow shown early, with the snap window (0.12 s) as the natural hit window. Open: does a miss sound messed up (see the wrong-note idea), does it cost anything (the zen-garden rule says no pressure), and is it its own node or what level 6 becomes. Related: `docs/guitar-skill-design.md`, issue 114.

## Guitar: wrong key presses sound messed up
*Marc, 2026-10-28. On hold.* In the notes game, a wrong key plays a deliberately off sound (a muted-string thunk, a buzz, a dissonant clash) instead of a clean note; it could depend on skill (a beginner clunks more, a better player's slips are subtler). Needs a look at how the notes activity decides what a wrong press is. Kept with the guitar skill issue ([114](../issues/114-guitar-skill.md), "Later ideas"), which also parks "more chords at higher levels".

## Plugins (VSTs) for the track editor
*Marc, 2026-10-23 (was issue 064).* Like customizable decor, "plugins" or "VSTs": add-ons that do interesting things in the track editor (see `docs/make-tracks.md`). He likes that the mixing feature has a lot of potential. **Marc's answer (2026-10-23):** the same as decor: plugins are a quiet side effect, a zen-garden thing you collect calmly, not a goal; no pressure or scarcity; they turn up (gifts, finds, small purchases that are never required, or as a calm reward for making tracks). Ideas for what a plugin does (each a small, separate thing the editor can apply, as data or a tiny function over a track): an arpeggiator (a held note becomes a run), a chord stamp (one key places a triad), an echo or delay (repeats notes quieter), a humanizer (small timing and volume drift), a swing control, a bit-crush or lo-fi colour on a channel, a drum pattern generator (four-on-the-floor, breakbeat), a transpose, a bounded random melody. Open: how you use one (a menu key listing owned plugins, applied to the current channel or selection with a preview and undo; or a per-channel slot); how you get them (the decor sources, achievements, making tracks; pick one first); owned plugins would live in the same owned list as decor with a `plugin` kind (see [decor.md](decor.md), "Other owned things"); names plain and a little wry like real plugin names, no real brands. If picked: a design note (`docs/plugins.md`) with the plugin list, the editor UI at 320 x 192 and the phone layout, acquisition, the save format and a staged plan; stage 1 could be transpose, chord stamp and echo with undo.

## NPCs
*2026-11-07.* You can acquire certain items that are intelligent, like a roomba or a dog. They do their own thing throughout the day. One challenge is how to make sure they're not in the way. An idea that comes to mind immediately is just an option to move them.

## Alternate settings
*2026-11-07.* Maybe not worth doing but I wanted to note it. Could either have entirely different games based on the same engine with different config or alternate scenes/levels where you're in a different location. Getting coffee or something like that. Part of the charm of the game is that it takes place entirely in on setting, but maybe if it were rare enough it wouldn't take aaway fromt he charm?

## “Going out”
*2026-11-07.* Menu at the door to go out and do different things: meet a friend for lunch, go on a date, get coffee, go to a museum or a show. The scene doesn't switch, just the time changes and there are effects to certain stats and points or whatever.

## The game reads the issues (a meta joke for the side project)
*Marc, 2026-11-15.* Once the issue data exists (`issues.json` from issue 128's design), the game could read it at some point as a dumb meta joke for the side project: the little game inside the game reading the repo's own issues. Needs a stable, public-safe, generated file and a deadpan line or two; nothing in the issue system depends on it.

## Make the issue pages look like ours
Graduated to [issue 133](../issues/133-issue-pages-theme.md) (2026-11-15).

## Phone track editor: long press and drag painting
*Marc, 2026-11-15 (was issue 106e, optional stage 5 of the phone track editor).* A hold timer and drag on the canvas: long press on a note cycles its length, on an empty cell sets the pen; drag across the beat channel paints hits along the row (the natural phone gesture for drum rows). Dropped for now because stages 1 to 4 feel fine; needs pointer-down and move handling on the canvas, which `touch-ui.ts` only does as a tap today (`docs/track-editor-phones-design.md`, sections 3.6 and 5).

## Guitar: a pause-screen skill line
*Marc, 2026-11-15 (was issue 114c, optional).* One deadpan line on the pause screen that shows the guitar skill after the first session: no bar, no number that can fall, nothing to chase (the guitar skill design, section 11, "114f"). Dropped for now: a skill line risks reading like a stat to chase. Wording would go in the text review.

## Side project: one real effect
*Marc, 2026-11-15 (was issue 111f).* The little room reaching into the real one: `SideProject.effects` and one real effect, once there is an effect in mind. Options from the design (`docs/side-project-config-design.md`): a cosmetic appearance in the real room, or a tiny mood or energy tweak. Parked until Marc picks. Related: the side project could have its own title, something like "Siminal Crossing".

## Task flavor lines (parked)
*Marc, 2026-11-21 (was issue 145; dropped in issue 146).* Every task used to carry a one-line joke that the game never drew. Marc approved or rewrote the lines below and wants them kept in case they show up somewhere later; the rest were removed. Where they might show was decision d1 of issue 145: on completion, as a line under the points; under the task name in the task menu; or as a one-line dialog after the task. Each line is `task prompt: flavor line`.

- Alphabetize records: By artist. Then by mood. Then by artist again.
- Records by color: It looks great. You can no longer find anything.
- Work at the desk: Per my last email, you are doing great.
- Clean the desk: It was a pile. It is now several smaller piles.
- Choose a record: Side B is the good side.
- Make coffee: Weigh, grind, bloom, wait. You'd love this if you weren't so tired.
- Drink the coffee: What a good feeling, the rush of energy before the panic attack.
- Reheat leftovers: Burnt on the outside, ice cold in the middle, just like you like it.
- Eat dinner: Eaten while watching something you have already seen.
- Doomscroll: One more. Okay, one more. Where did forty minutes go.
- Work from the couch: How can something be so comfortable and yet so painful?
- Work in bed: Couldn't hurt to close your eyes for just a second...
- Open the fridge: Nothing new has appeared since the last check.
- Take out the trash: You're testing the physical limits of how much you can compress this trash.
- Take out the recycling: The kitchen is clear and you find what appears to be a Blockbuster gift card.
- Flatten boxes: You have been meaning to do this since spring.
- Brush teeth: Because you do have your life together.
- Take a moment: Do I have to narrate everything?
- Take a shower: If only they'd record your ideas in there. What a world it would be...
