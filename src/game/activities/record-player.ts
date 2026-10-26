import type { Controls } from "../../input/controls";
import { BaseActivity, needHost, registerActivity, type ActivityHost } from "../activity";
import type { DialogNode, DialogResult } from "../dialog";
import { dialogOf } from "../interactable";
import { demoStore } from "../music/demo-library";
import { TRACKS, pickedFrom } from "../music/records";

// The record player's menu (issue 068). Pays (the task's points and mood) only when
// the pick is a record or demo other than the one on, and the payout window
// (MUSIC.payoutEveryMinutes) is over. Every other way out ends quietly: the same
// record, silence, a change inside the window (which still switches the record),
// backing out. Quiet means no payout, no cooldown and no `taskCancelled`.
export class RecordPlayerActivity extends BaseActivity {
  cancellable = true;

  constructor(
    private readonly node: DialogNode | (() => DialogNode),
    private readonly host: ActivityHost,
  ) {
    super();
  }

  start(): void {
    const opened = this.host.openDialog(dialogOf({ dialog: this.node })!, (result) => this.chosen(result));
    // Another dialog is already open, so there is nothing to wait for.
    if (!opened) this.finish({ completed: false, quiet: true });
  }

  update(_dt: number, _controls: Controls): void {
    // The dialog runs itself.
  }

  // Escape, in the menu or on the reply line: nothing changes, and it is not a cancel.
  cancel(): void {
    this.finish({ completed: false, quiet: true });
  }

  private chosen(result: DialogResult): void {
    if (this.done) return;
    const now = this.host.records?.() ?? { playingId: null, payoutReady: true };
    const pick = result.cancelled ? undefined : pickedFrom(result.path, now.tracks ?? [...TRACKS, ...demoStore().tracks()]);
    if (!pick) return this.finish({ completed: false, quiet: true });
    const id = pick.track?.id ?? null;
    if (id === now.playingId) return this.finish({ completed: false, quiet: true });
    const paid = id !== null && now.payoutReady;
    this.host.recordChosen?.(id, paid);
    this.finish(paid ? { completed: true } : { completed: false, quiet: true });
  }
}

registerActivity(
  "record-player",
  (_spec, item, host) => new RecordPlayerActivity(item.dialog!, needHost(host, `Task "${item.id}"`)),
  (_spec, item) => {
    if (!item.dialog) throw new Error(`Task "${item.id}" has a record-player activity but no dialog`);
  },
);
