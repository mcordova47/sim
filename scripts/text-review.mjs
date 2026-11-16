// Text review walkthrough, stage 1 (issue 140; design: issue 139).
//
// Pure text-in, text-out functions over docs/text-review.md: parse it into one item per
// string, write one mark back in place, clear it again, and say which item comes next.
// Nothing here reads or writes a file or runs git (that is scripts/text-review-io.mjs).
//
// THE MARK FORMAT (the one standard; also written at the top of docs/text-review.md):
//   bullets:      "- text - keep"   "- text - soften: note"   "- text - rewrite: new text"
//   table rows:   the last column ("mark") holds  keep  /  soften: note  /  rewrite: new text
//   an empty mark is "- text" or "- text -" (a bare dash waiting for a mark), or an empty cell.
//   A bullet line that lists several strings, each followed by a dash ("A. - / B. - / C. -"),
//   is several items, one per string: "A. - keep / B. - / C. - rewrite: new".
//
// The in-place guarantee: markLine rewrites the one slot of the one item it was asked about
// (found by character offsets in the original line) and splices the line back; every other
// byte of the file is the original byte. Before returning, it re-parses its own output and
// checks that nothing but that item changed. Anything else is refused, and a refusal never
// carries text to write.
//
// Ids: "<section path>~<hash of the text>" (plus "~2", "~3" for a repeated identical text in
// one section). They do not depend on line numbers or on any mark, so they stay the same when
// other lines are marked, added or removed. A line whose text changes gets a new id, so a
// page showing the old id is refused: "that line changed".
import crypto from 'node:crypto';

export const MARKS = ['keep', 'soften', 'rewrite'];
// Headings whose lines are not player-visible strings (internal notes), so they are not items.
export const SKIP_HEADINGS = ['State variable meanings'];

const refuse = (message) => ({ ok: false, message });
const isString = (v) => typeof v === 'string';
const hash8 = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 8);
const slugOf = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';

// ---- one bullet line: its slots (one per string) ---------------------------------------

const SLOT_END = /\s-(?:\s(?:keep|soften|rewrite)(?::\s?.*)?)?$/i;
const SLOT = /^(.*?\S)\s-(?:\s(keep|soften|rewrite)(?::\s?(.*))?)?$/i;

function slotOf(raw, start) {
  const m = SLOT.exec(raw);
  const end = start + raw.length;
  if (!m) return { text: raw, placeholder: false, mark: null, start, end };
  const mark = m[2] ? { kind: m[2].toLowerCase(), note: (m[3] || '').trim() } : null;
  return { text: m[1], placeholder: !mark, mark, start, end };
}

// Content (after "- ", without trailing spaces) -> slots. A line is several strings only when
// every ' / '-separated piece ends in a dash slot; otherwise it is one string.
export function splitSlots(content) {
  const cuts = [];
  let from = 0;
  let at = content.indexOf(' / ');
  while (at !== -1) {
    if (SLOT_END.test(content.slice(from, at))) { cuts.push([from, at]); from = at + 3; }
    at = content.indexOf(' / ', at + 1);
  }
  if (cuts.length && SLOT_END.test(content.slice(from))) {
    return [...cuts.map(([a, b]) => slotOf(content.slice(a, b), a)), slotOf(content.slice(from), from)];
  }
  return [slotOf(content, 0)];
}

// ---- parsing the document -----------------------------------------------------------------

const rankOf = (title) => {
  // The newest issue number named in the heading, e.g. "(issues 103 and 104)" -> 104, "117c" -> 117c.
  let best = null;
  for (const m of title.matchAll(/\bissues?\s+(\d{2,3})([a-z]?)\b(?:\s+(?:and|to)\s+(\d{2,3})([a-z]?)\b)?/gi)) {
    for (const [n, l] of [[m[1], m[2]], [m[3], m[4]]]) {
      if (!n) continue;
      const key = [Number(n), (l || '').toLowerCase()];
      if (!best || key[0] > best[0] || (key[0] === best[0] && key[1] > best[1])) best = key;
    }
  }
  return best;
};
const cmpRank = (a, b) => (a[0] - b[0]) || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);

const splitCells = (line) => {
  const t = line.trimEnd();
  if (!t.startsWith('|') || !t.endsWith('|') || t.length < 2) return null;
  const pipes = [];
  for (let i = 0; i < t.length; i++) if (t[i] === '|') pipes.push(i);
  const cells = [];
  for (let i = 0; i + 1 < pipes.length; i++) cells.push(t.slice(pipes[i] + 1, pipes[i + 1]).trim());
  return { cells, pipes, t };
};
const isSeparator = (line) => /^\s*\|[\s:|-]+\|\s*$/.test(line) && line.includes('-');

