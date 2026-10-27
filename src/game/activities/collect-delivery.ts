import type { Controls } from "../../input/controls";
import { BaseActivity, needHost, registerActivity, type ActivityHost } from "../activity";

// Opening the package by the door (issue 062 stage 3a): the game adds what is
// waiting to what you own and names each item on its own dialog page (issue 079).
// The task is over when the dialog closes; Escape skips the rest (everything is
// already owned). It pays nothing and is neither a completion nor a cancel.
export class CollectDeliveryActivity extends BaseActivity {
  cancellable = true;

  constructor(private readonly host: ActivityHost) {
    super();
  }

  start(): void {
    this.host.collectDeliveries?.(() => this.finish({ completed: false, quiet: true }));
    // A host with no deliveries has nothing to wait for.
    if (!this.host.collectDeliveries) this.finish({ completed: false, quiet: true });
  }

  cancel(): void {
    this.finish({ completed: false, quiet: true });
  }

  update(_dt: number, _controls: Controls): void {}
}

registerActivity("collect-delivery", (_spec, item, host) => new CollectDeliveryActivity(needHost(host, `Task "${item.id}"`)));
