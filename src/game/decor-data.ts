import type { COLOR } from "../render/colors";
import type { Rect } from "./world";

// What can be changed in the apartment and what you can put there (issue 062,
// docs/decor.md). Like state-vars.ts this is data: adding an item is a line
// here and a sprite, adding a slot is a line here and a `slot` on the object.
// Nothing here costs anything or is ever required.

// A small, seeded, quick wander of a glow: `alpha` and `radius` are the most it
// moves each, as a fraction (0.15 is plus or minus 15 percent); `seed` makes two
// flickers differ. Steps about twelve times a second, never a strobe (see `flickerAt`).
export interface GlowFlicker {
  alpha: number;
  radius: number;
  seed: number;
}

// The most characters in a `note` (issue 143: Marc's text review rewrites run to 78; the entry box wraps a note over
// as many rows as it needs, and the grid has three rows so there is room) or a `from`.
export const NOTE_MAX = 80;
export const FROM_MAX = 30;
export const TASK_NAME_MAX = 20;

// `trinket`, `coffee`, `outfit` and `furniture` are for the decor expansion (docs/decor-expansion-design.md, issue 151):
// no item has one yet, so they only need their swap prompt (tasks.ts SWAP_PROMPT).
export type DecorKind = "art" | "plant" | "lamp" | "prop" | "rug" | "instrument" | "plugin" | "pantry" | "trinket" | "coffee" | "outfit" | "furniture";

// A place that holds one item. `area` is where the item's sprite is drawn, in
// pixels from the room's top left; an item fits only if its size is the same.
export interface DecorSlot {
  id: string;
  room: string;
  // What a prompt calls it (capitals, digits and basic punctuation only: the font).
  name: string;
  // Where an item shown here is, in the swap list's small text ("ON THE DESK WALL"). Falls back to `name`.
  where?: string;
  area: Rect;
  kinds: DecorKind[];
  // The item shown on a fresh game, and the fallback when a saved one is gone. Left out, the slot starts
  // EMPTY: it draws nothing, can hold nothing, and its swap list has a NOTHING row at the top (issue 151).
  // Only a slot without a default can be emptied.
  default?: string;
  // For a slot that holds a growing plant: the state variables the plant's
  // stage and dryness live in (stage belongs to the slot, not the item).
  stageVar?: string;
  dryVar?: string;
  // The variable counting waterings toward the next stage. A swapped-in plant
  // starts small, so the swap puts the stage, this and the dry count back to 0.
  growthVar?: string;
  // The map piece you stand at to change it (its name in the room's legend). The
  // swap task (`swap-<slot id>`, issue 062 stage 2) is offered there, only when
  // there is something else to put in the slot. Checked against the room at startup.
  object?: string;
  // True for a slot that is not a place on the map (the worn outfit, issue 152): nothing is drawn at `area`
  // (it is only the size items must match), so no map object or prop is expected for it.
  offMap?: boolean;
}

export interface DecorItem {
  // Starts with its kind and a dash ("art-barn", "plant-snake").
  id: string;
  name: string;
  kind: DecorKind;
  // The sprite to draw. For an item with a `family` it is the name used before
  // any rules apply (and the placeholder), such as "plant-1".
  sprite: string;
  // A set of sprites chosen by rules from state: `<family>-0..` for the stage and
  // `<family>-wilted` for drooping, as the family's rules say (FAMILIES).
  family?: string;
  // What a task about this item calls it, lowercase ("snake plant"): it replaces the task's `itemWord` in the
  // task's name (Interactable.itemWord, issue 149). Letters the font can draw, at most TASK_NAME_MAX characters.
  taskName?: string;
  // If set, the item only fits these slots (even if another has its size). The
  // barn drawing and the gold abstract fit the table and the desk wall (issue 073,
  // so they can trade places); the silkscreen is wider and fits only the bed wall.
  slots?: string[];
  // Pixels. Must equal the slot's area size to fit.
  w: number;
  h: number;
  // Placeholder colour while the art is missing.
  color?: keyof typeof COLOR;
  // The night glow this item gives (issue 069): `radius` in pixels and `alpha`
  // (the strength at full night), as the time-of-day light draws it (config.ts
  // TIME_OF_DAY.glows has the same two numbers for things that are not decor).
  // An item without `glow` gives no light, whatever its sprite or slot.
  // `flicker` (the candle) makes the light wander a little over game time, see `flickerAt`.
  glow?: { radius: number; alpha: number; flicker?: GlowFlicker };
  // One short deadpan line, capitals, at most NOTE_MAX characters (issue 109a). Shown in the
  // browsable inventory. Add one for every new real item.
  note?: string;
  // Where it came from, as the words after "FROM: " ("A PACKAGE"). It records the past and
  // never hints at how to get anything else. Without it the entry falls back to `how`.
  from?: string;
  // Where it came from, in broad terms. The inventory falls back to this when there is no `from`.
  how?: "start" | "gift" | "find" | "delivery" | "browse";
  // "test" marks an item that only exists so the swap can be tried before there
  // is a way to get anything (stage 2). Stage 4 removes them; `?own=` is the only way to get one.
  tags?: string[];
}

