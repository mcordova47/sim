// Issues API, stage 2 (issue 137): a small local server for the generated issue pages, with
// Answer controls that call the same tested edit functions as `npm run issues -- answer ...`.
//
//   npm run issues:serve                     build the pages, serve them on 127.0.0.1, open the browser
//   npm run issues:serve -- --no-open        same, without opening a browser
//   npm run issues:serve -- --root <dir>     serve another checkout (used by the tests, on copies)
//   npm run issues:serve -- --branches       also show branch work, as the static build does
//
// Safety, in short: it listens on 127.0.0.1 only; every write needs this run's token (which only the
// pages it serves carry); a write is refused if the issue file changed since the page was built, if the
// checkout is not on main, or if the file has uncommitted edits; it never pushes; and it serves only the
// generated pages and the few POST endpoints, never a file from disk by path.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { formatProblem } from './issues.mjs';
import { buildFromDisk } from './issues-site.mjs';
import { answerDecision, dropDecision, deferDecision, resolveNeed } from './issues-edit.mjs';
import { editIssue, findIssueFile, hashOf, today } from './issues-edit-io.mjs';
import { readReview, markReviewLine, REVIEW_PATH } from './text-review-io.mjs';
import { nextUnmarked } from './text-review.mjs';
import { visibleItems, copiesOf, cardOf, progressWords } from './text-review-page.mjs';

const MAX_BODY = 20000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png',
};
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src data:; connect-src 'self'; form-action 'none'; base-uri 'none'";

