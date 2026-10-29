// The music lab page (issue 122, docs/music-lab.md): dev server only. It makes the game's own SoundEngine and
// MusicPlayer, so it sounds as the game does. The parts that decide things are in lab-text.ts and lab-player.ts.
import { SOUND } from "../game/config";
import { ADS } from "../game/encounter-ads";
import { TEMPO_RANGE } from "../game/music/track";
import { browserAudio } from "../game/sound/audio-types";
import { SoundEngine } from "../game/sound/engine";
import { LAB_ENCOUNTER } from "./lab-encounter";
import { LabMusicPlayer, labAudio } from "./lab-audio";
import { IntroPreview, introPlan } from "./lab-intro";
import { LabPlayer } from "./lab-player";
import { loadLab, saveLab, type LabState } from "./lab-store";
import { SAMPLE_TEXT, bake, channelRows, configLines, copyBack, parseLab, playable, type LabTrack, type Mode, type Tweaks } from "./lab-text";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
})();

const saved = loadLab(storage);
const state: LabState = saved ?? { text: SAMPLE_TEXT, mode: "both", tweaks: { gains: {}, muted: [] }, live: true };
let lab: LabTrack | null = null;

const engine = new SoundEngine(browserAudio);
const audio = labAudio(engine);
const music = new LabMusicPlayer();
const player = new LabPlayer(music, () => engine.ready, () => engine.now);
// "Play with the encounter intro" (issue 123): the real entrance sounds, then the loop on the hit, on the same
// bus the encounter hook uses (`sleep`, at the encounter music level) so the level is what the game will have.
const introMusic = new LabMusicPlayer("sleep");
const introPlayer = new LabPlayer(introMusic, () => engine.ready, () => engine.now);
const preview = new IntroPreview({
  playAt: (effect, pitch, delay) => void engine.playAt(effect, pitch === undefined ? undefined : { pitch }, delay),
  startLoop: () => {
    const now = current();
    if (now) introPlayer.start(null, now.loop);
  },
});

const text = $<HTMLTextAreaElement>("text");
const status = $("status");
text.value = state.text;
$<HTMLInputElement>("live").checked = state.live;
$<HTMLSelectElement>("mode").value = state.mode;
for (const ad of ADS) $<HTMLSelectElement>("ad").add(new Option(ad.id, ad.id));

function persist(): void {
  state.text = text.value;
  saveLab(storage, state);
  $("config").textContent = configLines({ ...state.tweaks, master: state.tweaks.master, encounterGain: state.tweaks.encounterGain });
}

function setStatus(message: string, kind: "ok" | "error"): void {
  status.textContent = message;
  status.className = kind;
}

const seconds = (beats: number, tempo: number): string => `${((beats * 60) / tempo).toFixed(1)} s`;

function slider(host: HTMLElement, label: string, min: number, max: number, step: number, value: number, onInput: (v: number) => void): { set(v: number): void } {
  const name = document.createElement("label");
  name.textContent = label;
  const input = document.createElement("input");
  input.type = "range";
  Object.assign(input, { min: String(min), max: String(max), step: String(step), value: String(value) });
  const out = document.createElement("span");
  const show = (v: number) => (out.textContent = String(Number(v.toFixed(3))));
  show(value);
  input.addEventListener("input", () => {
    show(Number(input.value));
    onInput(Number(input.value));
  });
  host.append(name, input, out, document.createElement("span"));
  return { set: (v) => { input.value = String(v); show(v); } };
}

let rowsKey = "";

function renderLevels(): void {
  const host = $("levels");
  host.replaceChildren();
  slider(host, "tempo (bpm)", TEMPO_RANGE.min, TEMPO_RANGE.max, 1, state.tweaks.tempo ?? lab?.loop.tempo ?? TEMPO_RANGE.default, (v) => { state.tweaks.tempo = v; changed(); });
  slider(host, "master (SOUND.master)", 0, 1, 0.01, state.tweaks.master ?? SOUND.master, (v) => { state.tweaks.master = v; audio.setMaster(v); persist(); });
  slider(host, "encounter music level", 0, 1, 0.01, state.tweaks.encounterGain ?? LAB_ENCOUNTER.defaultGain, (v) => { state.tweaks.encounterGain = v; persist(); });
}

function renderChannels(): void {
  const host = $("channels");
  host.replaceChildren();
  rowsKey = "";
  if (!lab) return;
  const rows = channelRows(lab);
  rowsKey = rows.map((r) => r.key).join("|");
  for (const r of rows) {
    slider(host, `${r.section}: ${r.name} (${r.wave})`, 0, 1, 0.01, state.tweaks.gains[r.key] ?? r.volume, (v) => { state.tweaks.gains[r.key] = v; changed(); });
    const mute = host.lastElementChild as HTMLElement;
    const box = document.createElement("label");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = state.tweaks.muted.includes(r.key);
    check.addEventListener("change", () => {
      state.tweaks.muted = state.tweaks.muted.filter((k) => k !== r.key).concat(check.checked ? [r.key] : []);
      changed();
    });
    box.append(check, " mute");
    mute.replaceWith(box);
  }
}

