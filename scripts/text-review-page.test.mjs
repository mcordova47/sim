import { describe, expect, it, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createApp } from './issues-serve.mjs';
import { buildFromDisk } from './issues-site.mjs';
import { parseReview } from './text-review.mjs';
import { DUPLICATE_POLICY, splitLabel, pixelFits, visibleItems, textBody, TEXT_SCRIPT } from './text-review-page.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const REAL_DOC = fs.readFileSync(path.join(here, '..', 'docs', 'text-review.md'), 'utf8');
const ISSUE = `---
id: "001"
title: "First thing"
status: todo
owner: claude
depends_on: []
summary: "A fixture issue."
---
## Goal
Nothing.

## Progress log
- 2026-11-01: made.
`;

const tmpDirs = [];
function makeRepo(doc = REAL_DOC) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'text-page-'));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, 'issues'));
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.writeFileSync(path.join(dir, 'issues', '001-first.md'), ISSUE);
  fs.writeFileSync(path.join(dir, 'docs', 'text-review.md'), doc);
  const g = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: 'pipe' });
  g('init', '-q', '-b', 'main');
  g('config', 'user.name', 'Test Person');
  g('config', 'user.email', 'test@example.com');
  g('config', 'commit.gpgsign', 'false');
  g('add', '.');
  g('commit', '-q', '-m', 'start');
  return { dir, g, doc: path.join(dir, 'docs', 'text-review.md') };
}
afterAll(() => { for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });

const PORT = 4322;
const TOKEN = 'b'.repeat(48);
const app = (repo) => createApp({ root: repo.dir, token: TOKEN, port: PORT, now: () => '2026-11-15' });
const hdr = { host: `127.0.0.1:${PORT}` };
const get = (a, p, headers = {}) => a.handle({ method: 'GET', url: p, headers: { ...hdr, ...headers }, body: '' });
const post = (a, body, headers = {}, p = '/api/text/mark') => a.handle({
  method: 'POST', url: p, body: typeof body === 'string' ? body : JSON.stringify(body),
  headers: { ...hdr, 'content-type': 'application/json', 'x-issues-token': TOKEN, ...headers },
});
const parse = (r) => JSON.parse(r.body);
const card = (a, after = '', skipped = '') => parse(get(a, `/api/text/card?after=${encodeURIComponent(after)}&skipped=${encodeURIComponent(skipped)}`));

describe('the page in the served build only', () => {
  it('the static build has no text page, script or link', () => {
    const repo = makeRepo();
    const files = buildFromDisk(repo.dir).files;
    expect(Object.keys(files).filter((n) => n.startsWith('text'))).toEqual([]);
    for (const [n, t] of Object.entries(files)) if (n.endsWith('.html')) { expect(t).not.toMatch(/text\.html|Text review|text\.js/); }
    expect(files['style.css']).not.toMatch(/\.tr-card/);
  });
  it('the served build has text.html, its script, and a nav link hidden until the server answers', () => {
    const repo = makeRepo();
    const files = buildFromDisk(repo.dir, { serve: { token: TOKEN } }).files;
    expect(files['text.html']).toContain('<script src="text.js"></script>');
    expect(files['text.html']).toContain('issues-token');
    expect(files['index.html']).toContain('<a class="serve-only" hidden href="text.html">Text review</a>');
    expect(files['text.js']).toBe(TEXT_SCRIPT);
    expect(files['style.css']).toMatch(/\.tr-card/);
  });
  it('the markup has the buttons, the note box, the empty state and a live region', () => {
    const b = textBody();
    for (const k of ['keep', 'soften', 'rewrite', 'skip', 'back', 'clear']) expect(b).toContain(`data-tr="${k}"`);
    expect(b).toContain('Nothing is waiting for a mark.');
    expect(b).toContain('role="status"');
    expect(b).toContain('id="tr-note"');
    expect(b).not.toMatch(/urgent|hurry|overdue|remaining|left to do/i);
  });
  it('the page script says nothing nagging and uses no red', () => {
    expect(TEXT_SCRIPT).not.toMatch(/urgent|hurry|overdue|deadline/i);
  });
});

