import { describe, expect, it } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  analyze, loadFiles, buildModel, issuesJson, parseDocDecisions, collectDecisions, optionLabel, headingSlug,
  isDocPath, DOC_ISSUES,
} from './issues.mjs';
import { buildSite } from './issues-site.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = (id, extra = {}, body = '## Goal\ng\n') => {
  const fm = { id, title: `Title ${id}`, status: 'todo', owner: 'claude', depends_on: '[]', ...extra };
  return { name: `${id}-x.md`, text: ['---', ...Object.entries(fm).map(([k, v]) => `${k}: ${v}`), '---', body].join('\n') };
};
const run = (...f) => analyze(f);
const msgs = (r) => r.errors.map((e) => e.message).join('|');
const git = { commit: 'abc1234', date: '2026-11-15', branch: 'main', dirty: false, merges: [] };
const D = (o) => `[{id: d1, q: "Which?", status: answered, answer: "Soft", by: marc, on: 2026-11-01${o}}]`;

describe('decisions and docs validation', () => {
  it('accepts a complete decision list and docs', () => {
    const r = run(file('001', {
      docs: '[docs/a-design.md]',
      decisions: '[{id: d1, q: "Which?", options: ["A", "B"], recommendation: "A", status: answered, answer: "A", by: marc, on: 2026-11-01, doc: "docs/a-design.md#14-questions"}, {id: d2, q: "And?", status: open}]',
    }));
    expect(r.errors).toEqual([]);
  });
  it('requires answer, by and on for answered and defaulted', () => {
    expect(msgs(run(file('001', { decisions: '[{id: d1, q: "Q", status: answered}]' })))).toMatch(/needs answer.*needs by.*needs on/);
    expect(msgs(run(file('001', { decisions: '[{id: d1, q: "Q", status: defaulted, answer: x}]' })))).toMatch(/needs by/);
    expect(run(file('001', { decisions: '[{id: d1, q: "Q", status: open}]' })).errors).toEqual([]);
  });
  it('rejects bad status, who, by, date, ids, options, doc and shape', () => {
    expect(msgs(run(file('001', { decisions: '[{id: d1, q: "Q", status: maybe}]' })))).toMatch(/status "maybe"/);
    expect(msgs(run(file('001', { decisions: '[{id: d1, q: "Q", status: open, who: bob}]' })))).toMatch(/who "bob"/);
    expect(msgs(run(file('001', { decisions: D(', by: bob').replace('by: marc, ', '') })))).toMatch(/by "bob"/);
    expect(msgs(run(file('001', { decisions: D('').replace('2026-11-01', '2026-13-45') })))).toMatch(/on must be a date/);
    expect(msgs(run(file('001', { decisions: '[{id: d1, q: "Q", status: open}, {id: d1, q: "R", status: open}]' })))).toMatch(/used twice/);
    expect(msgs(run(file('001', { decisions: '[{id: q1, q: "Q", status: open}]' })))).toMatch(/reserved/);
    expect(msgs(run(file('001', { decisions: '[{id: d1, status: open}]' })))).toMatch(/q must be/);
    expect(msgs(run(file('001', { decisions: '[{id: d1, q: "Q", status: open, options: [A]}, {id: d2, q: "Q", status: open, options: x}]' })))).toMatch(/options must be/);
    expect(msgs(run(file('001', { decisions: '[{id: d1, q: "Q", status: open, doc: "https://example.com/x.md"}]' })))).toMatch(/doc must be a repo path/);
    expect(msgs(run(file('001', { decisions: 'soon' })))).toMatch(/decisions must be a list/);
    expect(msgs(run(file('001', { docs: '[https://example.com/x.md]' })))).toMatch(/docs must be a list of repo paths/);
    expect(msgs(run(file('001', { docs: '[../secret.md]' })))).toMatch(/docs must be/);
    expect(msgs(run(file('001', { docs: 'docs/a.md' })))).toMatch(/docs must be/);
  });
  it('checks that named docs exist when asked, and warns about an open decision with an answer', () => {
    const r = analyze([file('001', { docs: '[docs/gone.md]' })], { docExists: () => false });
    expect(msgs(r)).toMatch(/docs\/gone\.md is named here but does not exist/);
    const w = run(file('001', { decisions: '[{id: d1, q: "Q", status: open, answer: x}]' }));
    expect(w.warnings.map((x) => x.message).join()).toMatch(/open but has an answer/);
  });
  it('isDocPath', () => {
    expect(isDocPath('docs/x-design.md')).toBe(true);
    expect(isDocPath('docs/x-design.md#a-b', true)).toBe(true);
    expect(isDocPath('docs/x-design.md#a-b')).toBe(false);
    expect(isDocPath('/etc/x.md')).toBe(false);
    expect(isDocPath('docs/x.txt')).toBe(false);
  });
});

