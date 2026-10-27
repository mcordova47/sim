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

// The voices V steps between in the practice deck while two are being compared
// (indexes into `VOICE_STYLES`: 11 faster, 13 fastest; 12 consfast is still there with `&voices=all`). `&voices=all` in the
// address steps through every voice.
export const DEMO_VOICES: readonly number[] = [11, 13];

// Four sets, to hear the voice on different things:
// - sentences: phonetically rich sentences that, between them, use every sound the
//   voice has (the audio equivalent of "the quick brown fox");
// - diphthongs: the glides in a word, against the hiatus that looks the same (día
//   is two vowels, Dios a glide), and a triphthong;
// - consonants: each consonant between two a's (aba, ada, ...), the usual way to
//   compare consonants;
// - words: the first practice deck, single words, both card directions.
export const DEMO_SETS = {
  sentences: [
    recognition("fox", "El veloz murciélago hindú comía feliz cardillo y kiwi.", "The speedy Indian bat happily ate thistle and kiwi.", "el beˈlos muɾˈsjelaɡo inˈdu koˈmia feˈlis kaɾˈdiʝo i ˈkiwi"),
    recognition("chico", "El chico pequeño juega con un perro rojo en la montaña.", "The small boy plays with a red dog in the mountains.", "el ˈtʃiko peˈkeɲo ˈxweɡa kon un ˈpero ˈroxo en la monˈtaɲa"),
  ],
  diphthongs: [
    recognition("aire", "aire", "air (a then i, one syllable)", "ˈajɾe"),
    recognition("peine", "peine", "comb (e then i)", "ˈpejne"),
    recognition("hoy", "hoy", "today (o then i)", "ˈoj"),
    recognition("causa", "causa", "cause (a then u)", "ˈkawsa"),
    recognition("europa", "Europa", "Europe (e then u)", "ewˈɾopa"),
    recognition("hacia", "hacia", "toward (glide i, then a)", "ˈasja"),
    recognition("bien", "bien", "well (glide i, then e)", "ˈbjen"),
    recognition("dios", "Dios", "God (glide i, then o)", "ˈdjos"),
    recognition("ciudad", "ciudad", "city (glide i, then u)", "sjuˈdad"),
    recognition("agua", "agua", "water (glide u, then a)", "ˈaɡwa"),
    recognition("bueno", "bueno", "good (glide u, then e)", "ˈbweno"),
    recognition("antiguo", "antiguo", "ancient (glide u, then o)", "anˈtiɡwo"),
    recognition("cuidado", "cuidado", "care (glide u, then i)", "kwiˈdado"),
    recognition("estudiais", "estudiáis", "you study (a triphthong: glide, vowel, glide)", "estuˈdjajs"),
    recognition("uruguay", "Uruguay", "Uruguay (glide u, a, glide)", "uɾuˈɡwaj"),
    recognition("dia", "día", "day (two vowels, not a glide: compare Dios)", "ˈdia"),
    recognition("rio", "río", "river (two vowels, not a glide)", "ˈrio"),
  ],
  consonants: [
    ["b", "ˈaba"], ["d", "ˈada"], ["g", "ˈaɡa"], ["p", "ˈapa"], ["t", "ˈata"], ["k", "ˈaka"],
    ["f", "ˈafa"], ["s", "ˈasa"], ["x", "ˈaxa"], ["ch", "ˈatʃa"], ["m", "ˈama"], ["n", "ˈana"],
    ["ñ", "ˈaɲa"], ["l", "ˈala"], ["r (tap)", "ˈaɾa"], ["rr (trill)", "ˈara"], ["y", "ˈaʝa"],
  ].map(([name, ipa]) => {
    const spoken = ipa.replace(/ˈ/g, "").replace(/ɾ/g, "r").replace(/ɲ/g, "ñ").replace(/ʝ/g, "y").replace(/ɡ/g, "g").replace(/tʃ/g, "ch").replace(/x/g, "j").replace(/^ara$/, "arra");
    return recognition(`vcv-${name}`, spoken, `${name} between two a's`, ipa);
  }),
  words: [
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
  ],
} satisfies Record<string, CardView[]>;

export type DemoSet = keyof typeof DEMO_SETS;

// Everything, in the order worth listening in: the sentences, the diphthongs, the
// consonants, then the words.
export const DEMO_CARDS: CardView[] = [...DEMO_SETS.sentences, ...DEMO_SETS.diphthongs, ...DEMO_SETS.consonants, ...DEMO_SETS.words];

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

// The practice backend over one of the sets (`?flashcards=demo&set=diphthongs`),
// or over all of them.
export function demoBackendFor(set?: string | null, voices?: string | null): StudyBackend {
  const cards = set && Object.hasOwn(DEMO_SETS, set) ? DEMO_SETS[set as DemoSet] : DEMO_CARDS;
  return {
    paysPoints: false,
    usesKey: false,
    // V steps between the voices being compared; `&voices=all` brings back them all.
    ...(voices === "all" ? {} : { voiceCycle: DEMO_VOICES }),
    async open(): Promise<OpenResult> {
      return new DemoSession(cards);
    },
  };
}

export const demoBackend: StudyBackend = {
  paysPoints: false,
  usesKey: false,
  async open(): Promise<OpenResult> {
    return new DemoSession();
  },
};
