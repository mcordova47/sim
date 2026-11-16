import { describe, expect, it, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { execFileSync } from 'node:child_process';
import { createApp, startServer } from './issues-serve.mjs';
import { hashOf, runCommand } from './issues-edit-io.mjs';
import { buildFromDisk } from './issues-site.mjs';

const FM = `---
id: "001"
title: "First thing"
status: todo
owner: claude
depends_on: []
summary: "A fixture issue."
needs: [{who: marc, kind: try, why: "Try the first thing", since: 2026-11-01}, {who: marc, kind: do, why: "Do the second thing", since: 2026-11-02}]
decisions:
  - id: d1
    who: marc
    q: "Which one?"
    options:
      - "Alpha"
      - "Beta"
    status: open
  - id: d2
    who: marc
    q: "Another?"
    status: open
  - id: d3
    who: marc
    q: "A third?"
    status: open
---
## Goal
Nothing.

## Progress log
- 2026-11-01: made.
`;

const tmpDirs = [];
function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'issues-serve-'));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, 'issues'));
  fs.writeFileSync(path.join(dir, 'issues', '001-first.md'), FM);
  const g = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: 'pipe' });
  g('init', '-q', '-b', 'main');
  g('config', 'user.name', 'Test Person');
  g('config', 'user.email', 'test@example.com');
  g('config', 'commit.gpgsign', 'false');
  g('add', '.');
  g('commit', '-q', '-m', 'start');
  return { dir, g, file: path.join(dir, 'issues', '001-first.md') };
}
afterAll(() => { for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });

const PORT = 4321;
const TOKEN = 'a'.repeat(48);
function app(repo, extra = {}) {
  return createApp({ root: repo.dir, token: TOKEN, port: PORT, now: () => '2026-11-15', ...extra });
}
const get = (a, p, headers = {}) => a.handle({ method: 'GET', url: p, headers: { host: `127.0.0.1:${PORT}`, ...headers }, body: '' });
const post = (a, p, body, headers = {}) => a.handle({
  method: 'POST', url: p, body: typeof body === 'string' ? body : JSON.stringify(body),
  headers: { host: `127.0.0.1:${PORT}`, 'content-type': 'application/json', 'x-issues-token': TOKEN, ...headers },
});
const parse = (r) => JSON.parse(r.body);
const hashNow = (repo) => hashOf(fs.readFileSync(repo.file, 'utf8'));

