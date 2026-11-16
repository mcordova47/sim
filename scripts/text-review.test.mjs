import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseReview, markLine, clearMark, nextUnmarked, splitSlots, progress } from './text-review.mjs';
import { readReview, markReviewLine, nextCard, hashOf } from './text-review-io.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// A frozen copy of docs/text-review.md as it was when the walkthrough shipped (298 strings, no marks): the live doc
// changes every time Marc marks a line, so the tests that count or round-trip run on this snapshot; one test at the end
// checks that the live doc still parses.
const REAL = fs.readFileSync(path.join(root, 'scripts/fixtures/text-review-snapshot.md'), 'utf8');
const LIVE = fs.readFileSync(path.join(root, 'docs/text-review.md'), 'utf8');
const tmpdir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'text-review-'));

const FIX = [
  '# Title',
  '',
  'Intro that is not a section. <!-- a comment -->',
  '',
  '## Newest thing (issue 120)',
  'Where it appears: the new page. Wired in `x.ts`.',
  '- Plain line',
  '- Marked line - keep',
  '- Soft line - soften: a bit less éü "quotes" \\ back',
  '- Rewritten line - rewrite: Totally new - text',
  '- Dash line -',
  '- A list heading',
  '  - Nested line with trailing spaces   ',
  '- Two / slashes here',
  '',
  '## Older thing (issue 050)',
  'The older note.',
  '| id | name | mark |',
  '|---|---|---|',
  '| a | Alpha one |  |',
  '| b | Beta two | keep |',
  '| c | Gamma three | rewrite: Gamma 3 |',
  '| d | Delta four | ok whatever |',
  '',
  '## Multi (issue 060)',
  '- Pool: One. - / Two. - keep / Three. - rewrite: Tres.',
  '- Not multi: A (1) / B (2). -',
  '',
  '## Plain section',
  'No number, so it comes after the numbered ones.',
  '- Same',
  '- Same',
  '- (prompt) Which?',
  '  - (label) This',
  '    - (text) Text here',
  '',
  '## State variable meanings',
  '- dishes: a count',
  '',
].join('\n');

const ids = (t) => parseReview(t).items.map((i) => i.id);
const byText = (t, text) => parseReview(t).items.find((i) => i.text === text);
const lineDiff = (a, b) => {
  const x = a.split('\n'); const y = b.split('\n');
  expect(y.length).toBe(x.length);
  return x.map((l, i) => (l === y[i] ? null : i + 1)).filter(Boolean);
};

