import { FLASHCARDS as F } from "../config";
import type { Core } from "./core";
import type { CardView, Grade, OpenResult, StudyBackend, StudySession } from "./study";

// The real backend (issue 026 stage 2): the flashcards app's own core for every
// decision, and its sync server as a blob store. A study loop is the app's own:
// GET, `session`, then for each answer `grade`, GET, `merge`, PUT. The game
// never edits the blob any other way, and never keeps an answer it could not
// deliver: the local copy only moves on once the PUT has gone through, so the
// real schedule is never silently wrong.

export interface RealOptions {
  core: () => Promise<Core>;
  fetch?: typeof fetch;
  origin?: string;
  now?: () => number;
}

const nfc = (text: string) => text.normalize("NFC");

class RealSession implements StudySession {
  private readonly slugs: string[];

  constructor(
    private readonly core: Core,
    private local: string | null,
    private readonly pull: () => Promise<string | null>,
    private readonly push: (progress: string) => Promise<void>,
    private readonly now: () => number,
  ) {
    this.slugs = core.session(local, now(), F.language);
  }

  queue(): string[] {
    return [...this.slugs];
  }

  card(slug: string): CardView {
    const c = this.core.card(this.local, slug, F.language);
    return {
      slug,
      prompt: nfc(c.prompt),
      answer: nfc(c.answers.join(", ")),
      ...(c.example ? { hint: nfc(c.example) } : {}),
    };
  }

  requeue(queue: string[], position: number, slug: string): string[] {
    return this.core.requeue(slug, position, queue);
  }

  async grade(slug: string, grade: Grade): Promise<boolean> {
    try {
      const next = this.core.grade(this.local, slug, grade === "gotit", this.now(), F.language);
      const merged = this.core.merge(next, await this.pull(), F.language);
      await this.push(merged);
      this.local = merged;
      return true;
    } catch (error) {
      console.warn("Flashcards: an answer was not delivered:", error instanceof Error ? error.message : error);
      return false;
    }
  }
}

export function realBackend(options: RealOptions): StudyBackend {
  const origin = (options.origin ?? F.origin).replace(/\/+$/, "");
  const now = options.now ?? Date.now;
  const doFetch: typeof fetch = options.fetch ?? ((...args) => fetch(...args));

  return {
    paysPoints: true,
    async open(key): Promise<OpenResult> {
      const url = `${origin}/api/progress/${key}/${F.language}`;
      const pull = async (): Promise<string | null> => {
        const response = await doFetch(url, { cache: "no-store" });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`The server answered ${response.status}`);
        return response.text();
      };
      const push = async (progress: string): Promise<void> => {
        const response = await doFetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: progress,
        });
        if (!response.ok) throw new Error(`The server answered ${response.status} to the save`);
      };
      try {
        const response = await doFetch(url, { cache: "no-store" });
        if (response.status === 400) return "bad-key";
        if (response.status !== 404 && !response.ok) return "offline";
        const blob = response.status === 404 ? null : await response.text();
        const core = await options.core();
        try {
          return new RealSession(core, blob, pull, push, now);
        } catch (error) {
          // The core refused what the server holds (a newer format, or damage).
          // Nothing is written; the app is left to deal with it.
          console.warn("Flashcards: the saved cards could not be read:", error instanceof Error ? error.message : error);
          return "unreadable";
        }
      } catch (error) {
        console.warn("Flashcards: could not reach the app:", error instanceof Error ? error.message : error);
        return "offline";
      }
    },
  };
}
