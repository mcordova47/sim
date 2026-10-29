import { DESKTOP_VIEW, NARROW, NARROW_VIEW, SYNC, VIEW, setView } from "./game/config";
import { keyFromText } from "./game/sync/client";
import { APARTMENT } from "./game/apartment";
import { attachFeatures } from "./game/features";
import { deliverFromSearch, encounterOnFirstKey, ownFromSearch, skipDaysFromSearch } from "./game/decor-dev";
import { Game } from "./game/game";
import { startLoop } from "./game/loop";
import { reducedMotionAsked } from "./game/reduced-motion";
import { readControls } from "./input/controls";
import { Keyboard } from "./input/keyboard";
import { mountTouchUi } from "./input/touch-ui";
import { createScreen } from "./render/canvas";
import { setTouchHints } from "./render/hints";
import "./render/side-project-view"; // registers the composed side project picture (issue 111c)
import { spriteNames } from "./render/sprite-names";
import { Sprites } from "./render/sprites";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const screen = createScreen(canvas);
const keyboard = new Keyboard();
const sprites = new Sprites();
const game = new Game(APARTMENT.rooms[APARTMENT.start], {
  rooms: APARTMENT.rooms,
  sprites,
  reducedMotion: () => reducedMotionAsked(),
});
const features = attachFeatures(game);

// A pairing link (issue 103): `#sync=<key>`. The key is taken out of the address bar at once, then the
// player is asked whether to sync with it. A fragment is never sent to a server.
try {
  const key = keyFromText(location.hash.startsWith(SYNC.linkMark) ? location.hash : "");
  if (location.hash.startsWith(SYNC.linkMark)) history.replaceState(null, "", location.pathname + location.search);
  if (key) features.offerPairing(key);
} catch {
  // No address or history to use (never in a browser).
}

// A dev shortcut for looking at a state without playing to it: `?set=plantStage:3`
// or `?set=plantStage:1,plantDry:100` (the plant drooping). Comma separated
// `variable:value` pairs, applied after any saved progress is loaded. Unknown
// names and bad numbers are ignored. Dev server only (issue 084): a built game ignores it. It is quiet: no events, so no particles or
// popups, and the room is set up again so doors and the like follow the values.
try {
  const effects = (import.meta.env.DEV ? new URLSearchParams(location.search).get("set") ?? "" : "")
    .split(",")
    .map((pair) => pair.split(":"))
    .filter(([id, value]) => game.state.has(id) && value !== "" && Number.isFinite(Number(value)))
    .map(([id, value]) => ({ var: id, set: Number(value) }));
  if (effects.length) {
    const listener = game.state.onChange;
    game.state.onChange = undefined;
    game.state.applyEffects(effects);
    game.state.onChange = listener;
    const { player } = game;
    game.loadLevel(game.currentLevel, player.col, player.row, player.facing);
  }
} catch {
  // No address to read (never in a browser).
}

// A dev shortcut to own decor you cannot get yet (issue 062 stage 2): `?own=test`
// owns every TEST item, or list ids: `?own=art-test-barn,lamp-test-stool`. Only in
// the dev server; a built game ignores it.
try {
  if (import.meta.env.DEV) ownFromSearch(game.decor, location.search);
} catch {
  // No address to read (never in a browser).
}

// Also dev only (issue 062 stage 3a): `?deliver=test` switches on the dev gift
// checkpoints (TEST items), or `?deliver=id,id` sends those items to the door.
try {
  if (import.meta.env.DEV) deliverFromSearch(game.deliveries, location.search);
  // `?days=3` skips three game days (the real gifts fire; each arrives 2 game hours later).
  if (import.meta.env.DEV) skipDaysFromSearch(game.deliveries, location.search);
  // `?encounter=ad-candle` shows that ad's encounter on the first key press, so audio is unlocked (`random` picks one; `&again=1` replays after each one).
  if (import.meta.env.DEV) encounterOnFirstKey(game, location.search, window, () => keyboard.endFrame());
  // `&labmusic=1` plays the music lab's track (/music-lab.html) under that encounter (issue 122).
  if (import.meta.env.DEV) {
    // A dynamic import, so a build has none of the lab's code at all.
    void import("./lab/lab-encounter").then(({ labEncounterMusic }) => {
      const engine = (globalThis as unknown as { simSoundEngine: Parameters<typeof labEncounterMusic>[1] }).simSoundEngine;
      // The lab's stand-in replaces the placeholder track while it plays, so the two never stack.
      if (engine && labEncounterMusic(game, engine, location.search, localStorage)) engine.encounter.disabled = true;
    });
  }
} catch {
  // No address to read (never in a browser).
}

// The touch layer (issue 087): shown on a touch screen (or with `?touch=1`), it raises the same
// key events as the keyboard. It switches the screen to the phone fit when it shows.
const touch = mountTouchUi({
  root: document.getElementById("touch-ui") as HTMLElement,
  onGesture: () => features.unlockAudio(),
  onVisible: (on) => {
    screen.setTouch(on);
    // Every hint names the controls in use, decided live as the layer shows and hides (issue 093).
    setTouchHints(on);
  },
  canvas,
  viewSize: () => ({ width: VIEW.width, height: VIEW.height }),
  tapAt: (x, y) => game.tapAt(x, y),
  text: {
    wantsText: () => game.wantsText,
    textValue: () => game.textValue(),
    setText: (text) => game.setText(text),
  },
});
screen.setTouch(touch.visible);
setTouchHints(touch.visible);

// Keep the browser from zooming or selecting when a finger is on the game.
document.addEventListener("contextmenu", (e) => {
  if (touch.visible) e.preventDefault();
});
document.addEventListener("gesturestart", (e) => {
  if (touch.visible) e.preventDefault();
});
document.addEventListener("touchmove", (e) => {
  if (touch.visible && e.touches.length > 1) e.preventDefault();
}, { passive: false });

// Load every sprite before the first frame. A missing one draws as a coloured
// rectangle (and is logged) rather than blocking the game.
sprites.load(spriteNames(Object.values(APARTMENT.rooms))).then(() => {
  startLoop({
    update(dt) {
      game.update(dt, readControls(keyboard));
      keyboard.endFrame();
      touch.afterFrame();
    },
    render(alpha) {
      // The phone's narrow view shows full-screen pictures (ad cards, cutscene views) at 320 x 192,
      // and turned sideways it is not used at all: there is room across for the whole 320 x 192.
      if (NARROW) {
        setView(game.showsFullPicture || screen.landscape ? DESKTOP_VIEW : NARROW_VIEW);
        screen.sync();
      }
      game.render(screen.ctx, alpha);
      screen.present();
    },
  });
});