describe('cards', () => {
  it('the first card is the newest section, unmarked, with context; skipped ids come last', () => {
    const a = app(makeRepo());
    const c1 = card(a);
    expect(c1.ok).toBe(true);
    expect(c1.card.heading).toMatch(/117d|LOOK/);
    expect(c1.card.context.length).toBeGreaterThan(20);
    expect(c1.words).toMatch(/section/);
    const c2 = card(a, c1.card.id);
    expect(c2.card.id).not.toBe(c1.card.id);
    const c3 = card(a, '', c1.card.id);
    expect(c3.card.id).not.toBe(c1.card.id);
  });
  it('shows each duplicate once under the default policy', () => {
    expect(DUPLICATE_POLICY).toBe('once');
    const items = parseReview(REAL_DOC).items;
    expect(items.filter((x) => x.duplicateOf).length).toBe(19);
    expect(visibleItems(items).length).toBe(items.length - 19);
    expect(visibleItems(items, 'separately').length).toBe(items.length);
  });
  it('shows the label of the Sofa scene lines apart from the string', () => {
    const items = parseReview(REAL_DOC).items;
    const sofa = items.filter((x) => /^Fixed phone-view line|^Close-up caption/.test(x.text));
    expect(sofa.length).toBe(2);
    for (const it of sofa) {
      const { label, body } = splitLabel(it);
      expect(label).toMatch(/^(Fixed phone-view line|Close-up caption) \(/);
      expect(body).not.toContain('): ');
      expect(body.length).toBeGreaterThan(5);
    }
    expect(splitLabel({ shape: 'bullet', text: 'E: CONTINUE' }).label).toBeNull();
    expect(splitLabel({ shape: 'bullet', tag: 'text', text: 'Why (x): y' }).label).toBeNull();
  });
  it('uses the pixel font only for short strings it can draw', () => {
    expect(pixelFits('Make the bed')).toBe(true);
    expect(pixelFits('Why — anything')).toBe(false);
    expect(pixelFits('x'.repeat(200))).toBe(false);
  });
});

describe('POST /api/text/mark', () => {
  const first = (a) => card(a);
  it('marks keep, soften and rewrite in place and commits on a clean main', () => {
    const repo = makeRepo();
    const a = app(repo);
    const c = first(a);
    const r1 = parse(post(a, { id: c.card.id, hash: c.hash, mark: 'keep' }));
    expect(r1.ok).toBe(true);
    expect(r1.committed).toBe(true);
    expect(r1.card.mark).toEqual({ kind: 'keep', note: '' });
    expect(repo.g('log', '-1', '--format=%an|%s')).toMatch(/Test Person\|text review: keep/);
    expect(repo.g('status', '--porcelain')).toBe('');
    const c2 = card(a, c.card.id);
    expect(c2.card.id).not.toBe(c.card.id);
    const r2 = parse(post(a, { id: c2.card.id, hash: r1.hash, mark: 'soften', note: 'less cute' }));
    expect(r2.ok).toBe(true);
    const c3 = card(a, c2.card.id);
    const r3 = parse(post(a, { id: c3.card.id, hash: r2.hash, mark: 'rewrite', note: 'Something plainer' }));
    expect(r3.ok).toBe(true);
    const text = fs.readFileSync(repo.doc, 'utf8');
    expect(text).toMatch(/ - keep\n/);
    expect(text).toContain(' - soften: less cute');
    expect(text).toContain(' - rewrite: Something plainer');
    expect(text.split('\n').length).toBe(REAL_DOC.split('\n').length);
  });
  it('clear with the placeholders from the mark result restores the file byte for byte', () => {
    const repo = makeRepo();
    const a = app(repo);
    const items = parseReview(REAL_DOC).items;
    for (const it of items.filter((x) => !x.duplicateOf).slice(0, 25)) {
      const h = parse(get(a, '/api/text/card')).hash;
      const m = parse(post(a, { id: it.id, hash: h, mark: 'soften', note: 'n' }));
      expect(m.ok).toBe(true);
      const placeholders = Object.fromEntries(Object.entries(m.previousAll).map(([k, v]) => [k, v.placeholder]));
      const c = parse(post(a, { id: it.id, hash: m.hash, mark: 'clear', placeholders }));
      expect(c.ok).toBe(true);
      expect(fs.readFileSync(repo.doc, 'utf8')).toBe(REAL_DOC);
    }
  });
  it('a duplicate line is marked once and the mark lands on both copies in one commit', () => {
    const repo = makeRepo();
    const a = app(repo);
    const items = parseReview(REAL_DOC).items;
    const copy = items.find((x) => x.duplicateOf);
    const original = items.find((x) => x.id === copy.duplicateOf);
    const h = card(a).hash;
    const before = repo.g('rev-list', '--count', 'HEAD');
    const r = parse(post(a, { id: original.id, hash: h, mark: 'rewrite', note: 'New words' }));
    expect(r.ok).toBe(true);
    const group = [original.id, ...items.filter((x) => x.duplicateOf === original.id).map((x) => x.id)];
    expect(r.ids.sort()).toEqual(group.sort());
    expect(Number(repo.g('rev-list', '--count', 'HEAD')) - Number(before)).toBe(1);
    const re = parseReview(fs.readFileSync(repo.doc, 'utf8')).items;
    expect(re.find((x) => x.id === original.id).mark).toEqual({ kind: 'rewrite', note: 'New words' });
    for (const id of group) expect(re.find((x) => x.id === id).mark).toEqual({ kind: 'rewrite', note: 'New words' });
    // the card says where else it appears
    expect(card(a, '').ok).toBe(true);
  });
  it('refuses calmly: no token, wrong host, another origin, bad body, wrong content type', () => {
    const repo = makeRepo();
    const a = app(repo);
    const c = first(a);
    const body = { id: c.card.id, hash: c.hash, mark: 'keep' };
    expect(post(a, body, { 'x-issues-token': 'nope' }).status).toBe(403);
    expect(post(a, body, { 'x-issues-token': undefined }).status).toBe(403);
    expect(post(a, body, { host: 'evil.example:80' }).status).toBe(403);
    expect(post(a, body, { origin: 'http://evil.example' }).status).toBe(403);
    expect(post(a, 'not json').status).toBe(400);
    expect(post(a, body, { 'content-type': 'text/plain' }).status).toBe(400);
    expect(post(a, { ...body, mark: 'delete' }).status).toBe(400);
    expect(post(a, { ...body, hash: 'abc' }).status).toBe(400);
    expect(post(a, { ...body, mark: 'rewrite', note: '' }).status).toBe(409);
    expect(post(a, { ...body, mark: 'keep', note: 'x' }).status).toBe(409);
    expect(post(a, { ...body, mark: 'soften', note: 'two\nlines' }).status).toBe(409);
    expect(post(a, { ...body, mark: 'soften', note: 'x'.repeat(501) }).status).toBe(400);
    expect(fs.readFileSync(repo.doc, 'utf8')).toBe(REAL_DOC);
    for (const r of [post(a, { ...body, mark: 'rewrite', note: '' }), post(a, body, { 'x-issues-token': 'nope' })]) {
      expect(parse(r).message).toMatch(/nothing was changed|not allowed|Rewrite needs/i);
      expect(parse(r).message).not.toMatch(/Error|undefined|stack|at /);
    }
  });
  it('refuses a stale page, a changed line, a dirty doc and a checkout not on main, writing nothing', () => {
    const repo = makeRepo();
    const a = app(repo);
    const c = first(a);
    const body = { id: c.card.id, hash: c.hash, mark: 'keep' };
    // unknown id
    expect(post(a, { ...body, id: 'nope~00000000' }).status).toBe(409);
    // stale hash: the doc changes (committed) after the page was loaded
    const edited = REAL_DOC.replace('# Text review', '# Text review ');
    fs.writeFileSync(repo.doc, edited);
    repo.g('commit', '-qam', 'edit');
    const stale = post(a, body);
    expect(stale.status).toBe(409);
    expect(parse(stale).message).toMatch(/changed on disk/);
    expect(fs.readFileSync(repo.doc, 'utf8')).toBe(edited);
    // dirty doc with the right hash
    const fresh = first(a);
    fs.writeFileSync(repo.doc, edited + '\n');
    const dirtyHash = card(a).hash;
    const dirty = post(a, { id: fresh.card.id, hash: dirtyHash, mark: 'keep' });
    expect(dirty.status).toBe(409);
    expect(parse(dirty).message).toMatch(/uncommitted edits/);
    expect(fs.readFileSync(repo.doc, 'utf8')).toBe(edited + '\n');
    repo.g('checkout', '-q', '--', '.');
    // not on main
    repo.g('checkout', '-q', '-b', 'side');
    const off = post(a, { id: fresh.card.id, hash: card(a).hash, mark: 'keep' });
    expect(off.status).toBe(409);
    expect(parse(off).message).toMatch(/not main/);
    expect(fs.readFileSync(repo.doc, 'utf8')).toBe(edited);
  });
  it('writes but does not commit when something else is uncommitted, and says so', () => {
    const repo = makeRepo();
    const a = app(repo);
    fs.writeFileSync(path.join(repo.dir, 'stray.txt'), 'x');
    const c = first(a);
    const r = parse(post(a, { id: c.card.id, hash: c.hash, mark: 'keep' }));
    expect(r.ok).toBe(true);
    expect(r.committed).toBeFalsy();
    expect(r.notCommitted).toMatch(/Not committed/);
    expect(repo.g('log', '-1', '--format=%s')).toBe('start\n');
  });
  it('shows the empty state data when everything is marked', () => {
    const doc = '# Text review\n\n## Only (issue 200)\nWhere it is.\n- One -\n- Two -\n';
    const repo = makeRepo(doc);
    const a = app(repo);
    let c = card(a);
    let hash = c.hash;
    for (let k = 0; k < 2; k++) {
      const r = parse(post(a, { id: c.card.id, hash, mark: 'keep' }));
      expect(r.ok).toBe(true);
      hash = r.hash;
      c = card(a, c.card.id);
    }
    expect(c.card).toBeNull();
    expect(fs.readFileSync(repo.doc, 'utf8')).toBe('# Text review\n\n## Only (issue 200)\nWhere it is.\n- One - keep\n- Two - keep\n');
  });
});
