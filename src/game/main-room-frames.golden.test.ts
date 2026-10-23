import { describe, expect, it } from "vitest";
import goldenText from "./golden/main-room-frames.json?raw";
import { recordFrames } from "./main-room-frames";

// Issue 062 stage 1: the main room is drawn from the decor store now, and with
// the default decor every drawing call must be exactly what it was before. The
// golden file was recorded on main before the change. To record it again (only
// after a deliberate change to how the room looks), run the tests with
// UPDATE_GOLDEN=1; DUMP_DIR=<dir> also writes each frame's full log, for
// diffing two builds by hand.
type Env = { env: Record<string, string | undefined> };
const env = (globalThis as unknown as { process?: Env }).process?.env ?? {};

describe("main room frames", () => {
  it("draw exactly the calls recorded before decor existed", async () => {
    const { logs, text } = recordFrames();
    if (env.UPDATE_GOLDEN === "1" || env.DUMP_DIR) {
      // @ts-ignore node module, only used when asked to write files
      const fs = await import("node:fs");
      if (env.DUMP_DIR) {
        fs.mkdirSync(env.DUMP_DIR, { recursive: true });
        for (const [name, body] of Object.entries(text)) fs.writeFileSync(`${env.DUMP_DIR}/${name.replace("#", "-")}.txt`, body);
      }
      if (env.UPDATE_GOLDEN === "1") {
        fs.writeFileSync(new URL("./golden/main-room-frames.json", import.meta.url), JSON.stringify(logs, null, 1) + "\n");
        return;
      }
    }
    expect(logs).toEqual(JSON.parse(goldenText));
    expect(logs.length).toBeGreaterThan(30);
    expect(logs.every((l) => l.calls > 50)).toBe(true);
  });
});
