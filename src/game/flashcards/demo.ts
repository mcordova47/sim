import { FLASHCARDS as F } from "../config";
import type { CardView, Grade, OpenResult, StudyBackend, StudySession } from "./study";

// The practice deck (issue 026): no server, no key, no schedule and no points.
// It is for trying the screens and tuning the mumblespeak voice without
// depending on the state of the real app. Open the game with `?flashcards=demo`
// in a dev build, or set `FLASHCARDS.backend` to "demo". It has both kinds of
// card (Spanish shown first, and English shown first), accents, a long word, a
// long phrase and a hint sentence, so each way the voice gets used is in reach.

// `ipa` is a hand-written es-MX transcription (broad, stress with ˈ), standing in
// for the flashcards app's `IPA es-MX` column until that exists.
const recognition = (slug: string, spanish: string, english: string, ipa: string, hint?: string): CardView => ({
  slug,
  prompt: spanish,
  answer: english,
  ...(hint ? { hint } : {}),
  spoken: spanish,
  ipa,
  speaks: "front",
});
const production = (slug: string, english: string, spanish: string, ipa: string, hint?: string): CardView => ({
  slug,
  prompt: english,
  answer: spanish,
  ...(hint ? { hint } : {}),
  spoken: spanish,
  ipa,
  speaks: "back",
});

export const DEMO_CARDS: CardView[] = [
  recognition("yo", "yo", "I", "ˈʝo"),
  production("querer", "to want", "querer", "keˈɾeɾ", "Yo quiero un café."),
  recognition("casa", "casa", "house", "ˈkasa"),
  production("tambien", "also", "también", "tamˈbjen"),
  recognition("nino", "niño", "boy, child", "ˈniɲo", "El niño duerme."),
  production("cancion", "song", "canción", "kanˈsjon"),
  recognition("manana", "mañana", "tomorrow, morning", "maˈɲana"),
  production("cafe", "coffee", "café", "kaˈfe"),
  recognition("aeiou", "aeiou", "vowels only", "ˈaeiou"),
  production("ferrocarril", "railway", "ferrocarril", "ferokaˈril"),
  recognition("hasta", "hasta luego", "see you later", "ˈasta ˈlweɡo"),
  production("noche", "good night", "buenas noches", "ˈbwenas ˈnotʃes", "Que descanses."),
  recognition("murcielago", "murciélago", "bat", "muɾˈsjelaɡo"),
  production("pronto", "see you soon", "hasta pronto", "ˈasta ˈpɾonto"),
  recognition("larga", "dónde está la biblioteca", "where is the library", "ˈdonde esˈta la bibljoˈteka"),
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
