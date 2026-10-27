import type { KeyValueStorage } from "../achievements/progress";
import { MUSIC, SOUND } from "../config";

export type DialogVoice = (typeof SOUND.dialogVoices)[number];

// What is remembered between visits: whether sound is muted, the ad blocker and which record
// is on the player (null for none). Every read and write is guarded, so
// blocked or missing storage, or a damaged or old save, just gives the defaults.
export interface SoundSettings {
  muted: boolean;
  track: string | null;
  // Game minutes left before choosing a record pays again (issue 068). Saved so a
  // reload cannot skip the wait; it counts down in game time while the game runs.
  payoutLeft: number;
  // How dialog text sounds as it types (issue 075): the spelling
  // voice's letters (the default since issue 077), or the plain beep. Only a save
  // that says "beep" and was chosen by the player means the beep; an old save, an
  // automatic "beep" or a junk value means letters.
  dialogVoice: DialogVoice;
  // True once the player pressed D (issue 077). Since 075 the game wrote a plain
  // "beep" into every save, so a saved "beep" only counts as a choice with this.
  dialogVoiceChosen: boolean;
  // The ad blocker switch (issue 043 stage B): on means no ad encounters. A preference, so
  // resetting progress leaves it alone. Off unless the save says exactly `true`.
  adBlocker: boolean;
}

export const DEFAULT_SETTINGS: SoundSettings = { muted: false, track: null, payoutLeft: 0, dialogVoice: "letters", dialogVoiceChosen: false, adBlocker: false };

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
      const chosen = r.dialogVoiceChosen === true;
      return {
        muted: r.muted === true,
        track: typeof r.track === "string" ? r.track : null,
        payoutLeft: typeof r.payoutLeft === "number" && Number.isFinite(r.payoutLeft) ? Math.min(MUSIC.payoutEveryMinutes, Math.max(0, r.payoutLeft)) : 0,
        dialogVoice: r.dialogVoice === "beep" && chosen ? "beep" : "letters",
        dialogVoiceChosen: chosen,
        adBlocker: r.adBlocker === true,
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
