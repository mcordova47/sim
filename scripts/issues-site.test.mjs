import { describe, expect, it } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  analyze, loadFiles, buildModel, issuesJson, firstSentence, parseSections, headingRole,
  orderSections, logEntries, NEEDS_KIND,
} from './issues.mjs';
import { buildSite, markdown, inline, recentlyShipped, esc } from './issues-site.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = (id, extra = {}, body = '## Goal\ng\n') => {
  const fm = { id, title: `Title ${id}`, status: 'todo', owner: 'claude', depends_on: '[]', ...extra };
  return { name: `${id}-x.md`, text: ['---', ...Object.entries(fm).map(([k, v]) => `${k}: ${v}`), '---', body].join('\n') };
};
const run = (...fs_) => analyze(fs_);
const msgs = (r) => r.errors.map((e) => e.message).join('|');
const git = { commit: 'abc1234', date: '2026-11-15', branch: 'main', dirty: false, merges: [] };
const NEED = '[{who: marc, kind: try, why: "Run it", since: 2026-11-01}]';

describe('new field validation', () => {
  it('accepts a good summary, kind, needs and unverified', () => {
    const r = run(file('001', { summary: '"A headline"', kind: 'build', needs: NEED, unverified: '["Safari"]' }));
    expect(r.errors).toEqual([]);
  });
  it('warns about a long summary and a missing summary on work in progress, never fails', () => {
    const r = run(file('001', { summary: `"${'x'.repeat(130)}"` }), file('002', { status: 'review' }), file('003'));
    expect(r.errors).toEqual([]);
    const w = r.warnings.map((x) => x.message).join('|');
    expect(w).toMatch(/summary is 130 characters/);
    expect(w).toMatch(/002 has no summary/);
    expect(w).not.toMatch(/003 has no summary/);
  });
  it('rejects a kind outside the closed set', () => {
    expect(msgs(run(file('001', { kind: 'epic' })))).toMatch(/kind "epic" is not one of/);
  });
  it('rejects bad needs: who, kind, why, since, shape, and a wait without on', () => {
    expect(msgs(run(file('001', { needs: '[{who: bob, kind: try, why: "x", since: 2026-11-01}]' })))).toMatch(/who "bob"/);
    expect(msgs(run(file('001', { needs: '[{who: marc, kind: later, why: "x", since: 2026-11-01}]' })))).toMatch(/kind "later"/);
    expect(msgs(run(file('001', { needs: '[{who: marc, kind: try, why: "", since: 2026-11-01}]' })))).toMatch(/why must be/);
    expect(msgs(run(file('001', { needs: '[{who: marc, kind: try, why: "x", since: yesterday}]' })))).toMatch(/since must be a date/);
    expect(msgs(run(file('001', { needs: 'soon' })))).toMatch(/needs must be a list/);
    expect(msgs(run(file('001', { needs: '[{who: other, kind: wait, why: "x", since: 2026-11-01}]' })))).toMatch(/waits on/);
    expect(NEEDS_KIND).toEqual(['decide', 'do', 'try', 'review', 'wait']);
  });
  it('rejects unverified that is not a list of text', () => {
    expect(msgs(run(file('001', { unverified: 'Safari' })))).toMatch(/unverified must be a list/);
  });
  it('checks superseded_by and thread targets, and warns about needs on a done issue', () => {
    expect(msgs(run(file('001', { superseded_by: '009' })))).toMatch(/does not exist/);
    const r = run(file('001', { status: 'done', needs: NEED }));
    expect(r.errors).toEqual([]);
    expect(r.warnings.map((w) => w.message).join()).toMatch(/done but still lists needs/);
  });
});

