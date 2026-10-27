import { afterEach, describe, expect, it, vi } from "vitest";
import { APARTMENT } from "../game/apartment";
import { DESKTOP_VIEW, NARROW, NARROW_VIEW, narrowViewWanted, setView, TILE, VIEW } from "../game/config";
import { FULL_VIEW as PICTURE_WINDOW, zoomProblem } from "../game/view-zoom";
import { Camera } from "./camera";
import { createScreen, fitFill, fitScale } from "./canvas";
import { STATUS_BOX } from "./layout";

// Issue 090: the phone's narrower, taller picture. docs/mobile.md section 13.
afterEach(() => setView(DESKTOP_VIEW));

describe("narrowViewWanted", () => {
  it("needs ?view=narrow and the touch layer", () => {
    expect(narrowViewWanted("?view=narrow&touch=1", false)).toBe(true);
    expect(narrowViewWanted("?view=narrow", true)).toBe(true); // a touch screen
    expect(narrowViewWanted("?view=narrow", false)).toBe(false); // a desktop
    expect(narrowViewWanted("?view=narrow&touch=0", true)).toBe(false);
    expect(narrowViewWanted("?touch=1", true)).toBe(false);
    expect(narrowViewWanted("", true)).toBe(false);
  });
  it("leaves the desktop and the tests on 320 x 192", () => {
    expect(NARROW).toBe(false);
    expect([VIEW.width, VIEW.height]).toEqual([320, 192]);
    expect([DESKTOP_VIEW.width, DESKTOP_VIEW.height]).toEqual([20 * TILE, 12 * TILE]);
  });
});

describe("the narrow view's scale on the phones in the note", () => {
  const css = (w: number, h: number, dpr: number) => {
    setView(NARROW_VIEW);
    const f = fitScale(w, h, dpr);
    return [f.scaleDev, Math.round(f.cssWidth), Math.round(f.cssHeight)];
  };
  it("is 224 x 208 and gets 1.67x on a 390 phone, 1.33x with Safari's bars", () => {
    expect([NARROW_VIEW.width, NARROW_VIEW.height]).toEqual([224, 208]);
    expect(css(390, 433, 3)).toEqual([5, 373, 347]); // standalone, after 330 px of controls
    expect(css(390, 334, 3)).toEqual([4, 299, 277]); // Safari with bars
    expect(css(430, 509, 3)).toEqual([5, 373, 347]); // Pro Max
    expect(css(360, 410, 3)).toEqual([4, 299, 277]); // 360: 1.67x would be 373 wide
  });
  it("stays whole device pixels per game pixel", () => {
    setView(NARROW_VIEW);
    const f = fitScale(390, 433, 3);
    expect([f.backingWidth, f.backingHeight]).toEqual([224 * 5, 208 * 5]);
  });
});

describe("the camera on the narrow view", () => {
  const world = (id: string) => ({ ...APARTMENT.rooms[id].size });
  const target = (x: number, y: number) => ({ x, y });

  it("scrolls the main room sideways and sits it at the bottom, under the HUD band", () => {
    const main = world("main");
    const camera = new Camera(main, { ...NARROW_VIEW });
    expect(main.width).toBeGreaterThan(NARROW_VIEW.width);
    camera.snapTo(target(8, 100));
    expect([camera.x, camera.y]).toEqual([0, main.height - NARROW_VIEW.height]);
    expect(camera.y).toBe(-48); // 48 px of band above the room
    camera.snapTo(target(main.width - 8, 100));
    expect(camera.x).toBe(main.width - NARROW_VIEW.width);
  });
  it("follows the player with a dead zone, never past either wall", () => {
    const main = world("main");
    const camera = new Camera(main, { ...NARROW_VIEW });
    camera.snapTo(target(150, 100));
    const start = camera.x;
    for (let i = 0; i < 60; i++) camera.update(1 / 60, target(150 + 20, 100)); // inside the dead zone
    expect(camera.x).toBe(start);
    for (let i = 0; i < 600; i++) camera.update(1 / 60, target(main.width, 100));
    expect(camera.x).toBeLessThanOrEqual(main.width - NARROW_VIEW.width);
    for (let i = 0; i < 600; i++) camera.update(1 / 60, target(0, 100));
    expect(camera.x).toBeCloseTo(0, 3);
  });
  it("holds the kitchen and the bathroom still, centred", () => {
    for (const id of Object.keys(APARTMENT.rooms).filter((r) => r !== "main")) {
      const w = world(id);
      const camera = new Camera(w, { ...NARROW_VIEW });
      camera.snapTo(target(40, 40));
      const spare = w.width - NARROW_VIEW.width;
      if (spare <= 0) expect(camera.x).toBe(Math.floor(spare / 2));
      expect(camera.y).toBe(w.height - NARROW_VIEW.height);
    }
  });
  it("every room is shorter than the view, so only the main room scrolls", () => {
    for (const id of Object.keys(APARTMENT.rooms)) expect(world(id).height).toBeLessThanOrEqual(NARROW_VIEW.height);
  });
});

