---
id: "165"
title: "A Sims-like shower scene that ends in the bathrobe"
short: "Shower scene"
status: todo
owner: marc + claude
depends_on: ["164"]
summary: "A short comic shower scene (bubbles, steam, a hiss) when you take a shower, ending with the player in the bathrobe."
kind: design
decisions:
  - id: d1
    who: marc
    q: "Where does the shower scene play?"
    options:
      - "a composed close-up like the sofa and side-project scenes: the player in the shower, bubbles and steam, then out in the robe"
      - "in the bath room itself: the player stays in the tub with effects drawn over it"
      - "both: the in-room version while it runs, a close-up for the finish"
    recommendation: "a composed close-up like the sofa and side-project scenes: the player in the shower, bubbles and steam, then out in the robe"
    status: open
  - id: d2
    who: marc
    q: "How should the effects look?"
    options:
      - "soap bubbles cover the body with the head showing (a nod to the censor blur); steam and fog drift up; droplets fall from the showerhead; all calm and slow"
      - "steam only, no bubbles"
      - "something sillier: more bubbles, bubbles that float away"
    recommendation: "soap bubbles cover the body with the head showing; steam and fog drift up; droplets fall from the showerhead; all calm and slow"
    status: open
  - id: d3
    who: marc
    q: "Sound for the scene?"
    options:
      - "a soft shower hiss (filtered noise on the effects bus) with a quiet click when it stops; the existing music keeps playing underneath"
      - "no sound beyond the existing music"
      - "a short jingle"
    recommendation: "a soft shower hiss (filtered noise on the effects bus) with a quiet click when it stops; the existing music keeps playing underneath"
    status: open
  - id: d4
    who: marc
    q: "Reduced motion (the browser setting, docs/reduced-motion.md)?"
    options:
      - "with it on, the steam is still and the bubbles do not move; the scene is otherwise the same"
      - "with it on, skip the scene and just play the old shower"
      - "ignore the setting for this scene"
    recommendation: "with it on, the steam is still and the bubbles do not move; the scene is otherwise the same"
    status: open
---

## Goal
Marc (2026-11-24): a Sims-like animation for the shower scene: the player in the shower covered in soap bubbles with some kind of particle motion showing the shower is on (steam, fog); when the shower turns off, the player is out of the shower in a bathrobe. See docs/ideas.md ('Put on the robe after a shower'). Today `shower` is a plain task in the bath (6 s, 70 points, mood +6, `src/game/tasks.ts`).

## Acceptance criteria
A DESIGN issue first: `docs/shower-scene-design.md` with the scene as mockups at 320x192 (and the phone layout, 224x208): the stages (shower off, on with bubbles and steam, off, out in the robe), the art needed (counts and sizes, palette only, no text), the particle effects reusing `src/game/particles`, the sound cues (`SOUND.effects`), how the robe appears (via the outfit slots of issue 164: the occasion 'after a shower' equips the ROBE slot; until that exists the scene may use the robe item if owned and the everyday outfit otherwise), reduced motion (docs/reduced-motion.md), the task's duration and points (unchanged unless Marc says), how it ends and what happens if the player skips it (Escape), the sleep-pose style of a clothes-free picture (issue 150), and a size and staged build plan. Unanswered questions stay as open `decisions` entries. No code in this issue.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
