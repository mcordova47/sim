// Issues API, stage 1 (issue 136; design: issue 135, docs/issues-as-data-design.md).
//
// Pure text-in, text-out edits of one issue file's front matter: answer, drop or
// defer a decision, ask a new one, add or resolve a `needs` entry. Nothing here
// reads or writes a file or runs git (that is scripts/issues-edit-io.mjs), so the
// command and a local server (issue 137) call exactly the same code.
//
// The in-place guarantee: every edit is a splice at a known position of the original
// text (found with the `yaml` package's source ranges, never by re-printing the
// document), so every byte outside the spliced places is the original byte: key order,
// comments, quoting, indentation, the body. Before returning, each edit also checks
// that the new front matter parses to exactly the old data plus the intended change,
// and that the validator reports no new error. Anything else is refused, and a refusal
// never carries text to write.
//
// Every function returns { ok: true, text, summary } or { ok: false, message }.
import { parseDocument } from 'yaml';
import { isDeepStrictEqual } from 'node:util';
import { analyze, parseIssue, NEEDS_WHO, NEEDS_KIND } from './issues.mjs';

const refuse = (message) => ({ ok: false, message });
const isString = (v) => typeof v === 'string';
const quote = (s) => JSON.stringify(s);
const single = (what, v) => {
  if (!isString(v) || v.trim() === '') return `${what} must be some text.`;
  if (/[\r\n\u2028\u2029]/.test(v)) return `${what} must be one line (no line breaks).`;
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)) return `${what} has a control character in it.`;
  return null;
};
const validDay = (v) => isString(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

// ---- reading the file ------------------------------------------------------------

function split(text) {
  if (!isString(text)) return refuse('There is no file text to edit.');
  if (text.includes('\r')) return refuse('This file has Windows line endings; the editor leaves those files alone. Edit it by hand.');
  const lines = text.split('\n');
  if (lines[0] !== '---') return refuse('The file must start with a front matter block (a line of three dashes).');
  const end = lines.indexOf('---', 1);
  if (end === -1) return refuse('The front matter block never ends (no closing line of three dashes).');
  const fm = lines.slice(1, end).join('\n');
  const tail = lines.slice(end).join('\n');
  const doc = parseDocument(fm, { schema: 'failsafe' });
  if (doc.errors.length) return refuse(`The front matter is not valid YAML, so it was not edited: ${doc.errors[0].message.split('\n')[0]}`);
  if (!doc.contents || !doc.contents.items) return refuse('The front matter must be a list of "key: value" lines.');
  return { fm, tail, doc, data: doc.toJS() };
}

const join = (fm, tail) => `---\n${fm}\n${tail}`;
const trimEnd = (s, pos) => { while (pos > 0 && /\s/.test(s[pos - 1])) pos--; return pos; };
const lineStart = (s, pos) => s.lastIndexOf('\n', pos - 1) + 1;
const lineEnd = (s, pos) => { const i = s.indexOf('\n', pos); return i === -1 ? s.length : i; };
const col = (s, pos) => pos - lineStart(s, pos);

function applyEdits(fm, edits) {
  let out = fm;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.insert + out.slice(e.end);
  return out;
}

// ---- rendering --------------------------------------------------------------------

// Words like marc, open and d3 are written bare, dates are written bare, any other text is quoted.
const BARE_KEYS = ['id', 'who', 'status', 'by', 'kind'];
const scalar = (v, k) => (validDay(v) || (BARE_KEYS.includes(k) && /^[a-z][a-z0-9-]*$/.test(v)) ? v : quote(v));
const flowValue = (k, v) => (Array.isArray(v) ? `[${v.map((x) => scalar(x)).join(', ')}]` : scalar(v, k));
const flowMap = (obj) => `{${Object.entries(obj).map(([k, v]) => `${k}: ${flowValue(k, v)}`).join(', ')}}`;
// A block map as lines: the first line starts with `prefix`, the rest are indented by `pad`.
function blockLines(obj, prefix, pad) {
  const lines = [];
  Object.entries(obj).forEach(([k, v], i) => {
    const lead = i === 0 ? prefix : pad;
    if (Array.isArray(v)) {
      lines.push(`${lead}${k}:`);
      for (const x of v) lines.push(`${pad}  - ${scalar(x)}`);
    } else lines.push(`${lead}${k}: ${scalar(v, k)}`);
  });
  return lines.join('\n');
}

// ---- finding things -----------------------------------------------------------------

const pairOf = (map, key) => map.items.find((p) => p.key && p.key.value === key);

// Set keys on a map node: replace the value of keys that exist, add the others after the last pair.
// kv is an ordered list of [key, plain JS string]. Returns edits.
function setKeys(fm, map, kv) {
  const edits = [];
  const added = [];
  for (const [k, v] of kv) {
    const pair = pairOf(map, k);
    if (!pair) { added.push([k, v]); continue; }
    const node = pair.value;
    if (!node || !isString(node.value)) throw new Error(`"${k}" is not a plain line of text in this entry.`);
    const raw = fm.slice(node.range[0], node.range[1]);
    let text;
    if (raw[0] === '"' || raw[0] === "'") text = raw[0] === '"' ? quote(v) : `'${v.replace(/'/g, "''")}'`;
    else text = scalar(v, k);
    edits.push({ start: node.range[0], end: node.range[1], insert: text });
  }
  if (added.length) {
    const last = map.items[map.items.length - 1];
    const lastEnd = trimEnd(fm, last.value ? last.value.range[1] : last.key.range[1]);
    if (map.flow) {
      edits.push({ start: lastEnd, end: lastEnd, insert: added.map(([k, v]) => `, ${k}: ${scalar(v, k)}`).join('') });
    } else {
      const pad = ' '.repeat(col(fm, map.items[0].key.range[0]));
      const at = lineEnd(fm, lastEnd);
      edits.push({ start: at, end: at, insert: added.map(([k, v]) => `\n${pad}${k}: ${scalar(v, k)}`).join('') });
    }
  }
  return edits;
}

function findDecision(data, doc, id) {
  const list = data.decisions;
  if (!Array.isArray(list)) return { error: 'This issue has no decisions.' };
  const i = list.findIndex((d) => d && d.id === id);
  if (i === -1) {
    const ids = list.map((d) => d && d.id).filter(Boolean);
    return { error: `This issue has no decision "${id}". It has: ${ids.join(', ') || 'none'}.` };
  }
  return { index: i, decision: list[i], node: doc.get('decisions', true).items[i] };
}

// Check an edit and finish it: parse the new text and compare with the intended data, and
// make sure the validator has nothing new to say.
function finish(name, oldText, parts, edits, mutate, summary) {
  let fm;
  try {
    fm = applyEdits(parts.fm, edits);
  } catch (e) {
    return refuse(e.message);
  }
  const text = join(fm, parts.tail);
  const check = parseDocument(fm, { schema: 'failsafe' });
  const expected = structuredClone(parts.data);
  mutate(expected);
  if (check.errors.length || !isDeepStrictEqual(check.toJS(), expected)) {
    return refuse('The edit would not have come out as intended, so nothing was changed. (This is a bug in the editor; please report it.)');
  }
  const before = new Set(analyze([{ name, text: oldText }]).errors.map((e) => e.message));
  const added = analyze([{ name, text }]).errors.filter((e) => !before.has(e.message));
  if (added.length) return refuse(`The edit would leave the file invalid, so nothing was changed: ${added[0].message}`);
  return { ok: true, text, summary };
}

function open(name, text) {
  const parts = split(text);
  if (parts.ok === false) return parts;
  const issue = parseIssue(name, text);
  if (issue.errors.length) return refuse(`The file has a problem already, so it was not edited: ${issue.errors[0].message}`);
  return parts;
}

// ---- decisions: answer, drop, defer ----------------------------------------------------

const optionLetter = (i) => String.fromCharCode(97 + i);

// Turn what Marc typed into the text to record. A letter or number picks an option; an
// option's own text works; "as recommended" works when there is a recommendation.
// Anything else needs other: true when the decision lists options.
export function resolveAnswer(decision, input, { other = false } = {}) {
  const bad = single('The answer', input);
  if (bad) return refuse(bad);
  const typed = input.trim();
  const options = Array.isArray(decision.options) ? decision.options : [];
  if (/^as recommended$/i.test(typed) && isString(decision.recommendation)) return { ok: true, answer: 'as recommended' };
  if (options.length) {
    const key = typed.toLowerCase().replace(/[.:)]$/, '');
    // Options may carry their own letter ("c: the hybrid ..."); otherwise the position gives it.
    const byOwnLetter = options.findIndex((o) => /^[a-z][:.)]\s/i.test(o) && o[0].toLowerCase() === key);
    const byPosition = options.every((o) => !/^[a-z][:.)]\s/i.test(o)) ? options.findIndex((_, i) => optionLetter(i) === key || String(i + 1) === key) : -1;
    const byText = options.findIndex((o) => o.toLowerCase() === typed.toLowerCase());
    const hit = [byOwnLetter, byPosition, byText].find((i) => i >= 0);
    if (hit !== undefined) return { ok: true, answer: options[hit] };
    if (!other) {
      const list = options.map((o, i) => `  ${/^[a-z][:.)]\s/i.test(o) ? '' : `${optionLetter(i)}: `}${o}`).join('\n');
      return refuse(`"${typed}" is not one of the options. Give the letter or the text of one:\n${list}\nTo record a different answer, say so with --other.`);
    }
  }
  return { ok: true, answer: typed };
}

