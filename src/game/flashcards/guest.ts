import type { KeyValueStorage } from "../achievements/progress";
import { FLASHCARDS as F } from "../config";
import type { Core } from "./core";
import { RealSession } from "./real";
import type { Grade, OpenResult, StudyBackend } from "./study";

// Studying without a sync key (issue 089, docs/flashcards-guest.md). The same
// core and the same deck as a key holder, but the progress is the string the
// core's `grade` returns, kept in this browser's localStorage and nowhere else:
// no call to the progress endpoint, only the static core file is fetched.
//
// Kept small on purpose (Marc, 2026-10-27: guest mode only keeps the feature from
// being broken for people who are not him). The blob is read once when a session
// opens and written after each answer, last write wins, so two tabs at once can
// lose an answer. A guest's progress is not guarded any further than that.

// One blob per language, so German could be added without moving anything.
export const guestStorageKey = (language: string = F.language): string => `life.flashcards.guest.${language}.v1`;

// Forgets the guest's cards (the game's own reset and "Start again"). Never throws.
export function clearGuestCards(storage: KeyValueStorage | null): void {
  try {
    storage?.removeItem(guestStorageKey());
  } catch {
    // Blocked storage has nothing to clear.
  }
}

class GuestSession extends RealSession {
  // Set when there is nowhere to keep answers; the session then still works, from memory.
  unsaved: boolean;

  constructor(
    core: Core,
    blob: string | null,
    private readonly storage: KeyValueStorage | null,
    unsaved: boolean,
    now: () => number,
  ) {
    const never = async (): Promise<never> => {
      throw new Error("A guest has no server");
    };
    super(core, blob, never, never, now);
    this.unsaved = unsaved;
  }

  async grade(slug: string, grade: Grade): Promise<boolean> {
    try {
      this.local = this.core.grade(this.local, slug, grade === "gotit", this.now(), F.language);
    } catch (error) {
      console.warn("Flashcards: an answer could not be recorded:", error instanceof Error ? error.message : error);
      return false;
    }
    try {
      if (!this.storage) throw new Error("No storage");
      this.storage.setItem(guestStorageKey(), this.local);
    } catch {
      // The answer counts for this visit only, and pays nothing.
      this.unsaved = true;
    }
    return true;
  }
}

export interface GuestOptions {
  core: () => Promise<Core>;
  storage: KeyValueStorage | null;
  now?: () => number;
}

export function guestBackend(options: GuestOptions): StudyBackend {
  const now = options.now ?? Date.now;
  return {
    paysPoints: true,
    usesKey: false,
    forget: () => clearGuestCards(options.storage),
    async open(): Promise<OpenResult> {
      let core: Core;
      try {
        core = await options.core();
      } catch (error) {
        console.warn("Flashcards: could not load the core:", error instanceof Error ? error.message : error);
        return "offline";
      }
      let blob: string | null = null;
      let unsaved = false;
      try {
        if (!options.storage) unsaved = true;
        else blob = options.storage.getItem(guestStorageKey()) || null;
      } catch {
        unsaved = true;
      }
      try {
        return new GuestSession(core, blob, options.storage, unsaved, now);
      } catch (error) {
        // The core refuses the saved cards. They are left as they are; the
        // player may choose to start again.
        console.warn("Flashcards: the saved cards could not be read:", error instanceof Error ? error.message : error);
        return "unreadable";
      }
    },
  };
}