describe('parseReview shapes', () => {
  const p = parseReview(FIX);
  it('finds every string and nothing else', () => {
    expect(p.items.map((i) => i.text)).toEqual([
      'Plain line', 'Marked line', 'Soft line', 'Rewritten line', 'Dash line', 'Nested line with trailing spaces', 'Two / slashes here',
      'Pool: One.', 'Two.', 'Three.', 'Not multi: A (1) / B (2).',
      'a | Alpha one', 'b | Beta two', 'c | Gamma three', 'd | Delta four',
      'Same', 'Same', '(prompt) Which?', '(label) This', '(text) Text here',
    ]);
    expect(p.skipped).toHaveLength(2); // the list heading and the internal section
    expect(p.unparsed).toEqual([]);
  });
  it('reads marks, notes, placeholders and shapes', () => {
    const m = (t) => byText(FIX, t);
    expect(m('Plain line').mark).toBeNull();
    expect(m('Marked line').mark).toEqual({ kind: 'keep', note: '' });
    expect(m('Soft line').mark).toEqual({ kind: 'soften', note: 'a bit less éü "quotes" \\ back' });
    expect(m('Rewritten line').mark).toEqual({ kind: 'rewrite', note: 'Totally new - text' });
    expect(m('Dash line')).toMatchObject({ mark: null, placeholder: true });
    expect(m('Plain line').placeholder).toBe(false);
    expect(m('b | Beta two')).toMatchObject({ shape: 'table', mark: { kind: 'keep', note: '' }, cells: ['b', 'Beta two'], columns: ['id', 'name'] });
    expect(m('d | Delta four').mark).toEqual({ kind: 'unknown', note: 'ok whatever' });
    expect(m('Plain line')).toMatchObject({ shape: 'bullet', heading: 'Newest thing (issue 120)', context: 'Where it appears: the new page. Wired in `x.ts`.' });
  });
  it('splits lines that hold several strings only when each ends in a dash', () => {
    expect(p.items.filter((i) => i.segments).map((i) => [i.text, i.segment, i.mark && i.mark.kind])).toEqual([
      ['Pool: One.', 0, null],
      ['Two.', 1, 'keep'],
      ['Three.', 2, 'rewrite'],
    ]);
    expect(splitSlots('A (1) / B (2). -')).toHaveLength(1);
  });
  it('orders newest issue first, then unnumbered in document order; skips internal sections', () => {
    expect([...new Set(p.items.map((i) => i.heading))]).toEqual(['Newest thing (issue 120)', 'Multi (issue 060)', 'Older thing (issue 050)', 'Plain section']);
    expect(p.items.map((i) => i.order)).toEqual(p.items.map((_, k) => k));
  });
  it('marks identical texts in one section as separate items, and flags repeats', () => {
    const same = p.items.filter((i) => i.text === 'Same');
    expect(same[0].id).not.toBe(same[1].id);
    expect(same[1].id.endsWith('~2')).toBe(true);
    expect(same[1].duplicateOf).toBe(same[0].id);
  });
  it('a tagged parent line is a string; an untagged list heading is not', () => {
    const t = '## S\n- Heading of a list\n  - one\n  - two\n- (prompt) Ask\n  - (label) A\n';
    expect(parseReview(t).items.map((i) => i.text)).toEqual(['one', 'two', '(prompt) Ask', '(label) A']);
  });
  it('ranks by the newest number named, including letters and ranges', () => {
    const t = '## A (issue 117c)\n- a\n## B (issues 103 and 104)\n- b\n## C (issue 117e)\n- c\n## D (issue 113c)\n- d\n';
    expect(parseReview(t).items.map((i) => i.text)).toEqual(['c', 'a', 'd', 'b']);
  });
  it('does not throw on odd input', () => {
    for (const t of ['', '\n', '|', '- ', '## \n| a |\n', '```\n- x\n```\n- y\n', '## S\n| a | mark |\n- z\n', '## S\n|---|\n| a | b |\n', '\u0000�']) {
      expect(() => parseReview(t)).not.toThrow();
    }
    expect(parseReview('## S\n| a | mark | b |\n|---|---|---|\n| 1 | 2 | 3 |\n').unparsed[0].reason).toMatch(/not the last column/);
    expect(parseReview('## S\n| a | mark |\n|---|---|\n| 1 | 2 | 3 |\n').unparsed[0].reason).toMatch(/cell count/);
  });
});

describe('ids', () => {
  it('stay the same when other lines are marked, added or removed, and change with the text', () => {
    const before = ids(FIX);
    const marked = markLine(FIX, byText(FIX, 'Plain line').id, 'keep').text;
    expect(ids(marked)).toEqual(before);
    const inserted = FIX.replace('- Plain line', '- A brand new line\n- Plain line');
    expect(ids(inserted).filter((i) => before.includes(i))).toHaveLength(before.length);
    const edited = FIX.replace('- Plain line', '- Plain line!');
    expect(ids(edited)).not.toEqual(before);
  });
});

