import type { Controls } from "../../input/controls";
import { drawCard } from "../../render/encounter-card";
import { BaseActivity, type ActivityHost } from "../activity";
import { ENCOUNTERS } from "../config";
import { choice, menu, say } from "../dialog";
import { CARD_WORDS, ENCOUNTER_WORDS, type Ad } from "../encounter-ads";
import type { EncounterOutcome, EncounterPhase, EncounterScene } from "../encounter-scene";
import { drawTransition, entranceFrames, exitFrames, transitionFrame } from "../encounter-transition";
import { arrivesWord, impulseChance, unsubscribeChance } from "../encounters";

// An ad encounter (issue 043 stage B, docs/random-encounters.md section 4): a full-screen
// card of an email, a post or a text message, one narrator line and a small menu, a standoff
// and not a fight. Nothing is ever lost: Ignore and a working Unsubscribe lift mood a little,
// Add to cart queues a delivery (the same package as a gift), a failed Unsubscribe only makes
// the next ad come sooner. An ad for something you already have, or have ordered, is just a
// card with one line, and it stays until you close it. It pays nothing, is never a completion or a cancel and has no
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
  // The browser asked for less motion: the entrance and exit are a plain fade. Missing: not asked.
  reducedMotion?(): boolean;
  // It starts right after a typing or notes game, so its first dialog ignores keys for a moment (issue 081).
  afterKeyGame?: boolean;
  // The item's own picture for the card.
  product: { sprite: string; w: number; h: number };
}

let encounterIds = 0;

export class EncounterActivity extends BaseActivity {
  cancellable = true;
  // No time pressure while it is open.
  readonly holdsClock = true;
  readonly readsKeys = false;

  // The second page of the card (Look closer) is showing.
  details = false;
  private looked = false;
  // entering: the entrance plays; open: the card and its dialogs; result: the closing line; leaving: the exit wipe.
  private phase: EncounterPhase = "entering";
  private frame = 0;
  private outcome: EncounterOutcome | null = null;
  private readonly id = ++encounterIds;
  private reduced = false;
  private firstDialogOpened = false;

  constructor(
    readonly ad: Ad,
    private readonly host: ActivityHost,
    private readonly deps: EncounterDeps,
  ) {
    super();
  }

  // What the sound follows (issue 091a); null once it is over, for any reason.
  get encounterScene(): EncounterScene | null {
    if (this.done) return null;
    return { id: this.id, phase: this.phase, frame: this.frame, outcome: this.outcome, reduced: this.reduced };
  }

  start(): void {
    this.reduced = this.deps.reducedMotion?.() ?? false;
    this.sound(0);
  }

  // The entrance's sounds that fall on `frame` (none after a skip: the rest is simply never played).
  private sound(frame: number): void {
    const E = ENCOUNTERS.entrance;
    if (this.reduced) {
      if (frame === 0) this.host.cue(E.softCue);
      return;
    }
    for (const [at, cue, semitones] of E.sounds) if (at === frame) this.host.cue(cue, semitones === 0 ? undefined : 2 ** (semitones / 12));
  }

  update(_dt: number, controls: Controls): void {
    if (this.done) return;
    this.frame++;
    if (this.phase === "entering") {
      const skip = controls.interactPressed && this.frame >= ENCOUNTERS.entrance.skipAfter;
      if (skip || this.frame >= entranceFrames(this.reduced)) this.open();
      else this.sound(this.frame);
    } else if (this.phase === "leaving" && this.frame >= exitFrames(this.reduced)) this.quit();
  }

  // True until the first dialog has opened, when the encounter followed a key game.
  get staleKeys(): boolean {
    return this.deps.afterKeyGame === true && !this.firstDialogOpened;
  }

  // The entrance is over (or skipped): the first line or the menu.
  private open(): void {
    this.phase = "open";
    this.frame = 0;
    this.openFirst();
    this.firstDialogOpened = true;
  }

  private openFirst(): void {
    const refusal = this.refusal();
    if (refusal !== null) return this.speak(refusal, "refused");
    const mood = this.deps.mood();
    const tone = mood < ENCOUNTERS.toneLow ? ENCOUNTER_WORDS.toneLow : mood >= ENCOUNTERS.toneHigh ? ENCOUNTER_WORDS.toneHigh : null;
    this.openMenu([this.ad.narrator ?? CARD_WORDS[this.ad.card].appeared, ...(tone ? [tone] : [])].join("\n"));
  }

