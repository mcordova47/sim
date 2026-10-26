import type { KeyValueStorage } from "../achievements/progress";
import { MUSIC } from "../config";

// What is remembered between visits: whether sound is muted and which record
// is on the player (null for none). Every read and write is guarded, so
// blocked or missing storage, or a damaged or old save, just gives the defaults.
export interface SoundSettings {
  muted: boolean;
  track: string | null;
  // Game minutes left before choosing a record pays again (issue 068). Saved so a
  // reload cannot skip the wait; it counts down in game time while the game runs.
  payoutLeft: number;
}

export const DEFAULT_SETTINGS: SoundSettings = { muted: false, track: null, payoutLeft: 0 };

export class SettingsStore {
  constructor(
    private readonly storage: KeyValueStorage | null,
    private readonly key: string,
  ) {}

  load(): SoundSettings {
    try {
      const text = this.storage?.getItem(this.key);
      if (!text) return { ...DEFAULT_SETTINGS };
      const raw: unknown = JSON.parse(text);
      if (typeof raw !== "object" || raw === null) return { ...DEFAULT_SETTINGS };
      const r = raw as Record<string, unknown>;
      return {
        muted: r.muted === true,
        track: typeof r.track === "string" ? r.track : null,
        payoutLeft: typeof r.payoutLeft === "number" && Number.isFinite(r.payoutLeft) ? Math.min(MUSIC.payoutEveryMinutes, Math.max(0, r.payoutLeft)) : 0,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  save(settings: SoundSettings): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(this.key, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  }
}