describe('the docs-line parser, on fixtures', () => {
  const doc = (body) => `# T\n\n## 3. Open questions for Marc (x)\n${body}\n`;
  it('reads the question-first form with bullets and a recommendation', () => {
    const { decisions: [d] } = parseDocDecisions('docs/x.md', doc(
      '1. **How tall? ANSWERED by Marc 2026-10-28: (a) 6 rows.** Prose here.\n   Recommend: six rows, try them.\n   - A (recommended): 6 rows, try it.\n   - B: 5 rows.\n', ), '001');
    expect(d).toMatchObject({ issue: '001', id: 'q1', q: 'How tall?', status: 'answered', by: 'marc', who: 'marc', on: '2026-10-28', answer: '(a) 6 rows', recommendation: 'Six rows, try them' });
    expect(d.options).toEqual(['6 rows, try it', '5 rows']);
    expect(d.doc).toBe('docs/x.md#3-open-questions-for-marc-x');
  });
  it('reads the answer-first form and a bare letter answer, inline options', () => {
    const r = parseDocDecisions('docs/x.md', doc(
      '1. **ANSWERED by Marc 2026-10-29: as recommended.** **The words.** Pick some. Recommend yes, then look.\n' +
      '2. **Silhouettes? ANSWERED by Marc 2026-10-28: (b).** (a) None. (b) **Recommended:** only shown things. (c) All of them.\n'), '001');
    expect(r.decisions[0]).toMatchObject({ q: 'The words', answer: 'As recommended', recommendation: 'Yes, then look' });
    expect(r.decisions[1]).toMatchObject({ q: 'Silhouettes?', answer: '(b) Only shown things', recommendation: 'Only shown things' });
    expect(r.decisions[1].options).toEqual(['None', 'Only shown things', 'All of them']);
  });
  it('reads a planner decision with a note as defaulted', () => {
    const { decisions: [d] } = parseDocDecisions('docs/x.md', doc('1. **How long? DECIDED by the planner 2026-10-29 (Marc: use judgement): (a) four passes.**\n'), '001');
    expect(d).toMatchObject({ status: 'defaulted', by: 'planner', who: 'marc', answer: '(a) four passes', note: 'Marc: use judgement' });
  });
  it('reports a marked line it cannot read, and ignores other numbered lists and code fences', () => {
    const r = parseDocDecisions('docs/x.md', doc('1. **Odd line ANSWERED by Marc someday: x.**\n2. A plain list item.\n```\n3. **Q? ANSWERED by Marc 2026-10-28: no.**\n```\n'), '001');
    expect(r.decisions).toEqual([]);
    expect(r.problems).toHaveLength(1);
  });
  it('shortens option labels sensibly and makes a github-style anchor', () => {
    expect(optionLabel('A shape for every item that exists (the real pokedex, which breaks the "no one is missing anything" rule).')).toBe('A shape for every item that exists');
    expect(optionLabel('x'.repeat(120)).length).toBeLessThanOrEqual(90);
    expect(headingSlug('14. Open questions for Marc (real ones only, most important first)')).toBe('14-open-questions-for-marc-real-ones-only-most-important-first');
  });
});

