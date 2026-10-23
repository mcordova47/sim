# Character brief: the player sprite

For the top-down art (see issue 025 for size and direction rules). Proposed from the interview; Marc approves. Nothing here comes from a photo, and no likeness detail beyond what Marc said.

## Look
- Hair: mid-length to long, curly, brown. It is the strongest silhouette, so make it a clear shape: a rounded, slightly uneven mass. Visible from all four directions, with back view mostly hair.
- Skin: light. Eyes: blue (probably only visible in the facing-down view at larger sizes; fine to skip at 16 px).
- Glasses: none.
- Build: ordinary. No exaggeration.

## Outfits (swappable, the sprite loads by filename)
Pieces to support, as full-body variants:
1. **Home:** t-shirt and sweatpants. The default on waking.
2. **Casual:** jeans and a sweater.
3. **Out:** corduroy pants and a flannel.
4. **Pajamas / just woke up** (optional): the same as home with messier hair.
Getting dressed is a task that picks one. The outfit shows on the sprite and, for the door, decides what you leave in.

## Feel
Tired but fine. Mildly dignified. Posture slightly slumped, no big expressions: the character reads as a person who is about to do something small. Animation is plain: a two-frame walk, a single idle frame, a small head turn.

## Four-direction notes
- Down (facing the camera): hair, face with two dots for eyes, shirt, hands.
- Up (back): hair covers most of the head, no face.
- Left and right: a side profile, hair swept to the back, one arm visible. Mirror only if the outfit is symmetric (a flannel's pattern makes it a poor mirror; check).
- Held items (guitar, laptop, book, mug) are separate overlay sprites, not baked into the character.

## Colors
From the shared palette (`docs/art-style.md`): brown hair, one skin tone, one shirt color per outfit, dark pants. Flannel gets a two-color check at most.