function settle(name, text, decisionId, { status, answer, note, by, on }, summary) {
  const parts = open(name, text);
  if (parts.ok === false) return parts;
  if (!NEEDS_WHO.includes(by)) return refuse(`"by" must be one of: ${NEEDS_WHO.join(', ')}.`);
  if (!validDay(on)) return refuse('The date must look like 2026-11-15.');
  const found = findDecision(parts.data, parts.doc, decisionId);
  if (found.error) return refuse(found.error);
  const d = found.decision;
  if (d.status !== 'open') {
    const who = d.by ? ` by ${d.by}` : '';
    const when = d.on ? ` on ${d.on}` : '';
    return refuse(`Decision ${decisionId} is already ${d.status}${who}${when}${d.answer ? ` ("${d.answer}")` : ''}; it can only be changed by hand.`);
  }
  const kv = [['status', status]];
  if (answer !== undefined) kv.push(['answer', answer]);
  if (note !== undefined) kv.push(['note', note]);
  if (by !== null) kv.push(['by', by]);
  kv.push(['on', on]);
  let edits;
  try {
    edits = setKeys(parts.fm, found.node, kv);
  } catch (e) {
    return refuse(e.message);
  }
  return finish(name, text, parts, edits, (data) => {
    Object.assign(data.decisions[found.index], Object.fromEntries(kv));
  }, summary);
}