const gitTry = (root, args) => {
  try { return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch { return null; }
};

const tokenOk = (given, token) => {
  if (typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const clean = (v, max = 1000) => (typeof v === 'string' && v.length <= max ? v : null);

// The refusals and the work, as a function from one request to one response, so tests can call it
// without a socket. `port` is only used to check the Host and Origin headers.
export function createApp({ root, token, port, now = today, branches = false }) {
  let built = null;
  const rebuild = () => {
    const r = buildFromDisk(root, { branches, serve: { token } });
    if (r.errors.length) return { error: `The issue files have a problem (${formatProblem(r.errors[0])}), so the pages are showing the last good version.` };
    built = r.files;
    return {};
  };
  const first = rebuild();
  if (first.error) throw new Error(first.error);

  const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  const json = (status, obj) => ({ status, type: 'application/json; charset=utf-8', body: JSON.stringify(obj) });
  const refuse = (status, message) => json(status, { ok: false, message });

  function write(body) {
    const issue = clean(body.issue, 12);
    const hash = clean(body.hash, 64);
    if (!issue || !hash || !/^[0-9a-f]{64}$/.test(hash)) return refuse(400, 'That request was not complete, so nothing was changed. Reload the page and try again.');
    // The checkout must be on main.
    const branch = (gitTry(root, ['rev-parse', '--abbrev-ref', 'HEAD']) || '').trim();
    if (branch !== 'main') return refuse(409, `The checkout is on ${branch || 'no branch'}, not main, so nothing was changed. Switch it to main and reload.`);
    const found = findIssueFile(root, issue);
    if (found.error) return refuse(404, `${found.error} Nothing was changed.`);
    // The page must still match the file.
    if (hashOf(fs.readFileSync(found.file, 'utf8')) !== hash) return refuse(409, `Issue ${found.id} changed on disk since this page was built, so nothing was changed. Reload the page and try again.`);
    // The file must have no uncommitted edits.
    const dirty = gitTry(root, ['status', '--porcelain', '--', path.relative(root, found.file)]);
    if (dirty === null) return refuse(409, 'This folder is not a git checkout, so nothing was changed.');
    if (dirty.trim()) return refuse(409, `Issue ${found.id} has uncommitted edits, so nothing was changed. Commit them or put them aside, then reload the page.`);

    const on = now();
    const note = body.note === undefined || body.note === '' ? undefined : clean(body.note, 500);
    if (note === null) return refuse(400, 'The note is too long or not text, so nothing was changed.');
    let edit;
    let label;
    switch (body.action) {
      case 'answer': {
        const answer = clean(body.answer, 2000);
        if (answer === null || !answer.trim()) return refuse(400, 'There is no answer to record, so nothing was changed.');
        edit = (t, name) => answerDecision(t, clean(body.decision, 40) || '', answer, { by: 'marc', on, other: body.other === true, name });
        label = `answered ${body.decision}`;
        break;
      }
      case 'drop':
        edit = (t, name) => dropDecision(t, clean(body.decision, 40) || '', note, { by: 'marc', on, name });
        label = `dropped ${body.decision}`;
        break;
      case 'defer':
        edit = (t, name) => deferDecision(t, clean(body.decision, 40) || '', note, { by: 'marc', on, name });
        label = `deferred ${body.decision}`;
        break;
      case 'resolve': {
        if (!Number.isInteger(body.need) || body.need < 1) return refuse(400, 'Which need to resolve was not clear, so nothing was changed.');
        edit = (t, name) => resolveNeed(t, String(body.need), { name });
        label = undefined; // the command uses the edit's own summary, so the commit message is the same
        break;
      }
      default:
        return refuse(404, 'There is nothing here.');
    }
    const r = editIssue({ root, issue, edit, label, expectHash: hash });
    if (!r.ok) return refuse(409, r.message);
    const rb = rebuild();
    const newHash = hashOf(fs.readFileSync(found.file, 'utf8'));
    return json(200, {
      ok: true, message: r.message, committed: r.committed, commitMessage: r.commitMessage,
      notCommitted: r.notCommitted, hash: newHash, diff: r.diff, note: rb.error,
    });
  }

  // The text review page (issue 141). A mark goes through the same guards as an answer: the
  // checkout is on main, the doc is the one the page was shown, and the doc has no uncommitted edits.
  function markText(body) {
    const id = clean(body.id, 300);
    const hash = clean(body.hash, 64);
    const mark = body.mark === 'clear' ? null : body.mark;
    if (!id || !hash || !/^[0-9a-f]{64}$/.test(hash) || !(mark === null || ['keep', 'soften', 'rewrite'].includes(mark))) {
      return refuse(400, 'That request was not complete, so nothing was changed. Reload the page and try again.');
    }
    const note = body.note === undefined || body.note === '' || body.note === null ? '' : clean(body.note, 500);
    if (note === null) return refuse(400, 'The note is too long or not text, so nothing was changed.');
    let placeholders = {};
    if (body.placeholders !== undefined && body.placeholders !== null) {
      const ph = body.placeholders;
      if (typeof ph !== 'object' || Array.isArray(ph) || Object.values(ph).some((v) => typeof v !== 'boolean')) return refuse(400, 'That request was not understood, so nothing was changed.');
      placeholders = ph;
    }
    const branch = (gitTry(root, ['rev-parse', '--abbrev-ref', 'HEAD']) || '').trim();
    if (branch !== 'main') return refuse(409, `The checkout is on ${branch || 'no branch'}, not main, so nothing was changed. Switch it to main and reload.`);
    const r = readReview(root);
    if (!r.ok) return refuse(404, `${r.message} Nothing was changed.`);
    if (r.hash !== hash) return refuse(409, 'The text review changed on disk since this page was loaded, so nothing was changed. Reload the page and try again.');
    const dirty = gitTry(root, ['status', '--porcelain', '--', REVIEW_PATH]);
    if (dirty === null) return refuse(409, 'This folder is not a git checkout, so nothing was changed.');
    if (dirty.trim()) return refuse(409, 'The text review has uncommitted edits, so nothing was changed. Commit them or put them aside, then reload the page.');
    const item = r.items.find((x) => x.id === id);
    if (!item) return refuse(409, 'That line is not in the text review any more, so nothing was changed. Reload the page and try again.');
    const also = copiesOf(r.items, item).map((x) => x.id);
    const res = markReviewLine({ root, itemId: id, alsoIds: also, mark, note, placeholders, expectHash: hash });
    if (!res.ok) return refuse(409, res.message);
    const after = readReview(root);
    const fresh = after.ok ? after.items.find((x) => x.id === id) : null;
    return json(200, {
      ok: true, message: res.message, committed: res.committed, commitMessage: res.commitMessage, notCommitted: res.notCommitted,
      hash: res.hash, diff: res.diff, previousAll: res.previousAll, ids: res.ids,
      card: fresh ? cardOf(fresh, after.items) : null,
    });
  }

  function textCard(url) {
    const r = readReview(root);
    if (!r.ok) return refuse(404, r.message);
    const after = url.searchParams.get('after') || null;
    const skipped = (url.searchParams.get('skipped') || '').split(',').filter(Boolean).slice(0, 2000);
    const pool = visibleItems(r.items);
    const item = nextUnmarked(pool, after && pool.some((x) => x.id === after) ? after : null, skipped);
    return json(200, { ok: true, hash: r.hash, card: item ? cardOf(item, r.items) : null, words: item ? progressWords(r.items, item) : null });
  }

  // req: { method, url, headers, body (string) } -> { status, type, body, headers? }
  function handle(req) {
    const host = String(req.headers.host || '').toLowerCase();
    if (!hosts.has(host)) return { status: 403, type: 'text/plain; charset=utf-8', body: 'This server only answers on 127.0.0.1.' };
    const url = new URL(req.url, 'http://127.0.0.1');
    const p = url.pathname;
    if (req.method === 'POST') {
      const origin = req.headers.origin;
      if (origin && origin !== `http://${host}`) return refuse(403, 'That request came from another site, so nothing was changed.');
      if (!tokenOk(req.headers['x-issues-token'], token)) return refuse(403, 'This page is not allowed to write (its key is missing or from an older run). Reload the page and try again.');
      if (p === '/api/text/mark') {
        if (!String(req.headers['content-type'] || '').startsWith('application/json')) return refuse(400, 'That request was not understood, so nothing was changed.');
        let tb;
        try { tb = JSON.parse(req.body || ''); } catch { return refuse(400, 'That request was not understood, so nothing was changed.'); }
        if (!tb || typeof tb !== 'object' || Array.isArray(tb)) return refuse(400, 'That request was not understood, so nothing was changed.');
        return markText(tb);
      }
      if (!/^api\/(answer|drop|defer|resolve)$/.test(p.slice(1))) return refuse(404, 'There is nothing here.');
      if (!String(req.headers['content-type'] || '').startsWith('application/json')) return refuse(400, 'That request was not understood, so nothing was changed.');
      let body;
      try { body = JSON.parse(req.body || ''); } catch { return refuse(400, 'That request was not understood, so nothing was changed.'); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return refuse(400, 'That request was not understood, so nothing was changed.');
      return write({ ...body, action: p.slice(5) });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return { status: 405, type: 'text/plain; charset=utf-8', body: 'Not allowed.' };
    if (p === '/api/ping') return json(200, { issues: true });
    if (p === '/api/text/card') return textCard(url);
    const name = p === '/' ? 'index.html' : p.slice(1);
    if (name.endsWith('.html')) rebuild(); // a reload always shows what is on disk now
    if (!Object.hasOwn(built, name)) return { status: 404, type: 'text/plain; charset=utf-8', body: 'There is no such page.' };
    return { status: 200, type: TYPES[path.extname(name)] || 'application/octet-stream', body: built[name] };
  }
  return { handle };
}

export function startServer({ root, port = 0, open = false, branches = false, log = console.log } = {}) {
  const token = crypto.randomBytes(24).toString('hex');
  return new Promise((resolve, reject) => {
    let app;
    const server = http.createServer((req, res) => {
      const chunks = [];
      let size = 0;
      let dead = false;
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY && !dead) { dead = true; res.writeHead(413).end('Too large.'); req.destroy(); return; }
        chunks.push(c);
      });
      req.on('end', () => {
        if (dead) return;
        let out;
        try { out = app.handle({ method: req.method, url: req.url || '/', headers: req.headers, body: Buffer.concat(chunks).toString('utf8') }); } catch (e) {
          out = { status: 500, type: 'text/plain; charset=utf-8', body: 'Something went wrong on the server, and nothing was changed.' };
          log(`error: ${e.stack || e.message}`);
        }
        res.writeHead(out.status, {
          'content-type': out.type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
          'referrer-policy': 'no-referrer', 'content-security-policy': CSP,
        });
        res.end(req.method === 'HEAD' ? undefined : out.body);
      });
    });
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const actual = server.address().port;
      try { app = createApp({ root, token, port: actual, branches }); } catch (e) { server.close(); reject(e); return; }
      const url = `http://127.0.0.1:${actual}/`;
      log(`Serving the issue pages at ${url} (this computer only). Press Ctrl+C to stop.`);
      log('Answers are written to the issue files and committed on main when the checkout is clean. Nothing is pushed.');
      if (open) {
        const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
        const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
        try { spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref(); } catch { /* the address is printed above */ }
      }
      resolve({ server, url, port: actual, token, close: () => new Promise((r) => server.close(r)) });
    });
  });
}

function main(argv) {
  const flag = (k) => argv.indexOf(`--${k}`);
  const root = flag('root') >= 0 ? path.resolve(argv[flag('root') + 1]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  return startServer({ root, open: flag('no-open') < 0, branches: flag('branches') >= 0 })
    .catch((e) => { console.error(e.message); process.exitCode = 1; });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
