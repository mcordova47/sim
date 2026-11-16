import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadFiles, analyze } from './issues.mjs';
import {
  answerDecision, dropDecision, deferDecision, addDecision, addNeed, resolveNeed, resolveAnswer,
} from './issues-edit.mjs';
import { editIssue, runCommand, hashOf, parseArgs, commitCheck } from './issues-edit-io.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ON = '2026-11-15';
const NAME = '001-x.md';
const wrap = (fm, body = '## Goal\ng\n\n## Progress log\n- a line\n') => `---\n${fm}\n---\n${body}`;
const BASE = 'id: "001"\ntitle: "T"\nstatus: todo\nowner: claude\ndepends_on: []';
const ok = (r) => { expect(r.message).toBeUndefined(); expect(r.ok).toBe(true); return r.text; };
const refused = (r) => { expect(r.ok).toBe(false); expect(r.text).toBeUndefined(); return r.message; };
const opt = { on: ON, name: NAME };

// Everything that is not inside the front matter is untouched, and the changed lines are exactly `expectedChange`.
const lineDiff = (a, b) => {
  const x = a.split('\n'); const y = b.split('\n');
  let s = 0; while (s < x.length && s < y.length && x[s] === y[s]) s++;
  let e = 0; while (e < x.length - s && e < y.length - s && x[x.length - 1 - e] === y[y.length - 1 - e]) e++;
  return { removed: x.slice(s, x.length - e), added: y.slice(s, y.length - e) };
};

const BLOCK = `${BASE}
# a comment before
decisions:
  # about d1
  - id: d1
    who: marc
    q: "Which one, A or B?"   # why we ask
    options:
      - "a: Alpha"
      - "b: Beta"
    recommendation: "a: Alpha"
    status: open   # still open
  - id: d2
    who: marc
    q: 'Single quoted: question'
    status: 'open'
note: "after"
unverified: ["x"]`;

describe('answerDecision, block style', () => {
  it('changes only the status and adds answer, by, on', () => {
    const t = wrap(BLOCK);
    const out = ok(answerDecision(t, 'd1', 'b', opt));
    const d = lineDiff(t, out);
    expect(d.removed).toEqual(['    status: open   # still open']);
    expect(d.added).toEqual(['    status: answered   # still open', '    answer: "b: Beta"', '    by: marc', '    on: 2026-11-15']);
    expect(analyze([{ name: NAME, text: out }]).errors).toEqual([]);
  });
  it('keeps single quotes on a quoted status and leaves the other entry alone', () => {
    const t = wrap(BLOCK);
    const out = ok(answerDecision(t, 'd2', 'a free answer', { ...opt, other: true }));
    expect(lineDiff(t, out).removed).toEqual(["    status: 'open'"]);
    expect(out).toContain("    status: 'answered'\n    answer: \"a free answer\"\n    by: marc\n    on: 2026-11-15\nnote: \"after\"");
  });
  it('accepts a letter, an option text, or "as recommended", and records the option text', () => {
    const t = wrap(BLOCK);
    expect(ok(answerDecision(t, 'd1', 'A', opt))).toContain('answer: "a: Alpha"');
    expect(ok(answerDecision(t, 'd1', 'a: alpha', opt))).toContain('answer: "a: Alpha"');
    expect(ok(answerDecision(t, 'd1', 'As Recommended', opt))).toContain('answer: "as recommended"');
  });
  it('writes quotes and colons in the answer safely', () => {
    const t = wrap(BLOCK);
    const out = ok(answerDecision(t, 'd2', 'say "hi": # not a comment', { ...opt, other: true }));
    expect(analyze([{ name: NAME, text: out }]).issues[0].fm.decisions[1].answer).toBe('say "hi": # not a comment');
  });
  it('byte for byte outside the edit, including the body', () => {
    const body = '## Goal\ntabs\there  \n\n```\n---\n```\n\n\nno trailing newline';
    const t = wrap(BLOCK, body);
    const out = ok(answerDecision(t, 'd1', 'a', opt));
    expect(out.endsWith(`---\n${body}`)).toBe(true);
    const d = lineDiff(t, out);
    expect(d.removed.length).toBe(1);
  });
});

