// Importing this registers the built-in kinds of activity. Add a new kind by
// writing a class that extends `BaseActivity` and calling `registerActivity`
// with its name; nothing else needs to change.
import "./wait";
import "./dialog";
import "./cutscene";
import "./typing";
import "./notes";
import "./make-track";

export { WaitActivity } from "./wait";
export { DialogActivity } from "./dialog";
export { CutsceneActivity, type CutsceneStep } from "./cutscene";
export { TypingActivity, SNIPPETS, isTypingKey } from "./typing";
export { NotesActivity, ARROW } from "./notes";
export { MakeTrackActivity } from "./make-track";