describe('markLine: in place', () => {
  const t = (text) => byText(FIX, text).id;
  const ok = (r) => { expect(r.message).toBeUndefined(); expect(r.ok).toBe(true); return r.text; };
  const bad = (r) => { expect(r.ok).toBe(false); expect(r.text).toBeUndefined(); return r.message; };

  it('writes each mark on an unmarked bullet and changes only that line', () => {
    const k = ok(markLine(FIX, t('Plain line'), 'keep'));
    expect(lineDiff(FIX, k)).toEqual([7]);
    expect(k.split('\n')[6]).toBe('- Plain line - keep');
    expect(ok(markLine(FIX, t('Plain line'), 'soften', 'less jokes')).split('\n')[6]).toBe('- Plain line - soften: less jokes');
    expect(ok(markLine(FIX, t('Plain line'), 'soften')).split('\n')[6]).toBe('- Plain line - soften');
    expect(ok(markLine(FIX, t('Plain line'), 'rewrite', 'Better line.')).split('\n')[6]).toBe('- Plain line - rewrite: Better line.');
  });
  it('turns a bare dash into the mark and back', () => {
    const k = ok(markLine(FIX, t('Dash line'), 'keep'));
    expect(k.split('\n')[10]).toBe('- Dash line - keep');
    expect(ok(clearMark(k, t('Dash line'), { placeholder: true }))).toBe(FIX);
  });
  it('replaces an existing mark, keeps trailing spaces and indentation', () => {
    const r = ok(markLine(FIX, t('Marked line'), 'rewrite', 'New - ok'));
    expect(r.split('\n')[7]).toBe('- Marked line - rewrite: New - ok');
    expect(ok(markLine(FIX, t('Nested line with trailing spaces'), 'keep')).split('\n')[12]).toBe('  - Nested line with trailing spaces - keep   ');
  });
  it('edits the last cell of a table row only, in the same widths', () => {
    const a = ok(markLine(FIX, t('a | Alpha one'), 'soften', 'shorter'));
    expect(a.split('\n')[19]).toBe('| a | Alpha one | soften: shorter |');
    expect(lineDiff(FIX, a)).toEqual([20]);
    const b = ok(markLine(FIX, t('b | Beta two'), null));
    expect(b.split('\n')[20]).toBe('| b | Beta two |  |');
  });
  it('edits one segment of a multi-string line, and clearing restores the dash', () => {
    const one = t('Pool: One.');
    const r = ok(markLine(FIX, one, 'soften', 'x'));
    expect(r.split('\n')[25]).toBe('- Pool: One. - soften: x / Two. - keep / Three. - rewrite: Tres.');
    expect(ok(clearMark(r, one))).toBe(FIX);
    const two = ok(clearMark(FIX, t('Two.')));
    expect(two.split('\n')[25]).toBe('- Pool: One. - / Two. - / Three. - rewrite: Tres.');
    const three = ok(markLine(FIX, t('Three.'), 'keep'));
    expect(three.split('\n')[25]).toBe('- Pool: One. - / Two. - keep / Three. - keep');
  });
  it('clearing an unmarked line is a no-op', () => {
    expect(ok(clearMark(FIX, t('Plain line')))).toBe(FIX);
  });
  it('mark then clear returns the file byte for byte, for every item (odd characters included)', () => {
    const odd = `${FIX}\n## Odd (issue 130)\n- café ü 😀 <b>&amp;</b> \`code\` - \n- tab\there\n- quote " and ' and \\\n- x -  y -\n`;
    const p = parseReview(odd);
    expect(p.items.length).toBeGreaterThan(20);
    for (const it of p.items) {
      if (it.mark) continue;
      for (const [m, n] of [['keep', ''], ['soften', 'né "x" \\'], ['rewrite', 'new 😀']]) {
        if (it.mark && it.mark.kind === 'unknown') continue;
        const marked = markLine(odd, it.id, m, n);
        expect(marked.ok, `${it.text}: ${marked.message}`).toBe(true);
        expect(marked.text).not.toBe(odd);
        const back = markLine(marked.text, it.id, null, '', { placeholder: it.placeholder });
        expect(back.ok).toBe(true);
        expect(back.text).toBe(odd);
      }
    }
  });
  it('refuses plainly', () => {
    const id = t('Plain line');
    expect(bad(markLine(FIX, 'nope~12345678', 'keep'))).toMatch(/not in the text review any more/);
    expect(bad(markLine(FIX.replace('Plain line', 'Plain line 2'), id, 'keep'))).toMatch(/changed/);
    expect(bad(markLine(FIX, id, 'maybe'))).toMatch(/not a mark/);
    expect(bad(markLine(FIX, id, 'rewrite'))).toMatch(/needs the new text/);
    expect(bad(markLine(FIX, id, 'keep', 'a note'))).toMatch(/Keep takes no note/);
    expect(bad(markLine(FIX, id, 'soften', 'two\nlines'))).toMatch(/one line/);
    expect(bad(markLine(FIX, id, 'soften', 'bell\u0007'))).toMatch(/control character/);
    expect(bad(markLine(FIX, t('a | Alpha one'), 'soften', 'a | b'))).toMatch(/\|/);
    expect(bad(markLine(FIX, t('Two.'), 'soften', 'a / b'))).toMatch(/several strings/);
    expect(bad(markLine(FIX, t('d | Delta four'), 'keep'))).toMatch(/does not recognize/);
    expect(bad(markLine(FIX.replace(/\n/g, '\r\n'), id, 'keep'))).toMatch(/Windows line endings/);
    expect(bad(markLine(null, id, 'keep'))).toMatch(/no file text/);
    expect(bad(markLine(FIX, id, null, 'a note'))).toMatch(/no note/);
    // an unknown table mark can still be cleared
    expect(ok(markLine(FIX, t('d | Delta four'), null)).split('\n')[22]).toBe('| d | Delta four |  |');
  });
  it('marking the same thing again changes nothing', () => {
    const r = markLine(FIX, t('Marked line'), 'keep');
    expect(r).toMatchObject({ ok: true, unchanged: true, text: FIX });
  });
  it('refuses when a line changed after the page showed it (stale id), and when a note would confuse the parser', () => {
    // a note that, written out, would be read as the text of the next string
    const r = markLine(FIX, byText(FIX, 'Two.').id, 'rewrite', 'ok - / Evil. -');
    expect(r.ok).toBe(false);
  });
  it('a long file of one hundred marks then one hundred clears is the original', () => {
    let text = REAL;
    const items = parseReview(REAL).items.filter((i) => i.shape === 'bullet').slice(0, 100);
    for (const i of items) text = markLine(text, i.id, 'soften', `note ${i.order}`).text;
    expect(text).not.toBe(REAL);
    for (const i of items) text = markLine(text, i.id, null, '', { placeholder: i.placeholder }).text;
    expect(text).toBe(REAL);
  });
});

