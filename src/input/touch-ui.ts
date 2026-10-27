import { dpadDirection, eventKeySink, TouchPad, touchLayerVisible, type TouchControl } from "./touch";

// The DOM side of the touch layer (issue 087): builds the d-pad and buttons in code, turns
// pointer events into TouchPad calls, and shows or hides the layer. Not used in tests.

export interface TouchUiOptions {
  // `#touch-ui`, where the controls go.
  root: HTMLElement;
  // Called on every real touch or click, so audio can start (iOS wants a real gesture).
  onGesture?: () => void;
  // Called when the layer shows or hides.
  onVisible?: (visible: boolean) => void;
}

export interface TouchUi {
  pad: TouchPad;
  readonly visible: boolean;
  // The game calls this at the end of every update.
  afterFrame(): void;
}

function readOverride(): boolean | null {
  try {
    const value = new URLSearchParams(location.search).get("touch");
    if (value === "1") return true;
    if (value === "0") return false;
  } catch {
    // No address to read.
  }
  return null;
}

function el(tag: string, className: string, text = ""): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function mountTouchUi(options: TouchUiOptions): TouchUi {
  const { root } = options;
  const pad = new TouchPad(eventKeySink(window));
  const override = readOverride();
  let sawRealKey = false;
  let visible = false;

  const dpad = el("div", "tp-dpad");
  for (const name of ["up", "down", "left", "right"]) dpad.appendChild(el("div", `tp-arm tp-${name}`));
  dpad.appendChild(el("div", "tp-hub"));

  const buttons: Array<[TouchControl, string, string]> = [
    ["a", "tp-btn tp-a", "A"],
    ["b", "tp-btn tp-b", "B"],
    ["cycle", "tp-pill tp-cycle", "CHOICE"],
    ["list", "tp-pill tp-list", "LIST"],
    ["mute", "tp-pill tp-mute", "SOUND"],
  ];
  const buttonEls = new Map<TouchControl, HTMLElement>();
  const pills = el("div", "tp-pills");
  const face = el("div", "tp-face");
  for (const [control, cls, label] of buttons) {
    const node = el("div", cls, label);
    buttonEls.set(control, node);
    (cls.includes("tp-pill") ? pills : face).appendChild(node);
  }
  root.append(dpad, face, pills);

  const press = (node: HTMLElement, on: boolean) => node.classList.toggle("tp-held", on);

  for (const [control, node] of buttonEls) {
    node.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try {
        node.setPointerCapture(e.pointerId);
      } catch {
        // Not capturable (a synthetic pointer); the cancel and blur paths still let go.
      }
      press(node, true);
      pad.pressControl(e.pointerId, control);
    });
    const end = (e: PointerEvent) => {
      press(node, false);
      pad.releasePointer(e.pointerId);
    };
    node.addEventListener("pointerup", end);
    node.addEventListener("pointercancel", end);
    node.addEventListener("lostpointercapture", end);
  }

  const aim = (e: PointerEvent) => {
    const r = dpad.getBoundingClientRect();
    const dir = dpadDirection(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2), r.width);
    pad.padMove(e.pointerId, dir);
    for (const name of ["up", "down", "left", "right"]) dpad.classList.toggle(`tp-on-${name}`, name === dir);
  };
  dpad.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    try {
      dpad.setPointerCapture(e.pointerId);
    } catch {
      // As above.
    }
    aim(e);
  });
  dpad.addEventListener("pointermove", (e) => {
    if (dpad.hasPointerCapture?.(e.pointerId)) aim(e);
  });
  const endPad = (e: PointerEvent) => {
    pad.releasePointer(e.pointerId);
    for (const name of ["up", "down", "left", "right"]) dpad.classList.remove(`tp-on-${name}`);
  };
  dpad.addEventListener("pointerup", endPad);
  dpad.addEventListener("pointercancel", endPad);
  dpad.addEventListener("lostpointercapture", endPad);

  const clearLook = () => {
    for (const node of buttonEls.values()) press(node, false);
    for (const name of ["up", "down", "left", "right"]) dpad.classList.remove(`tp-on-${name}`);
  };
  const releaseAll = () => {
    pad.releaseAll();
    clearLook();
  };

  const coarse = () => {
    try {
      return matchMedia("(pointer: coarse)").matches;
    } catch {
      return false;
    }
  };
  const apply = () => {
    const next = touchLayerVisible({
      coarse: coarse(),
      maxTouchPoints: navigator.maxTouchPoints ?? 0,
      sawRealKey,
      override,
    });
    if (next === visible) return;
    visible = next;
    if (!visible) releaseAll();
    document.body.classList.toggle("touch", visible);
    options.onVisible?.(visible);
  };

  // A real key (the synthetic ones are not trusted) hides the layer: a keyboard is here.
  window.addEventListener("keydown", (e) => {
    if (!e.isTrusted || sawRealKey) return;
    sawRealKey = true;
    apply();
  });
  // A real touch brings it back after that (a hybrid laptop used by touch).
  window.addEventListener(
    "pointerdown",
    (e) => {
      if (e.pointerType === "touch" && sawRealKey) {
        sawRealKey = false;
        apply();
      }
    },
    true,
  );

  // iOS starts audio only from a real touch or click, not from the synthetic keys.
  const gesture = () => options.onGesture?.();
  for (const type of ["pointerup", "touchend", "click"]) window.addEventListener(type, gesture, true);

  // Nothing may stay held when the finger's pointerup is lost or the page goes away.
  window.addEventListener("blur", releaseAll);
  window.addEventListener("pagehide", releaseAll);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) releaseAll();
    else gesture();
  });
  document.addEventListener("touchcancel", releaseAll, true);

  apply();
  return {
    pad,
    get visible() {
      return visible;
    },
    afterFrame: () => pad.afterFrame(),
  };
}