describe('derived thread status and pills', () => {
  const pill = (files, id) => buildModel(run(...files).issues).threads.find((t) => t.id === id).pill;
  it('Shipped when every member is done, ignoring the root own status', () => {
    expect(pill([file('001', { status: 'todo' }), file('001a', { status: 'done' }), file('001b', { status: 'done' })], '001')).toBe('Shipped');
  });
  it('Planned when every member is todo', () => {
    expect(pill([file('001', { status: 'done' }), file('001a'), file('001b')], '001')).toBe('Planned');
  });
  it('Paused when everything not done is blocked', () => {
    expect(pill([file('001'), file('001a', { status: 'done' }), file('001b', { status: 'blocked' })], '001')).toBe('Paused');
  });
  it('In progress otherwise, and for review or in-progress', () => {
    expect(pill([file('001', { status: 'done' }), file('001a', { status: 'done' }), file('001b')], '001')).toBe('In progress');
    expect(pill([file('001', { status: 'done' }), file('001a', { status: 'review' })], '001')).toBe('In progress');
  });
  it('leaves out superseded members; a lone issue is a thread of one from its own status', () => {
    expect(pill([file('001', { status: 'done' }), file('001a', { status: 'done' }), file('001b', { superseded_by: '001a' })], '001')).toBe('Shipped');
    expect(pill([file('005', { status: 'review' })], '005')).toBe('In progress');
  });
  it('an explicit thread field groups an issue under a root with no shared id', () => {
    const m = buildModel(run(file('050', { status: 'done' }), file('060', { thread: '"050"', status: 'todo' })).issues);
    expect(m.threads.map((t) => t.id)).toEqual(['050']);
    expect(m.threadOf.get('060').id).toBe('050');
  });
  it('words the progress and orders needs newest first, marc separate from the rest', () => {
    const files = [file('001', { status: 'done' }), file('001a', { status: 'done' }), file('001b'),
      file('002', { needs: '[{who: marc, kind: do, why: "old", since: 2026-10-01}, {who: marc, kind: try, why: "new", since: 2026-11-05}, {who: other, kind: wait, why: "w", on: "x", since: 2026-11-06}]' })];
    const m = buildModel(run(...files).issues);
    expect(m.threads.find((t) => t.id === '001').progress).toBe('one of two shipped');
    expect(m.forMarc.map((n) => n.why)).toEqual(['new', 'old']);
    expect(m.elsewhere.map((n) => n.why)).toEqual(['w']);
    expect(m.unblocks.size).toBe(0);
  });
  it('computes unblocks', () => {
    const m = buildModel(run(file('001'), file('002', { depends_on: '[001]' })).issues);
    expect(m.unblocks.get('001')).toEqual(['002']);
  });
});

describe('body parsing', () => {
  it('takes a first sentence without markup, cut near the limit', () => {
    expect(firstSentence('**Verdict: approve.** More words here.')).toBe('Verdict: approve.');
    expect(firstSentence('x '.repeat(200), 50).length).toBeLessThanOrEqual(51);
    expect(firstSentence('```\ncode\n```\nHello world, this is it. Next.')).toBe('Hello world, this is it.');
  });
  it('builds a heading tree, ignoring headings in fences', () => {
    const t = parseSections('intro\n## A\ntext\n### A1\nx\n```\n## no\n```\n## B\n');
    expect(t.intro).toBe('intro');
    expect(t.sections.map((s) => s.title)).toEqual(['A', 'B']);
    expect(t.sections[0].children.map((s) => s.title)).toEqual(['A1']);
    expect(t.sections[0].children[0].text).toContain('## no');
  });
  it('maps canonical headings to roles and orders them, unknown ones in file order', () => {
    expect(headingRole("Marc's answers")).toBe('decisions');
    expect(headingRole('Decisions made')).toBe('decisions');
    expect(headingRole('Whatever')).toBeNull();
    const o = orderSections(parseSections('## Progress log\n## Zeta\n## Goal\n## Alpha\n## Acceptance criteria\n').sections);
    expect(o.map((s) => s.title)).toEqual(['Goal', 'Acceptance criteria', 'Zeta', 'Alpha', 'Progress log']);
  });
  it('turns log bullets into leaves with a first sentence label', () => {
    const e = logEntries('- 2026-11-01 (claude): Did a thing. More.\n  - nested\n- second one');
    expect(e.length).toBe(2);
    expect(e[0].label).toBe('2026-11-01 (claude): Did a thing.');
    expect(e[0].body).toContain('nested');
  });
});

describe('markdown and escaping', () => {
  it('escapes html and never emits outside links', () => {
    expect(markdown('<script>x</script> [a](https://claude.ai/share/abc)')).not.toMatch(/<script|href/);
    expect(inline('[Go](issues/117g-gallery-pass.md)')).toBe('<a href="issue-117g.html">Go</a>');
    expect(inline('[Go](issues/999-nope.md)', new Set(['001']))).toBe('Go');
    expect(esc('a<"b">&')).toBe('a&lt;&quot;b&quot;&gt;&amp;');
  });
  it('renders lists, code, tables and headings', () => {
    const h = markdown('- a\n  - b\n\n```\n<x>\n```\n\n| h |\n|---|\n| c |\n\n#### Sub');
    expect(h).toMatch(/<ul><li>a<ul><li>b<\/li><\/ul><\/li><\/ul>/);
    expect(h).toContain('&lt;x&gt;');
    expect(h).toContain('<th>h</th>');
    expect(h).toContain('<h4>Sub</h4>');
  });
});

describe('recently shipped', () => {
  it('reads issue ids from merge subjects, newest first, once each', () => {
    const byId = new Map([['129', 1], ['091d', 1]]);
    const merges = [
      { sha: 'a', date: '2026-11-15', subject: 'Merge 129: x' }, { sha: 'b', date: '2026-11-14', subject: 'Merge 129: again' },
      { sha: 'c', date: '2026-10-29', subject: 'Merge 091d: y' }, { sha: 'd', date: '2026-10-01', subject: 'Merge branch main' },
    ];
    expect(recentlyShipped(merges, byId)).toEqual([{ id: '129', date: '2026-11-15' }, { id: '091d', date: '2026-10-29' }]);
  });
});

