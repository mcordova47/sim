import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import YAML from 'yaml';
import {
  analyze, generateTable, loadFiles, parseIssue, replaceTable, formatProblem,
  TABLE_START, TABLE_END, defaultThread,
} from './issues.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const file = (id, extra = {}, slug = 'x') => {
  const fm = { id, title: `Title ${id}`, status: 'todo', owner: 'claude', depends_on: '[]', ...extra };
  const text = ['---', ...Object.entries(fm).map(([k, v]) => `${k}: ${v}`), '---', '## Goal', 'g', ''].join('\n');
  return { name: `${id}-${slug}.md`, text };
};
const messages = (r) => r.errors.map((e) => e.message);

describe('parseIssue', () => {
  it('keeps ids as strings, including leading zeros and octal-looking ids', () => {
    const i = parseIssue('010-x.md', '---\nid: 010\ntitle: "T"\nstatus: todo\nowner: claude\ndepends_on: [007, 009, 117f]\n---\n');
    expect(i.errors).toEqual([]);
    expect(i.fm.id).toBe('010');
    expect(i.fm.depends_on).toEqual(['007', '009', '117f']);
  });
  it('shows why a string-only schema is needed: the default schema makes numbers', () => {
    expect(YAML.parse('id: 007').id).toBe(7);
    expect(YAML.parse('id: 010').id).toBe(10);
  });
  it('reports invalid YAML with a line number', () => {
    const i = parseIssue('001-x.md', '---\nid: 001\ntitle: A: b\nstatus: todo\n---\n');
    expect(i.errors.length).toBe(1);
    expect(i.errors[0].line).toBe(3);
  });
  it('reports a missing or unterminated front matter block', () => {
    expect(parseIssue('001-x.md', '# hi').errors[0].message).toMatch(/start with a front matter/);
    expect(parseIssue('001-x.md', '---\nid: 001\n').errors[0].message).toMatch(/never ends/);
  });
  it('warns about duplicate headings but ignores headings inside code fences', () => {
    const t = '---\nid: 001\n---\n## A\n```\n## A\n```\n## A\n';
    const i = parseIssue('001-x.md', t);
    expect(i.warnings.length).toBe(1);
  });
});

describe('validator rules', () => {
  it('passes a clean set', () => {
    const r = analyze([file('001'), file('002', { depends_on: '[001]' }), file('002a'), file('002b', { depends_on: '[002a]' })]);
    expect(r.errors).toEqual([]);
  });
  it('rejects a missing required key, naming the file and a line', () => {
    const f = { name: '001-x.md', text: '---\nid: 001\ntitle: T\nstatus: todo\nowner: claude\n---\n' };
    const r = analyze([f]);
    expect(messages(r)).toEqual(['The front matter is missing "depends_on".']);
    expect(formatProblem(r.errors[0])).toMatch(/^issues\/001-x\.md:\d+: /);
  });
  it('rejects a bad status', () => {
    expect(messages(analyze([file('001', { status: 'finished' })]))[0]).toMatch(/status "finished" is not one of/);
  });
  it('rejects a numeric id and an id that does not match the file name', () => {
    expect(messages(analyze([{ ...file('007'), text: file('007').text.replace('id: 007', 'id: 7') }]))[0]).toMatch(/must be three digits/);
    expect(messages(analyze([{ ...file('007'), name: '008-x.md' }]))[0]).toMatch(/does not match the file name/);
  });
  it('rejects a bad file name', () => {
    expect(messages(analyze([{ ...file('007'), name: 'notes.md' }])).join()).toMatch(/file name must look like/);
  });
  it('rejects duplicate ids', () => {
    const r = analyze([file('001', {}, 'a'), { ...file('001', {}, 'b') }]);
    expect(messages(r)[0]).toMatch(/also used by 001-a\.md/);
  });
  it('rejects depends_on that is not a list or names a missing id', () => {
    expect(messages(analyze([file('001', { depends_on: '006' })]))[0]).toMatch(/must be a list/);
    expect(messages(analyze([file('001', { depends_on: '[006]' })]))[0]).toBe('depends_on lists 006, which does not exist.');
  });
  it('rejects dependency loops and self-dependency', () => {
    const r = analyze([file('001', { depends_on: '[002]' }), file('002', { depends_on: '[001]' })]);
    expect(messages(r).join()).toMatch(/loop: 001 -> 002 -> 001/);
    expect(messages(analyze([file('001', { depends_on: '[001]' })]))[0]).toMatch(/cannot depend on itself/);
  });
  it('checks thread and superseded_by targets and loops', () => {
    expect(messages(analyze([file('001', { thread: '009' })]))[0]).toMatch(/thread names 009, which does not exist/);
    const r = analyze([file('001', { superseded_by: '002' }), file('002', { superseded_by: '001' })]);
    expect(messages(r).join()).toMatch(/superseded_by goes round in a loop/);
  });
  it('warns, without failing, about a done root with open members and unknown keys', () => {
    const r = analyze([file('001', { status: 'done', colour: 'red' }), file('001a')]);
    expect(r.errors).toEqual([]);
    expect(r.warnings.map((w) => w.message).join('|')).toMatch(/001 is done, but 001a is not/);
    expect(r.warnings.map((w) => w.message).join('|')).toMatch(/"colour" is not a field/);
  });
  it('ignores a superseded member when judging a done root', () => {
    const r = analyze([file('001', { status: 'done' }), file('001a', { superseded_by: '002' }), file('002', { status: 'done' })]);
    expect(r.warnings.filter((w) => /is done, but/.test(w.message))).toEqual([]);
  });
  it('knows the default thread', () => {
    expect(defaultThread('117c')).toBe('117');
    expect(defaultThread('117')).toBeNull();
  });
});

