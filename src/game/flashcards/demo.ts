import { FLASHCARDS as F } from "../config";
import type { CardView, Grade, OpenResult, StudyBackend, StudySession } from "./study";

// A stand-in for the flashcards app, for stage 1 and for tests: a few cards,
// no server, no schedule. It pays no points. The real backend replaces it in
// stage 2 (config `FLASHCARDS.backend`).

export const DEMO_CARDS: CardView[] = [
  { slug: "yo", prompt: "I", answer: "yo" },
  { slug: "querer", prompt: "to want", answer: "querer" },
  { slug: "casa", prompt: "house", answer: "casa" },
  { slug: "tambien", prompt: "also", answer: "también" },
  { slug: "nino", prompt: "boy, child", answer: "niño" },
  { slug: "cancion", prompt: "song", answer: "canción" },
  { slug: "cafe", prompt: "coffee", answer: "café" },
  { slug: "manana", prompt: "tomorrow, morning", answer: "mañana" },
  { slug: "tiempo", prompt: "time, weather", answer: "tiempo" },
  { slug: "dormir", prompt: "to sleep", answer: "dormir" },
];

export class DemoSession implements StudySession {
  readonly graded: { slug: string; grade: Grade }[] = [];

  constructor(private readonly cards: CardView[] = DEMO_CARDS) {}

  queue(): string[] {
    return this.cards.map((c) => c.slug);
  }

  card(slug: string): CardView {
    const card = this.cards.find((c) => c.slug === slug);
    if (!card) throw new Error(`No such card: ${slug}`);
    return card;
  }

  requeue(queue: string[], position: number, slug: string): string[] {
    const out = [...queue];
    out.splice(Math.min(out.length, position + 1 + F.requeueGap), 0, slug);
    return out;
  }

  async grade(slug: string, grade: Grade): Promise<boolean> {
    this.graded.push({ slug, grade });
    return true;
  }
}

export const demoBackend: StudyBackend = {
  paysPoints: false,
  async open(): Promise<OpenResult> {
    return new DemoSession();
  },
};