  // Why nothing can be bought (an ad for something you have, ordered or cannot order), or null.
  private refusal(): string | null {
    if (this.deps.owns(this.ad.item)) return ENCOUNTER_WORDS.alreadyOwn;
    if (this.deps.queued(this.ad.item)) return ENCOUNTER_WORDS.alreadyInCart;
    return null;
  }

  // Over, with no wipe.
  private quit(): void {
    this.finish({ completed: false, quiet: true });
  }

  // Over once the exit wipe has played.
  private leave(): void {
    if (this.done || this.phase === "leaving") return;
    this.phase = "leaving";
    this.frame = 0;
    // The soft echo is for the exits that had no jingle (failure, refusal, Ignore, a plain leave).
    if (!this.reduced && !this.jingle()) this.host.cue(ENCOUNTERS.entrance.exitCue);
  }

  // Escape, and anything that drops the encounter: leave at once, with no mood change and no purchase.
  cancel(): void {
    if (this.done) return;
    this.quit();
  }

  private openMenu(prompt?: string): void {
    const words = CARD_WORDS[this.ad.card];
    const labels = [ENCOUNTER_WORDS.ignore, words.unsubscribe, ...(this.looked ? [] : [ENCOUNTER_WORDS.closer]), ENCOUNTER_WORDS.cart];
    const opened = this.host.openDialog(
      menu(prompt, labels.map((l) => choice(l))),
      (result) => {
        if (this.done) return;
        if (result.cancelled) return this.quit();
        if (result.path.length === 0) return this.leave();
        this.choose(result.path[result.path.length - 1]);
      },
    );
    if (!opened) this.quit();
  }

  private choose(label: string): void {
    const words = CARD_WORDS[this.ad.card];
    const mood = this.deps.mood();
    switch (label) {
      case ENCOUNTER_WORDS.ignore:
        // An Ignore at a low mood may turn into a purchase.
        if (this.deps.random() < impulseChance(mood, this.looked)) return this.buy(true);
        this.deps.addMood(ENCOUNTERS.mood.ignore);
        return this.speak(words.ignore, "ignore");
      case words.unsubscribe:
        if (this.deps.random() < unsubscribeChance(mood, this.ad.persistence)) {
          this.deps.addMood(ENCOUNTERS.mood.unsubscribe);
          return this.speak(words.unsubscribed, "unsubscribed");
        }
        this.deps.failedUnsubscribe();
        return this.speak(words.unsubscribeFailed, "unsubscribeFailed");
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
      return this.speak(why, "refused");
    }
    this.deps.addMood(ENCOUNTERS.mood.cart);
    const when = ENCOUNTER_WORDS[arrivesWord(this.ad.delayHours)];
    const confirmed = `${ENCOUNTER_WORDS.ordered} ${when}`;
    this.speak(impulse ? `${ENCOUNTER_WORDS.impulse}\n${confirmed}` : confirmed, "cart");
  }

  // The result jingle's cue for the outcome so far, or null (only a success has one; issue 091b).
  private jingle(): string | null {
    return (this.outcome && ENCOUNTERS.music.jingles[this.outcome]) || null;
  }

  // One narrator line, then it is over. The scene is in its `result` phase while the line is up.
  private speak(text: string, outcome: EncounterOutcome): void {
    this.phase = "result";
    this.frame = 0;
    this.outcome = outcome;
    const jingle = this.jingle();
    if (jingle) this.host.cue(jingle);
    if (!this.host.openDialog(say(text), (result) => (result.cancelled ? this.quit() : this.leave()))) this.quit();
  }

  draw(ctx: CanvasRenderingContext2D, screen: { width: number; height: number }): void {
    if (this.done) return;
    const t = this.phase === "open" || this.phase === "result" ? null : transitionFrame(this.phase === "entering" ? "enter" : "exit", this.frame, this.reduced);
    if (!t || t.card) {
      if (t && t.cardAlpha < 1) ctx.globalAlpha = t.cardAlpha;
      drawCard(ctx, { ad: this.ad, details: this.details, product: this.deps.product, sprites: this.host.sprites });
      ctx.globalAlpha = 1;
    }
    if (t) drawTransition(ctx, t, screen);
  }
}