// Record Marc's answer: status answered, plus answer, by and on.
export function answerDecision(text, decisionId, input, { by = 'marc', on, other = false, name = '000-x.md' } = {}) {
  const parts = open(name, text);
  if (parts.ok === false) return parts;
  const found = findDecision(parts.data, parts.doc, decisionId);
  if (found.error) return refuse(found.error);
  if (found.decision.status !== 'open') return settle(name, text, decisionId, { status: 'answered', by, on }, '');
  const r = resolveAnswer(found.decision, input, { other });
  if (r.ok === false) return r;
  return settle(name, text, decisionId, { status: 'answered', answer: r.answer, by, on }, `answered ${decisionId}`);
}

// Drop a question that no longer needs an answer. An optional reason is kept as a note.
export function dropDecision(text, decisionId, reason, { by = 'marc', on, name = '000-x.md' } = {}) {
  if (reason !== undefined && reason !== '') {
    const bad = single('The reason', reason);
    if (bad) return refuse(bad);
  }
  return settle(name, text, decisionId, { status: 'dropped', note: reason ? reason.trim() : undefined, by, on }, `dropped ${decisionId}`);
}

// Keep the question open and add a dated note. The note is "Deferred <date>: <why>".
export function deferDecision(text, decisionId, reason, { by = 'marc', on, name = '000-x.md' } = {}) {
  if (reason !== undefined && reason !== '') {
    const bad = single('The note', reason);
    if (bad) return refuse(bad);
  }
  if (!validDay(on)) return refuse('The date must look like 2026-11-15.');
  const note = reason && reason.trim() ? `Deferred ${on}: ${reason.trim()}` : `Deferred ${on}`;
  const parts = open(name, text);
  if (parts.ok === false) return parts;
  const found = findDecision(parts.data, parts.doc, decisionId);
  if (found.error) return refuse(found.error);
  if (found.decision.status !== 'open') return settle(name, text, decisionId, { status: 'open', by, on }, '');
  let edits;
  try {
    edits = setKeys(parts.fm, found.node, [['note', note]]);
  } catch (e) {
    return refuse(e.message);
  }
  return finish(name, text, parts, edits, (data) => { data.decisions[found.index].note = note; }, `deferred ${decisionId}`);
}