describe('the page markup', () => {
  it('has no controls, token or script without the server (the static build)', () => {
    const repo = makeRepo();
    const files = buildFromDisk(repo.dir).files;
    for (const [name, text] of Object.entries(files)) {
      if (!name.endsWith('.html')) continue;
      expect(text).not.toMatch(/serve-only|issues-token|serve\.js|answer-form/);
    }
    expect(files['serve.js']).toBeUndefined();
    expect(files['style.css']).not.toContain('.answer-form');
  });
  it('with the server: answer form on open decisions, Resolve on needs, token, hash, script', () => {
    const repo = makeRepo();
    const a = app(repo);
    const page = get(a, '/issue-001.html').body;
    expect(page).toContain(`<meta name="issues-token" content="${TOKEN}">`);
    expect(page).toContain('<script src="serve.js"></script>');
    expect(page).toContain(`data-hash="${hashNow(repo)}"`);
    expect((page.match(/class="answer serve-only"/g) || []).length).toBe(3);
    expect((page.match(/data-act="resolve"/g) || []).length).toBe(2);
    expect(page).toContain('type="radio"');
    expect(get(a, '/style.css').body).toContain('.answer-form');
    expect(get(a, '/serve.js').status).toBe(200);
    expect(get(a, '/decisions.html').body).toContain('data-act="drop"');
    // Everything shown is controlled markup: the controls start hidden until the server answers.
    expect(page).toMatch(/serve-only" hidden/);
  });
  it('does not show controls on an answered decision', () => {
    const repo = makeRepo();
    const a = app(repo);
    const h = hashNow(repo);
    expect(post(a, '/api/answer', { issue: '001', decision: 'd1', hash: h, answer: 'Alpha' }).status).toBe(200);
    const page = get(a, '/issue-001.html').body;
    expect((page.match(/class="answer serve-only"/g) || []).length).toBe(2);
  });
});

describe('the POST handler', () => {
  it('answers a decision exactly as the command does, commits only that file, and rebuilds', () => {
    const repo = makeRepo();
    const a = app(repo);
    const h = hashNow(repo);
    const r = post(a, '/api/answer', { issue: '001', decision: 'd1', hash: h, answer: 'Beta' });
    expect(r.status).toBe(200);
    const j = parse(r);
    expect(j.ok).toBe(true);
    expect(j.committed).toBe(true);
    expect(j.hash).toBe(hashNow(repo));
    const text = fs.readFileSync(repo.file, 'utf8');
    expect(text).toContain('    status: answered\n    answer: "Beta"\n    by: marc\n    on: 2026-11-15\n');
    expect(repo.g('log', '-1', '--format=%an|%s')).toBe('Test Person|001: answered d1\n');
    expect(repo.g('status', '--porcelain')).toBe('');
    expect(get(a, '/decisions.html').body).toContain('Beta');
  });
  it('free text needs other: an answer that is not an option is refused otherwise', () => {
    const repo = makeRepo();
    const a = app(repo);
    const h = hashNow(repo);
    const r = post(a, '/api/answer', { issue: '001', decision: 'd1', hash: h, answer: 'Gamma' });
    expect(r.status).toBe(409);
    expect(hashNow(repo)).toBe(h);
    const ok = post(a, '/api/answer', { issue: '001', decision: 'd1', hash: h, answer: 'Gamma', other: true });
    expect(ok.status).toBe(200);
    expect(fs.readFileSync(repo.file, 'utf8')).toContain('answer: "Gamma"');
  });
  it('drops and defers with an optional note; defer keeps it open', () => {
    const repo = makeRepo();
    const a = app(repo);
    let h = hashNow(repo);
    expect(post(a, '/api/drop', { issue: '001', decision: 'd2', hash: h, note: 'no longer needed' }).status).toBe(200);
    h = hashNow(repo);
    expect(post(a, '/api/defer', { issue: '001', decision: 'd3', hash: h, note: 'later' }).status).toBe(200);
    const t = fs.readFileSync(repo.file, 'utf8');
    expect(t).toMatch(/id: d2[\s\S]*status: dropped[\s\S]*note: "no longer needed"/);
    expect(t).toMatch(/id: d3[\s\S]*status: open[\s\S]*note: "Deferred 2026-11-15: later"/);
    expect(repo.g('log', '--format=%s', '-3')).toBe('001: deferred d3\n001: dropped d2\nstart\n');
  });
  it('resolves a need by number', () => {
    const repo = makeRepo();
    const a = app(repo);
    const r = post(a, '/api/resolve', { issue: '001', need: 1, hash: hashNow(repo) });
    expect(r.status).toBe(200);
    const t = fs.readFileSync(repo.file, 'utf8');
    expect(t).not.toContain('Try the first thing');
    expect(t).toContain('Do the second thing');
    expect(repo.g('log', '-1', '--format=%s')).toBe('001: resolved a try need\n');
    // the command makes the same commit message
    const other = makeRepo();
    runCommand(['need', 'resolve', '001', '1'], { root: other.dir, out: () => {}, err: () => {} });
    expect(other.g('log', '-1', '--format=%s')).toBe(repo.g('log', '-1', '--format=%s'));
  });
  it('refuses a missing or wrong token, writing nothing', () => {
    const repo = makeRepo();
    const a = app(repo);
    const h = hashNow(repo);
    const body = { issue: '001', decision: 'd1', hash: h, answer: 'Alpha' };
    const none = a.handle({ method: 'POST', url: '/api/answer', body: JSON.stringify(body), headers: { host: `127.0.0.1:${PORT}`, 'content-type': 'application/json' } });
    expect(none.status).toBe(403);
    expect(post(a, '/api/answer', body, { 'x-issues-token': 'b'.repeat(48) }).status).toBe(403);
    expect(post(a, '/api/answer', body, { 'x-issues-token': '' }).status).toBe(403);
    expect(hashNow(repo)).toBe(h);
    expect(repo.g('log', '--format=%s')).toBe('start\n');
  });
  it('refuses another origin and another host', () => {
    const repo = makeRepo();
    const a = app(repo);
    const body = { issue: '001', decision: 'd1', hash: hashNow(repo), answer: 'Alpha' };
    expect(post(a, '/api/answer', body, { origin: 'https://example.com' }).status).toBe(403);
    expect(post(a, '/api/answer', body, { host: 'evil.example:4321' }).status).toBe(403);
    expect(get(a, '/', { host: 'evil.example' }).status).toBe(403);
    expect(post(a, '/api/answer', body, { origin: `http://127.0.0.1:${PORT}` }).status).toBe(200);
  });
  it('refuses a stale page (the file changed since it was built), with a plain message', () => {
    const repo = makeRepo();
    const a = app(repo);
    const h = hashNow(repo);
    fs.writeFileSync(repo.file, FM.replace('Nothing.', 'Something else.'));
    repo.g('commit', '-qam', 'edit elsewhere');
    const r = post(a, '/api/answer', { issue: '001', decision: 'd1', hash: h, answer: 'Alpha' });
    expect(r.status).toBe(409);
    expect(parse(r).message).toMatch(/changed on disk since this page was built, so nothing was changed/);
    expect(fs.readFileSync(repo.file, 'utf8')).toContain('status: open');
  });
  it('refuses when the file has uncommitted edits (even if the page matches)', () => {
    const repo = makeRepo();
    fs.writeFileSync(repo.file, FM.replace('Nothing.', 'Edited by hand.'));
    const a = app(repo);
    const r = post(a, '/api/answer', { issue: '001', decision: 'd1', hash: hashNow(repo), answer: 'Alpha' });
    expect(r.status).toBe(409);
    expect(parse(r).message).toMatch(/uncommitted edits, so nothing was changed/);
    expect(fs.readFileSync(repo.file, 'utf8')).not.toContain('answered');
  });
  it('refuses when the checkout is not on main', () => {
    const repo = makeRepo();
    const a = app(repo);
    repo.g('checkout', '-q', '-b', 'topic');
    const r = post(a, '/api/answer', { issue: '001', decision: 'd1', hash: hashNow(repo), answer: 'Alpha' });
    expect(r.status).toBe(409);
    expect(parse(r).message).toMatch(/on topic, not main, so nothing was changed/);
    expect(repo.g('status', '--porcelain')).toBe('');
  });
  it('edits but does not commit when another file is dirty (the command rule), and says why', () => {
    const repo = makeRepo();
    const a = app(repo);
    fs.writeFileSync(path.join(repo.dir, 'other.txt'), 'x');
    const r = parse(post(a, '/api/answer', { issue: '001', decision: 'd1', hash: hashNow(repo), answer: 'Alpha' }));
    expect(r.ok).toBe(true);
    expect(r.committed).toBe(false);
    expect(r.notCommitted).toMatch(/Not committed: the checkout has uncommitted changes/);
    expect(repo.g('log', '--format=%s')).toBe('start\n');
  });
  it('refuses unknown things and bad requests plainly, writing nothing', () => {
    const repo = makeRepo();
    const a = app(repo);
    const h = hashNow(repo);
    expect(parse(post(a, '/api/answer', { issue: '999', decision: 'd1', hash: h, answer: 'x' })).message).toMatch(/no issue 999/);
    expect(parse(post(a, '/api/answer', { issue: '001', decision: 'd9', hash: h, answer: 'Alpha' })).ok).toBe(false);
    expect(post(a, '/api/answer', { issue: '001', decision: 'd1', answer: 'Alpha' }).status).toBe(400);
    expect(parse(post(a, '/api/answer', { issue: '../x', decision: 'd1', hash: h, answer: 'Alpha' })).ok).toBe(false);
    expect(post(a, '/api/answer', 'not json').status).toBe(400);
    expect(post(a, '/api/answer', '[1]').status).toBe(400);
    expect(post(a, '/api/answer', { issue: '001', decision: 'd1', hash: h, answer: '' }).status).toBe(400);
    expect(parse(post(a, '/api/resolve', { issue: '001', need: 9, hash: h })).ok).toBe(false);
    expect(post(a, '/api/resolve', { issue: '001', need: 'one', hash: h }).status).toBe(400);
    expect(post(a, '/api/nothing', {}).status).toBe(404);
    expect(post(a, '/api/answer', { issue: '001', decision: 'd1', hash: h, answer: 'Alpha\nBeta', other: true }).status).toBe(409);
    expect(hashNow(repo)).toBe(h);
    expect(repo.g('log', '--format=%s')).toBe('start\n');
  });
  it('a second answer from the same stale page is refused (the hash moved)', () => {
    const repo = makeRepo();
    const a = app(repo);
    const h = hashNow(repo);
    expect(post(a, '/api/answer', { issue: '001', decision: 'd1', hash: h, answer: 'Alpha' }).status).toBe(200);
    expect(post(a, '/api/drop', { issue: '001', decision: 'd2', hash: h }).status).toBe(409);
  });
});

describe('what is served', () => {
  it('serves only generated pages: no file by path, no traversal, no directory listing', () => {
    const repo = makeRepo();
    fs.writeFileSync(path.join(repo.dir, 'secret.txt'), 'private');
    const a = app(repo);
    for (const p of ['/secret.txt', '/../secret.txt', '/%2e%2e/secret.txt', '/issues/001-first.md', '/package.json', '/.git/config', '/issues/', '/api/answer']) {
      expect(get(a, p).status, p).toBe(404);
    }
    expect(get(a, '/').status).toBe(200);
    expect(a.handle({ method: 'DELETE', url: '/', headers: { host: `127.0.0.1:${PORT}` }, body: '' }).status).toBe(405);
  });
});

describe('a real server', () => {
  it('listens on 127.0.0.1 only, on a random port, and checks the token over HTTP', async () => {
    const repo = makeRepo();
    const s = await startServer({ root: repo.dir, log: () => {} });
    try {
      const addr = s.server.address();
      expect(addr.address).toBe('127.0.0.1');
      expect(addr.port).toBeGreaterThan(0);
      // Not reachable through any other local address.
      const others = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && i.address !== '127.0.0.1').map((i) => i.address);
      for (const ip of others.slice(0, 3)) {
        const refused = await new Promise((resolve) => {
          const c = net.connect({ host: ip, port: addr.port, timeout: 1500 });
          c.on('connect', () => { c.destroy(); resolve(false); });
          c.on('error', () => resolve(true));
          c.on('timeout', () => { c.destroy(); resolve(true); });
        });
        expect(refused, ip).toBe(true);
      }
      const page = await (await fetch(s.url)).text();
      const token = page.match(/issues-token" content="([0-9a-f]+)"/)[1];
      expect(token).toBe(s.token);
      expect(token.length).toBe(48);
      const h = hashNow(repo);
      const body = JSON.stringify({ issue: '001', decision: 'd1', hash: h, answer: 'Alpha' });
      const bad = await fetch(`${s.url}api/answer`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-issues-token': 'nope' }, body });
      expect(bad.status).toBe(403);
      const missing = await fetch(`${s.url}api/answer`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
      expect(missing.status).toBe(403);
      expect(hashNow(repo)).toBe(h);
      const good = await fetch(`${s.url}api/answer`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-issues-token': token }, body });
      expect(good.status).toBe(200);
      const big = await fetch(`${s.url}api/answer`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-issues-token': token }, body: 'x'.repeat(50000) }).catch(() => ({ status: 413 }));
      expect(big.status).toBe(413);
      expect(good.headers.get('content-security-policy')).toContain("default-src 'none'");
    } finally { await s.close(); }
  });
  it('a second run has a different token', async () => {
    const repo = makeRepo();
    const a = await startServer({ root: repo.dir, log: () => {} });
    const b = await startServer({ root: repo.dir, log: () => {} });
    try { expect(a.token).not.toBe(b.token); expect(a.port).not.toBe(b.port); } finally { await a.close(); await b.close(); }
  });
});