describe('answerDecision, other layouts', () => {
  const FLOW = `${BASE}\ndecisions: [{id: d1, who: marc, q: "Which, A or B?", options: ["A", "B"], status: open}, {id: d2, q: "Two?", status: open}]  # list\nsummary: "s"`;
  it('flow-style entries get the new keys inside the braces', () => {
    const t = wrap(FLOW);
    const out = ok(answerDecision(t, 'd1', 'B', opt));
    expect(out).toContain('{id: d1, who: marc, q: "Which, A or B?", options: ["A", "B"], status: answered, answer: "B", by: marc, on: 2026-11-15}, {id: d2');
    expect(out).toContain('status: open}]  # list\nsummary: "s"');
  });
  it('flow entry in the last position and in a multi-line flow list', () => {
    const t = wrap(`${BASE}\ndecisions: [\n  {id: d1, q: "One?", status: open},\n  {id: d2, q: "Two?", status: open}   # last\n]`);
    const out = ok(answerDecision(t, 'd2', 'yes', opt));
    expect(out).toContain('{id: d2, q: "Two?", status: answered, answer: "yes", by: marc, on: 2026-11-15}   # last\n]');
  });
  it('block entry whose last field is a block list of options', () => {
    const t = wrap(`${BASE}\ndecisions:\n- id: d1\n  q: "Q?"\n  status: open\n  options:\n  - "x"\n  - "y"\nlast: 1`);
    const out = ok(answerDecision(t, 'd1', 'y', opt));
    expect(out).toContain('  - "y"\n  answer: "y"\n  by: marc\n  on: 2026-11-15\nlast: 1');
    expect(out).toContain('  status: answered\n  options:');
  });
  it('a decision with no options takes any answer; an existing answer on an open one is replaced', () => {
    const t = wrap(`${BASE}\ndecisions:\n  - {id: d1, q: "Q?", status: open, answer: "old"}`);
    expect(ok(answerDecision(t, 'd1', 'new thing', opt))).toContain('status: answered, answer: "new thing", by: marc, on: 2026-11-15}');
  });
  it('a quoted by/answer in a plain-style entry is replaced in its own style', () => {
    const t = wrap(`${BASE}\ndecisions:\n  - id: d1\n    q: "Q?"\n    status: "open"\n    answer: 'old'\n`);
    const out = ok(answerDecision(t, 'd1', 'fresh', opt));
    expect(out).toContain('status: "answered"\n    answer: \'fresh\'\n    by: marc');
  });
});