// ---- lists: add an entry, remove an entry ----------------------------------------------------

// Append `entry` (an object) to the list under `key`, creating the key at the end of the front matter if needed.
// Returns { edits } or { error }.
function appendEntry(parts, key, entry, preferFlow) {
  const { fm, doc } = parts;
  const pair = pairOf(doc.contents, key);
  if (!pair) {
    const at = fm.length;
    const body = preferFlow
      ? `${key}: [${flowMap(entry)}]`
      : `${key}:\n${blockLines(entry, '  - ', '    ')}`;
    return { edits: [{ start: at, end: at, insert: fm === '' ? body : `\n${body}` }] };
  }
  const seq = pair.value;
  if (!seq || !Array.isArray(seq.items)) return { error: `"${key}" in this file is not a list, so nothing was added.` };
  if (seq.flow) {
    if (seq.items.length === 0) return { edits: [{ start: seq.range[0], end: seq.range[1], insert: `[${flowMap(entry)}]` }] };
    const last = seq.items[seq.items.length - 1];
    const at = trimEnd(fm, last.range[1]);
    return { edits: [{ start: at, end: at, insert: `, ${flowMap(entry)}` }] };
  }
  if (seq.items.length === 0) return { error: `"${key}" in this file is an empty block list; write it as ${key}: [] first.` };
  const first = seq.items[0];
  const last = seq.items[seq.items.length - 1];
  const prefix = fm.slice(lineStart(fm, first.range[0]), first.range[0]);
  if (!/^\s*- +$/.test(prefix)) return { error: `The list "${key}" is laid out in a way the editor does not handle; edit it by hand.` };
  const pad = ' '.repeat(prefix.length);
  const at = lineEnd(fm, trimEnd(fm, last.range[1]));
  const lines = first.flow ? `${prefix}${flowMap(entry)}` : blockLines(entry, prefix, pad);
  return { edits: [{ start: at, end: at, insert: `\n${lines}` }] };
}

// Record a new open question, in the form the planner writes today (no id: the next free dN).
export function addDecision(text, decision, { name = '000-x.md' } = {}) {
  const parts = open(name, text);
  if (parts.ok === false) return parts;
  const d = decision || {};
  for (const [what, v] of [['The question', d.q]]) {
    const bad = single(what, v);
    if (bad) return refuse(bad);
  }
  const who = d.who === undefined ? 'marc' : d.who;
  if (!NEEDS_WHO.includes(who)) return refuse(`"who" must be one of: ${NEEDS_WHO.join(', ')}.`);
  const options = d.options === undefined ? [] : d.options;
  if (!Array.isArray(options)) return refuse('The options must be a list.');
  for (const o of options) { const bad = single('Each option', o); if (bad) return refuse(bad); }
  for (const k of ['recommendation', 'doc']) {
    if (d[k] !== undefined) { const bad = single(`The ${k}`, d[k]); if (bad) return refuse(bad); }
  }
  const existing = Array.isArray(parts.data.decisions) ? parts.data.decisions.map((x) => x && x.id) : [];
  let id = d.id;
  if (id === undefined) {
    let n = 1;
    while (existing.includes(`d${n}`)) n++;
    id = `d${n}`;
  } else if (existing.includes(id)) return refuse(`This issue already has a decision "${id}".`);
  const entry = { id, who, q: d.q.trim() };
  if (options.length) entry.options = options.map((o) => o.trim());
  if (d.recommendation !== undefined) entry.recommendation = d.recommendation.trim();
  if (d.doc !== undefined) entry.doc = d.doc.trim();
  entry.status = 'open';
  const r = appendEntry(parts, 'decisions', entry, false);
  if (r.error) return refuse(r.error);
  return finish(name, text, parts, r.edits, (data) => {
    if (!Array.isArray(data.decisions)) data.decisions = [];
    data.decisions.push(entry);
  }, `asked ${id}`);
}

