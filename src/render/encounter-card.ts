import { VIEW } from "../game/config";
import { wrapText } from "../game/dialog";
import { ENCOUNTER_WORDS, type Ad, type CardType } from "../game/encounter-ads";
import { COLOR, paletteColor } from "./colors";
import { GLYPH_H, drawText, textWidth } from "./font";
import type { Box } from "./layout";
import type { SpriteDrawer } from "./sprites";

// The card of an ad encounter (issue 043 stage B, docs/random-encounters.md sections 7 and 8):
// a full-screen template picture per card type (`view-ad-email`, `view-ad-social`,
// `view-ad-text`, palette only, in art/src), with the platform, sender, subject, body and button
// drawn over it in the pixel font from the ad's data, and the item's own sprite as the product
// picture, scaled up with whole-number steps. The layout is plain data (`layoutCard`) so a test
// can check that nothing is hidden by the menu or the text box.

export const CARD_SPRITE: Readonly<Record<CardType, string>> = {
  email: "view-ad-email",
  social: "view-ad-social",
  text: "view-ad-text",
};

// What the template pictures are made of, for the fallback when a picture is missing.
const CARD_BASE: Readonly<Record<CardType, "paper" | "night">> = { email: "paper", social: "paper", text: "night" };

// How much the product picture is magnified, at most (a 16x16 item is 48x48).
export const PRODUCT_SCALE = 3;

const LINE = GLYPH_H + 2;
const BUTTON_H = 14;
const BUTTON_PAD = 8;
// Space between one paragraph of a post or message and the next.
const PARAGRAPH_GAP = 3;

export interface CardText {
  text: string;
  x: number;
  y: number;
  color: string;
  align?: "left" | "right";
}

export interface CardLayout {
  // The platform's header bar texts, the sender, the subject, the body (or the details page) and so on.
  texts: CardText[];
  // The button drawn on the card, with its text.
  button: { box: Box; text: string };
  // Where the product picture goes (it is centred in this box).
  picture: Box;
  // Drawn behind the text on a text message: the bubble and its tail.
  bubble?: Box;
  // Whether the item's picture is framed by the template (email, social) or sits by itself (text).
  frame: boolean;
}

const INK = COLOR.ink;
const BODY = COLOR.slate;
const DETAIL = COLOR.dusk;

// Lays the card out. `details` is the second page (Look closer): the two details lines take the place of the body.
export function layoutCard(ad: Ad, details: boolean, measure: (s: string) => number = (s) => textWidth(s)): CardLayout {
  const lines = details ? ad.closer : ad.body;
  const wrap = (text: string, width: number) => wrapText(text, width, measure);
  const buttonBox = (x: number, y: number): { box: Box; text: string } => ({
    box: { x, y, w: measure(ad.button) + BUTTON_PAD * 2, h: BUTTON_H },
    text: ad.button,
  });
  const texts: CardText[] = [];

  if (ad.card === "email") {
    texts.push({ text: ad.platform, x: 8, y: 4, color: COLOR.paper });
    texts.push({ text: ad.tag, x: VIEW.width - 8, y: 4, color: paletteColor("cream"), align: "right" });
    texts.push({ text: ad.from ?? ad.brand, x: 14, y: 24, color: INK });
    texts.push({ text: ENCOUNTER_WORDS.emailTo, x: 14, y: 33, color: DETAIL });
    texts.push({ text: ad.headline, x: 14, y: 46, color: INK });
    lines.forEach((line, i) => texts.push({ text: line, x: 14, y: 64 + i * LINE, color: details ? INK : BODY }));
    return { texts, button: buttonBox(126, 100), picture: { x: 16, y: 96, w: 100, h: 52 }, frame: true };
  }

  if (ad.card === "social") {
    texts.push({ text: ad.platform, x: 8, y: 4, color: COLOR.paper });
    texts.push({ text: ad.tag, x: VIEW.width - 8, y: 4, color: paletteColor("cream"), align: "right" });
    texts.push({ text: ad.from ?? ad.brand, x: 32, y: 24, color: INK });
    let y = 40;
    for (const line of wrap(ad.headline, 176)) {
      texts.push({ text: line, x: 134, y, color: INK });
      y += LINE;
    }
    y += 4;
    for (const paragraph of lines) {
      for (const line of wrap(paragraph, 176)) {
        texts.push({ text: line, x: 134, y, color: details ? INK : BODY });
        y += LINE;
      }
      y += PARAGRAPH_GAP;
    }
    return { texts, button: buttonBox(14, 134), picture: { x: 20, y: 44, w: 100, h: 68 }, frame: true };
  }

  // A text message: a light bubble on the dark thread, with the picture as an attachment at the right.
  texts.push({ text: ad.platform, x: 22, y: 4, color: COLOR.paper });
  texts.push({ text: ad.tag, x: VIEW.width - 8, y: 4, color: paletteColor("cream"), align: "right" });
  let y = 31;
  for (const paragraph of details ? ad.closer : [ad.headline, ...ad.body]) {
    for (const line of wrap(paragraph, 196)) {
      texts.push({ text: line, x: 20, y, color: INK });
      y += LINE;
    }
    y += PARAGRAPH_GAP;
  }
  const bubble: Box = { x: 12, y: 24, w: 216, h: y - 24 + 1 };
  return { texts, button: buttonBox(12, bubble.y + bubble.h + 8), picture: { x: 238, y: 24, w: 70, h: 52 }, bubble, frame: false };
}