describe('refusals', () => {
  const t = wrap(BLOCK);
  it('unknown decision', () => expect(refused(answerDecision(t, 'd9', 'a', opt))).toMatch(/no decision "d9".*d1, d2/));
  it('no decisions at all', () => expect(refused(answerDecision(wrap(BASE), 'd1', 'a', opt))).toMatch(/no decisions/));
  it('not an option', () => {
    const m = refused(answerDecision(t, 'd1', 'zzz', opt));
    expect(m).toMatch(/not one of the options/);
    expect(m).toMatch(/--other/);
  });
  it('already answered, dropped', () => {
    const done = ok(answerDecision(t, 'd1', 'a', opt));
    expect(refused(answerDecision(done, 'd1', 'b', opt))).toMatch(/already answered by marc on 2026-11-15/);
    expect(refused(dropDecision(done, 'd1', '', opt))).toMatch(/already answered/);
    expect(refused(deferDecision(done, 'd1', 'x', opt))).toMatch(/already answered/);
  });
  it('empty or multi-line answer, bad by, bad date', () => {
    expect(refused(answerDecision(t, 'd2', '  ', { ...opt, other: true }))).toMatch(/some text/);
    expect(refused(answerDecision(t, 'd2', 'a\nb', { ...opt, other: true }))).toMatch(/one line/);
    expect(refused(answerDecision(t, 'd1', 'a', { ...opt, by: 'bob' }))).toMatch(/"by" must be/);
    expect(refused(answerDecision(t, 'd1', 'a', { ...opt, on: '15/11/2026' }))).toMatch(/date/);
  });
  it('file that is not valid, has CRLF or no front matter', () => {
    expect(refused(answerDecision('no front matter', 'd1', 'a', opt))).toMatch(/front matter/);
    expect(refused(answerDecision(t.replace(/\n/g, '\r\n'), 'd1', 'a', opt))).toMatch(/Windows/);
    expect(refused(answerDecision(wrap(`${BASE}\ndecisions: [{id: d1`), 'd1', 'a', opt))).toMatch(/not valid YAML/);
    // A problem the file already has is not made worse and does not block the edit; a new one does.
    const sick = wrap(`id: "001"\ntitle: T\nstatus: nope\nowner: c\ndepends_on: []\ndecisions: [{id: d1, q: "Q?", status: open}]`);
    expect(ok(answerDecision(sick, 'd1', 'a', opt))).toContain('status: nope');
  });
  it('resolveAnswer on its own', () => {
    expect(resolveAnswer({ options: ['x', 'y'] }, '2').answer).toBe('y');
    expect(resolveAnswer({ options: ['x', 'y'] }, 'c').ok).toBe(false);
    expect(resolveAnswer({}, 'anything').answer).toBe('anything');
    expect(resolveAnswer({ options: ['x'] }, 'as recommended').ok).toBe(false); // no recommendation to point to
  });
});

describe('dropDecision and deferDecision', () => {
  const t = wrap(BLOCK);
  it('drop sets status dropped with by and on, and keeps a reason as a note', () => {
    const out = ok(dropDecision(t, 'd2', 'no longer needed', opt));
    expect(out).toContain("    status: 'dropped'\n    note: \"no longer needed\"\n    by: marc\n    on: 2026-11-15\nnote: \"after\"");
  });
  it('drop with no reason adds no note', () => {
    expect(ok(dropDecision(t, 'd2', undefined, opt))).toContain("status: 'dropped'\n    by: marc\n    on: 2026-11-15");
  });
  it('defer keeps it open and adds a dated note; deferring again replaces the note', () => {
    const out = ok(deferDecision(t, 'd1', 'ask me after the demo', opt));
    expect(lineDiff(t, out).removed).toEqual([]);
    expect(lineDiff(t, out).added).toEqual(['    note: "Deferred 2026-11-15: ask me after the demo"']);
    const again = ok(deferDecision(out, 'd1', 'later', { ...opt, on: '2026-11-20' }));
    expect(lineDiff(out, again).added).toEqual(['    note: "Deferred 2026-11-20: later"']);
    expect(analyze([{ name: NAME, text: again }]).issues[0].fm.decisions[0].status).toBe('open');
  });
  it('a deferred decision can still be answered', () => {
    const out = ok(deferDecision(t, 'd1', 'x', opt));
    expect(ok(answerDecision(out, 'd1', 'a', opt))).toContain('status: answered');
  });
});

