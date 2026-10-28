import { keyFromText, type Fail, type SyncBackend } from "./client";
import type { SyncLocal } from "./local";
import { canon, mergeSaves, normaliseDoc, type SyncDoc, type SyncEnv } from "./merge";

// Pairing and syncing with the server (issue 103, docs/sync.md sections 4.3, 5 and 8). Best effort: every
// call can fail and the game does not care. The merge is the one from issue 102; the server only keeps
// the latest merged document. A device GETs, merges into the game, then PUTs the merged document.

// What the service needs from the game.
export interface SyncHost {
  // The live state as a document.
  doc(): SyncDoc;
  // Merges a remote document into the live game (applied now if nothing is running, else held).
  mergeIncoming(doc: SyncDoc): void;
  now(): number;
  env(): SyncEnv;
}

// The line the sync page shows next to SYNC:.
export type SyncStatus = "off" | "on" | "noConnection" | "keyNotFound" | "unavailable" | "updateGame" | "unreadable" | "refused";

export const STATUS_TEXT: Record<SyncStatus, string> = {
  off: "SYNC: OFF",
  on: "SYNC: ON",
  noConnection: "SYNC: NO CONNECTION",
  keyNotFound: "SYNC: KEY NOT FOUND",
  unavailable: "SYNC: UNAVAILABLE",
  updateGame: "SYNC: UPDATE THE GAME",
  unreadable: "SYNC: SAVE ON THE SERVER IS UNREADABLE",
  refused: "SYNC: THE SERVER REFUSED THE SAVE",
};

const failStatus = (e: Fail): SyncStatus => ({ offline: "noConnection", notFound: "keyNotFound", refused: "refused", full: "unavailable", server: "noConnection" } as const)[e];

// What a document is, apart from who wrote it and the clamp: the part two devices compare.
const content = (d: SyncDoc) => canon({ activeAt: d.activeAt, progress: d.progress, tracks: d.tracks });

export class SyncService {
  private state: SyncStatus | null = null;
  busy = false;

  constructor(
    private readonly backend: SyncBackend,
    private readonly local: SyncLocal,
    private readonly host: SyncHost,
  ) {}

  get key(): string | null {
    return this.local.key();
  }

  status(): SyncStatus {
    if (this.local.key() === null) return "off";
    return this.state ?? "on";
  }

  private async guarded(run: () => Promise<string>): Promise<string> {
    if (this.busy) return "ONE MOMENT";
    this.busy = true;
    try {
      return await run();
    } finally {
      this.busy = false;
    }
  }

  // Joins `key`: reads what is there, merges it into the game, writes the merged save back. True when it worked.
  private async syncWith(key: string): Promise<{ ok: true } | { ok: false; error: SyncStatus }> {
    const got = await this.backend.get(key);
    if (!got.ok) return { ok: false, error: failStatus(got.error) };
    let remote: SyncDoc | null = null;
    if (got.value !== null) {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(got.value);
      } catch {
        // Not JSON: left alone, below.
      }
      const read = normaliseDoc(parsed, this.host.env());
      // A save that cannot be read, or is from a newer game, is never overwritten.
      if (!read.ok) return { ok: false, error: read.error === "newer" ? "updateGame" : "unreadable" };
      remote = read.doc;
    }
    const live = this.host.doc();
    const merged = remote ? mergeSaves(live, remote, this.host.now()) : live;
    if (remote) this.host.mergeIncoming(remote);
    if (!remote || content(merged) !== content(remote)) {
      const put = await this.backend.put(key, JSON.stringify(merged));
      if (!put.ok) return { ok: false, error: failStatus(put.error) };
    }
    return { ok: true };
  }

  private report(error: SyncStatus): string {
    this.state = error;
    return STATUS_TEXT[error].replace("SYNC: ", "");
  }

  // TURN ON SYNC: asks the server for a key, keeps it, and saves this device's progress there.
  turnOn(): Promise<string> {
    return this.guarded(async () => {
      let key = this.local.key();
      if (key === null) {
        const minted = await this.backend.mint();
        if (!minted.ok) return this.report(failStatus(minted.error));
        key = minted.value;
        this.local.setKey(key);
      }
      const done = await this.syncWith(key);
      if (!done.ok) return this.report(done.error);
      this.state = null;
      return "SYNC IS ON";
    });
  }

  // SYNC NOW.
  syncNow(): Promise<string> {
    return this.guarded(async () => {
      const key = this.local.key();
      if (key === null) return "SYNC IS OFF";
      const done = await this.syncWith(key);
      if (!done.ok) return this.report(done.error);
      this.state = null;
      return "SYNCED";
    });
  }

  // A pasted key or link (or the one from the address bar): checked on the server first, so a wrong one
  // changes nothing, then joined with a merge, so this device's own progress is never lost.
  pair(text: string): Promise<string> {
    return this.guarded(async () => {
      const key = keyFromText(text);
      if (key === null) return "THAT IS NOT A SYNC KEY OR LINK";
      const done = await this.syncWith(key);
      if (!done.ok) return this.report(done.error);
      this.local.setKey(key);
      this.state = null;
      return "PAIRED. SYNC IS ON";
    });
  }

  // STOP SYNCING: deletes the saved copy on the server and forgets the key (a new key makes a new pairing).
  stop(): Promise<string> {
    return this.guarded(async () => {
      const key = this.local.key();
      if (key === null) return "SYNC IS OFF";
      const gone = await this.backend.del(key);
      if (!gone.ok && gone.error !== "notFound") return this.report(failStatus(gone.error));
      this.local.setKey(null);
      this.state = null;
      return "SYNC STOPPED. THE SAVED COPY IS DELETED";
    });
  }
}