describe('order helpers', () => {
  const items = parseReview(FIX).items;
  it('next unmarked after an item, skipping marks and skipped ids, wrapping, skipped come back last', () => {
    const first = items[0];
    expect(nextUnmarked(items, null).id).toBe(first.id);
    expect(nextUnmarked(items, first.id).id).toBe(items[4].id); // 'Dash line' (the two before it are marked)
    expect(nextUnmarked(items, first.id, [items[4].id]).id).toBe(items[5].id);
    const unmarked = items.filter((i) => !i.mark);
    expect(nextUnmarked(items, unmarked[unmarked.length - 1].id).id).toBe(first.id);
    // everything unmarked is skipped: they come back
    expect(nextUnmarked(items, first.id, unmarked.map((i) => i.id)).id).toBe(items[4].id);
    expect(nextUnmarked(items.map((i) => ({ ...i, mark: { kind: 'keep', note: '' } })), null)).toBeNull();
    expect(nextUnmarked([], null)).toBeNull();
  });
  it('an unrecognized mark counts as marked', () => {
    expect(nextUnmarked(items, items[6].id, []).text).not.toBe('d | Delta four');
  });
  it('progress is plain facts', () => {
    expect(progress(items)).toMatchObject({ total: 20 });
  });
});

// ---- the real document (read only; every edit is on a copy) --------------------------------

// A counter that works differently from the parser: line by line, by regular expressions.
function handCount(text) {
  const L = text.split('\n');
  const out = new Map();
  let sec = null; let skip = false;
  L.forEach((l, i) => {
    const h = /^#{2,6} (.*)/.exec(l);
    if (h) { sec = h[1]; skip = sec.startsWith('State variable'); if (!out.has(sec)) out.set(sec, 0); return; }
    if (sec === null || skip || l.startsWith('# ')) return;
    if (l.startsWith('|')) {
      if (/^\|\s*(id|card)\b/.test(l) || /^\|[-|]+\|$/.test(l)) return;
      out.set(sec, out.get(sec) + 1);
      return;
    }
    const m = /^(\s*)- (.*\S)\s*$/.exec(l);
    if (!m) return;
    const next = /^(\s*)- /.exec(L[i + 1] || '');
    if (next && next[1].length > m[1].length && !/^\((prompt|label|text)\)/.test(m[2])) return;
    const dashes = l.split(' - / ').length - 1;
    out.set(sec, out.get(sec) + (dashes && l.trimEnd().endsWith(' -') ? dashes + 1 : 1));
  });
  return out;
}

