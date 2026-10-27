import type { Direction } from "./direction";
import type { Interactable } from "./interactable";
import type { Level } from "./level";
import type { Track } from "./music/track";
import type { Award } from "./scoring";

// Things that happen in the game that other features (sound, particles,
// achievements, the day/night cycle) can react to. Payloads are plain objects.
export interface GameEvents {
  // The player arrived on a new tile, having walked in `direction`.
  step: { col: number; row: number; direction: Direction };
  // The player tried to walk into something solid. `col` and `row` are the tile
  // they ran into. Announced once per attempt, not every frame while pushing.
  bump: { col: number; row: number; direction: Direction };
  // The player walked through a doorway and is now in room `id`.
  room: { id: string; level: Level };
  taskStart: { item: Interactable };
  taskComplete: { item: Interactable; award: Award };
  // A task's activity ended without finishing (the player backed out): no
  // points, no changes to the apartment, no cooldown.
  taskCancelled: { item: Interactable };
  // A named moment in a cutscene (for sound and animation features to react to).
  cue: { name: string };
  // The player pressed interact but the task in reach is not ready yet.
  // `message` is the reason shown to the player when `reason` is "requirement".
  taskBlocked: { item: Interactable; reason: "cooldown" | "requirement"; message?: string };
  // A state variable changed. Sent after all the changes of the same moment
  // (all of a task's effects) have applied. Time-driven changes are sent when
  // the whole-number part changes: the clock once per in-game hour. See docs/state.md.
  stateChanged: { id: string; value: number; previous: number };
  // The track editor wants `track` played over the music (null: put the record
  // back). `live` means swap it in at the end of the loop. See ActivityHost.previewTrack.
  preview: { track: Track | null; live: boolean };
  // The track editor sounded a note at `freq` Hz.
  blip: { freq: number };
  // One sound of the flashcards' voice: `effect` from SOUND.effects ("mumble" if
  // missing), `pitch` as a multiple of its frequencies, `gain` as a multiple of its loudness.
  voice: { pitch: number; effect?: string; gain?: number };
  // The record player picked a record, a demo or silence (`id` null), and it is
  // now on. `paid` is true when the choice also pays (issue 068). Sent just
  // before the task ends.
  record: { id: string | null; paid: boolean };
  // A dialog or menu opened or closed.
  dialogOpen: Record<string, never>;
  // `path` is every label picked in the dialog (empty if none); `cancelled` is
  // true if the player backed out of a menu to end it.
  dialogClose: { path: string[]; cancelled: boolean };
  // The player picked an entry in a menu. `path` is every label picked so far
  // in this dialog, oldest first, ending with `label`.
  dialogChoose: { label: string; path: string[] };
}

type Listener<T> = (payload: T) => void;

// Each subscription is its own entry, so subscribing the same function twice
// calls it twice and each unsubscribe removes just its own.
interface Entry {
  call: Listener<never>;
}

// A tiny typed event emitter. A listener that throws is reported and skipped,
// so one broken feature can't stop the game or the other listeners. Every
// listener of an event gets the same payload object, so treat it as read-only.
export class Emitter<E extends object> {
  private listeners = new Map<keyof E, Set<Entry>>();

  // Returns a function that removes the listener again.
  on<K extends keyof E>(name: K, listener: Listener<E[K]>): () => void {
    let set = this.listeners.get(name);
    if (!set) this.listeners.set(name, (set = new Set()));
    const entry: Entry = { call: listener as Listener<never> };
    set.add(entry);
    return () => {
      set.delete(entry);
    };
  }

  emit<K extends keyof E>(name: K, payload: E[K]): void {
    // Copy first, so listeners can unsubscribe themselves while being called.
    for (const entry of [...(this.listeners.get(name) ?? [])]) {
      try {
        (entry.call as Listener<E[K]>)(payload);
      } catch (error) {
        console.error(`Listener for "${String(name)}" threw`, error);
      }
    }
  }
}
