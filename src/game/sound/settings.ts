import type { KeyValueStorage } from "../achievements/progress";

// What is remembered between visits: whether sound is muted and which record
// is on the player (null for none). Every read and write is guarded, so
// blocked or missing storage, or a damaged or old save, just gives the defaults.
export interface SoundSettings {
  muted: boolean;
  track: string | null;
}

export const DEFAULT_SETTINGS: SoundSettings = { muted: false, track: null };

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