// How a family of sprites follows the plant's state. `stages` is how many
// stage sprites there are (0 for one that never grows: it then just uses the
// item's `sprite`), `droops` is whether a long dry spell shows `<family>-wilted`.
export interface FamilyRules {
  stages: number;
  droops: boolean;
  // Waterings that count to grow out of stage 0, 1, 2 and so on (one fewer than `stages`). Left out, the
  // family uses PLANT.wateringsToGrow, the snake plant's (issue 149).
  wateringsToGrow?: number[];
  // Stages whose sprite is bigger than the 16x16 slot (issue 149): stage -> how many pixels it reaches `up` above
  // the slot's top and `down` below its bottom, so the sprite is `up + 16 + down` high and the slot's 16 rows are the
  // ones in the middle. It is drawn as an overlay over what is around the slot: the monstera's crown reaches up over
  // the bookshelf's top, the pothos's vines hang down over the bookshelf's south face. Sprites are whole tiles, so
  // each is 0 or a multiple of 16. Such a stage also has its own drooping sprite, `<family>-wilted-<stage>`, the same
  // size. The slot and the swap still compare the 16x16 footprint.
  overhang?: Record<number, { up?: number; down?: number }>;
}

export const FAMILIES: Record<string, FamilyRules> = {
  // The snake plant: plant-0 to plant-3 and plant-wilted (issue 063).
  plant: { stages: 4, droops: true },
  // TEST: a plant that never grows or droops (like dried flowers will), drawn with its own sprite.
  "plant-test": { stages: 0, droops: false },
  // The other live houseplants (issue 147): the same four stages and the same drooping as the snake plant.
  // Issue 149: the pothos keeps growing, long after the others stop, and its vines hang down over the shelf's south
  // face; the monstera gets one more stage, a taller crown with bigger leaves. These stages are 16x32: sprites are whole tiles.
  pothos: { stages: 6, droops: true, wateringsToGrow: [2, 3, 4, 6, 8], overhang: { 4: { down: 16 }, 5: { up: 16, down: 16 } } },
  monstera: { stages: 5, droops: true, wateringsToGrow: [2, 3, 4, 7], overhang: { 4: { up: 16 } } },
  spider: { stages: 4, droops: true },
};

