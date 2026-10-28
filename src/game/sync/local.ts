import type { KeyValueStorage } from "../achievements/progress";
import { SYNC } from "../config";
import { normaliseDoc, normaliseProgress, type SyncDoc, type SyncEnv, type SyncProgress } from "./merge";

// What this device keeps about syncing, apart from the game's own saves (issue 102, docs/sync.md 4.3 and 2):
// a random device id and a merge that is held until it is safe to apply (`life.sync.v1`), and the
// progress group as it was before the last import that changed it (`life.sync.backup.v1`, one step back).
// Every read and write is guarded: blocked or full storage means the values live in memory only, and
// nothing here is written until it is first needed, so a game that never syncs writes nothing.

export interface Backup {
  progress: SyncProgress;
  activeAt: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function randomId(): string {
  const bytes = new Uint8Array(8);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class SyncLocal {
  private id: string | null = null;
  // The key this device syncs with (issue 103). It lives here and nowhere else: never in a save, a code or a file.
  private syncKey: string | null = null;
  private heldDoc: SyncDoc | null = null;
  private backupData: Backup | null = null;
  private loaded = false;

  constructor(
    private readonly storage: KeyValueStorage | null,
    private readonly env: SyncEnv = {},
  ) {}

  private read(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const text = this.storage?.getItem(SYNC.storageKey);
      if (text && text.length <= SYNC.maxChars * 2) {
        const raw: unknown = JSON.parse(text);
        if (isRecord(raw)) {
          if (typeof raw.device === "string" && /^[a-z0-9]{1,32}$/.test(raw.device)) this.id = raw.device;
          if (typeof raw.key === "string" && SYNC.keyPattern.test(raw.key)) this.syncKey = raw.key;
          const held = normaliseDoc(raw.held, this.env);
          if (held.ok) this.heldDoc = held.doc;
        }
      }
    } catch {
      // Unreadable: start without a held merge.
    }
    try {
      const text = this.storage?.getItem(SYNC.backupKey);
      if (text && text.length <= SYNC.maxChars * 2) {
        const raw: unknown = JSON.parse(text);
        if (isRecord(raw)) {
          const at = raw.activeAt;
          this.backupData = { progress: normaliseProgress(raw.progress, this.env), activeAt: typeof at === "number" && Number.isFinite(at) && at > 0 ? at : 0 };
        }
      }
    } catch {
      // Unreadable: no backup.
    }
  }

  private write(): void {
    try {
      this.storage?.setItem(SYNC.storageKey, JSON.stringify({ device: this.id, ...(this.syncKey && { key: this.syncKey }), ...(this.heldDoc && { held: this.heldDoc }) }));
    } catch {
      // Memory only.
    }
  }

  // This device's random id, made the first time it is asked for.
  device(): string {
    this.read();
    if (this.id === null) {
      this.id = randomId();
      this.write();
    }
    return this.id;
  }

  key(): string | null {
    this.read();
    return this.syncKey;
  }

  // Sets or (with null) clears the key.
  setKey(key: string | null): void {
    this.read();
    this.syncKey = key;
    this.device();
    this.write();
  }

  held(): SyncDoc | null {
    this.read();
    return this.heldDoc;
  }

  hold(doc: SyncDoc | null): void {
    this.read();
    if (this.heldDoc === null && doc === null) return;
    this.heldDoc = doc;
    this.device();
    this.write();
  }

  backup(): Backup | null {
    this.read();
    return this.backupData;
  }

  setBackup(backup: Backup): void {
    this.read();
    this.backupData = backup;
    try {
      this.storage?.setItem(SYNC.backupKey, JSON.stringify(backup));
    } catch {
      // Memory only: it still works until the page closes.
    }
  }
}
