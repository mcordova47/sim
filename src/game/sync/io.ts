import { browserClipboard, type ClipboardLike } from "../../input/clipboard";
import { SYNC } from "../config";

// What the transfer page needs from the browser besides the clipboard: saving a file and choosing one.
// Tests pass a fake; `browserIO` is the real one.

export type PickedFile = { text: string } | { tooBig: true } | null;

export interface TransferIO extends ClipboardLike {
  // Offers `text` as a download. False if it could not.
  saveFile(name: string, text: string): boolean;
  // Opens the file chooser. It must be called straight from the tap or key press (iOS needs that).
  // Null for none chosen (or never answered, when the chooser is cancelled on a browser that says nothing).
  pickFile(): Promise<PickedFile>;
}

export const browserIO: TransferIO = {
  ...browserClipboard,

  saveFile(name, text) {
    try {
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    } catch {
      return false;
    }
  },

  pickFile() {
    return new Promise((resolve) => {
      try {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,.txt,application/json,text/plain";
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return resolve(null);
          if (file.size > SYNC.maxChars) return resolve({ tooBig: true });
          file.text().then((text) => resolve({ text }), () => resolve(null));
        };
        input.click();
      } catch {
        resolve(null);
      }
    });
  },
};