export const DECOR_SLOTS: DecorSlot[] = [
  { id: "art-table", where: "ON THE TABLE WALL", room: "main", name: "ART OVER THE TABLE", area: { x: 32, y: 0, w: 32, h: 16 }, kinds: ["art"], default: "art-barn", object: "dining table" },
  { id: "art-desk", where: "ON THE DESK WALL", room: "main", name: "ART OVER THE DESK", area: { x: 112, y: 0, w: 32, h: 16 }, kinds: ["art"], default: "art-abstract", object: "standing desk" },
  { id: "art-bed", where: "ON THE BED WALL", room: "main", name: "ART OVER THE BED", area: { x: 224, y: 0, w: 48, h: 16 }, kinds: ["art"], default: "art-silkscreen", object: "nightstand" },
  { id: "plant-shelf", where: "ON THE SHELF", room: "main", name: "PLANT ON THE SHELF", area: { x: 160, y: 52, w: 16, h: 16 }, kinds: ["plant"], default: "plant-snake", stageVar: "plantStage", dryVar: "plantDry", growthVar: "plantGrowth", object: "cube bookshelf" },
  { id: "lamp-sofa", where: "BY THE SOFA", room: "main", name: "LAMP BY THE SOFA", area: { x: 128, y: 96, w: 16, h: 16 }, kinds: ["lamp"], default: "lamp-table", object: "lamp table" },
  // The rugs (issue 166, step E of decor-expansion-design.md): floor props, drawn under every piece and the player. No default, so a
  // fresh game has no rug and looks the same. `rug-floor` is the living-area rug, 128x64 at tile cols 2-9, rows 3-6: it runs under
  // the front of the sofa, the desk chair and the lamp table. `rug-bed` is the bed rug, 112x48 at cols 11-17, rows 6-8: the bed lies
  // over most of it, so a band at the bed's foot and the strips beside it show. Two sizes, so each has its own slot and items.
  { id: "rug-floor", where: "ON THE FLOOR", room: "main", name: "RUG", area: { x: 32, y: 48, w: 128, h: 64 }, kinds: ["rug"], object: "sofa" },
  { id: "rug-bed", where: "UNDER THE BED", room: "main", name: "BED RUG", area: { x: 176, y: 96, w: 112, h: 48 }, kinds: ["rug"], object: "queen bed" },
  // The pantry in the kitchen (issue 072): a 16x32 stack of bins down the east wall. Nothing to swap yet (no `object`, one item); stage 4 can add upgrade items.
  { id: "pantry", where: "IN THE PANTRY", room: "kitchen", name: "PANTRY", area: { x: 176, y: 16, w: 16, h: 32 }, kinds: ["pantry"], default: "pantry-bins" },
  // What you wear (issue 152). Not drawn on the map: the player's sprites follow it (`Game.syncOutfit`). Changed at the cube bookshelf (Marc, 2026-11-24).
  { id: "worn", where: "WORN", room: "main", name: "CLOTHES", area: { x: 0, y: 0, w: 16, h: 16 }, kinds: ["outfit"], default: "outfit-home", object: "cube bookshelf", offMap: true },
  // The two coffee stations (issue 168): the pour-over cone on the dining table (today's look), and a burner on the stove that starts empty.
  // Each apparatus fits one of them (its item's `slots`). The make-coffee task is offered where an apparatus sits.
  { id: "coffee-table", where: "ON THE TABLE", room: "main", name: "COFFEE ON THE TABLE", area: { x: 62, y: 18, w: 16, h: 16 }, kinds: ["coffee"], default: "coffee-pourover", object: "dining table" },
  { id: "coffee-stove", where: "ON THE STOVE", room: "kitchen", name: "COFFEE ON THE STOVE", area: { x: 93, y: 56, w: 16, h: 16 }, kinds: ["coffee"], object: "stove" },
];

// Today's room, as items. These are the starting set: owned from the first run.
export const DECOR_ITEMS: DecorItem[] = [
  { id: "art-barn", name: "BARN DRAWING", kind: "art", sprite: "painting", w: 32, h: 16, color: "paper", how: "start", from: "ALREADY HERE", note: "A RUSTIC-LOOKING BARN. YOUR UNCLE PAINTED IT. YOU WONDER WHERE IT IS...", slots: ["art-table", "art-desk"] },
  { id: "art-abstract", name: "GOLD ABSTRACT", kind: "art", sprite: "painting-desk", w: 32, h: 16, color: "paper", how: "start", from: "ALREADY HERE", note: "DEUS EX MESSINA.", slots: ["art-table", "art-desk"] },
  { id: "art-silkscreen", name: "SILKSCREEN", kind: "art", sprite: "painting-wide", w: 48, h: 16, color: "paper", how: "start", from: "ALREADY HERE", note: "A SILKSCREEN PRINT. NUM. 1/12, WHICH YOU FEEL A STRANGE SENSE OF PRIDE ABOUT.", slots: ["art-bed"] },
  { id: "plant-snake", name: "SNAKE PLANT", kind: "plant", sprite: "plant-1", family: "plant", taskName: "snake plant", w: 16, h: 16, color: "leaf", how: "start", from: "ALREADY HERE", note: "A SNAKE PLANT. IT ASKS FOR VERY LITTLE." },
  { id: "lamp-table", name: "LAMP", kind: "lamp", sprite: "lamp-table", w: 16, h: 16, color: "butter", how: "start", from: "ALREADY HERE", note: "A LAMP. IT'S A GOOD LAMP, YOU THINK.", glow: { radius: 40, alpha: 0.2 } },
  { id: "outfit-home", name: "EVERYDAY CLOTHES", kind: "outfit", sprite: "player-idle-down", w: 16, h: 16, color: "dusk", how: "start", from: "ALREADY HERE", note: "THE USUAL. IT HAS WORKED SO FAR." },
  { id: "pantry-bins", name: "CLEAR BINS", kind: "pantry", sprite: "pantry", w: 16, h: 32, color: "mist", how: "start", from: "ALREADY HERE", note: "YOU GUESS THESE WILL DO AS A PANTRY, FOR NOW." },
  { id: "coffee-pourover", name: "POUR-OVER CONE", kind: "coffee", sprite: "coffee-pourover", taskName: "pour-over", slots: ["coffee-table"], w: 16, h: 16, color: "paper", how: "start", from: "ALREADY HERE", note: "THE SLOW WAY. YOU SAY IT'S FOR THE FLAVOR." },
];

