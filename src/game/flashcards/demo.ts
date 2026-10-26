import { FLASHCARDS as F } from "../config";
import type { CardView, Grade, OpenResult, StudyBackend, StudySession } from "./study";

// The practice deck (issue 026): no server, no key, no schedule and no points.
// It is for trying the screens and tuning the mumblespeak voice without
// depending on the state of the real app. Open the game with `?flashcards=demo`
// in a dev build, or set `FLASHCARDS.backend` to "demo". It has both kinds of
// card (Spanish shown first, and English shown first), accents, a long word, a
// long phrase and a hint sentence, so each way the voice gets used is in reach.

const recognition = (slug: string, spanish: string, english: string, hint?: string): CardView => ({
  slug,
  prompt: spanish,
  answer: english,
  ...(hint ? { hint } : {}),
  spoken: spanish,
  speaks: "front",
});
const production = (slug: string, english: string, spanish: string, hint?: string): CardView => ({
  slug,
  prompt: english,
  answer: spanish,
  ...(hint ? { hint } : {}),
  spoken: spanish,
  speaks: "back",
});

export const DEMO_CARDS: CardView[] = [
  recognition("yo", "yo", "I"),
  production("querer", "to want", "querer", "Yo quiero un café."),
  recognition("casa", "casa", "house"),
  production("tambien", "also", "también"),
  recognition("nino", "niño", "boy, child", "El niño duerme."),
  production("cancion", "song", "canción"),
  recognition("manana", "mañana", "tomorrow, morning"),
  production("cafe", "coffee", "café"),
  recognition("aeiou", "aeiou", "vowels only"),
  production("ferrocarril", "railway", "ferrocarril"),
  recognition("hasta", "hasta luego", "see you later"),
  production("noche", "good night", "buenas noches", "Que descanses."),
  recognition("murcielago", "murciélago", "bat"),
  production("pronto", "see you soon", "hasta pronto"),
  recognition("larga", "dónde está la biblioteca", "where is the library"),
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
  usesKey: false,
  async open(): Promise<OpenResult> {
    return new DemoSession();
  },
};
