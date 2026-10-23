import { VIEW } from "./config";
import type { CutsceneStep } from "./activities/cutscene";

// "Admire the art" (issue 061): the view pushes in on one of the ten pieces,
// three times, and the narration comments on it very seriously. ALL THE TEXT IS
// HERE, one place, for the text review (issue 037). Rules for the lines: plain
// and sincere, never winking; no names, nothing about who made a piece; keep the
// real prints abstract; only characters the pixel font has.
//
// Each piece has three lines, said at the three zoom levels:
//   at 2x  what it is and how it is composed,
//   at 4x  the handling (brushwork, restraint),
//   at 8x  what the work asks of the viewer (the last line; then the view goes back to the room).
// The voice is a completely sincere, slightly pompous critic looking at a real
// painting. It never admits the picture is small, chunky or part of a game; the
// joke is the distance between the lofty words and what is on screen.

export interface ArtPiece {
  id: string;
  // Where the frame is in `view-gallery-wall` (320x192), in picture pixels.
  at: { x: number; y: number; w: number; h: number };
  lines: [string, string, string];
}

export const ART_PIECES: ArtPiece[] = [
  {
    id: "silver-landscape",
    at: { x: 59, y: 4, w: 60, h: 54 },
    lines: [
      "A landscape of real restraint. The eye is led across the field and asked to stay, and it does.",
      "Note the patience in the handling of the sky. Nothing is hurried. Nothing is explained.",
      "A quiet work. It asks only that you give it a moment longer, and rewards you for it.",
    ],
  },
  {
    id: "tall-brown",
    at: { x: 127, y: 13, w: 37, h: 49 },
    lines: [
      "A tall, serious composition. The upright format gives it dignity, and it never once asks for more than it has.",
      "The handling is confident and economical. Warmth comes in at the center, held in check by the dark around it.",
      "It holds the gaze without raising its voice. That is harder to do than it looks.",
    ],
  },
  {
    id: "white-building",
    at: { x: 170, y: 18, w: 55, h: 70 },
    lines: [
      "A building, centered and unafraid of it. One warm note governs the whole composition, and everything else defers to it.",
      "The mood is order. Every part of the lower register has been placed on purpose.",
      "Stay with it. It rewards a steady look, and it has nothing to hide.",
    ],
  },
  {
    id: "small-blue",
    at: { x: 231, y: 28, w: 25, h: 20 },
    lines: [
      "A small work with a large manner. The blue is assured, and the composition does not apologize for its size.",
      "There is great economy in the accents. Each is placed exactly where it is needed and nowhere else.",
      "It asks the viewer to lean in. It is not wrong to.",
    ],
  },
  {
    id: "oak-box",
    at: { x: 228, y: 53, w: 31, h: 37 },
    lines: [
      "A work of real tension, framed in oak. Warm tones press against dark ones, and neither gives way.",
      "The handling is firm. Edges are decided and kept. Nothing is left to chance, or to charm.",
      "This is a work that knows what it is arguing, and argues it plainly.",
    ],
  },
  {
    id: "pale-mat",
    at: { x: 68, y: 63, w: 35, h: 42 },
    lines: [
      "A modest work, generously presented. The wide mat gives the image room to breathe, and the image is grateful.",
      "Three small notes of color keep company with one another. The restraint is complete.",
      "It asks very little of the viewer, and gives a great deal of stillness in return.",
    ],
  },
  {
    id: "dark-animal",
    at: { x: 109, y: 64, w: 54, h: 72 },
    lines: [
      "A single animal stands on a warm ground, facing left. The composition faces left with it. It is not in a hurry.",
      "The mark is bold and unfussy. There is a great deal of confidence in the mass of the figure.",
      "It meets your gaze and does not look away. Few works are this sure of themselves.",
    ],
  },
  {
    id: "green-still-life",
    at: { x: 168, y: 92, w: 38, h: 38 },
    lines: [
      "A still life, composed with care. The objects are set off center, and the eye travels between them without being told to.",
      "There is warmth in the accents and weight in the shadow. The balance is exact.",
      "The longer you look, the more settled it becomes. That is the mark of a considered work.",
    ],
  },
  {
    id: "gold-narrow",
    at: { x: 210, y: 96, w: 30, h: 35 },
    lines: [
      "A narrow work in a gold frame. A single vertical gesture divides the field, and the field accepts it calmly.",
      "The mark is deliberate and slightly softened at its edge. It reads as a pause, not an absence.",
      "Silence is difficult to compose. This work has managed it.",
    ],
  },
  {
    id: "dark-postcard",
    at: { x: 82, y: 111, w: 24, h: 28 },
    lines: [
      "A dark work, low on the left, easy to miss. The composition rewards those willing to look down.",
      "Bands of warm and cool color stand out against the dark, which has been given real depth.",
      "Modest in format, serious in intent. It deserves more attention than it asks for.",
    ],
  },
];

// Where on the screen the piece's center sits, as a fraction of the height. A
// little above the middle, because the dialog box covers the bottom.
const FOCUS_Y = 0.38;
// How long each push in takes, in milliseconds.
const PUSH_MS = [500, 500, 500];

// The window onto the picture at an integer scale, centered on a piece.
export function zoomRect(at: ArtPiece["at"], scale: number): { x: number; y: number; w: number; h: number } {
  const w = VIEW.width / scale;
  const h = VIEW.height / scale;
  const cx = at.x + at.w / 2;
  const cy = at.y + at.h / 2;
  return {
    x: Math.min(VIEW.width - w, Math.max(0, Math.round(cx - w / 2))),
    y: Math.min(VIEW.height - h, Math.max(0, Math.round(cy - FOCUS_Y * h))),
    w,
    h,
  };
}

// The scene for one piece: wall, push to the piece, brushwork, pixels, then
// back to the room.
export function pieceScene(piece: ArtPiece): CutsceneStep[] {
  const [a, b, c] = piece.lines;
  return [
    { wait: 0.6 },
    { zoom: { to: zoomRect(piece.at, 2), ms: PUSH_MS[0] } },
    { say: a },
    { zoom: { to: zoomRect(piece.at, 4), ms: PUSH_MS[1] } },
    { say: b },
    { zoom: { to: zoomRect(piece.at, 8), ms: PUSH_MS[2] } },
    { say: c },
    { unview: true },
  ];
}

// One scene per piece, in order; the cutscene picks by the `artPiece` state variable.
export const ART_SCENES: CutsceneStep[][] = ART_PIECES.map(pieceScene);