function needFields(need) {
  const n = need || {};
  if (!NEEDS_WHO.includes(n.who)) return refuse(`"who" must be one of: ${NEEDS_WHO.join(', ')}.`);
  if (!NEEDS_KIND.includes(n.kind)) return refuse(`"kind" must be one of: ${NEEDS_KIND.join(', ')}.`);
  const bad = single('The "why"', n.why);
  if (bad) return refuse(bad);
  if (!validDay(n.since)) return refuse('The "since" date must look like 2026-11-15.');
  const entry = { who: n.who, kind: n.kind, why: n.why.trim() };
  if (n.kind === 'wait') {
    const w = single('A wait entry says what it waits on, and "on"', n.on);
    if (w) return refuse(w);
    entry.on = n.on.trim();
  } else if (n.on !== undefined) {
    return refuse('Only a "wait" entry has an "on".');
  }
  entry.since = n.since;
  return { ok: true, entry };
}

// Add a `needs` entry: { who, kind, why, since, on? }. Written as one line, the documented form.
export function addNeed(text, need, { name = '000-x.md' } = {}) {
  const parts = open(name, text);
  if (parts.ok === false) return parts;
  const f = needFields(need);
  if (f.ok === false) return f;
  const dup = Array.isArray(parts.data.needs) && parts.data.needs.some((x) => x.who === f.entry.who && x.kind === f.entry.kind && x.why === f.entry.why);
  if (dup) return refuse('That need is already listed.');
  const r = appendEntry(parts, 'needs', f.entry, true);
  if (r.error) return refuse(r.error);
  return finish(name, text, parts, r.edits, (data) => {
    if (!Array.isArray(data.needs)) data.needs = [];
    data.needs.push(f.entry);
  }, `added a ${f.entry.kind} need`);
}

// Resolve (delete) a `needs` entry, by its 1-based number or by some words from its "why".
export function resolveNeed(text, which, { name = '000-x.md' } = {}) {
  const parts = open(name, text);
  if (parts.ok === false) return parts;
  const list = parts.data.needs;
  if (!Array.isArray(list) || list.length === 0) return refuse('This issue has no needs to resolve.');
  const show = list.map((n, i) => `  ${i + 1}: ${n.kind} (${n.who}): ${n.why}`).join('\n');
  let index = -1;
  const w = String(which === undefined ? '' : which).trim();
  if (w === '') return refuse(`Say which need, by number or by some words from its "why":\n${show}`);
  if (/^\d+$/.test(w)) {
    index = Number(w) - 1;
    if (index < 0 || index >= list.length) return refuse(`There is no need number ${w}. This issue has:\n${show}`);
  } else {
    const hits = list.map((n, i) => (n.why.toLowerCase().includes(w.toLowerCase()) ? i : -1)).filter((i) => i >= 0);
    if (hits.length === 0) return refuse(`No need matches "${w}". This issue has:\n${show}`);
    if (hits.length > 1) return refuse(`More than one need matches "${w}"; use its number:\n${show}`);
    index = hits[0];
  }
  const pair = pairOf(parts.doc.contents, 'needs');
  const seq = pair.value;
  const { fm } = parts;
  const item = seq.items[index];
  const itemEnd = trimEnd(fm, item.range[1]);
  let edit;
  if (seq.items.length === 1) {
    edit = { start: pair.key.range[0], end: Math.max(itemEnd, seq.flow ? trimEnd(fm, seq.range[1]) : 0), insert: 'needs: []' };
  } else if (seq.flow) {
    edit = index < seq.items.length - 1
      ? { start: item.range[0], end: seq.items[index + 1].range[0], insert: '' }
      : { start: trimEnd(fm, seq.items[index - 1].range[1]), end: itemEnd, insert: '' };
  } else {
    const start = lineStart(fm, item.range[0]);
    if (!/^\s*-\s*$/.test(fm.slice(start, item.range[0])) && !/^\s*- +$/.test(fm.slice(start, item.range[0]))) {
      return refuse('That list is laid out in a way the editor does not handle; edit it by hand.');
    }
    const end = lineEnd(fm, itemEnd);
    edit = end >= fm.length ? { start: start - 1, end, insert: '' } : { start, end: end + 1, insert: '' };
  }
  const gone = list[index];
  return finish(name, text, parts, [edit], (data) => {
    data.needs.splice(index, 1);
  }, `resolved a ${gone.kind} need`);
}
