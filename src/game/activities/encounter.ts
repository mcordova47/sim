import type { Controls } from "../../input/controls";
import { drawCard, drawNote } from "../../render/encounter-card";
import { textBoxRect } from "../../render/dialog-box";
import { BaseActivity, type ActivityHost } from "../activity";
import { ENCOUNTERS } from "../config";
import { choice, menu, say } from "../dialog";
import { CARD_WORDS, ENCOUNTER_WORDS, type Ad } from "../encounter-ads";
import { arrivesWord, impulseChance, unsubscribeChance } from "../encounters";

// An ad encounter (issue 043 stage B, docs/random-encounters.md section 4): a full-screen
// card of an email, a post or a text message, one narrator line and a small menu, a standoff
// and not a fight. Nothing is ever lost: Ignore and a working Unsubscribe lift mood a little,
// Add to cart queues a delivery (the same package as a gift), a failed Unsubscribe only makes
// the next ad come sooner. An ad for something you already have, or have ordered, is just a
// card that goes away by itself. It pays nothing, is never a completion or a cancel and has no
// cooldown of its own (the encounters' own cooldown lives in `Encounters`), so every way out is
// the quiet end. It holds the clock: no pressure while it is open.

// What the encounter needs from the game, so it tests without one.
export interface EncounterDeps {
  owns(itemId: string): boolean;
  // The item is queued or waiting at the door.
  queued(itemId: string): boolean;
  // Queues the delivery; false if refused (owned, queued, full).
  deliver(itemId: string, delayHours: number): boolean;
  mood(): number;
  addMood(amount: number): void;
  // An unsubscribe did not work.
  failedUnsubscribe(): void;
  random(): number;
  // The item's own picture for the card.
  product: { sprite: string; w: number; h: number };
}

export class EncounterActivity extends BaseActivity {
  cancellable = true;
  // No time pressure while it is open.
  readonly holdsClock = true;
  readonly readsKeys = false;

  // The second page of the card (Look closer) is showing.
  details = false;
  // The line shown at the foot of the card for an ad you already have, until it goes away.
  note: string | null = null;
  private left = 0;
  private looked = false;

  constructor(
    readonly ad: Ad,
    private readonly host: ActivityHost,
    private readonly deps: EncounterDeps,
  ) {
    super();
  }

  start(): void {
    const refusal = this.refusal();
    if (refusal !== null) {
      this.note = refusal;
      this.left = ENCOUNTERS.dismissSeconds;
      return;
    }
    const mood = this.deps.mood();
    const tone = mood < ENCOUNTERS.toneLow ? ENCOUNTER_WORDS.toneLow : mood >= ENCOUNTERS.toneHigh ? ENCOUNTER_WORDS.toneHigh : null;
    this.openMenu([this.ad.narrator ?? CARD_WORDS[this.ad.card].appeared, ...(tone ? [tone] : [])].join("\n"));
  }

  update(dt: number, _controls: Controls): void {
    if (this.done || this.note === null) return;
    this.left -= dt;
    if (this.left <= 0) this.leave();
  }

  // Why nothing can be bought (an ad for something you have, ordered or cannot order), or null.
  private refusal(): string | null {
    if (this.deps.owns(this.ad.item)) return ENCOUNTER_WORDS.alreadyOwn;
    if (this.deps.queued(this.ad.item)) return ENCOUNTER_WORDS.alreadyInCart;
    return null;
  }

  private leave(): void {
    this.finish({ completed: false, quiet: true });
  }

  // Escape, and anything that drops the encounter: leave at once, with no mood change and no purchase.
  cancel(): void {
    if (this.done) return;
    this.leave();
  }

  private openMenu(prompt?: string): void {
    const words = CARD_WORDS[this.ad.card];
    const labels = [ENCOUNTER_WORDS.ignore, words.unsubscribe, ...(this.looked ? [] : [ENCOUNTER_WORDS.closer]), ENCOUNTER_WORDS.cart];
    const opened = this.host.openDialog(
      menu(prompt, labels.map((l) => choice(l))),
      (result) => {
        if (this.done) return;
        if (result.cancelled || result.path.length === 0) return this.leave();
        this.choose(result.path[result.path.length - 1]);
      },
    );
    if (!opened) this.leave();
  }

  private choose(label: string): void {
    const words = CARD_WORDS[this.ad.card];
    const mood = this.deps.mood();
    switch (label) {
      case ENCOUNTER_WORDS.ignore:
        // An Ignore at a low mood may turn into a purchase.
        if (this.deps.random() < impulseChance(mood, this.looked)) return this.buy(true);
        this.deps.addMood(ENCOUNTERS.mood.ignore);
        return this.speak(words.ignore);
      case words.unsubscribe:
        if (this.deps.random() < unsubscribeChance(mood, this.ad.persistence)) {
          this.deps.addMood(ENCOUNTERS.mood.unsubscribe);
          return this.speak(words.unsubscribed);
        }
        this.deps.failedUnsubscribe();
        return this.speak(words.unsubscribeFailed);
      case ENCOUNTER_WORDS.closer:
        this.details = true;
        this.looked = true;
        return this.openMenu();
      case ENCOUNTER_WORDS.cart:
        return this.buy(false);
      default:
        return this.leave();
    }
  }

  // Queues the delivery. A refused one (the item was bought some other way meanwhile, or the cart is full) is just a line.
  private buy(impulse: boolean): void {
    if (!this.deps.deliver(this.ad.item, this.ad.delayHours)) {
      const why = this.refusal() ?? ENCOUNTER_WORDS.cartFull;
      return this.speak(why);
    }
    this.deps.addMood(ENCOUNTERS.mood.cart);
    const when = ENCOUNTER_WORDS[arrivesWord(this.ad.delayHours)];
    const confirmed = `${ENCOUNTER_WORDS.ordered} ${when}`;
    this.speak(impulse ? `${ENCOUNTER_WORDS.impulse}\n${confirmed}` : confirmed);
  }

  // One narrator line, then it is over.
  private speak(text: string): void {
    if (!this.host.openDialog(say(text), () => this.leave())) this.leave();
  }

  draw(ctx: CanvasRenderingContext2D, _screen: { width: number; height: number }): void {
    if (this.done) return;
    drawCard(ctx, { ad: this.ad, details: this.details, product: this.deps.product, sprites: this.host.sprites });
    if (this.note !== null) drawNote(ctx, this.note, textBoxRect());
  }
}