describe('table generation', () => {
  const plan = `intro\n${TABLE_START}\nold\n${TABLE_END}\noutro\n`;
  const set = () => analyze([
    file('002', { short: '"Short name"', note: '"a note"', status: 'in-progress', depends_on: '[001a, 001b]', owner: 'marc + claude' }),
    file('001'), file('001a'), file('001b', { title: '"A | pipe"' }),
  ]);
  it('writes one row per issue in id order, with short, note and dependencies', () => {
    const t = generateTable(set().issues);
    const rows = t.split('\n').filter((l) => /^\| \d/.test(l));
    expect(rows).toEqual([
      '| 001 | [Title 001](issues/001-x.md) | claude | todo | |',
      '| 001a | [Title 001a](issues/001a-x.md) | claude | todo | |',
      '| 001b | [A \\| pipe](issues/001b-x.md) | claude | todo | |',
      '| 002 | [Short name](issues/002-x.md) | marc + claude | in-progress (a note) | 001a, 001b |',
    ]);
    expect(t.startsWith(TABLE_START)).toBe(true);
    expect(t.endsWith(TABLE_END)).toBe(true);
  });
  it('replaces only the block, and is idempotent', () => {
    const block = generateTable(set().issues);
    const once = replaceTable(plan, block);
    expect(once.ok).toBe(true);
    expect(once.text.startsWith('intro\n')).toBe(true);
    expect(once.text.endsWith('\noutro\n')).toBe(true);
    expect(replaceTable(once.text, block).text).toBe(once.text);
  });
  it('detects a hand-edited table', () => {
    const block = generateTable(set().issues);
    const good = replaceTable(plan, block).text;
    const edited = good.replace('| todo |', '| done |');
    expect(edited).not.toBe(good);
    expect(replaceTable(edited, block).text).toBe(good);
  });
  it('fails when markers are missing, reversed or doubled', () => {
    expect(replaceTable('no markers', 'x').ok).toBe(false);
    expect(replaceTable(`${TABLE_END}\n${TABLE_START}`, 'x').ok).toBe(false);
    expect(replaceTable(`${plan}${plan}`, 'x').ok).toBe(false);
  });
});

describe('the real issues folder', () => {
  const files = loadFiles(path.join(root, 'issues'));
  const result = analyze(files);

  it('has no validation errors', () => {
    expect(result.errors.map(formatProblem)).toEqual([]);
  });
  it('reads every id as a string matching its file name, and every file parses strictly', () => {
    expect(files.length).toBeGreaterThan(160);
    for (const f of files) {
      const fm = f.text.match(/^---\n([\s\S]*?)\n---/)[1];
      const d = YAML.parse(fm, { schema: 'failsafe' });
      expect(typeof d.id, f.name).toBe('string');
      expect(f.name.startsWith(d.id + '-'), f.name).toBe(true);
      for (const dep of d.depends_on) expect(typeof dep, f.name).toBe('string');
    }
    expect(result.issues.length).toBe(files.length);
  });
  // Not "equals the committed table": branches change statuses and never touch
  // PLAN.md, so that comparison is `npm run issues:check -- --table`, on main only.
  it('can write one table row per issue into the real PLAN.md markers', () => {
    const plan = fs.readFileSync(path.join(root, 'PLAN.md'), 'utf8');
    const r = replaceTable(plan, generateTable(result.issues));
    expect(r.ok).toBe(true);
    expect(r.text.split('\n').filter((l) => /^\| \d{3}[a-z]? \|/.test(l)).length).toBe(files.length);
  });
});
