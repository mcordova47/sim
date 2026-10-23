import { describe, expect, it } from "vitest";
import palette from "../../art/palette.json";
import { COLOR, withAlpha } from "./colors";

const hexes = new Set(Object.values(palette.colors).map((c) => c.hex));

describe("colors", () => {
  it("only uses colours that are in the shared palette", () => {
    for (const [name, hex] of Object.entries(COLOR)) {
      expect(hexes.has(hex), name).toBe(true);
    }
  });

  it("makes transparent versions of palette colours", () => {
    expect(withAlpha("#1a1a2e", 0.5)).toBe("rgba(26, 26, 46, 0.5)");
    expect(withAlpha(COLOR.paper, 1)).toBe("rgba(237, 242, 244, 1)");
  });
});

// Every source file (not tests) as text, so the next person who writes a
// colour literal in the UI gets pointed at the palette.
const sources = import.meta.glob(["/src/**/*.ts", "!/src/**/*.test.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

describe("colour literals", () => {
  it("are only written in colors.ts, never in drawing code", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10);
    const offenders = Object.entries(sources)
      .filter(([file]) => !file.endsWith("/colors.ts"))
      .filter(
        ([, text]) =>
          /["'`]#[0-9a-fA-F]{3,8}["'`]/.test(text) || /rgba?\(\s*\d/.test(text),
      )
      .map(([file]) => file);
    expect(offenders, "use COLOR / withAlpha from render/colors.ts").toEqual([]);
  });
});
