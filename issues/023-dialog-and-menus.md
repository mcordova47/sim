---
id: 023
title: Dialog box and choice menus
status: review
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
- 2026-10-23: Done, ready for review. Branch `issue/023-dialog-and-menus`, worktree `../life-worktrees/023-dialog-and-menus`.
  - **Added:** `src/game/dialog.ts` (the data types `Say`, `Menu`, `Choice` with builders `say`, `menu`, `choice`; `wrapText`, `paginate`; `DialogRunner`, which holds all the logic and never touches the canvas or the keyboard), `src/render/dialog-box.ts` (the text box along the bottom and the choice box at the right, with a blinking "more" arrow and a cursor, all from the palette), `src/game/dialog-data.ts` (a sample "contemplate" tree with a nested "Existence" submenu), `docs/dialogs.md` (how to write dialogs). `font.ts` gained 19 punctuation glyphs (`" ; & # @ $ = _ < > [ ] { } | \ ^ ~` and the back tick), `normalizeText` (curly quotes, en and em dashes, the ellipsis, odd spaces become plain characters, used by measuring, drawing and the coverage checks) and `unsupportedChars`. `Controls` gained `dirPressed` (a direction that went down this frame) and `cancelPressed` (Escape or X). `Game` gained `lockInput()`, `inputLocked`, `openDialog()`, `dialogOpen` and draws the dialog over the HUD. `Interactable` gained an optional `dialog`. `GameEvents` gained `dialogOpen`, `dialogChoose` (label and the whole path so far) and `dialogClose`. `DIALOG` in `config.ts` holds typing speed (45 chars/s), lines per page (3), `pauseClock`, margins and the text width. The placeholder room has a new object, a green "Contemplate" spot, that opens the menu.
  - **Criteria:**
    - Text box at the bottom, typewriter text, interact finishes the page then advances, wrapping, pages, optional speaker: yes. `dialog.test.ts` (29) covers wrapping (exact fits, over by a character, a word too long for a line, newlines, spaces, curly quotes), paging, typing speed, finishing a page versus moving on, speaker, being closed.
    - Menus with a cursor, up and down one entry per press (wraps), interact chooses, cancel backs out, nested menus as data trees: yes, including cancel returning to the parent menu with the cursor where it was, the path of choices, a menu offered again after a reply (a cycle), menus with no prompt, and a prompt too long for one page.
    - World input frozen while open: through one shared lock, `Game.lockInput()`, not a second mechanism. It is what 022 (activities, cutscenes) should use as well. The dialog takes it when it opens and gives it back when it closes; another feature's lock stays in place. Tested in `game-dialog.test.ts` (14): the lock freezes walking and stops tasks starting, needs every lock released, double release is harmless, a step already under way finishes.
    - Clock and cooldowns: they stand still while a dialog is open (`DIALOG.pauseClock`, true by default, documented in `config.ts` and `docs/dialogs.md`). The press that opens a dialog does not also choose an entry, and the press that closes it does not count as a press on a cooling-down task (tested).
    - Font: 19 glyphs added and `normalizeText` for typographic characters. A test over every dialog reachable from the placeholder room checks all text, labels and speaker names are drawable, that menus have at most 8 entries and fit on screen, and that replies are at most 4 pages (`dialog-data.test.ts`, 4).
    - Events: open, choose (label and path) and close: yes, tested.
    - Tests without a browser: yes. Drawing is tested with a recording canvas (`dialog-box.test.ts`, 9): boxes inside the screen for 1 to 8 choices with and without a prompt, the choice box clear of the text box and (for up to 6 choices) the HUD, wide labels clamped, one cursor on the chosen entry, the waiting arrow never drawn before the page is done. `game-dialog-render.test.ts` (1) checks the world prompt is hidden while a dialog is open.
  - **Checks:** `npm run build` passes; `npm test` 244 pass (181 on `main`, 63 new: dialog 29, dialog box 9, dialog data 4, game dialog 14, game dialog render 1, font 4, controls 2). I rendered the placeholder room with the menu open, the nested menu and a reply part way through typing, and looked at them: a white Pokemon-style box with a dark border at the bottom, the choice box at the right with a pointing cursor, the reply typing out. That showed one fault I then fixed: the world prompt ("CONTEMPLATE (30 SEC)") was drawn behind the menu, so it is now hidden while a dialog is open (with a test).
  - **Decisions and things to know:**
    - **The font stays uppercase.** Whether to add lowercase is the open question in `PLAN.md`; I did not, because a lowercase set needs descenders and a taller font. Real book excerpts in capitals are readable but not lovely. If Marc wants mixed case, it is its own issue (a second, taller font for dialogs only).
    - **A task with a dialog is instant** until activities (022): it starts, opens the dialog and completes at once (so the points arrive when the dialog opens). 022 should turn this into a proper activity type with a result.
    - **Event order** when a dialog task starts: `taskStart`, `dialogOpen`, `taskComplete` (the dialog opens as the task starts and the task itself is instant).
    - **Menu navigation is one entry per fresh key press**; holding a key does not repeat. Easy to add if it feels slow with long menus.
    - **Cancel keys are Escape and X.** The interact key is E.
    - The text box and choice box positions and sizes are placeholders for the look; a real frame, a speaker portrait or a different layout is an art-and-layout job for later.
  - **Not checked in a browser:** how the typing speed (45 characters a second) and the menu feel in real time; keyboard handling with a real keyboard (Escape and X, key repeat).
  - Notes for the planner: `docs/dialogs.md` is the how-to for the content issues and for 024's task list. `dialog-data.test.ts` finds dialogs reachable from the placeholder room's tasks; the real level (020) and the content issue must add theirs to its `roots`, or make the test discover them from the real level.
