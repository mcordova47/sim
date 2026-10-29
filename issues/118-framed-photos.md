---
id: 118
title: Ads for framing a photo, then hang or shelve it
status: todo
owner: marc + claude
depends_on: [117]
---

## Goal
Marc (2026-10-29): ads for framing a photo, so a framed photo can later be hung on a wall or placed on the bookshelf. Fits the decor system (`docs/decor.md`, slots, gifts, ads from issue 043) and the zen-garden rule (no pressure, nothing to hoard).

## What to do (design first, after 117)
Ask Marc one question at a time. Things to settle: the ad (a fake frame brand, a frame arrives as a gift item like other decor); how a player picks which stored picture goes in a frame (from the close-up or the gallery); what is stored (the decor save must stay free of picture data: photos are device-only and never synced, so the decor record can only hold a reference such as a stored-picture id that may be missing on another device, which then shows an empty or generic frame); which slots take a framed photo (a wall slot, a bookshelf slot) and how it is drawn (the 48 x 36 pixels inside a frame sprite, 3x or 1x); what happens when the picture is deleted or REMOVE ALL runs; sync and reset behaviour; the inventory (109) entry for the frame. Privacy: no picture content in the repo, the save or sync.

## Acceptance criteria
- A design agreed with Marc, then build issues filed.

## Progress log