describe('addDecision', () => {
  it('appends in the block form the planner writes, matching the existing indent', () => {
    const t = wrap(BLOCK);
    const out = ok(addDecision(t, { q: "Should it?", options: ['yes', 'no'], recommendation: 'yes' }, { name: NAME }));
    const d = lineDiff(t, out);
    expect(d.removed).toEqual([]);
    expect(d.added).toEqual(['  - id: d3', '    who: marc', '    q: "Should it?"', '    options:', '      - "yes"', '      - "no"', '    recommendation: "yes"', '    status: open']);
    expect(out).toContain("    status: 'open'\n  - id: d3");
  });
  it('creates the decisions key at the end when there is none', () => {
    const out = ok(addDecision(wrap(BASE), { q: 'Q?' }, { name: NAME }));
    expect(out).toBe(wrap(`${BASE}\ndecisions:\n  - id: d1\n    who: marc\n    q: "Q?"\n    status: open`));
  });
  it('adds into a flow list and into an empty one', () => {
    const f = wrap(`${BASE}\ndecisions: [{id: d1, q: "One?", status: open}] # c`);
    expect(ok(addDecision(f, { q: 'Two?', who: 'planner' }, { name: NAME }))).toContain('status: open}, {id: d2, who: planner, q: "Two?", status: open}] # c');
    expect(ok(addDecision(wrap(`${BASE}\ndecisions: []`), { q: 'Q?' }, { name: NAME }))).toContain('decisions: [{id: d1, who: marc, q: "Q?", status: open}]');
  });
  it('refuses a duplicate id, a bad who, a missing or multi-line question', () => {
    const t = wrap(BLOCK);
    expect(refused(addDecision(t, { q: 'Q?', id: 'd1' }, { name: NAME }))).toMatch(/already has a decision "d1"/);
    expect(refused(addDecision(t, { q: 'Q?', who: 'bob' }, { name: NAME }))).toMatch(/who/);
    expect(refused(addDecision(t, {}, { name: NAME }))).toMatch(/question/);
    expect(refused(addDecision(t, { q: 'a\nb' }, { name: NAME }))).toMatch(/one line/);
    expect(refused(addDecision(t, { q: 'Q?', id: 'q1' }, { name: NAME }))).toMatch(/reserved/);
    expect(refused(addDecision(t, { q: 'Q?', doc: '../x' }, { name: NAME }))).toMatch(/doc/);
  });
});

