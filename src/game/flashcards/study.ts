// What the study activity needs from the flashcards app, and nothing more. The
// real thing (issue 026 stage 2) is the app's own compiled core plus its sync
// server; tests and the demo use `demo.ts`. The names follow the core's planned
// API (session, card, grade, requeue) and are provisional until the flashcards
// repo confirms them.

export type Grade = "again" | "gotit";

// One card as the screen shows it: the front, the back and an optional hint.
export interface CardView {
  slug: string;
  prompt: string;
  answer: string;
  hint?: string;
  // The Spanish that gets "spoken" (mumblespeak) and the side it appears on.
  // Without them the answer is spoken when the card is flipped.
  spoken?: string;
  speaks?: "front" | "back";
}

export interface StudySession {
  // The slugs to study this session, in order.
  queue(): string[];
  card(slug: string): CardView;
  // `queue` with the card at `position` (which was missed) put back a few places on.
  requeue(queue: string[], position: number, slug: string): string[];
  // Records the answer with the real server. Resolves false if it could not be
  // delivered; the answer is then not kept anywhere, so the app's schedule is
  // never silently wrong.
  grade(slug: string, grade: Grade): Promise<boolean>;
}

// "unreadable": the server holds cards this version of the core refuses (a newer
// format, or damage). Nothing is written.
export type OpenResult = StudySession | "bad-key" | "offline" | "unreadable";

export interface StudyBackend {
  // Whether delivered answers earn game points (the demo's do not).
  readonly paysPoints: boolean;
  open(key: string): Promise<OpenResult>;
}
