import type { Controls } from "../../input/controls";
import { BaseActivity, needHost, registerActivity, type ActivityHost } from "../activity";

// Opening the package by the door (issue 062 stage 3a): the game adds what is
// waiting to what you own and shows one plain line per item, and the task is
// over at once. It pays nothing and is neither a completion nor a cancel.
export class CollectDeliveryActivity extends BaseActivity {
  constructor(private readonly host: ActivityHost) {
    super();
  }

  start(): void {
    this.host.collectDeliveries?.();
    this.finish({ completed: false, quiet: true });
  }

  update(_dt: number, _controls: Controls): void {}
}

registerActivity("collect-delivery", (_spec, item, host) => new CollectDeliveryActivity(needHost(host, `Task "${item.id}"`)));