describe('needs', () => {
  const NEED = { who: 'marc', kind: 'try', why: 'Run it once', since: ON };
  const ONE = '{who: marc, kind: try, why: "Run it once", since: 2026-11-15}';
  it('adds the one-line form, creating the key at the end', () => {
    const out = ok(addNeed(wrap(BASE), NEED, { name: NAME }));
    expect(out).toBe(wrap(`${BASE}\nneeds: [${ONE}]`));
  });
  it('appends to a flow list and to a block list of block maps', () => {
    const f = wrap(`${BASE}\nneeds: [{who: other, kind: wait, why: "Deploy first", on: "the deploy", since: 2026-11-01}]  # c\nsummary: s`);
    expect(ok(addNeed(f, NEED, { name: NAME }))).toContain(`since: 2026-11-01}, ${ONE}]  # c\nsummary: s`);
    const b = wrap(`${BASE}\nneeds:\n  - who: marc\n    kind: do\n    why: "Mark it"\n    since: 2026-10-01\nsummary: s`);
    const out = ok(addNeed(b, NEED, { name: NAME }));
    expect(out).toContain('since: 2026-10-01\n  - who: marc\n    kind: try\n    why: "Run it once"\n    since: 2026-11-15\nsummary: s');
  });
  it('a wait needs "on"; only wait has one; refuses bad fields and duplicates', () => {
    expect(refused(addNeed(wrap(BASE), { ...NEED, kind: 'wait' }, { name: NAME }))).toMatch(/waits on/);
    expect(ok(addNeed(wrap(BASE), { ...NEED, kind: 'wait', on: 'the deploy' }, { name: NAME }))).toContain('why: "Run it once", on: "the deploy", since');
    expect(refused(addNeed(wrap(BASE), { ...NEED, on: 'x' }, { name: NAME }))).toMatch(/Only a "wait"/);
    expect(refused(addNeed(wrap(BASE), { ...NEED, who: 'bob' }, { name: NAME }))).toMatch(/who/);
    expect(refused(addNeed(wrap(BASE), { ...NEED, kind: 'later' }, { name: NAME }))).toMatch(/kind/);
    expect(refused(addNeed(wrap(BASE), { ...NEED, why: '' }, { name: NAME }))).toMatch(/why/);
    expect(refused(addNeed(wrap(BASE), { ...NEED, since: 'today' }, { name: NAME }))).toMatch(/since/);
    expect(refused(addNeed(wrap(`${BASE}\nneeds: [${ONE}]`), NEED, { name: NAME }))).toMatch(/already listed/);
    expect(refused(addNeed(wrap(`${BASE}\nneeds: nope`), NEED, { name: NAME }))).toMatch(/problem already|not a list/);
  });
  const TWO = `{who: marc, kind: try, why: "First, with a comma", since: 2026-10-01}, {who: marc, kind: do, why: "Second", since: 2026-10-02}, {who: planner, kind: review, why: "Third", since: 2026-10-03}`;
  it('resolves from a flow list: first, middle, last, only', () => {
    const t = wrap(`${BASE}\nneeds: [${TWO}] # c\nsummary: s`);
    expect(ok(resolveNeed(t, '1', { name: NAME }))).toContain('needs: [{who: marc, kind: do, why: "Second"');
    expect(ok(resolveNeed(t, 'second', { name: NAME }))).toContain('"First, with a comma", since: 2026-10-01}, {who: planner');
    expect(ok(resolveNeed(t, '3', { name: NAME }))).toContain('since: 2026-10-02}] # c\nsummary: s');
    const one = wrap(`${BASE}\nneeds: [${ONE}] # c\nsummary: s`);
    expect(ok(resolveNeed(one, 'run it', { name: NAME }))).toBe(wrap(`${BASE}\nneeds: [] # c\nsummary: s`));
  });
  it('resolves from a block list: middle, last, only', () => {
    const b = wrap(`${BASE}\nneeds:\n  - who: marc\n    kind: do\n    why: "A"\n    since: 2026-10-01\n  - {who: marc, kind: try, why: "B", since: 2026-10-02}\n  - who: marc\n    kind: do\n    why: "C"\n    since: 2026-10-03\nsummary: s`);
    expect(ok(resolveNeed(b, 'B', { name: NAME }))).toBe(wrap(`${BASE}\nneeds:\n  - who: marc\n    kind: do\n    why: "A"\n    since: 2026-10-01\n  - who: marc\n    kind: do\n    why: "C"\n    since: 2026-10-03\nsummary: s`));
    const one = wrap(`${BASE}\nneeds:\n  - who: marc\n    kind: do\n    why: "A"\n    since: 2026-10-01\nsummary: s`);
    expect(ok(resolveNeed(one, '1', { name: NAME }))).toBe(wrap(`${BASE}\nneeds: []\nsummary: s`));
    const last = wrap(`${BASE}\nneeds:\n  - who: marc\n    kind: do\n    why: "A"\n    since: 2026-10-01\n  - who: marc\n    kind: do\n    why: "Z"\n    since: 2026-10-03`);
    expect(ok(resolveNeed(last, 'Z', { name: NAME }))).toBe(wrap(`${BASE}\nneeds:\n  - who: marc\n    kind: do\n    why: "A"\n    since: 2026-10-01`));
  });
  it('refuses when nothing, nothing matches, or many match', () => {
    expect(refused(resolveNeed(wrap(BASE), '1', { name: NAME }))).toMatch(/no needs/);
    const t = wrap(`${BASE}\nneeds: [${TWO}]`);
    expect(refused(resolveNeed(t, '9', { name: NAME }))).toMatch(/no need number 9/);
    expect(refused(resolveNeed(t, 'zebra', { name: NAME }))).toMatch(/No need matches/);
    expect(refused(resolveNeed(t, 'ir', { name: NAME }))).toMatch(/More than one/);
    expect(refused(resolveNeed(t, '', { name: NAME }))).toMatch(/Say which/);
  });
  it('add then resolve gives back the original bytes', () => {
    for (const fm of [BASE, BLOCK, `${BASE}\nneeds: [${TWO}]`]) {
      const t = wrap(fm);
      const added = ok(addNeed(t, { ...NEED, why: 'Zebra stripes' }, { name: NAME }));
      expect(ok(resolveNeed(added, 'zebra', { name: NAME }))).toBe(fm.includes('needs:') ? t : wrap(`${fm}\nneeds: []`));
    }
  });
});

