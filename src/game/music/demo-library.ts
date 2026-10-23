import type { KeyValueStorage } from "../achievements/progress";
import { MAKE_TRACKS } from "../config";
import { DemoStore } from "./demo-store";
import { RESERVED_NAMES } from "./demos";
import { TRACKS } from "./records";

// The one store of made tracks the game shares: the editor writes it, the
// record player's menu and the sound feature read it. It is made the first
// time something asks. Tests replace it with `setDemoStore`.

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // Even reading `localStorage` can throw when it is blocked.
  }
}

// A name a made track cannot have: the records' titles and the menus' own words.
export const reservedNames = (): string[] => [...RESERVED_NAMES, ...TRACKS.map((t) => t.title)];

let shared: DemoStore | null = null;

export function demoStore(): DemoStore {
  return (shared ??= new DemoStore(browserStorage(), MAKE_TRACKS.storageKey, { reserved: reservedNames }));
}

export function setDemoStore(store: DemoStore | null): void {
  shared = store;
}
