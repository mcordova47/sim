---
id: 120
title: Pause screen: the good-hour legend overlaps the header on the narrow view
status: todo
owner: claude
depends_on: [116]
---

## Goal
Found in review of 116: on the 224-wide view the good-hour legend icon at the right of the pause header overlaps the header text (15 to 39 px with the new `SIMAGOTCHI  n/m` header, worse before). At 320 wide it is fine. Drop the legend on the narrow view or give it its own line, and settle whether the header can carry ACHIEVEMENTS again (see `docs/text-review.md`, pause header wording).

## Acceptance criteria
- No overlap at 224 or 320 (layout test with measured text widths); both views rendered at 1x and looked at; golden frames unchanged unless the pause screen is in them; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log

