// Copying text out of the game and pasting it in, for the track editor's
// export and import. Browsers differ in what they allow, so each way has a
// fallback and none of them throws. Tests pass a fake `ClipboardLike`.

export interface ClipboardLike {
  // Copies `text`. False if it could not (the text is then printed to the console).
  copy(text: string): Promise<boolean>;
  // The clipboard's text, or null if the browser will not say (ask the player to press Ctrl+V).
  read(): Promise<string | null>;
  // Calls `listener` when the player pastes (Ctrl+V). Returns a way to stop listening.
  onPaste(listener: (text: string) => void): () => void;
}

// Copies with a hidden text box, for pages that may not use the clipboard API.
function copyWithTextArea(text: string): boolean {
  if (typeof document === "undefined" || !document.body) return false;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  try {
    area.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

export const browserClipboard: ClipboardLike = {
  async copy(text) {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fall through to the other ways.
    }
    if (copyWithTextArea(text)) return true;
    console.log(text);
    return false;
  },

  async read() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) return await navigator.clipboard.readText();
    } catch {
      // Not allowed: the caller asks for Ctrl+V.
    }
    return null;
  },

  onPaste(listener) {
    if (typeof window === "undefined") return () => {};
    const handler = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData("text");
      if (typeof text === "string") listener(text);
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  },
};

// The phone's share sheet (issue 106d). `share` must be called straight from a tap, before any await, or
// the browser refuses it. It says what happened so the caller can fall back to Copy.
export type ShareResult = "shared" | "cancelled" | "unsupported" | "failed";

export interface ShareLike {
  share(title: string, text: string): Promise<ShareResult>;
}

export const browserShare: ShareLike = {
  async share(title, text) {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") return "unsupported";
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (error) {
      // The player closing the sheet is a choice, not a failure.
      return (error as { name?: string } | null)?.name === "AbortError" ? "cancelled" : "failed";
    }
  },
};
