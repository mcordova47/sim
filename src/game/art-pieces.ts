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
//   at 4x  the brushwork,
//   at 8x  the pixels (the last line, and then the view goes back to the room).

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
      "A landscape. The horizon sits low, which gives the sky room. The pale line leads the eye across the field.",
      "The grey of the sky is laid in even, patient strokes. The green below is allowed to be busier.",
      "Up close it is square after square of green. Each one is doing its part.",
    ],
  },
  {
    id: "tall-brown",
    at: { x: 127, y: 13, w: 37, h: 49 },
    lines: [
      "A tall, narrow piece. The upright format suggests a doorway, or a tower. Either way it is built to be climbed with the eye.",
      "The orange is laid in thin vertical bands. The brown around them holds them in place.",
      "At this distance it is brown squares and orange squares. The vertical still holds.",
    ],
  },
  {
    id: "white-building",
    at: { x: 170, y: 18, w: 55, h: 70 },
    lines: [
      "A building, centered in the frame. The red element is the only warm note, and the whole piece is arranged around it.",
      "The checked pattern below is handled with care. Every square is committed to its color.",
      "Up close it is a red block and a yellow block, side by side. Everything around them is white.",
    ],
  },
  {
    id: "small-blue",
    at: { x: 231, y: 28, w: 25, h: 20 },
    lines: [
      "A small blue piece. Small pieces ask you to come closer, and this one rewards it.",
      "The blue is flat and confident. A pink mark and a purple mark are placed exactly where they need to be.",
      "A grid of blues with a few lighter squares. They carry the composition.",
    ],
  },
  {
    id: "oak-box",
    at: { x: 228, y: 53, w: 31, h: 37 },
    lines: [
      "A shallow box frame in oak. The red, orange and yellow blocks press against the brown without apology.",
      "The edges between the blocks are firm. Nothing bleeds into anything else.",
      "Red, orange and yellow squares on brown. The straight edges are the entire argument.",
    ],
  },
  {
    id: "pale-mat",
    at: { x: 68, y: 63, w: 35, h: 42 },
    lines: [
      "A small picture in a wide pale mat. The mat does most of the talking, and the picture lets it.",
      "A green mark, a slate mark and a tan mark sit close together, each aware of the others.",
      "Three kinds of square: green, slate and tan. The rest is mat.",
    ],
  },
  {
    id: "dark-animal",
    at: { x: 109, y: 64, w: 54, h: 72 },
    lines: [
      "A dark animal stands on an orange ground against pale green. It faces left, and the composition faces left with it.",
      "The fur is built from short, uneven strokes. The effort is visible and well spent.",
      "Pixels, dark ones mostly. The animal is a decision made many times in a row.",
    ],
  },
  {
    id: "green-still-life",
    at: { x: 168, y: 92, w: 38, h: 38 },
    lines: [
      "A still life in a green frame. A few objects, set off center and left to be themselves.",
      "An orange shape, a white shape and a navy shape share the table. None of them crowds another.",
      "Orange, white, navy and brown squares, stacked. The brown is the table, and it holds.",
    ],
  },
  {
    id: "gold-narrow",
    at: { x: 210, y: 96, w: 30, h: 35 },
    lines: [
      "A narrow piece in a gold frame. A pale field with one dark upright, which works like a pause.",
      "The dark upright is a single stroke, a little softer at the top. It looks deliberate.",
      "One column of green squares on a field of pale ones. It is a good column.",
    ],
  },
  {
    id: "dark-postcard",
    at: { x: 82, y: 111, w: 24, h: 28 },
    lines: [
      "A dark postcard, low on the left and easy to miss. The composition rewards those who look down.",
      "Bars of yellow and green stand against the dark. The dark has been given real depth.",
      "Dark squares, yellow squares, green squares. It was a postcard and it is now a grid.",
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