describe('the real docs/text-review.md', () => {
  const p = parseReview(REAL);
  it('parses every string: the count per section equals a hand count by another method', () => {
    const hand = handCount(REAL);
    const mine = new Map(p.sections.filter((s) => s.title !== 'Text review').map((s) => [s.title, s.count]));
    expect([...mine.entries()]).toEqual([...hand.entries()]);
    expect(p.items.length).toBe([...hand.values()].reduce((a, b) => a + b, 0));
    expect(p.items.length).toBeGreaterThan(250);
  });
  it('has no line it could not read, and ids are unique', () => {
    expect(p.unparsed).toEqual([]);
    expect(new Set(p.items.map((i) => i.id)).size).toBe(p.items.length);
  });
  it('keeps every marked line readable and uses the standard marks only', () => {
    for (const i of p.items) if (i.mark) expect(['keep', 'soften', 'rewrite']).toContain(i.mark.kind);
    for (const l of REAL.split('\n')) {
      const m = /^\s*- .* - (keep|soften|rewrite)\b/i.exec(l);
      if (m) expect(p.docOrder.some((i) => i.line === REAL.split('\n').indexOf(l) + 1 && i.mark)).toBe(true);
    }
  });
  it('puts the newest sections first', () => {
    expect(p.items[0].heading).toMatch(/117d/);
    const heads = [...new Set(p.items.map((i) => i.heading))];
    expect(heads.indexOf('Tasks')).toBeGreaterThan(heads.findIndex((h) => /issue 043/.test(h)));
  });
  it('round trip on a copy: every item marked and cleared leaves the file byte for byte unchanged', () => {
    const dir = tmpdir();
    const copy = path.join(dir, 'text-review.md');
    fs.writeFileSync(copy, REAL);
    let text = fs.readFileSync(copy, 'utf8');
    for (const it of p.items) {
      const marked = markLine(text, it.id, 'rewrite', 'x');
      expect(marked.ok, it.id).toBe(true);
      expect(lineDiff(text, marked.text)).toEqual([it.line]);
      const back = markLine(marked.text, it.id, null, '', { placeholder: it.placeholder });
      expect(back.text, it.id).toBe(text);
    }
    // clearing without saying how the line looked: only a bare-dash line in a section that mostly has none may differ
    const differing = p.items.filter((it) => markLine(markLine(text, it.id, 'keep').text, it.id, null).text !== text);
    expect(differing.every((it) => it.placeholder && it.shape === 'bullet')).toBe(true);
    expect(differing.length).toBeLessThan(5);
    // and the `previous` that markLine returns is enough to undo any of them
    for (const it of differing) {
      const r = markLine(text, it.id, 'keep');
      expect(markLine(r.text, it.id, null, '', { placeholder: r.previous.placeholder }).text).toBe(text);
    }
  });
});

// ---- the I/O layer, on a temporary git repository ---------------------------------------

function repo({ branch = 'main', commitIt = true } = {}) {
  const dir = tmpdir();
  const g = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: 'pipe' });
  g('init', '-q', '-b', 'main');
  g('config', 'user.name', 'Test Person');
  g('config', 'user.email', 'test@example.invalid');
  g('config', 'commit.gpgsign', 'false');
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.writeFileSync(path.join(dir, 'docs/text-review.md'), REAL);
  g('add', '-A');
  if (commitIt) g('commit', '-q', '-m', 'start');
  if (branch !== 'main') g('checkout', '-q', '-b', branch);
  return { dir, g, file: path.join(dir, 'docs/text-review.md') };
}