describe('the pages from fixtures', () => {
  const files = [
    file('001', { status: 'done', summary: '"Root headline"', short: '"Root"' }, '## Goal\nThe goal sentence. More.\n\n## Progress log\n- 2026-11-01: did it.\n'),
    file('001a', { status: 'done', summary: '"Part A"' }), file('001b', { summary: '"Part B"', unverified: '["Safari"]', needs: NEED }),
    file('002', { status: 'done' }),
  ];
  const site = buildSite(run(...files).issues, git);
  it('writes home, needs, threads, a thread page, issue pages, json and assets', () => {
    for (const n of ['index.html', 'needs.html', 'threads.html', 'thread-001.html', 'issue-001.html', 'issue-002.html', 'issues.json', 'style.css', 'site.js']) {
      expect(site[n], n).toBeTruthy();
    }
    expect(site['thread-002.html']).toBeUndefined();
  });
  it('home has the stamp naming the commit, a needs card and a thread card with a pill', () => {
    const h = site['index.html'];
    expect(h).toContain('main abc1234');
    expect(h).toContain('If it disagrees with GitHub, GitHub is right.');
    expect(h).toContain('Run it');
    expect(h).toContain('>Try<');
    expect(h).toContain('Root headline');
    expect(h).toContain('>In progress<');
  });
  it('an empty needs is the calm state, with no counts or urgency words', () => {
    const calm = buildSite(run(file('001')).issues, git);
    expect(calm['index.html']).toContain('Nothing is waiting on you.');
    expect(calm['needs.html']).toContain('Nothing is waiting on you.');
    for (const [n, t] of Object.entries(site)) {
      if (n.endsWith('.html')) expect(t, n).not.toMatch(/overdue|urgent!|ASAP|stale|blocked on you/i);
    }
  });
  it('a thread page has native details branches, one open, an open-everything button and prev/next', () => {
    const t = site['thread-001.html'];
    expect(t).toMatch(/<details name="branches" open>/);
    expect((t.match(/<details name="branches" open>/g) || []).length).toBe(1);
    expect(t).toContain('data-open-all');
    expect(t).toContain('What shipped');
    expect(t).toContain('Still open');
    expect(t).toContain('Safari');
    expect(t).toContain('issue-001a.html');
  });
  it('an issue page shows the heading tree with Goal first and open and the log last and closed', () => {
    const p = site['issue-001.html'];
    expect(p.indexOf('>Goal<')).toBeLessThan(p.indexOf('>Progress log<'));
    expect(p).toMatch(/<details name="top" open><summary><span class="role"[^>]*>\u25ce/);
    expect(p).toMatch(/<details name="top"><summary><span class="role"[^>]*>\u231b/);
    expect(p).toContain('2026-11-01: did it.');
  });
  it('the needs page groups by kind, and is the same data as the json', () => {
    expect(site['needs.html']).toContain('Try');
    const j = JSON.parse(site['issues.json']);
    expect(j.needs).toEqual([{ id: '001b', who: 'marc', kind: 'try', why: 'Run it', since: '2026-11-01' }]);
  });
  it('is deterministic', () => {
    expect(buildSite(run(...files).issues, git)).toEqual(site);
  });
});

describe('the real repo', () => {
  const { issues, errors } = analyze(loadFiles(path.join(root, 'issues')));
  const site = buildSite(issues, { ...git, commit: 'abc1234' });
  const json = site['issues.json'];
  it('builds without errors and has one page per issue', () => {
    expect(errors).toEqual([]);
    for (const i of issues) expect(site[`issue-${i.fm.id}.html`], i.fm.id).toBeTruthy();
  });
  it('issues.json is sorted, public-safe and has no absolute paths', () => {
    const j = JSON.parse(json);
    const ids = j.issues.map((i) => i.id);
    expect([...ids].sort()).toEqual(ids);
    expect(json).not.toMatch(/\/Users\/\w+\/|\/home\/\w+\/|C:\\\\|claude\.ai|@[a-z0-9-]+\.(com|org)/i);
    for (const i of j.issues) expect(i.file).toMatch(/^issues\/\d{3}[a-z]?-[^/]+\.md$/);
  });
  it('no generated page contains an absolute path, a share link or a script src outside the site', () => {
    for (const [n, t] of Object.entries(site)) {
      if (!n.endsWith('.html')) continue;
      expect(t, n).not.toMatch(/\/Users\/\w+\//);
      expect(t, n).not.toMatch(/(href|src)="https?:/);
    }
  });
  it('the real home has at least the seeded needs and every thread card has a pill', () => {
    const h = site['index.html'];
    expect(h).toContain('Run the workflow once to confirm it deploys');
    expect(fs.existsSync(path.join(root, 'reference-photos'))).toBe(fs.existsSync(path.join(root, 'reference-photos')));
  });
});
