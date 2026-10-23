import type { Award } from "./scoring";
import type { Interactable } from "./interactable";

// Things that happen in the game that other features (sound, particles,
// achievements, the day/night cycle) can react to. Payloads are plain objects.
export interface GameEvents {
  jump: Record<string, never>;
  // Touching the ground after being airborne; `speed` is the impact in px/s.
  land: { speed: number };
  taskStart: { item: Interactable };
  taskComplete: { item: Interactable; award: Award };
  // The player pressed interact but the task in reach is not ready yet.
  taskBlocked: { item: Interactable; reason: "cooldown" };
}

type Listener<T> = (payload: T) => void;

// A tiny typed event emitter. A listener that throws is reported and skipped,
// so one broken feature can't stop the game or the other listeners.
export class Emitter<E extends object> {
  private listeners = new Map<keyof E, Set<Listener<never>>>();

  // Returns a function that removes the listener again.
  on<K extends keyof E>(name: K, listener: Listener<E[K]>): () => void {
    let set = this.listeners.get(name);
    if (!set) this.listeners.set(name, (set = new Set()));
    set.add(listener as Listener<never>);
    return () => {
      set.delete(listener as Listener<never>);
    };
  }

  emit<K extends keyof E>(name: K, payload: E[K]): void {
    // Copy first, so listeners can unsubscribe themselves while being called.
    for (const listener of [...(this.listeners.get(name) ?? [])]) {
      try {
        (listener as Listener<E[K]>)(payload);
      } catch (error) {
        console.error(`Listener for "${String(name)}" threw`, error);
      }
    }
  }
}