// The whole number the product picture is magnified by to fit `area` (1 to PRODUCT_SCALE).
export function productScale(w: number, h: number, area: Box): number {
  const fit = Math.min(Math.floor(area.w / Math.max(1, w)), Math.floor(area.h / Math.max(1, h)));
  return Math.max(1, Math.min(PRODUCT_SCALE, fit));
}

export interface CardView {
  ad: Ad;
  details: boolean;
  // The item's own sprite and size, for the product picture.
  product: { sprite: string; w: number; h: number };
  sprites?: SpriteDrawer;
}

// Draws the card over the whole screen.
export function drawCard(ctx: CanvasRenderingContext2D, view: CardView): void {
  const { ad, sprites } = view;
  const template = CARD_SPRITE[ad.card];
  if (sprites?.has(template)) sprites.draw(ctx, template, 0, 0, VIEW);
  else {
    ctx.fillStyle = CARD_BASE[ad.card] === "night" ? COLOR.night : COLOR.paper;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  const layout = layoutCard(ad, view.details);
  if (layout.bubble) {
    const { x, y, w, h } = layout.bubble;
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    // A small tail at the bottom left.
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(x + 4, y + h, 5, 1);
    ctx.fillRect(x + 4, y + h + 1, 3, 1);
    ctx.fillRect(x + 4, y + h + 2, 1, 1);
  }
  drawProduct(ctx, view, layout);
  for (const t of layout.texts) drawText(ctx, t.text, t.x, t.y, { color: t.color, shadow: null, align: t.align });
  const { box, text } = layout.button;
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = ad.card === "social" ? paletteColor("denim") : ad.card === "text" ? paletteColor("teal") : COLOR.brick;
  ctx.fillRect(box.x + 1, box.y + 1, box.w - 2, box.h - 2);
  drawText(ctx, text, box.x + box.w / 2, box.y + (box.h - GLYPH_H) / 2, { color: COLOR.paper, shadow: null, align: "center" });
}

function drawProduct(ctx: CanvasRenderingContext2D, view: CardView, layout: CardLayout): void {
  const { sprite, w, h } = view.product;
  const area = layout.picture;
  if (!layout.frame) {
    // An attachment on the dark thread: a thin paper frame round the picture.
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(area.x - 1, area.y - 1, area.w + 2, area.h + 2);
    ctx.fillStyle = paletteColor("cream");
    ctx.fillRect(area.x, area.y, area.w, area.h);
  }
  const scale = productScale(w, h, area);
  const x = Math.round(area.x + (area.w - w * scale) / 2);
  const y = Math.round(area.y + (area.h - h * scale) / 2);
  const { sprites } = view;
  if (sprites?.has(sprite) && sprites.drawRegion) {
    ctx.save();
    ctx.translate(x, y);
    sprites.drawRegion(ctx, sprite, { x: 0, y: 0, w, h }, { width: w * scale, height: h * scale });
    ctx.restore();
  } else if (sprites?.has(sprite)) {
    sprites.draw(ctx, sprite, x, y);
  } else {
    ctx.fillStyle = paletteColor("mist");
    ctx.fillRect(x, y, w * scale, h * scale);
  }
}
