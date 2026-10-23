---
id: 064
title: Plugins (VSTs) for the track editor (explore)
status: todo
owner: marc + claude
depends_on: []
---

## Goal
Marc's idea (2026-10-23): like customizable decor (issue 062), you could also get "plugins" or "VSTs": add-ons that do interesting things in the track editor (issue 059). He likes that the mixing feature has a lot of potential. Start with a design note.

## Design questions
- **What a plugin does** (each is a small, separate thing the editor can apply, written as data or a tiny function over a track): ideas to list and let Marc pick: an arpeggiator (turns a held note into a run), a chord stamp (one key places a triad), an echo or delay (repeats notes quieter), a humanizer (small timing and volume drift), a swing control, a bit-crush or lo-fi color on a channel, a drum pattern generator (four-on-the-floor, breakbeat), a transpose, a randomize (a bounded random melody in a scale), a scale lock (only notes in a key), a reverb-like tail. Each is something the existing track format can express (the format has notes, waves, volumes and drums), or needs a small format extension (say which).
- **How you use one:** a menu key in the editor that lists owned plugins, applies one to the current channel or selection, with a preview and undo; or a per-channel slot you plug them into.
- **How you get them:** the same source as decor (issue 062: a shop task on the laptop, deliveries, gifts, finds), or unlocked by achievements (009c) or by making tracks; pick one first. Owned plugins are saved (with the `life.tracks.v1` data or progress, tolerant of old saves).
- **Fiction and tone:** names plain and a little wry like real plugin names (not gag names); the laptop is the shop; no real brands (no real plugin or company names).
- **Pillar check:** like 062, decide whether getting things is a goal or a quiet side effect; the game has no win condition.

## Acceptance criteria
- A design note in `docs/plugins.md` with the plugin list and which the format supports, the editor UI for applying one (mockups at 320x192), acquisition options, data model and save format, a staged plan, and open questions for Marc.
- Marc picks; then stage 1 (the plugin data model and two or three simple plugins, say transpose, chord stamp and echo, applied in the editor with undo) is a build issue.

## Marc's answer (2026-10-23)
Same as 062: plugins are a **quiet side effect**, a zen-garden thing you collect calmly, not a goal. No pressure or scarcity; they turn up (gifts, finds, small purchases that are never required, or as a calm reward for making tracks).

## Progress log