// The real gifts (issue 043 stage A, docs/random-encounters.md section 3), in the
// order the checkpoints give them (delivery-checkpoints.ts). They start unowned.
// Paintings are 32x16 and fit the table and desk wall slots (the bed wall is 48x16:
// nothing wide yet); items with no slot yet are still ownable inventory.
const WALL = ["art-table", "art-desk"];
export const GIFT_ITEMS: DecorItem[] = [
  { id: "art-robin", name: "ROBIN PRINT", kind: "art", sprite: "art-robin", w: 32, h: 16, color: "paper", how: "gift", from: "A PACKAGE", note: "WHERE ARE YOU, ROBIN?", slots: WALL },
  { id: "art-concert-poster", name: "CONCERT POSTER", kind: "art", sprite: "art-concert-poster", w: 32, h: 16, color: "paper", how: "gift", from: "A PACKAGE", note: "A POSTER FROM THAT SHOW YOU JUST WENT TO.", slots: WALL },
  { id: "lamp-warm", name: "WARM LAMP", kind: "lamp", sprite: "lamp-warm", w: 16, h: 16, color: "tangerine", how: "gift", from: "A PACKAGE", note: "A LAMP, BUT WARMER.", glow: { radius: 40, alpha: 0.2 } },
  { id: "plant-dried", name: "DRIED FLOWERS", kind: "plant", sprite: "plant-dried", w: 16, h: 16, color: "leaf", how: "gift", from: "A PACKAGE", note: "THEY LAST SO LONG IT FEELS ILLEGAL." },
  { id: "art-snow-wagon", name: "SNOW WAGON", kind: "art", sprite: "art-snow-wagon", w: 32, h: 16, color: "paper", how: "gift", from: "A PACKAGE", note: "A LANDSCAPE OF YOUR AUNT'S YARD. +5 NOSTALGIA.", slots: WALL },
  { id: "lamp-stool-lamp", name: "STOOL LAMP", kind: "lamp", sprite: "stool-lamp", w: 16, h: 16, color: "butter", how: "gift", from: "A PACKAGE", note: "A SMALL LAMP ON A STOOL. A GOOD ARRANGEMENT.", glow: { radius: 24, alpha: 0.2 } },
  { id: "art-serenity-now", name: "SERENITY NOW", kind: "art", sprite: "art-serenity-now", w: 32, h: 16, color: "paper", how: "gift", from: "A PACKAGE", note: "YOU DON'T MAKE A HABIT OF BUYING JOKE ART, BUT THE ARTIST SEEMED COOL.", slots: WALL },
  { id: "art-canoes", name: "CANOES", kind: "art", sprite: "art-canoes", w: 32, h: 16, color: "paper", how: "gift", from: "A PACKAGE", note: "JUST A COUPLE CANOES. EMPTY. HOW VERY RIMBAUD.", slots: WALL },
  // A small light that wanders a little, slowly (never a strobe).
  { id: "lamp-candle", name: "CANDLE", kind: "lamp", sprite: "lamp-candle", w: 16, h: 16, color: "butter", how: "gift", from: "A PACKAGE", note: "THE ORIGINAL LAMP.", glow: { radius: 20, alpha: 0.18, flicker: { alpha: 0.2, radius: 0.08, seed: 11 } } },
  { id: "art-great-wave", name: "GREAT WAVE", kind: "art", sprite: "art-great-wave", w: 32, h: 16, color: "paper", how: "gift", from: "A PACKAGE", note: "JUST BECAUSE IT'S IN EVERY COLLEGE DORM DOESN'T MAKE IT BAD.", slots: WALL },
  // After the first ten (the later list): owned only once something gives them.
  { id: "art-starry-night", name: "STARRY NIGHT", kind: "art", sprite: "art-starry-night", w: 32, h: 16, color: "paper", how: "gift", from: "A PACKAGE", note: "NOT YOUR FAVORITE VAN GOGH, BUT THERE IS A REASON IT'S A CLASSIC.", slots: WALL },
  { id: "art-water-lilies", name: "WATER LILIES", kind: "art", sprite: "art-water-lilies", w: 32, h: 16, color: "paper", how: "gift", from: "A PACKAGE", note: "PEOPLE TALK ABOUT CAPTURING A FLEETING MOMENT, BUT YOU JUST THINK IT'S PRETTY.", slots: WALL },
  { id: "art-sunflowers", name: "SUNFLOWERS", kind: "art", sprite: "art-sunflowers", w: 32, h: 16, color: "paper", how: "gift", from: "A PACKAGE", note: "SUNFLOWERS IN A VASE. JUST LOOK AT THOSE BRUSH STROKES.", slots: WALL },
  // Plants for the shelf (issue 147). The live ones grow and droop like the snake plant; the dried ones are still items.
  // In the order the checkpoints give them, alternating live and dried.
  { id: "plant-pothos", name: "POTHOS", kind: "plant", sprite: "pothos-1", family: "pothos", taskName: "pothos", w: 16, h: 16, color: "leaf", how: "gift", from: "A PACKAGE", note: "ITS LEAVES HAVE STARTED FOR THE FLOOR. YOU ADMIRE THE AMBITION." },
  { id: "plant-pampas", name: "PAMPAS PLUMES", kind: "plant", sprite: "plant-pampas", w: 16, h: 16, color: "paper", how: "gift", from: "A PACKAGE", note: "THEY SHED A LITTLE. THAT IS THE WHOLE COMMITMENT." },
  { id: "plant-monstera", name: "MONSTERA", kind: "plant", sprite: "monstera-1", family: "monstera", taskName: "monstera", w: 16, h: 16, color: "leaf", how: "gift", from: "A PACKAGE", note: "THE HOLES ARE ON PURPOSE. YOU CHECKED." },
  { id: "plant-lavender", name: "LAVENDER BUNDLE", kind: "plant", sprite: "plant-lavender", w: 16, h: 16, color: "dusk", how: "gift", from: "A PACKAGE", note: "SMELLS LIKE A DRAWER THAT HAS NEVER HAD A BAD DAY." },
  { id: "plant-spider", name: "SPIDER PLANT", kind: "plant", sprite: "spider-1", family: "spider", taskName: "spider plant", w: 16, h: 16, color: "leaf", how: "gift", from: "A PACKAGE", note: "IT KEEPS MAKING SMALLER ONES. NOBODY ASKED." },
  { id: "plant-eucalyptus", name: "EUCALYPTUS JAR", kind: "plant", sprite: "plant-eucalyptus", w: 16, h: 16, color: "mist", how: "gift", from: "A PACKAGE", note: "STEMS IN A JAR. THE ROOM SMELLS LIKE A SPA THAT GAVE UP." },
  // Rugs (issue 166): the main set (128x64, the `rug-floor` slot) then the bed set (112x48, the `rug-bed` slot). Only the first of each
  // set has a checkpoint (delivery-checkpoints.ts); the rest are items with no source yet and come through the random-encounter
  // pool (issue 163) when it is built. An item nobody gives is simply never owned; nothing needs it.
  { id: "rug-striped", name: "STRIPED RUG", kind: "rug", sprite: "rug-striped", w: 128, h: 64, color: "dusk", how: "gift", from: "A PACKAGE", note: "ONE LONG OPINION ABOUT THE FLOOR, IN BLUE AND CREAM." },
  { id: "rug-geometric", name: "DIAMOND RUG", kind: "rug", sprite: "rug-geometric", w: 128, h: 64, color: "butter", how: "gift", from: "A PACKAGE", note: "THE DIAMONDS ARE EVENLY SPACED. YOU HAVE CHECKED TWICE." },
  { id: "rug-field", name: "GREEN RUG", kind: "rug", sprite: "rug-field", w: 128, h: 64, color: "leaf", how: "gift", from: "A PACKAGE", note: "IT IS ONE COLOR ON PURPOSE. THE FLOOR SEEMS RELIEVED." },
  { id: "rug-shag", name: "SHAG RUG", kind: "rug", sprite: "rug-shag", w: 128, h: 64, color: "tangerine", how: "gift", from: "A PACKAGE", note: "YOUR FEET HAVE OPINIONS ABOUT IT. THEY ARE GOOD ONES." },
  { id: "rug-kilim", name: "KILIM RUG", kind: "rug", sprite: "rug-kilim", w: 128, h: 64, color: "brick", how: "gift", from: "A PACKAGE", note: "EVERY ZIGZAG WAS A DECISION. YOU RESPECT THE COMMITMENT." },
  { id: "rug-bed-striped", name: "STRIPED BED RUG", kind: "rug", sprite: "rug-bed-striped", w: 112, h: 48, color: "dusk", how: "gift", from: "A PACKAGE", note: "THE FIRST THING YOUR FEET FIND. THE STRIPES ARE ENCOURAGING." },
  { id: "rug-bed-geometric", name: "DIAMOND BED RUG", kind: "rug", sprite: "rug-bed-geometric", w: 112, h: 48, color: "butter", how: "gift", from: "A PACKAGE", note: "THE DIAMONDS POINT AT THE BED. THE BED ACCEPTS THIS." },
  { id: "rug-bed-field", name: "GREEN BED RUG", kind: "rug", sprite: "rug-bed-field", w: 112, h: 48, color: "leaf", how: "gift", from: "A PACKAGE", note: "A SOFT PLACE TO START A HARD DAY, ONE FOOT AT A TIME." },
  { id: "rug-bed-shag", name: "SHAG BED RUG", kind: "rug", sprite: "rug-bed-shag", w: 112, h: 48, color: "tangerine", how: "gift", from: "A PACKAGE", note: "THE MORNING STARTS WARMER. THE ALARM STAYS THE SAME." },
  { id: "rug-bed-braid", name: "BRAIDED BED RUG", kind: "rug", sprite: "rug-bed-braid", w: 112, h: 48, color: "brick", how: "gift", from: "A PACKAGE", note: "SOMEONE BRAIDED THIS BY HAND. YOU SLEEP NEAR IT." },
  { id: "rug-bed-kilim", name: "KILIM BED RUG", kind: "rug", sprite: "rug-bed-kilim", w: 112, h: 48, color: "brick", how: "gift", from: "A PACKAGE", note: "A ZIGZAG BORDER. THE BEDSIDE HAS NEVER LOOKED BUSIER." },
  // Clothes (issue 152): worn from the `worn` slot, drawn as the player's idle-down sprite. The player's own outfit list is outfits.ts.
  { id: "outfit-casual", name: "CASUAL CLOTHES", kind: "outfit", sprite: "player-casual-idle-down", w: 16, h: 16, color: "dusk", how: "gift", from: "A PACKAGE", note: "SOFT PANTS. THE OTHER PANTS HAVE LOST." },
  { id: "outfit-out", name: "GOING OUT CLOTHES", kind: "outfit", sprite: "player-out-idle-down", w: 16, h: 16, color: "dusk", how: "gift", from: "A PACKAGE", note: "FOR WHEN THE PLAN INVOLVES A DOOR." },
  { id: "outfit-pajamas", name: "PAJAMAS", kind: "outfit", sprite: "player-pajamas-idle-down", w: 16, h: 16, color: "dusk", how: "gift", from: "A PACKAGE", note: "THE DAY ENDS WHEN YOU SAY SO." },
  { id: "outfit-casual-cardigan", name: "CARDIGAN AND TEE", kind: "outfit", sprite: "player-casual-cardigan-idle-down", w: 16, h: 16, color: "dusk", how: "gift", from: "A PACKAGE", note: "IT DOES UP. YOU HAVE DECIDED IT DOESN'T." },
  { id: "outfit-casual-hoodie", name: "GREY HOODIE", kind: "outfit", sprite: "player-casual-hoodie-idle-down", w: 16, h: 16, color: "dusk", how: "gift", from: "A PACKAGE", note: "A POCKET FOR EVERYTHING EXCEPT THE KEYS." },
  { id: "outfit-casual-denim-jacket", name: "DENIM JACKET AND TEE", kind: "outfit", sprite: "player-casual-denim-jacket-idle-down", w: 16, h: 16, color: "dusk", how: "gift", from: "A PACKAGE", note: "IT GOES WITH EVERYTHING. YOU HAVE CHECKED." },
  { id: "outfit-out-jacket-scarf", name: "JACKET AND SCARF", kind: "outfit", sprite: "player-out-jacket-scarf-idle-down", w: 16, h: 16, color: "dusk", how: "gift", from: "A PACKAGE", note: "A SCARF MAKES ANY ERRAND LOOK PLANNED." },
  { id: "outfit-out-button-up", name: "BUTTON-UP SHIRT", kind: "outfit", sprite: "player-out-button-up-idle-down", w: 16, h: 16, color: "dusk", how: "gift", from: "A PACKAGE", note: "EVERY BUTTON IS IN THE RIGHT HOLE. THIS TIME." },
  { id: "outfit-out-blazer", name: "BLAZER AND TEE", kind: "outfit", sprite: "player-out-blazer-idle-down", w: 16, h: 16, color: "dusk", how: "gift", from: "A PACKAGE", note: "IT MAKES A TEE LOOK LIKE A DECISION." },
  { id: "outfit-out-peacoat", name: "PEACOAT", kind: "outfit", sprite: "player-out-peacoat-idle-down", w: 16, h: 16, color: "dusk", how: "gift", from: "A PACKAGE", note: "WARM, AND NOBODY ASKS WHERE YOU ARE GOING." },
  { id: "outfit-pajamas-striped", name: "STRIPED PAJAMAS", kind: "outfit", sprite: "player-pajamas-striped-idle-down", w: 16, h: 16, color: "dusk", how: "gift", from: "A PACKAGE", note: "NOTHING ABOUT THESE IS URGENT." },
  { id: "outfit-pajamas-robe", name: "BATHROBE", kind: "outfit", sprite: "player-pajamas-robe-idle-down", w: 16, h: 16, color: "dusk", how: "gift", from: "A PACKAGE", note: "THE SHOWER WENT WELL. THE ROBE AGREES." },
  // Coffee gear (issue 168): equal pay, only the picture and the task's name follow the apparatus. The table takes the first three, the stove the rest.
  { id: "coffee-french-press", name: "FRENCH PRESS", kind: "coffee", sprite: "coffee-french-press", taskName: "french press", slots: ["coffee-table"], w: 16, h: 16, color: "paper", how: "gift", from: "A PACKAGE", note: "YOU PRESS IT SLOWLY, LIKE SOMEONE WITH NOTHING SCHEDULED." },
  { id: "coffee-drip-machine", name: "DRIP MACHINE", kind: "coffee", sprite: "coffee-drip-machine", taskName: "drip", slots: ["coffee-table"], w: 16, h: 16, color: "paper", how: "gift", from: "A PACKAGE", note: "IT DOES THE WAITING FOR YOU. YOU WAIT ANYWAY." },
  { id: "coffee-pod-machine", name: "POD MACHINE", kind: "coffee", sprite: "coffee-pod-machine", taskName: "pod", slots: ["coffee-table"], w: 16, h: 16, color: "paper", how: "gift", from: "A PACKAGE", note: "EVERY CUP COMES IN A LITTLE CAPSULE. THE CAPSULES ADD UP." },
  { id: "coffee-percolator", name: "PERCOLATOR", kind: "coffee", sprite: "coffee-percolator", taskName: "percolator", slots: ["coffee-stove"], w: 16, h: 16, color: "dusk", how: "gift", from: "A PACKAGE", note: "IT BUBBLES IN THE LITTLE GLASS KNOB. WATCHING IS THE POINT." },
  { id: "coffee-moka-pot", name: "MOKA POT", kind: "coffee", sprite: "coffee-moka-pot", taskName: "moka", slots: ["coffee-stove"], w: 16, h: 16, color: "mist", how: "gift", from: "A PACKAGE", note: "IT SPUTTERS WHEN IT'S DONE. YOU HAVE LEARNED TO TRUST THE SPUTTER." },
  { id: "coffee-briki", name: "BRIKI", kind: "coffee", sprite: "coffee-briki", taskName: "briki", slots: ["coffee-stove"], w: 16, h: 16, color: "tangerine", how: "gift", from: "A PACKAGE", note: "A TINY POT WITH A LONG HANDLE. THE FOAM IS NOT OPTIONAL." },
];