describe('the real issue files, all of them (in memory)', () => {
  const files = loadFiles(path.join(root, 'issues'));
  it('adding then resolving a need only ever inserts, then restores (or leaves needs: [])', () => {
    expect(files.length).toBeGreaterThan(150);
    for (const f of files) {
      const added = addNeed(f.text, { who: 'marc', kind: 'try', why: 'Zebra stripes', since: ON }, { name: f.name });
      if (added.ok === false) { expect(added.message).toMatch(/problem already|Windows|not a list|laid out|empty block/); continue; }
      const back = resolveNeed(added.text, 'zebra stripes', { name: f.name });
      expect(back.ok, f.name).toBe(true);
      const body = f.text.split('\n---\n').slice(1).join('\n---\n');
      expect(added.text.endsWith(`\n---\n${body}`), f.name).toBe(true);
      if (/^needs:/m.test(f.text)) expect(back.text, f.name).toBe(f.text);
      else expect(back.text.replace('\nneeds: []', ''), f.name).toBe(f.text);
    }
  });
  it('asking a question only inserts lines and keeps the validator happy', () => {
    for (const f of files) {
      const r = addDecision(f.text, { q: 'Zebra?', options: ['x', 'y'] }, { name: f.name });
      if (r.ok === false) { expect(r.message, f.name).toMatch(/problem already|Windows|not a list|laid out|empty block/); continue; }
      const d = lineDiff(f.text, r.text);
      expect(d.removed, f.name).toEqual([]);
    }
  });
});

// ---- the I/O layer, on a copy of the repo's issue folder in a temp dir ----------------------------------------

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'issues-edit-'));
function copyRepo(withGit) {
  const dir = tmp();
  fs.cpSync(path.join(root, 'issues'), path.join(dir, 'issues'), { recursive: true });
  fs.cpSync(path.join(root, 'docs'), path.join(dir, 'docs'), { recursive: true });
  fs.copyFileSync(path.join(root, 'PLAN.md'), path.join(dir, 'PLAN.md'));
  if (withGit) {
    const g = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: 'pipe' });
    g('init', '-q', '-b', 'main');
    g('config', 'user.name', 'Test Person');
    g('config', 'user.email', 'test@example.invalid');
    g('config', 'commit.gpgsign', 'false');
    g('add', '.');
    g('commit', '-q', '-m', 'start');
    return { dir, g };
  }
  return { dir };
}
const silent = { out: () => {}, err: () => {} };
const find134 = (dir) => path.join(dir, 'issues', fs.readdirSync(path.join(dir, 'issues')).find((n) => n.startsWith('134-')));

