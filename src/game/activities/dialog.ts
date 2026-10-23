import type { Controls } from "../../input/controls";
import { BaseActivity, needHost, registerActivity, type ActivityHost } from "../activity";
import type { DialogNode } from "../dialog";

// A task that is a conversation or a menu ("contemplate"). It is over when the
// dialog closes, so the points arrive then, not when it opens. Backing out of
// the dialog backs out of the task; picking anything finishes it.
export class DialogActivity extends BaseActivity {
  constructor(
    private readonly node: DialogNode,
    private readonly host: ActivityHost,
  ) {
    super();
  }

  start(): void {
    const opened = this.host.openDialog(this.node, (result) =>
      this.finish({ completed: !result.cancelled }),
    );
    // Another dialog is already open, so there is nothing to wait for.
    if (!opened) this.finish({ completed: false });
  }

  update(_dt: number, _controls: Controls): void {
    // The dialog runs itself.
  }
}

registerActivity("dialog", (_spec, item, host) => {
  if (!item.dialog) throw new Error(`Task "${item.id}" has a dialog activity but no dialog`);
  return new DialogActivity(item.dialog, needHost(host, `Task "${item.id}"`));
});
