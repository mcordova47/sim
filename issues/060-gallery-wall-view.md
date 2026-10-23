---
id: 060
title: Draw the gallery wall view
status: done
owner: agent
depends_on: []
---

## Goal
"Admire the art" (issue 040) shows a full-screen picture of the south gallery wall, `view-gallery-wall`, which is still a labelled placeholder. Draw it from Marc's close-ups (2026-10-23: "a relatively easy improvement").

## Acceptance criteria
- Replace `art/src/view-gallery-wall.sprite` (320x192, same name) with a straight-on picture of the whole gallery wall: the real arrangement of the ten pieces on the wall with the plaster texture (the warm greys from 058), the baseboard at the bottom, maybe a bit of the sofa's back rail in the foreground (the view is from the sofa). Read the gallery photos in `/Users/marccordova/Dev/repos/mcordova47/life/reference-photos/` (`gallery-wall*`, absolute paths, never copied into the repo; no readable text or signatures). Reuse the existing `gallery-wall` strip's pieces where they fit, but this picture is larger, so draw the frames bigger and with more detail than the 16 px strip can hold.
- Keep key content in the top 140 px: the dialog box covers the bottom. The three lines of the admire-art scene must remain readable over it.
- Palette only; render it in the real game (`Admire the art` from the sofa; the dev build shows it) and look at it at 1x and 4x, in the day and at `?hour=23`; `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log

- 2026-10-23: started. Plan: redraw `view-gallery-wall` from the gallery-wall photos (ten pieces at the photo's arrangement, scaled about 0.17), plaster, corner, baseboard, sofa rail with blanket and hoodie; keep pieces in the top 140 px.
- 2026-10-23: done, status review. Replaced `art/src/view-gallery-wall.sprite` (320x192, palette only; the generated `public/sprites/view-gallery-wall.png` is updated too). Frames keep real finishes (silver bevel, white-and-gold, ornate gold, oak box, pale wood), pictures are blurry impressions. Pieces end at y 138; the bottom rows are plaster, baseboard, sofa rail with a cable-knit blanket and a green hoodie. Checked: `npm run sprites`, `npm test` (1256 pass), `npm run build` pass. Rendered in the real game headless (puppeteer, dev server; Tab x3 at the sofa then E) at 1x and 4x, day and `?hour=23`, and looked at all four: the three-line box and "ESC TO STOP" stay readable, and nothing key is under the dialog. Notes: (1) the view is drawn above the night tint, so it looks identical at 23:00 as by day; that is existing engine behaviour, not changed (out of scope; a follow-up if Marc wants it dimmed at night). (2) The wolf print is a small shaggy figure, a loose impression. Not checked: how it feels in a real browser.
- 2026-10-23: Review (independent, approve). Re-ran `npm run sprites` (no diff in the tree afterwards, so the committed PNG matches the source), `npm test` (1256 pass), `npm run build` (pass). Criteria: (1) picture of the whole wall, ten pieces in the photo's arrangement (silver landscape, white house, tall white-gold building, small blue top right, oak box, small gold-framed pair, tall wolf print, green still life, dark postcard bottom left), plaster, baseboard, sofa rail: pass; read the sprite at 4x and compared to `gallery-wall.jpg`; no readable text, nothing copied from reference-photos (only the sprite and its PNG changed). Frames are noticeably bigger and more detailed than the strip. (2) Key content in the top 140 px: pass, the last frame ends at about y 139; the rail and blanket are under the dialog. The dialog box and "ESC TO STOP" are readable over the plaster at 1x and 4x. (3) Palette only: pass, the generated PNG has 20 distinct opaque colours and the pipeline rejects off-palette characters. Rendered in the real game headless (dev server on 5199; face down at the sofa, Tab x3, E) at 1x and 4x, day and `?hour=23`: all fine. Note the view is identical at 23:00 (drawn above the night tint, existing engine behaviour, not a defect of this issue). Scope: only the sprite, its PNG and this issue file changed. Can't verify: how it feels in a real browser. Verdict: approve. PLAN.md table needs updating by the planner.