const parseMarkCell = (s) => {
  const v = s.trim();
  if (v === '') return null;
  const m = /^(keep|soften|rewrite)(?::\s?(.*))?$/i.exec(v);
  return m ? { kind: m[1].toLowerCase(), note: (m[2] || '').trim() } : { kind: 'unknown', note: v };
};

// Returns { items, unparsed, skipped, sections, lines }. Never throws on an odd line.
export function parseReview(text, { skipHeadings = SKIP_HEADINGS } = {}) {
  const lines = isString(text) ? text.split('\n') : [];
  const items = [];
  const unparsed = [];
  const skipped = [];
  const sections = [];
  const stack = []; // { level, title, slug, rank, intro: [], items: 0 }
  const usedSlugs = new Set();
  let cur = null;
  let group = null;
  let inFence = false;
  let table = null; // { markCol, ncols } while inside a table block

  const flushTable = () => { table = null; };
  const enterHeading = (level, title) => {
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
    // The one level-1 title (the page title) is not a section: its prose is the how-to, not context.
    const parent = stack[stack.length - 1];
    let slug = (parent ? `${parent.slug}/` : '') + slugOf(title);
    for (let n = 2; usedSlugs.has(slug); n++) slug = `${(parent ? `${parent.slug}/` : '') + slugOf(title)}-${n}`;
    usedSlugs.add(slug);
    cur = { level, title, slug, rank: rankOf(title) || (parent && parent.rank) || null, intro: [], items: 0, count: 0, firstLine: 0, order: sections.length, parent };
    if (level > 1) stack.push(cur);
    sections.push(cur);
    group = null;
  };
  const isSkipped = () => stack.some((s) => skipHeadings.includes(s.title));
  const contextOf = () => {
    return stack.filter((s) => s.intro.length).map((s) => s.intro.join('\n')).join('\n\n');
  };

  // Index of the next bullet line that is deeper than line i (it makes line i a list heading).
  const hasChildren = (i, indent) => {
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === '') return false;
      const m = /^(\s*)- /.exec(lines[j]);
      if (!m) return false;
      return m[1].length > indent;
    }
    return false;
  };

  const seen = new Map(); // slug -> Map(hash -> count)
  const nextId = (slug, h) => {
    if (!seen.has(slug)) seen.set(slug, new Map());
    const m = seen.get(slug);
    const n = (m.get(h) || 0) + 1;
    m.set(h, n);
    return `${slug}~${h}${n > 1 ? `~${n}` : ''}`;
  };
  const push = (item) => {
    cur.count++;
    cur.items++;
    items.push(item);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) { unparsed.push({ line: i + 1, reason: 'inside a code fence', text: line }); continue; }
    const h = /^(#{1,6})\s+(.*?)\s*$/.exec(line);
    if (h) { flushTable(); enterHeading(h[1].length, h[2]); cur.firstLine = i + 1; continue; }
    if (line.trim() === '') { flushTable(); continue; }

    if (/^\s*\|/.test(line)) {
      if (!cur) { unparsed.push({ line: i + 1, reason: 'a table before any heading', text: line }); continue; }
      const sc = splitCells(line);
      if (!table) {
        // a header row, then a separator row
        const hasSep = i + 1 < lines.length && isSeparator(lines[i + 1]);
        if (!sc || !hasSep) { unparsed.push({ line: i + 1, reason: 'a table without a separator row', text: line }); table = { markCol: -1, ncols: 0, dead: true }; continue; }
        const markCol = sc.cells.findIndex((c) => c.toLowerCase() === 'mark');
        table = { markCol, ncols: sc.cells.length, headers: sc.cells, header: true };
        if (markCol === -1) table.dead = true;
        else if (markCol !== sc.cells.length - 1) { table.dead = true; unparsed.push({ line: i + 1, reason: 'the mark column is not the last column', text: line }); }
        continue;
      }
      if (table.header) { table.header = false; continue; } // the separator row
      if (table.dead) { if (table.markCol !== -1) unparsed.push({ line: i + 1, reason: 'a row of a table this tool cannot edit', text: line }); continue; }
      if (isSkipped()) { skipped.push({ line: i + 1, text: line }); continue; }
      if (!sc || sc.cells.length !== table.ncols) { unparsed.push({ line: i + 1, reason: 'a table row whose cell count does not match the header', text: line }); continue; }
      const parts = sc.cells.slice(0, -1);
      const rowText = parts.join(' | ');
      const hh = hash8(rowText);
      push({
        id: nextId(cur.slug, hh), shape: 'table', line: i + 1, section: cur.slug, sectionTitle: cur.title,
        sectionPath: stack.map((s) => s.title), heading: cur.title, text: rowText, cells: parts, columns: table.headers.slice(0, -1),
        context: contextOf(), group, mark: parseMarkCell(sc.cells[sc.cells.length - 1]), placeholder: false,
        _sec: cur, _doc: items.length,
      });
      continue;
    }
    flushTable();

    const b = /^(\s*)- (.*)$/.exec(line);
    if (b) {
      if (!cur) { unparsed.push({ line: i + 1, reason: 'a list line before any heading', text: line }); continue; }
      if (isSkipped()) { skipped.push({ line: i + 1, text: line }); continue; }
      const indent = b[1].length;
      const trimmed = b[2].trimEnd();
      if (trimmed === '') { unparsed.push({ line: i + 1, reason: 'an empty list line', text: line }); continue; }
      const tagged = /^\((prompt|label|text)\)\s/.test(trimmed);
      if (!tagged && hasChildren(i, indent)) { skipped.push({ line: i + 1, text: line, reason: 'a list heading whose lines below are the strings' }); continue; }
      const slots = splitSlots(trimmed);
      slots.forEach((s, k) => {
        const tag = /^\((prompt|label|text)\)\s/.exec(s.text);
        push({
          id: nextId(cur.slug, hash8(s.text)), shape: 'bullet', line: i + 1, section: cur.slug, sectionTitle: cur.title,
          sectionPath: stack.map((x) => x.title), heading: cur.title, text: s.text, tag: tag ? tag[1] : null,
          context: contextOf(), group, mark: s.mark, placeholder: s.placeholder,
          segment: slots.length > 1 ? k : null, segments: slots.length > 1 ? slots.length : null,
          _sec: cur, _doc: items.length,
        });
      });
      continue;
    }

    // Anything else is prose: the section's context, or (after its strings began) a bold group line.
    if (!cur) continue;
    const bold = /^\*\*/.test(line.trim());
    let k = i + 1;
    while (k < lines.length && lines[k].trim() === '') k++;
    const leadsList = k < lines.length && /^(\s*- |\s*\|)/.test(lines[k]);
    if (bold && leadsList) group = line.trim();
    else if (cur.items === 0) cur.intro.push(line.trim());
    else unparsed.push({ line: i + 1, reason: 'prose in the middle of a list', text: line });
  }

  // Order: newest issue number first (by the section title), then the rest in document order.
  const withRank = items.filter((x) => x._sec.rank);
  const without = items.filter((x) => !x._sec.rank);
  withRank.sort((a, b) => cmpRank(b._sec.rank, a._sec.rank) || a._doc - b._doc);
  const ordered = [...withRank, ...without];
  const firstByText = new Map();
  ordered.forEach((it, n) => {
    it.order = n;
    const key = `${it.shape}:${it.text}`;
    if (firstByText.has(key)) it.duplicateOf = firstByText.get(key);
    else firstByText.set(key, it.id);
  });
  for (const it of ordered) { delete it._sec; delete it._doc; }
  const counts = sections.map((s) => ({ section: s.slug, title: s.title, count: s.count }));
  return { items: ordered, docOrder: [...ordered].sort((a, b) => a.line - b.line || (a.segment || 0) - (b.segment || 0)), unparsed, skipped, sections: counts };
}

