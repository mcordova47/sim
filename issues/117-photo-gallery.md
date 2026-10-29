---
id: 117
title: Photos like a phone gallery: browse, delete one at a time, a close-up scene
status: todo
owner: marc + claude
depends_on: [113]
---

## Goal
Marc (2026-10-29), after trying the photo reel: (1) delete one picture at a time; (2) reaching the photos from the pause menu should feel like browsing a photo gallery on a phone; (3) the sofa "Scroll through photos" task should become a short scene like the gallery wall: first a phone view with a selection of pictures and a caption (phone chrome, like the monitor view), a key to continue, then a close-up of one photo with a generic caption ("ah, memories..." style; never about resolution), look as long as you like, a key to exit, and an ad encounter may interrupt in the close-up. Marc picked: **the player chooses the close-up picture** (a highlight moved with the arrows in the phone view, the key opens it).

Answers so far (2026-10-29): the phone view is a **3 x 2 grid** (6 per page). Captions (2026-10-29): the phone view has **one fixed line under the grid for the whole session** (no per-picture text), and the **close-up has its own generic caption** ("ah, memories..." style, never about resolution). Idea from Marc: the pause-menu gallery could also hold **settings for the pixelation** (resolution and the like), applied only to new uploads; stored pictures keep the look they were made with (the store today accepts only 48 x 36 or 36 x 48 and records a palette version, so settings mean relaxing the store's size check and keeping `w`, `h` and the look on each record; the look chosen in 113 was 48 x 36, full palette, dither 20).

## What to do (design first)
Write `docs/photo-gallery-design.md` and ask Marc one question at a time: how many pictures the phone view shows and how it pages or scrolls; whether the pause-menu PHOTOS page becomes the same gallery (grid, tap or key to open a close-up, delete from the close-up with a confirm, ADD stays); the close-up size (48 x 36 at 4x is 192 x 144, fits the 192 px height); caption rules (one fixed line per session, never about resolution; the phone view caption); what an ad interruption does to the scene; what happens to the interim slideshow (113d). Then split into small issues. The store, `pixelate` and the PHOTOS add flow stay.

## Acceptance criteria
- A design agreed with Marc, then build issues filed; photos never leave the device and nothing about them is in the repo.

## Progress log