// TEST items (issue 062 stage 2): borrowed sprites, so the swap can be tried and
// reviewed before gifts and finds (stage 3) or new art (stage 4) exist. They are
// not owned by anyone; `?own=test` in the dev server gives them all. Every id
// starts with "-test-" and every name with "TEST" so they cannot be mistaken
// for real items. Stage 4 deletes this list.
export const TEST_ITEMS: DecorItem[] = [
  { id: "art-test-desk", name: "TEST GOLD ABSTRACT", kind: "art", sprite: "painting-desk", w: 32, h: 16, color: "paper", tags: ["test"] },
  { id: "art-test-barn", name: "TEST BARN DRAWING", kind: "art", sprite: "painting", w: 32, h: 16, color: "paper", tags: ["test"] },
  { id: "plant-test-grown", name: "TEST GROWN PLANT", kind: "plant", sprite: "plant-3", family: "plant-test", w: 16, h: 16, color: "leaf", tags: ["test"] },
  // The bare stool gives no light; the same stool with a small lamp on it does (issue 069).
  { id: "lamp-test-stool", name: "TEST STOOL", kind: "lamp", sprite: "stool", w: 16, h: 16, color: "butter", tags: ["test"] },
  { id: "lamp-test-stool-lamp", name: "TEST STOOL AND LAMP", kind: "lamp", sprite: "stool-lamp", w: 16, h: 16, color: "butter", tags: ["test"], glow: { radius: 24, alpha: 0.2 } },
];