describe("pieces that read the view", () => {
  it("the status panel hugs the right edge of whichever view is current", () => {
    expect(STATUS_BOX.x + STATUS_BOX.w).toBe(320);
    setView(NARROW_VIEW);
    expect(STATUS_BOX.x + STATUS_BOX.w).toBe(224);
  });
  it("a full-screen picture's zoom windows do not follow the narrow view", () => {
    setView(NARROW_VIEW);
    expect([PICTURE_WINDOW.w, PICTURE_WINDOW.h]).toEqual([320, 192]);
    expect(zoomProblem({ x: 0, y: 0, w: 160, h: 96 })).toBeNull();
    expect(zoomProblem({ x: 0, y: 0, w: 112, h: 104 })).not.toBeNull();
  });
});

describe("Screen.sync", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("resizes the picture and refits the canvas when the view size changes", () => {
    const mk = () => {
      const ctx = { imageSmoothingEnabled: true, drawImage: vi.fn() };
      return { width: 0, height: 0, style: {} as Record<string, string>, getContext: () => ctx, ctx };
    };
    const made: ReturnType<typeof mk>[] = [];
    vi.stubGlobal("document", {
      createElement: () => {
        const c = mk();
        made.push(c);
        return c;
      },
      body: { appendChild() {}, classList: { toggle() {} } },
    });
    vi.stubGlobal("window", { innerWidth: 390, innerHeight: 763, devicePixelRatio: 3, addEventListener() {} });
    vi.stubGlobal("getComputedStyle", () => ({ paddingTop: "0px", paddingRight: "0px", paddingBottom: "0px", paddingLeft: "0px" }));
    setView(NARROW_VIEW);
    const canvas = mk();
    const screen = createScreen(canvas as unknown as HTMLCanvasElement);
    screen.setTouch(true);
    const off = made[0];
    expect([off.width, off.height]).toEqual([224, 208]);
    expect(canvas.width).toBe(224 * 5);
    setView(DESKTOP_VIEW);
    screen.sync();
    expect([off.width, off.height]).toEqual([320, 192]);
    expect(canvas.width).toBe(320 * 3); // NARROW is false in tests, so no fill here (fitFill is tested below)
    setView(NARROW_VIEW);
    screen.sync();
    expect(canvas.width).toBe(224 * 5);
  });
});

describe("Game.showsFullPicture", () => {
  it("is false in a room, true while a registered screen is open (the achievements list)", async () => {
    const { Game } = await import("../game/game");
    const game = new Game(APARTMENT.rooms[APARTMENT.start], { rooms: APARTMENT.rooms });
    expect(game.showsFullPicture).toBe(false);
    let open = false;
    game.fullPictureWhen.push(() => open);
    expect(game.showsFullPicture).toBe(false);
    open = true;
    expect(game.showsFullPicture).toBe(true);
  });
});

describe("fitFill (a full-screen piece fills the width)", () => {
  const fill = (w: number, h: number, dpr: number) => {
    const f = fitFill(w, h, dpr, DESKTOP_VIEW);
    return [f.scaleDev, Math.round(f.cssWidth), Math.round(f.cssHeight)];
  };
  it("steps in quarter device pixels, using the width less a margin", () => {
    expect(fill(390, 433, 3)).toEqual([3.5, 373, 224]); // was 1.0x (320 css)
    expect(fill(360, 410, 3)).toEqual([3.25, 347, 208]);
    expect(fill(430, 509, 3)).toEqual([4, 427, 256]); // the whole-number fit is already better
    expect(fill(375, 400, 2)).toEqual([2.25, 360, 216]);
  });
  it("keeps the backing store a whole number of device pixels, and the picture inside the width", () => {
    for (const [w, d] of [[360, 3], [375, 2], [390, 3], [412, 2.625], [430, 3], [320, 2]] as const) {
      const f = fitFill(w, 600, d, DESKTOP_VIEW);
      expect(Number.isInteger(f.backingWidth)).toBe(true);
      expect(Number.isInteger(f.backingHeight)).toBe(true);
      expect(f.cssWidth).toBeLessThanOrEqual(w + 1e-9);
    }
  });
  it("never shrinks below the whole-number fit and survives a tiny or bad area", () => {
    expect(fitFill(100, 50, 3, DESKTOP_VIEW).scaleDev).toBe(1);
    expect(fitFill(0, 0, 0, DESKTOP_VIEW).scaleDev).toBe(1);
    expect(fitFill(NaN, 300, 3, DESKTOP_VIEW).scaleDev).toBeGreaterThanOrEqual(1);
    // a short area limits it by height
    expect(fitFill(390, 150, 3, DESKTOP_VIEW).cssHeight).toBeLessThanOrEqual(150);
  });
});
