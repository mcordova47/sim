---
id: 023
title: Dialog box and choice menus
status: todo
owner: claude
depends_on: [019]
---

## Goal
A Pokemon-style text box and choice menus, so cutscenes, thoughts and abstract tasks are just data: "Contemplate..." then a list (existence, the state of democracy, late stage capitalism, the impermanence of everything) and a line of thought in reply.

## Acceptance criteria
- A text box drawn at the bottom of the screen in screen space: text appears character by character (speed in `config.ts`), the interact key finishes the page or moves on, long text wraps to the box width and splits into pages, and an optional speaker name is shown.
- Choice menus: a list with a cursor, up and down to move, interact to choose, cancel to back out. Menus nest (a choice can open another menu or a dialog), described as data trees, so "contemplate" is one data entry.
- While a dialog or menu is open the world does not take input and the player does not move. Whether the clock and cooldowns pause is a documented choice in `config.ts`.
- Text support: check which characters the data needs (full punctuation such as quotes, semicolons and ampersands, and possibly lowercase) and extend the pixel font to cover them, with a style that fits. Keep the font coverage test and extend it over all dialog data, so a character the font can't draw fails a test with the entry named.
- Events (open, choose, close) so sound and achievements can react.
- Tests (no browser): wrapping, paging, typewriter timing, skipping, menu navigation and cancel, nested menus, input blocking, glyph coverage over sample data.

## Things the 019 review found that this issue must handle
- **Freeze input while a dialog is open** through the same lock as activities (022), not a second mechanism. If 023 lands first, build the lock here and let 022 use it.

## Progress log