// ---- marks --------------------------------------------------------------------------------

export function markString(mark, note) {
  return mark === 'keep' ? 'keep' : note ? `${mark}: ${note}` : mark;
}

const noteProblem = (v) => {
  if (/[\r\n\u2028\u2029]/.test(v)) return 'The note must be one line (no line breaks).';
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)) return 'The note has a control character in it.';
  return null;
};

// Does this text round-trip through the line parser unchanged?
const sameState = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const view = (it) => ({ id: it.id, text: it.text, mark: it.mark, line: it.line });

// markLine(text, itemId, mark, note): mark is 'keep' | 'soften' | 'rewrite' | null (clear).
// opts.placeholder: when clearing, write the bare dash ("text -") instead of nothing; default is
// what most lines of the same section do. Returns { ok, text, summary, item, previous } or
// { ok:false, message }; `previous` ({ mark, placeholder } as the line was) is what an undo passes back.
export function markLine(text, itemId, mark, note, opts = {}) {
  if (!isString(text)) return refuse('There is no file text to edit.');
  if (text.includes('\r')) return refuse('This file has Windows line endings; the tool leaves it alone. Edit it by hand.');
  if (mark === 'clear' || mark === '' || mark === undefined) mark = null;
  if (mark !== null && !MARKS.includes(mark)) return refuse(`"${mark}" is not a mark. Use keep, soften or rewrite.`);
  const n = note === undefined || note === null ? '' : String(note).trim();
  if (mark === null && n) return refuse('Clearing a mark takes no note.');
  if (mark === 'keep' && n) return refuse('Keep takes no note. Use soften with a note, or rewrite with the new text.');
  if (mark === 'rewrite' && !n) return refuse('Rewrite needs the new text.');
  if (n) { const p = noteProblem(n); if (p) return refuse(p); }

  const parsed = parseReview(text);
  const item = parsed.items.find((x) => x.id === itemId);
  if (!item) return refuse('That line is not in the text review any more (it was changed, moved to another section or removed), so nothing was changed. Reload and try again.');
  if (item.mark && item.mark.kind === 'unknown' && mark !== null) {
    return refuse(`That line has a mark this tool does not recognize ("${item.mark.note}"), so it was left alone. Clear it first or edit it by hand.`);
  }
  if (item.shape === 'table' && n.includes('|')) return refuse('A table note cannot contain the | character.');
  if (item.segments && n.includes(' / ')) return refuse('A note on a line that holds several strings cannot contain " / ".');

  const lines = text.split('\n');
  const raw = lines[item.line - 1];
  let next;
  if (item.shape === 'table') {
    const sc = splitCells(raw);
    const p = sc.pipes;
    const cell = mark === null ? '  ' : ` ${markString(mark, n)} `;
    next = raw.slice(0, p[p.length - 2] + 1) + cell + raw.slice(p[p.length - 1]);
  } else {
    const b = /^(\s*- )(.*)$/.exec(raw);
    const prefix = b[1];
    const content = b[2].trimEnd();
    const tail = b[2].slice(content.length);
    const slots = splitSlots(content);
    const slot = slots[item.segment || 0];
    let keepDash;
    if (item.segments) keepDash = true;
    else if (opts.placeholder !== undefined) keepDash = !!opts.placeholder;
    else keepDash = defaultPlaceholder(parsed, item);
    const rendered = mark === null ? (keepDash ? `${slot.text} -` : slot.text) : `${slot.text} - ${markString(mark, n)}`;
    next = prefix + content.slice(0, slot.start) + rendered + content.slice(slot.end) + tail;
  }

  const outLines = lines.slice();
  outLines[item.line - 1] = next;
  const out = outLines.join('\n');
  const previous = { mark: item.mark, placeholder: item.placeholder };
  if (out === text) return { ok: true, text, summary: 'no change', item, unchanged: true, previous };

  // Self-check: only this item changed, nothing else moved.
  const re = parseReview(out);
  const want = parsed.items.map((x) => (x.id === itemId ? { ...view(x), mark: mark === null ? null : { kind: mark, note: n } } : view(x)));
  const got = re.items.map(view);
  if (!sameState(want.map((x) => ({ ...x })), got.map((x) => ({ ...x })))) {
    return refuse('That mark could not be written without changing something else on the line, so nothing was changed. Try different words for the note.');
  }
  const sec = item.heading;
  const summary = mark === null ? `cleared the mark in ${sec}` : `${markString(mark, n)} in ${sec}`;
  return { ok: true, text: out, summary, item: re.items.find((x) => x.id === itemId), before: raw, after: next, previous };
}