describe('the command on a copy of the real issues folder', () => {
  it('answering 134 d1 changes exactly the status line and adds answer, by and on', () => {
    const { dir } = copyRepo(false);
    const file = find134(dir);
    const before = fs.readFileSync(file, 'utf8');
    const msgs = [];
    const code = runCommand(['answer', '134', 'd1', 'done', '--date', ON, '--no-commit'], { root: dir, out: (m) => msgs.push(m), err: (m) => msgs.push(m) });
    expect(code, msgs.join('\n')).toBe(0);
    const after = fs.readFileSync(file, 'utf8');
    const d = lineDiff(before, after);
    expect(d.removed).toEqual(['    status: open']);
    expect(d.added).toEqual(['    status: answered', '    answer: "done"', '    by: marc', '    on: 2026-11-15']);
    // everything else is the same bytes: removing the added lines and restoring the status gives back the original
    expect(after.replace('    status: answered\n    answer: "done"\n    by: marc\n    on: 2026-11-15\n', '    status: open\n')).toBe(before);
    expect(analyze(loadFiles(path.join(dir, 'issues'))).errors).toEqual([]);
    // the real files are untouched
    expect(fs.readFileSync(path.join(root, 'issues', path.basename(file)), 'utf8')).toBe(before);
  });
  it('--dry-run prints the change and writes nothing', () => {
    const { dir } = copyRepo(false);
    const file = find134(dir);
    const before = fs.readFileSync(file, 'utf8');
    const out = [];
    expect(runCommand(['answer', '134', 'd1', 'a', '--dry-run'], { root: dir, out: (m) => out.push(m), err: (m) => out.push(m) })).toBe(0);
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
    expect(out.join('\n')).toMatch(/dry run/);
    expect(out.join('\n')).toMatch(/\+    status: answered/);
  });
  it('refusals exit 1 and write nothing', () => {
    const { dir } = copyRepo(false);
    const file = find134(dir);
    const before = fs.readFileSync(file, 'utf8');
    const errs = [];
    const run = (...a) => runCommand(a, { root: dir, out: () => {}, err: (m) => errs.push(m) });
    expect(run('answer', '134', 'd1', 'maybe')).toBe(1);
    expect(run('answer', '134', 'd99', 'done')).toBe(1);
    expect(run('answer', '999', 'd1', 'done')).toBe(1);
    expect(run('answer', 'abc', 'd1', 'done')).toBe(1);
    expect(run('answer', '134')).toBe(1);
    expect(run('frobnicate')).toBe(1);
    expect(run('answer', '134', 'd1', 'done', '--wat')).toBe(1);
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
    expect(errs.join('\n')).toMatch(/not one of the options/);
  });
  it('a stale page (changed hash) is refused', () => {
    const { dir } = copyRepo(false);
    const file = find134(dir);
    const r = editIssue({ root: dir, issue: '134', commit: false, expectHash: hashOf('old'), edit: (t, n) => answerDecision(t, 'd1', 'done', { on: ON, name: n }) });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/changed on disk/);
    expect(fs.readFileSync(file, 'utf8')).toBe(fs.readFileSync(path.join(root, 'issues', path.basename(file)), 'utf8'));
  });
  it('ask, need add and need resolve through the command', () => {
    const { dir } = copyRepo(false);
    const c = (...a) => runCommand([...a, '--no-commit', '--date', ON], { root: dir, ...silent });
    expect(c('ask', '134', 'Is this fine?', '--option', 'yes', '--option', 'no', '--recommend', 'yes')).toBe(0);
    expect(c('need', 'add', '134', '--who', 'marc', '--kind', 'try', '--why', 'Look at the pages')).toBe(0);
    const text = fs.readFileSync(find134(dir), 'utf8');
    expect(text).toContain('Look at the pages');
    expect(text).toContain('Is this fine?');
    expect(c('need', 'resolve', '134', 'look at')).toBe(0);
    expect(fs.readFileSync(find134(dir), 'utf8')).not.toContain('Look at the pages');
    expect(c('defer', '134', 'd2', 'later')).toBe(0);
    expect(c('drop', '134', 'd3')).toBe(0);
    expect(analyze(loadFiles(path.join(dir, 'issues'))).errors).toEqual([]);
  });
});

