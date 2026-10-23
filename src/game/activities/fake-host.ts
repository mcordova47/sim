import type { ActivityHost } from "../activity";
import type { DialogNode, DialogResult } from "../dialog";
import type { Direction } from "../direction";

// A stand-in for the game, for testing activities without one. It records what
// the activity asks for, and lets the test decide when a dialog closes.
export function fakeHost(seed = 1) {
  const cues: string[] = [];
  const stateSets: { id: string; value: number }[] = [];
  const dialogs: { node: DialogNode; close(result?: DialogResult): void }[] = [];
  let open = false;

  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };

  const player = {
    col: 5,
    row: 5,
    facing: "down" as Direction,
    stepping: false,
    face(direction: Direction) {
      this.facing = direction;
    },
  };

  const host: ActivityHost = {
    openDialog(node, onDone) {
      if (open) return false;
      open = true;
      dialogs.push({
        node,
        close(result = { path: [], cancelled: false }) {
          open = false;
          onDone(result);
        },
      });
      return true;
    },
    cue: (name) => cues.push(name),
    setState: (id, value) => stateSets.push({ id, value }),
    player,
    random,
  };

  return {
    host,
    cues,
    stateSets,
    dialogs,
    player,
    // Make `openDialog` refuse, as if another dialog were open.
    blockDialogs(blocked: boolean) {
      open = blocked;
    },
    closeDialog(result?: DialogResult) {
      dialogs.at(-1)!.close(result);
    },
    random,
  };
}