export const clearMark = (text, itemId, opts) => markLine(text, itemId, null, '', opts);

// Which unmarked form does this item's section use: "text -" (a bare dash) or plain "text"?
function defaultPlaceholder(parsed, item) {
  const mates = parsed.items.filter((x) => x.section === item.section && x.shape === 'bullet' && !x.segments && x.id !== item.id && !x.mark);
  if (!mates.length) return false;
  return mates.filter((x) => x.placeholder).length * 2 > mates.length;
}

// ---- order: what to show next -------------------------------------------------------------

export const isMarked = (it) => !!it.mark;

// The next item after `afterId` that has no mark. Items in `skipped` (a Set or array of ids,
// kept per session, never in the file) come last: first every unmarked, unskipped item after
// this one (wrapping to the start), then, only if none is left, the skipped ones.
export function nextUnmarked(items, afterId = null, skipped = []) {
  const skip = new Set(skipped);
  const at = afterId === null ? -1 : items.findIndex((x) => x.id === afterId);
  const rotated = items.map((_, k) => items[(at + 1 + k) % items.length]);
  return rotated.find((x) => !isMarked(x) && !skip.has(x.id)) || rotated.find((x) => !isMarked(x)) || null;
}

// Plain facts for a calm progress line.
export function progress(items, sectionOf = null) {
  const pool = sectionOf ? items.filter((x) => x.section === sectionOf) : items;
  return { total: pool.length, marked: pool.filter(isMarked).length, left: pool.filter((x) => !isMarked(x)).length };
}

export function countsBySection(parsed) {
  return parsed.sections.map((s) => ({ section: s.section, title: s.title, count: s.count }));
}