// The text or a slider changed: read it again, show the result and, with live preview on, let it be heard.
function changed(): void {
  const result = parseLab(text.value);
  if (result.ok) {
    lab = result.lab;
    const t = state.tweaks.tempo ?? lab.loop.tempo;
    setStatus(`ok. ${lab.intro ? `intro ${seconds(lab.intro.beats, t)}, ` : "no intro, "}loop ${seconds(lab.loop.beats, t)} at ${t} bpm.`, "ok");
    if (channelRows(lab).map((r) => r.key).join("|") !== rowsKey) renderChannels();
    if (state.live && (player.playing || introPlayer.playing)) apply();
  } else {
    setStatus(result.error, "error");
  }
  persist();
}

function current(): { intro: ReturnType<typeof playable>["intro"]; loop: ReturnType<typeof playable>["loop"] } | null {
  return lab ? playable(lab, state.mode, state.tweaks) : null;
}

// Live preview: the loop changes at the next loop end, an intro edit starts again (see LabPlayer).
let timer: ReturnType<typeof setTimeout> | undefined;
function apply(): void {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const now = current();
    if (!now) return;
    if (introPlayer.playing) introPlayer.update(null, now.loop);
    else if (player.playing) player.update(now.intro, now.loop);
  }, 150);
}

function stopAll(): void {
  preview.stop();
  introPlayer.stop();
  player.stop();
}

function play(): void {
  engine.unlock();
  preview.stop();
  introPlayer.stop();
  if (state.tweaks.master !== undefined) audio.setMaster(state.tweaks.master);
  const now = current();
  if (!now) return;
  if (!player.start(now.intro, now.loop)) setStatus("audio is not ready yet: press Play again", "error");
}

text.addEventListener("input", changed);
text.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") play();
  if (e.key === "Tab") {
    e.preventDefault();
    document.execCommand("insertText", false, "  ");
  }
});
$("play").addEventListener("click", play);
// Plays the encounter's real entrance sounds and starts the loop on the hit (the intro section of the text is
// not used: the entrance is the intro). The loop is read when the hit comes, so edits before it count.
function playWithIntro(): void {
  engine.unlock();
  if (!engine.ready) return setStatus("audio is not ready yet: press the button again", "error");
  if (!current()) return;
  if (state.tweaks.master !== undefined) audio.setMaster(state.tweaks.master);
  stopAll();
  audio.rampBus("sleep", state.tweaks.encounterGain ?? LAB_ENCOUNTER.defaultGain, 0);
  preview.start(introPlan(), engine.now);
}

$("play-intro").addEventListener("click", playWithIntro);
$("stop").addEventListener("click", stopAll);
$<HTMLInputElement>("live").addEventListener("change", (e) => {
  state.live = (e.target as HTMLInputElement).checked;
  persist();
});
$<HTMLSelectElement>("mode").addEventListener("change", (e) => {
  state.mode = (e.target as HTMLSelectElement).value as Mode;
  persist();
  if (player.playing && state.live) play();
});
$("bake").addEventListener("click", () => {
  const baked = bake(text.value, state.tweaks);
  if (!baked) return;
  // The sliders are drawn from the new text (read first), so each keeps showing the value just written.
  text.value = baked.text;
  lab = baked.lab;
  state.tweaks = baked.tweaks;
  renderLevels();
  renderChannels();
  changed();
});
$("copy").addEventListener("click", () => {
  if (!parseLab(text.value).ok) return;
  void navigator.clipboard?.writeText(copyBack(text.value, state.tweaks));
  setStatus("copied the text with the slider values written in", "ok");
});
$("reset").addEventListener("click", () => {
  state.tweaks = { gains: {}, muted: [] } as Tweaks;
  audio.setMaster(SOUND.master);
  renderLevels();
  renderChannels();
  changed();
});
$("encounter").addEventListener("click", () => {
  persist();
  window.open(`/?encounter=${encodeURIComponent($<HTMLSelectElement>("ad").value)}&labmusic=1&again=1`, "_blank");
});

// Any click or key lets the browser start audio.
for (const type of ["pointerdown", "keydown"] as const) document.addEventListener(type, () => engine.unlock());
(function frame() {
  audio.update(music);
  preview.tick(engine.now);
  if (introPlayer.playing) audio.update(introMusic);
  requestAnimationFrame(frame);
})();

changed();
renderLevels();
renderChannels();
