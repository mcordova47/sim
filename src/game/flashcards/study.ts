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
  // The IPA transcription of `spoken` (no slashes or brackets), if known. With
  // it the card is voiced phoneme by phoneme; without it, letter by letter.
  ipa?: string;
  speaks?: "front" | "back";
}

// The figures on the progress page, all from the app's own core (or, in the
// practice deck, its stand-in). Counts are whole numbers, `nextDueInMs` is
// milliseconds from now to the soonest card that is not yet due, or null.
export interface ProgressSummary {
  total: number;
  seen: number;
  mastered: number;
  dueNow: number;
  dueTomorrow: number;
  nextDueInMs: number | null;
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
  // The figures for the progress page, from the progress as it stands now, or
  // null when the backend cannot report them (the core has no `overview`, or it
  // answered something that is not a set of plain counts). Never made up.
  progress?(): ProgressSummary | null;
  // True when answers are not being kept (a guest whose browser blocks storage);
  // such answers pay nothing.
  readonly unsaved?: boolean;
}

// "unreadable": the server holds cards this version of the core refuses (a newer
// format, or damage). Nothing is written.
export type OpenResult = StudySession | "bad-key" | "offline" | "unreadable";

export interface StudyBackend {
  // Whether delivered answers earn game points (the demo's do not).
  readonly paysPoints: boolean;
  // False for a backend with no account (the practice deck, a guest): the key
  // screen is skipped and no key is remembered. Default true.
  readonly usesKey?: boolean;
  // The dev practice deck: the IPA line, V voices and the taller layout. A guest
  // has no key but is not this.
  readonly practice?: boolean;
  // The voices V steps through (indexes into `VOICE_STYLES`), if not all of them:
  // the practice deck is limited to the ones being compared.
  readonly voiceCycle?: readonly number[];
  // A guest's backend can forget the cards it keeps ("Start again").
  forget?(): void;
  open(key: string): Promise<OpenResult>;
}
