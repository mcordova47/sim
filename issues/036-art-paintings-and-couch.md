---
id: 036
title: Art: more accurate paintings, the gallery wall, blinds states
status: done
owner: agent
depends_on: []
---

## Goal
From Marc's playtest of the sprite build (2026-10-23): the paintings are generic colour blocks. Make them read as the real ones, even abstractly, and add the pieces the new couch tasks and alternating blinds need.

## Acceptance criteria
- **Paintings:** redraw `painting` (2x1) and `painting-wide` (3x1), and add variants as needed so the three on the north wall differ from each other, each a recognisable impression (palette, composition) of the real artwork. Read Marc's photos in `reference-photos/` by absolute path from the main checkout; ask Marc before using anything that shows readable text or a signature. Never copy photo content into the repo; abstract impressions only. If a photo of each painting straight on would help, say so in the log.
- **Gallery wall** (for "admire the art" in issue 035): a `gallery-wall` top-down piece, sized to a wall space chosen with Marc or from the floor plan, or if the floor plan has no spot, propose one and say so. Check `docs/floor-plan.md`.
- **Blinds open and closed:** `window-blinds-open` and `window-blinds-closed` (and `window` if it has the same alternation), same size as `window-blinds`.
- Update the reuse audit and `docs/art-style.md` where names are added. Sprites pass `npm run sprites`; contact sheet and a main-room mockup for Marc.
- `npm test` and `npm run build` pass.

## Progress log

- 2026-10-23 (agent): Started. Plan: read the photos, redraw the three north-wall paintings from the real prints, redraw `gallery-wall` for the top-down view, add the two blind states, update docs, mockup.
- 2026-10-23 (agent): Done, ready for review. All art is abstract impressions drawn with the shared palette; no photo content copied, no text or signatures reproduced.
  - **Paintings** (sources read from `reference-photos/`: IMG_4647, 4648, 4651, 4654, 4655): `painting` (32x16) is the pencil-and-wash barn in a cream frame with a dusty mat (hangs over the table in the real room); new `painting-desk` (32x16) is the gold-matted abstract in a walnut frame with an orange swoop, pale disc and navy bar (over the desk); `painting-wide` (48x16) is the small green print floating in a wide white mat in a pale oak frame (by the nightstand). The three are now different sprites. The glyphs in the desk print are left out. The robin linocut (dark frame, orange-red field, dark bird) is also in the real room, by the passage, and has no slot in the north wall; not drawn. Say so if you want it (a `painting-robin` 16x32 would be an easy add).
  - **Only rename in game data:** `src/game/apartment.ts` piece `q` (painting over the desk) now uses `painting-desk`. A test checks the three north-wall paintings use three different sprites.
  - **Gallery wall:** `gallery-wall` is now 96x16 (6x1 tiles). The floor plan has no spot for it (issue 020 dropped it), so I propose the south wall face behind the sofa, cols 1-6 of the main-room row 7 (the `wall-front` tiles under the sofa), where the real one is. It uses the `wall-front` top slice and shadow so it can replace those six tiles. Ten frames in the order and rough mix of the real wall (gold, silver, white-gold, pale-wood and dark frames, the big dark animal print in the middle). NOT placed in game data; 035 decides. The mockup places it there.
  - **Blinds:** `window-blinds-closed` (tan slats edge to edge, pull cord) and `window-blinds-open` (slats raised at the top, glass and sky below), both 16x32 like `window-blinds`, same frame. `window-blinds` is left untouched and still used by the data; 035 can retire it. `window` has no blinds alternation in the data (the lower window has the task, the upper is behind the radiator), so it is unchanged.
  - **Docs:** `docs/art-style.md` reuse audit updated (gallery-wall, paintings, blinds states). `scripts/main-room-mockup.mjs` draws the gallery wall and uses open blinds in the made picture and closed in the unmade one.
  - **Checks:** `npm run sprites` passes (75 sprites); `npm test` 553 pass; `npm run build` passes. Viewed the contact sheet, an 8x zoom of each new sprite, and `art/main-room-mockup*.png` (gitignored; run `node scripts/main-room-mockup.mjs`).
  - **Not checked:** how it looks in the running game at real scale (the sprites are not placed in data yet beyond the desk painting); whether Marc finds the impressions recognisable. A straight-on photo of the desk print, the barn drawing and the gallery wall would let me sharpen details.
  - Files: `art/src/{painting,painting-desk,painting-wide,gallery-wall,window-blinds-open,window-blinds-closed}.sprite`, matching `public/sprites/*.png`, `src/game/apartment.ts`, `src/game/apartment.test.ts`, `scripts/main-room-mockup.mjs`, `docs/art-style.md`.

- 2026-10-23 (independent reviewer): **Review: approve.**
  - **Paintings: pass.** `painting` (32x16), `painting-desk` (32x16) and `painting-wide` (48x16) match the sizes of the pieces in `MAIN_MAP` (`pp`, `qq`, `uuu`) and the old sprites; all three sprites differ and a test pins it. Compared with IMG_4647 (barn pencil drawing in a cream frame and mat; gold-matted orange/pale-disc/navy abstract in a walnut frame) and IMG_4654 (small green print in a wide mat, pale oak frame): palette, framing and composition read as the real pieces. No text, glyphs or signatures reproduced; nothing copied from photos.
  - **Gallery wall: pass.** 96x16 (6x1). Its top and bottom rows match `wall-front` (ink, paper, mist, dusk, ink), so it can replace six `wall-front` tiles. Map row 7 cols 1-6 are all `#` with open floor north, so the spot fits the floor plan (which has no gallery entry, as the author said; the proposal is stated in the log). Not placed in game data, as allowed. Mockup shows it reading as a frame strip on the south wall face.
  - **Blinds: pass.** `window-blinds-open` and `-closed` are both 16x32, same as `window-blinds`, which is untouched and still used. `window` has no alternation in the data, unchanged.
  - **Docs/sprites: pass.** `art-style.md` audit rows added. My own check of every changed sprite: all glyphs in `art/palette.json`, every row the declared width, row count equals declared height. `npm run sprites` renders 75 sprites and leaves the tree clean (PNGs match source). `npm test` 553 pass; `npm run build` passes.
  - **Scope: pass.** The only game-data change is piece `q` to `painting-desk` (and its test). No other issues or `PLAN.md` touched; only `reference-photos/README.md` is tracked from that folder.
  - **Unverified (not passed):** how the sprites look in the running game at real scale (only the static mockup was viewed); whether Marc finds the paintings recognisable. Minor notes for Marc: the nightstand print is portrait in real life but the 3x1 slot forces a landscape mat; the desk print is a gold-and-orange impression without its glyphs; the robin linocut has no slot; the gallery strip starts one tile west of the sofa body (sofa is cols 2-7, strip cols 1-6).
