// What the PHOTOS page needs from the browser (issue 113c, docs/photo-reel-design.md section 4):
// choosing pictures, decoding one at a time, and asking the browser to keep storage. Tests pass a
// fake; `browserPhotoIO` is the real one. Nothing here reads a file name, a date or any EXIF value:
// the decoder hands back pixels only.

export interface DecodedImage {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface PhotoIO {
  // Opens the picture chooser. It must be called straight from the tap or key press (iOS refuses a
  // chooser opened later). Null for none chosen; on a cancel some browsers never answer at all.
  pickImages(): Promise<Blob[] | null>;
  // One picture to pixels, no larger than about 256 on the long side, upright. Null when it cannot
  // be read. The big bitmap is released before this returns.
  decode(file: Blob): Promise<DecodedImage | null>;
  // Asks the browser not to clear what was stored. Best effort.
  keepStorage(): void;
}

export const DECODE_LONG_SIDE = 256;

let chooser: HTMLInputElement | null = null;

function scaledSize(w: number, h: number): { w: number; h: number } {
  const k = Math.min(1, DECODE_LONG_SIDE / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

async function bitmapOf(file: Blob): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === "function") {
    try {
      // `from-image` turns a rotated phone photo upright; `low` is a cheap shrink while decoding.
      return await createImageBitmap(file, { imageOrientation: "from-image", resizeWidth: DECODE_LONG_SIDE, resizeQuality: "low" });
    } catch {
      // Fall through to an image element.
    }
  }
  if (typeof document === "undefined") return null;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    return null;
  } finally {
    // The element has what it needs once decoded.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export const browserPhotoIO: PhotoIO = {
  pickImages() {
    return new Promise((resolve) => {
      try {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.multiple = true;
        chooser = input; // Kept so it is not collected before the answer (it is not on the page).
        const finish = (files: Blob[] | null) => {
          if (chooser === input) chooser = null;
          resolve(files);
        };
        input.onchange = () => finish(input.files && input.files.length > 0 ? Array.from(input.files) : null);
        input.oncancel = () => finish(null);
        input.click();
      } catch {
        resolve(null);
      }
    });
  },

  async decode(file) {
    const source = await bitmapOf(file);
    if (!source) return null;
    try {
      const sw = "naturalWidth" in source ? source.naturalWidth : source.width;
      const sh = "naturalHeight" in source ? source.naturalHeight : source.height;
      if (!(sw > 0 && sh > 0)) return null;
      const { w, h } = scaledSize(sw, sh);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(source, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h);
      return { rgba: data.data, width: w, height: h };
    } catch {
      return null;
    } finally {
      if ("close" in source) source.close();
    }
  },

  keepStorage() {
    try {
      void navigator.storage?.persist?.().catch(() => {});
    } catch {
      // Not available: nothing to do.
    }
  },
};