describe('the commit step, on a temporary git repo', () => {
  it('commits only the issue file, with the repo identity, on a clean main; never pushes', () => {
    const { dir, g } = copyRepo(true);
    const msgs = [];
    const code = runCommand(['answer', '134', 'd1', 'done', '--date', ON], { root: dir, out: (m) => msgs.push(m), err: (m) => msgs.push(m) });
    expect(code, msgs.join('\n')).toBe(0);
    expect(g('log', '-1', '--format=%an <%ae>|%s%n%b').trim()).toBe('Test Person <test@example.invalid>|134: answered d1');
    expect(g('show', '--name-only', '--format=').trim().split('\n').map((l) => path.basename(l)).filter((n) => n.startsWith('134-'))).toHaveLength(1);
    expect(g('show', '--name-only', '--format=').trim().split('\n')).toHaveLength(1);
    expect(g('status', '--porcelain').trim()).toBe('');
    expect(g('remote').trim()).toBe('');
    expect(msgs.join('\n')).toMatch(/Committed on main/);
    expect(g('log', '-1', '--format=%B')).not.toMatch(/Co-Authored/);
  });
  it('does not commit when not on main', () => {
    const { dir, g } = copyRepo(true);
    g('checkout', '-q', '-b', 'topic');
    const head = g('rev-parse', 'HEAD');
    const msgs = [];
    expect(runCommand(['answer', '134', 'd1', 'done', '--date', ON], { root: dir, out: (m) => msgs.push(m), err: (m) => msgs.push(m) })).toBe(0);
    expect(g('rev-parse', 'HEAD')).toBe(head);
    expect(g('status', '--porcelain')).toMatch(/134-/);
    expect(msgs.join('\n')).toMatch(/Not committed: the checkout is on topic, not main/);
  });
  it('does not commit when something else is uncommitted, or the file already was', () => {
    const { dir, g } = copyRepo(true);
    fs.appendFileSync(path.join(dir, 'PLAN.md'), '\nstray edit\n');
    const head = g('rev-parse', 'HEAD');
    const msgs = [];
    runCommand(['answer', '134', 'd1', 'done', '--date', ON], { root: dir, out: (m) => msgs.push(m), err: (m) => msgs.push(m) });
    expect(g('rev-parse', 'HEAD')).toBe(head);
    expect(msgs.join('\n')).toMatch(/uncommitted changes/);
    const other = copyRepo(true);
    fs.appendFileSync(find134(other.dir), '\nhand edit\n');
    expect(commitCheck(other.dir, find134(other.dir)).why).toMatch(/issue file already had/);
  });
  it('--no-commit edits only; a missing git identity edits only', () => {
    const a = copyRepo(true);
    const head = a.g('rev-parse', 'HEAD');
    runCommand(['answer', '134', 'd1', 'done', '--no-commit'], { root: a.dir, ...silent });
    expect(a.g('rev-parse', 'HEAD')).toBe(head);
    const b = copyRepo(true);
    b.g('config', '--unset', 'user.name');
    const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', HOME: b.dir };
    const saved = { ...process.env };
    Object.assign(process.env, env);
    try {
      expect(commitCheck(b.dir, find134(b.dir)).why).toMatch(/name and email/);
    } finally {
      for (const k of Object.keys(env)) { if (k in saved) process.env[k] = saved[k]; else delete process.env[k]; }
    }
  });
  it('a refused edit makes no commit and no change', () => {
    const { dir, g } = copyRepo(true);
    const head = g('rev-parse', 'HEAD');
    expect(runCommand(['answer', '134', 'd1', 'nope'], { root: dir, ...silent })).toBe(1);
    expect(g('rev-parse', 'HEAD')).toBe(head);
    expect(g('status', '--porcelain').trim()).toBe('');
  });
});

describe('parseArgs', () => {
  it('collects repeated options and rejects unknown flags', () => {
    expect(parseArgs(['ask', '1', 'q', '--option', 'a', '--option', 'b']).flags.option).toEqual(['a', 'b']);
    expect(parseArgs(['--nope']).error).toMatch(/--nope/);
    expect(parseArgs(['--why']).error).toMatch(/needs a value/);
  });
});