export const isTestItem = (item: DecorItem): boolean => item.tags?.includes("test") === true;

export interface DecorData {
  slots: readonly DecorSlot[];
  items: readonly DecorItem[];
  families: Readonly<Record<string, FamilyRules>>;
}

export const DECOR_DATA: DecorData = { slots: DECOR_SLOTS, items: [...DECOR_ITEMS, ...GIFT_ITEMS, ...TEST_ITEMS], families: FAMILIES };

// Every sprite name an item can ask for, so they are loaded before the first frame.
export function itemSprites(item: DecorItem, families: DecorData["families"] = FAMILIES): string[] {
  const rules = item.family ? families[item.family] : undefined;
  if (!item.family || !rules) return [item.sprite];
  const names = new Set<string>();
  for (let i = 0; i < rules.stages; i++) names.add(`${item.family}-${i}`);
  if (rules.droops) names.add(`${item.family}-wilted`);
  for (const stage of Object.keys(rules.overhang ?? {})) if (rules.droops) names.add(`${item.family}-wilted-${stage}`);
  if (rules.stages === 0) names.add(item.sprite);
  return [...names];
}

// The wander of a flickering glow at `hours` of game time, as multipliers near 1:
// `alpha` within 1 plus or minus `flicker.alpha`, `radius` within 1 plus or minus
// `flicker.radius`. Pure: the same seed and time always give the same numbers.
// It is a sum of three sine waves (periods of about 0.4, 0.7 and 1.3 seconds of
// play, since a game hour is 30 seconds) with phases and slight speeds taken from
// the seed, read in steps of 1/12 of a second so it ticks like a small sprite
// animation instead of sliding. Each step is a fraction of the range, so it is
// lively but never a strobe.
export function flickerAt(flicker: GlowFlicker, hours: number): { alpha: number; radius: number } {
  const step = 1 / 360; // game hours in 1/12 of a second
  hours = Math.floor(hours / step) * step;
  const wave = (k: number, period: number, t: number) => {
    const phase = (((flicker.seed * 2654435761 + k * 40503) >>> 0) % 6283) / 1000;
    const speed = 1 + ((((flicker.seed + k) * 2246822519) >>> 0) % 1000) / 10000;
    return Math.sin((t / period) * Math.PI * 2 * speed + phase);
  };
  const a = (wave(1, 0.0133, hours) + wave(2, 0.0233, hours) + wave(3, 0.0433, hours)) / 3;
  const r = (wave(4, 0.0167, hours) + wave(5, 0.0267, hours) + wave(6, 0.05, hours)) / 3;
  return { alpha: 1 + flicker.alpha * a, radius: 1 + flicker.radius * r };
}
