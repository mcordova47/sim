---
id: 093
title: Mobile stage 3: key entry, a tappable pause screen, and key hints that match the controls
status: todo
owner: claude
depends_on: [087, 089]
---

## Goal
Marc (2026-10-27), after trying the live game on a phone: three related gaps in the touch layer (stage 3 of `docs/mobile.md`, section 7):
1. Starting Study Spanish without a key, there is **no way to enter a key** on mobile (the key screen wants keyboard typing and paste).
2. The list screen (the `L` screen: achievements, ad blocker `B`, dialog voice `D`, reset `Shift+R`) has **actions with no touch way to do them**.
3. Every label for an action names the **desktop key** (E, Esc, L, B, D, Shift+R, the arrows) even when the touch layer has a way to do it.
Also his question: should the list screen simply be called **Pause**?

## What to do
- **Key entry on touch:** the flashcards key screen (and any other text entry the touch layer can reach: names, the sync key) uses a hidden text input that raises the OS keyboard when the player taps the field or a visible "Enter key" control; paste works (the iOS paste bubble over the input; optionally a Paste button via `navigator.clipboard.readText` where allowed). The game already accepts a pasted pairing link or a bare key (`keyFromText`); keep that rule. Keep a way to leave the screen by touch (B). The guest choice screen and the done screen's K and G and the problem screen's S and Y also need touch equivalents (tappable rows or buttons).
- **The pause screen:** every action on it becomes tappable on the touch layer: close, the ad blocker toggle, the dialog voice, reset (keep its confirmation, tap-yes and tap-no), and scrolling or paging if the list is longer than the screen. Decide with a quick check whether opening it holds the clock; Marc's lean is that it should (it is a pause, and the game has no pressure), so make it hold the clock (and say so in the log) and **call it PAUSE**: the pill label (now LIST), the screen's title and the hint line. Keep `L` as the desktop key (Escape also closes it; `P` as an alias is optional). Achievements stay on it as a section, with settings; do not split it into two screens in this issue.
- **Hints that match the controls:** one central place that turns a desktop key name into the label for the current controls (touch layer visible or not, decided live as the layer shows and hides), used by every on-screen hint: the in-world prompt (the `E` box), popups and "ESC TO STOP", dialog hints ("UP DOWN: LOOK  E: PUT UP  ESC: BACK" and the like), flashcards screens, the encounter menu, the pause screen's footer, the status and toasts. On touch the labels use the button names (A, B, the pad as arrows, CHOICE, PAUSE) and drop key combos that do not exist there; on desktop nothing changes (the goldens stay). Where an action has no touch way yet, say nothing or keep the desktop key in the hint (do not promise a button that is not there): list those in the log.
- Keep the 081 stray-key rules and the touch release-on-blur rules working with the new inputs.

## Acceptance criteria
- On the touch layer (device mode `?touch=1`, and a phone) you can: enter a sync key by typing or pasting a link, use every choice on the guest and key screens, and do every action on the pause screen, all by touch. Tests drive these with synthetic pointer and input events.
- The hint function is tested for both control sets; no on-screen hint on the touch layer names a key the player cannot press; desktop output is unchanged and the golden frames are unchanged.
- The pause screen holds the clock and its pill and title say PAUSE; a test proves the clock holds while it is open and that closing it resumes.
- `npm test`, `npx tsc --noEmit`, `npm run build` pass; the text goes into `docs/text-review.md`; anything that needs a real phone (the OS keyboard, the paste bubble, scroll feel) is listed as unverified.

## Progress log
