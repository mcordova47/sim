// Text entry on the touch layer (issue 093, docs/mobile.md section 4): a hidden `<input>`
// raises the phone's keyboard, and what it holds is handed to the game as the whole text.
// This file is the logic with no DOM in it (touch-ui.ts owns the element), so tests can drive
// it with plain values: an input event is `input(value)`, a key in the field is `key(...)`.
//
// The game's own key reading is not used for typing here: the field's key events are stopped
// before they reach the window (touch-ui), so a letter is never typed twice, and a soft
// keyboard's (trusted) key never hides the touch layer as a "real keyboard".

export interface TextHost {
  // True while a screen wants the player to type (the sync key screen).
  wantsText(): boolean;
  // What the game holds as the text right now.
  textValue(): string;
  // The player's whole text, as the field holds it. A pasted pairing link is reduced to its key
  // by the game (`keyFromText`).
  setText(text: string): void;
}

export class TextEntry {
  constructor(
    private readonly host: TextHost,
    // One quick key press for the game (the pad's `tapKey`).
    private readonly tapKey: (code: string) => void,
  ) {}

  get wanted(): boolean {
    return this.host.wantsText();
  }

  // The field's value changed (typing, deleting, a paste bubble, autofill).
  input(value: string): void {
    if (this.wanted) this.host.setText(value);
  }

  // A key pressed in the field. Enter and Escape are the game's keys; everything else is text
  // and arrives by `input`. Returns true when it was one of the two.
  key(key: string): boolean {
    if (!this.wanted) return false;
    if (key === "Enter") this.tapKey("Enter");
    else if (key === "Escape") this.tapKey("Escape");
    else return false;
    return true;
  }

  // Pasted text (the paste event, or the PASTE button). It replaces what was there, the way
  // pasting into a selected field does, and the field is set to what the game now holds.
  paste(text: string): string {
    if (this.wanted) this.host.setText(text);
    return this.host.textValue();
  }

  // What the field should show now, or null when it already shows it (called every frame; the
  // game may clear the text, for example after a key it did not accept).
  syncValue(current: string): string | null {
    const want = this.wanted ? this.host.textValue() : "";
    // A pasted link comes back as the key it holds, and spaces are trimmed: the field follows the game.
    return want === current ? null : want;
  }
}
