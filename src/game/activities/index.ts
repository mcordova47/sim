// Importing this registers the built-in kinds of activity. Add a new kind by
// writing a class that extends `BaseActivity` and calling `registerActivity`
// with its name; nothing else needs to change.
import "./wait";
import "./sleep";
import "./dialog";
import "./cutscene";
import "./typing";
import "./notes";
import "./make-track";
import "./swap-decor";
import "./collect-delivery";
import "./flashcards";
import "./record-player";
import "./reel";

export { WaitActivity } from "./wait";
export { SleepActivity } from "./sleep";
export { DialogActivity } from "./dialog";
export { CutsceneActivity, type CutsceneStep } from "./cutscene";
export { TypingActivity, SNIPPETS, isTypingKey } from "./typing";
export { NotesActivity, ARROW } from "./notes";
export { MakeTrackActivity } from "./make-track";
export { SwapDecorActivity } from "./swap-decor";
export { FlashcardsActivity } from "./flashcards";
export { ReelActivity } from "./reel";