describe('the real design docs', () => {
  const { issues } = analyze(loadFiles(path.join(root, 'issues')));
  const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
  const { decisions, problems } = collectDecisions(issues, read);
  const fromDocs = decisions.filter((d) => d.source === 'doc');
  it('finds 25 answered by Marc and 5 decided by the planner, with nothing unread', () => {
    expect(problems).toEqual([]);
    expect(fromDocs.filter((d) => d.by === 'marc' && d.status === 'answered')).toHaveLength(25);
    expect(fromDocs.filter((d) => d.by === 'planner' && d.status === 'defaulted')).toHaveLength(5);
    expect(fromDocs).toHaveLength(30);
  });
  it('gives every one a question, an answer, a date, a real issue and a doc section; ids are unique', () => {
    const ids = new Set(issues.map((i) => i.fm.id));
    const keys = new Set();
    for (const d of fromDocs) {
      expect(d.q.length).toBeGreaterThan(5);
      expect(d.answer.length).toBeGreaterThan(1);
      expect(d.on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(ids.has(d.issue)).toBe(true);
      expect(d.doc).toMatch(/^docs\/[\w-]+\.md#[\w-]+$/);
      keys.add(`${d.issue}:${d.id}`);
    }
    expect(keys.size).toBe(30);
    expect(Object.values(DOC_ISSUES).every((id) => ids.has(id))).toBe(true);
  });
  it('splits by date as the design counted: 15 on 10-28 and 10 on 10-29 by Marc', () => {
    const marc = fromDocs.filter((d) => d.by === 'marc');
    expect(marc.filter((d) => d.on === '2026-10-28')).toHaveLength(15);
    expect(marc.filter((d) => d.on === '2026-10-29')).toHaveLength(10);
  });
  it('reads the recommendation and options where the docs state them', () => {
    const q = (issue, id) => fromDocs.find((d) => d.issue === issue && d.id === id);
    expect(q('109', 'q1').answer).toMatch(/^\(b\) /);
    expect(q('109', 'q1').options).toHaveLength(3);
    expect(q('106', 'q1').recommendation).toMatch(/^6 rows/);
    expect(q('117', 'q1').answer).toBe('As recommended');
    expect(q('117', 'q1').recommendation).toMatch(/^Yes as proposed/);
    expect(q('113', 'q2').options[0]).toMatch(/22 colours/);
    expect(q('091', 'q4').by).toBe('planner');
  });
  it('is read-only: the docs on disk are never changed by building', () => {
    const before = read('docs/photo-gallery-design.md');
    collectDecisions(issues, read);
    expect(read('docs/photo-gallery-design.md')).toBe(before);
  });
});

describe('the pages and issues.json', () => {
  const build = (files, extra = []) => {
    const { issues } = run(...files);
    const ds = collectDecisions(issues, () => null).decisions.concat(extra);
    const model = buildModel(issues, ds);
    return { site: buildSite(issues, git, { decisions: ds }), json: issuesJson(issues, model, {}), model };
  };
  const ANSWERED = '[{id: d1, q: "Which look?", options: ["Crisp", "Soft"], recommendation: "Soft", status: answered, answer: "Soft", by: marc, on: 2026-11-02}]';
  it('lists answered decisions newest first on the log, with who, when, recommendation and choice', () => {
    const { site } = build([
      file('001', { decisions: ANSWERED }),
      file('002', { decisions: '[{id: d1, q: "Older?", status: defaulted, answer: "Yes", by: planner, on: 2026-10-01}]' }),
    ]);
    const html = site['decisions.html'];
    expect(html.indexOf('Which look?')).toBeLessThan(html.indexOf('Older?'));
    expect(html).toMatch(/Answered by Marc, 2026-11-02/);
    expect(html).toMatch(/Decided by the planner, 2026-10-01/);
    expect(html).toMatch(/Recommended:<\/span> Soft/);
    expect(html).toMatch(/Chose:<\/span> Soft/);
  });
  it('shows the waiting band empty when nothing is open, and calm when something is', () => {
    const none = build([file('001', { decisions: ANSWERED })]).site;
    expect(none['decisions.html']).toMatch(/Nothing is waiting on you\./);
    expect(none['needs.html']).toMatch(/Nothing is waiting on you\./);
    const open = build([file('001', { decisions: '[{id: d1, q: "Pick one?", recommendation: "A", status: open}]' })]);
    expect(open.site['decisions.html']).toMatch(/Pick one\?/);
    expect(open.site['decisions.html']).toMatch(/None of these is urgent/);
    expect(open.site['needs.html']).toMatch(/Pick one\?/);
    expect(open.site['index.html']).toMatch(/Pick one\?/);
    expect(open.model.forMarc.map((n) => n.kind)).toEqual(['decide']);
  });
  it('an open decision for someone else does not appear as waiting on Marc', () => {
    const { model } = build([file('001', { decisions: '[{id: d1, q: "Planner?", who: planner, status: open}]' })]);
    expect(model.forMarc).toEqual([]);
  });
  it('adds the thread branch only when the thread has decisions, and carries them to the issue page', () => {
    const { site } = build([file('001', { decisions: ANSWERED }), file('001a'), file('002')]);
    expect(site['thread-001.html']).toMatch(/Decisions you made, and why/);
    expect(site['thread-001.html']).toMatch(/Which look\?/);
    expect(site['issue-001.html']).toMatch(/id="decisions"/);
    expect(site['issue-001.html']).toMatch(/Which look\?/);
    const bare = build([file('001'), file('001a')]).site;
    expect(bare['thread-001.html']).not.toMatch(/Decisions you made/);
  });
  it('puts decisions in issues.json, sorted, with no host or link', () => {
    const { json } = build([file('001', { decisions: ANSWERED }), file('002', { decisions: '[{id: d1, q: "Q", status: open}]' })]);
    expect(json.decisions.map((d) => `${d.issue}:${d.id}`)).toEqual(['001:d1', '002:d1']);
    expect(json.decisions[0]).toMatchObject({ status: 'answered', by: 'marc', on: '2026-11-02', recommendation: 'Soft', thread: '001' });
    expect(JSON.stringify(json)).not.toMatch(/https?:|claude\.ai/);
  });
  it('escapes markup in a question', () => {
    const { site } = build([file('001', { decisions: '[{id: d1, q: "<script>x</script>?", status: open}]' })]);
    expect(site['decisions.html']).not.toMatch(/<script>x/);
  });
  it('the real repo builds a log of all 30, with no urgency words, links to other hosts, or counts of what waits', () => {
    const { issues } = analyze(loadFiles(path.join(root, 'issues')));
    const ds = collectDecisions(issues, (p) => fs.readFileSync(path.join(root, p), 'utf8')).decisions;
    const site = buildSite(issues, git, { decisions: ds });
    const html = site['decisions.html'];
    expect((html.match(/<article class="dec/g) || []).length).toBeGreaterThanOrEqual(30);
    expect(html).toMatch(/Nothing is waiting on you\./);
    expect(html).not.toMatch(/overdue|urgent!|ASAP|href="https?:/i);
    expect(site['thread-117.html']).toMatch(/Decisions you made, and why/);
    expect(site['thread-106.html']).toMatch(/Decisions you made, and why/);
  });
});
