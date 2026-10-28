import { SYNC } from "../config";

// When the game syncs by itself (issue 104, docs/sync.md section 5): once after load, when the page is
// hidden, when it is shown again after a while, and every few minutes while playing if something changed.
// Best effort and quiet: a failure only schedules a later try, with a longer wait each time, and it never
// blocks anything (the sync runs in the background; nothing here waits on it).

export type AutoResult = "ok" | "retry" | "stop" | "busy";

export interface AutoHost {
  now(): number;
  // Safe to start a background sync now: the pause screen and any activity are closed.
  idle(): boolean;
  // Something changed since the last sync.
  changed(): boolean;
  sync(): Promise<AutoResult>;
}

export class AutoSync {
  private nextAt: number;
  private failures = 0;
  private stopped = false;
  private running = false;
  private force = true;
  private lastTry = -Infinity;

  constructor(
    private readonly host: AutoHost,
    private readonly enabled: () => boolean,
  ) {
    this.nextAt = host.now() + SYNC.auto.loadDelayMs;
  }

  // Called every frame: starts a sync when one is due.
  tick(): void {
    if (this.running || this.stopped || this.host.now() < this.nextAt || !this.enabled() || !this.host.idle()) return;
    if (!this.force && this.failures === 0 && !this.host.changed()) {
      this.nextAt = this.host.now() + SYNC.auto.everyMs;
      return;
    }
    void this.run();
  }

  // The page was hidden: the moment that matters on a phone. Runs now, whatever else is going on.
  hidden(): void {
    if (this.running || this.stopped || !this.enabled()) return;
    void this.run();
  }

  // The page is visible again: look for what another device saved, unless that was just done.
  shown(): void {
    if (this.host.now() - this.lastTry < SYNC.auto.shownGapMs) return;
    this.force = true;
    this.nextAt = this.host.now();
  }

  // The player did something about syncing (turned it on, paired, synced by hand, turned automatic back on).
  resume(): void {
    this.stopped = false;
    this.failures = 0;
    this.nextAt = this.host.now() + SYNC.auto.everyMs;
  }

  private async run(): Promise<void> {
    this.running = true;
    this.force = false;
    this.lastTry = this.host.now();
    let result: AutoResult = "retry";
    try {
      result = await this.host.sync();
    } catch {
      // Never reaches the game.
    }
    this.running = false;
    const now = this.host.now();
    if (result === "ok") {
      this.failures = 0;
      this.nextAt = now + SYNC.auto.everyMs;
    } else if (result === "stop") {
      this.stopped = true;
    } else if (result === "busy") {
      this.nextAt = now + SYNC.auto.retryMs[0];
    } else {
      const waits = SYNC.auto.retryMs;
      this.nextAt = now + waits[Math.min(this.failures, waits.length - 1)];
      this.failures++;
    }
  }
}