describe('markReviewLine', () => {
  const pick = (p, text) => p.items.find((i) => i.text.includes(text));
  it('writes the mark, commits only the doc as the configured identity, never pushes', () => {
    const { dir, g, file } = repo();
    const r0 = readReview(dir);
    const it = pick(r0, 'Picture deleted');
    const r = markReviewLine({ root: dir, itemId: it.id, mark: 'soften', note: 'shorter', expectHash: r0.hash });
    expect(r).toMatchObject({ ok: true, wrote: true, committed: true });
    expect(fs.readFileSync(file, 'utf8')).toContain('- After a delete: Picture deleted. The original was never here. - soften: shorter');
    expect(g('log', '--format=%an <%ae>|%s', '-1').trim()).toBe('Test Person <test@example.invalid>|text review: soften: shorter in PHOTOS page: gallery and delete one (issue 117c)');
    expect(g('status', '--porcelain')).toBe('');
    expect(g('log', '--oneline').trim().split('\n')).toHaveLength(2);
    expect(g('remote').trim()).toBe('');
    expect(r.diff).toContain('+++ docs/text-review.md');
    // clear it again: the file is the original, in a second commit
    const r1 = markReviewLine({ root: dir, itemId: it.id, mark: null, expectHash: r.hash, placeholder: it.placeholder });
    expect(r1.committed).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toBe(REAL);
  });
  it('refuses a stale page, an unknown item and a dry run writes nothing', () => {
    const { dir, file } = repo();
    const r0 = readReview(dir);
    const it = r0.items[0];
    expect(markReviewLine({ root: dir, itemId: it.id, mark: 'keep', expectHash: 'a'.repeat(64) })).toMatchObject({ ok: false, message: expect.stringMatching(/changed on disk/) });
    expect(markReviewLine({ root: dir, itemId: 'zzz~00000000', mark: 'keep' })).toMatchObject({ ok: false });
    const d = markReviewLine({ root: dir, itemId: it.id, mark: 'keep', dryRun: true });
    expect(d).toMatchObject({ ok: true, wrote: false, committed: false });
    expect(fs.readFileSync(file, 'utf8')).toBe(REAL);
    expect(fs.readdirSync(path.join(dir, 'docs'))).toEqual(['text-review.md']);
  });
  it('writes but does not commit on a branch, with other changes in the checkout, or with no identity', () => {
    const a = repo({ branch: 'issue/x' });
    const ra = markReviewLine({ root: a.dir, itemId: readReview(a.dir).items[0].id, mark: 'keep' });
    expect(ra).toMatchObject({ ok: true, wrote: true, committed: false });
    expect(ra.notCommitted).toMatch(/not main/);

    const b = repo();
    fs.writeFileSync(path.join(b.dir, 'stray.txt'), 'x');
    const rb = markReviewLine({ root: b.dir, itemId: readReview(b.dir).items[0].id, mark: 'keep' });
    expect(rb).toMatchObject({ wrote: true, committed: false });
    expect(rb.notCommitted).toMatch(/uncommitted/);
    expect(b.g('log', '--oneline').trim().split('\n')).toHaveLength(1);

    const c = repo();
    c.g('config', '--unset', 'user.name');
    const rc = markReviewLine({ root: c.dir, itemId: readReview(c.dir).items[0].id, mark: 'keep', commit: true });
    // a global identity may exist on this machine; either way nothing is pushed and the doc is written
    expect(rc.wrote).toBe(true);
    const d = repo();
    expect(markReviewLine({ root: d.dir, itemId: readReview(d.dir).items[0].id, mark: 'keep', commit: false })).toMatchObject({ wrote: true, committed: false });
  });
  it('refuses a missing doc', () => {
    const dir = tmpdir();
    expect(markReviewLine({ root: dir, itemId: 'x~1', mark: 'keep' }).message).toMatch(/no docs\/text-review.md/);
    expect(readReview(dir).ok).toBe(false);
  });
  it('nextCard walks the doc with skips', () => {
    const { dir } = repo();
    const first = nextCard({ root: dir });
    const second = nextCard({ root: dir, afterId: first.item.id });
    expect(second.item.id).not.toBe(first.item.id);
    expect(nextCard({ root: dir, afterId: first.item.id, skipped: [second.item.id] }).item.id).not.toBe(second.item.id);
    expect(first.progress.left).toBe(first.progress.total);
    expect(hashOf(REAL)).toBe(first.hash);
  });
});

describe('the live docs/text-review.md', () => {
  it('still parses: nothing unparsed, and at least as many strings as the snapshot', () => {
    const p = parseReview(LIVE);
    expect(p.unparsed).toEqual([]);
    expect(p.items.length).toBeGreaterThanOrEqual(parseReview(REAL).items.length);
  });
});
