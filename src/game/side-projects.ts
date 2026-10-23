import type { Effect, Requirement } from "./state";
import type { Task } from "./tasks";
import type { HourWindow } from "./time-of-day/hours";

// Side projects (issue 051): things the character works on at the desk when they
// are not doing their job. Each is a small piece of data and becomes one task
// (`sideProjectTask`), with its own points, cooldown and mood. Add a project by
// adding an entry here and its id to the desk's tasks in `apartment.ts`.
//
// Only one is written so far: this game, seen on a small screen.
export interface SideProject {
  id: string;
  name: string;
  prompt: string;
  points: number;
  cooldown: number;
  mood: number;
  energy: number;
  goodHours?: HourWindow[];
  // A full-screen picture (a `view-...` sprite) and what you think while looking at it.
  view: string;
  lines: string[];
  flavor: string;
}

export const SIDE_PROJECTS: SideProject[] = [
  {
    id: "side-project-game",
    name: "Work on the side project",
    prompt: "Work on side project",
    points: 45,
    cooldown: 90,
    mood: 4,
    energy: -5,
    goodHours: [{ from: 20, to: 24 }],
    view: "view-side-project",
    // Draft wording; Marc reviews it in the text pass (037). Plain, like the mirror lines.
    lines: [
      "A small version of this room, on a small screen. Someone is at the desk.",
      "They are looking at a screen too.",
      "You do not follow that all the way down.",
    ],
    flavor: "Same room, one size smaller.",
  },
];

const TIRED: Requirement = { var: "energy", min: 10, reason: "TOO TIRED FOR IT" };

export function sideProjectTask(p: SideProject): Task {
  const effects: Effect[] = [{ var: "mood", add: p.mood }, { var: "energy", add: p.energy }];
  return {
    id: p.id,
    name: p.name,
    prompt: p.prompt,
    duration: 0,
    points: p.points,
    cooldown: p.cooldown,
    flavor: p.flavor,
    requires: [TIRED],
    effects,
    pose: "type-desk",
    held: "laptop",
    ...(p.goodHours ? { goodHours: p.goodHours } : {}),
    activity: {
      type: "cutscene",
      steps: [{ view: p.view }, ...p.lines.map((say) => ({ say })), { unview: true }],
    },
  };
}
