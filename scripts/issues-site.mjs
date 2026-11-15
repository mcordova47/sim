// Issues as data, stage 2 (issue 130, design: docs/issues-as-data-design.md).
//
//   npm run issues:site                 build dist-issues/ from the issue files
//   npm run issues:site -- --branches   also read local issue/* branches for "In flight"
//
// The pages are plain static HTML with one small stylesheet and one tiny optional
// script (for "Open everything"). No server, no network, no libraries. Open
// dist-issues/index.html from the file system. The output is never committed.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  analyze, loadFiles, parseIssue, buildModel, issuesJson, parseSections, orderSections,
  headingRole, logEntries, firstSentence, formatProblem, headline, label, STATUS_WORDS,
  NEEDS_PILL, numberWord,
} from './issues.mjs';

export const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------------------------------------------------------------------------
// A small Markdown renderer. Escapes everything first; links only to our own pages.
// ---------------------------------------------------------------------------

const ISSUE_LINK = /(?:^|\/)(\d{3}[a-z]?)-[^/)]*\.md(?:#.*)?$/;

export function inline(text, knownIds = null) {
  const codes = [];
  let t = String(text).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  t = esc(t);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, url) => {
    const m = url.replace(/&amp;/g, '&').match(ISSUE_LINK);
    if (m && (!knownIds || knownIds.has(m[1]))) return `<a href="issue-${m[1]}.html">${txt}</a>`;
    return txt; // outside links are shown as text, never as links
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=$|[\s).,;:])/g, '$1<em>$2</em>');
  t = t.replace(/\u0000(\d+)\u0000/g, (_, n) => `<code>${esc(codes[Number(n)])}</code>`);
  return t;
}

export function markdown(md, knownIds = null) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const indentOf = (l) => l.match(/^ */)[0].length;
  const isBullet = (l) => /^\s*([-*+]|\d+[.)])\s+/.test(l);

  const renderList = (startIndent) => {
    const ordered = /^\s*\d/.test(lines[i]);
    let html = ordered ? '<ol>' : '<ul>';
    while (i < lines.length && isBullet(lines[i]) && indentOf(lines[i]) >= startIndent) {
      if (indentOf(lines[i]) > startIndent) break;
      let item = lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, '');
      i++;
      let nested = '';
      while (i < lines.length) {
        if (lines[i].trim() === '') {
          // a blank line continues the list only if the next line is indented or another bullet
          const nxt = lines[i + 1];
          if (nxt !== undefined && (indentOf(nxt) > startIndent || (isBullet(nxt) && indentOf(nxt) >= startIndent)) && nxt.trim() !== '') { i++; continue; }
          break;
        }
        if (isBullet(lines[i]) && indentOf(lines[i]) > startIndent) { nested += renderList(indentOf(lines[i])); continue; }
        if (isBullet(lines[i]) && indentOf(lines[i]) <= startIndent) break;
        if (indentOf(lines[i]) > startIndent) { item += ' ' + lines[i].trim(); i++; continue; }
        break;
      }
      html += `<li>${inline(item, knownIds)}${nested}</li>`;
    }
    return html + (ordered ? '</ol>' : '</ul>');
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }
    const fence = line.match(/^\s*(```|~~~)/);
    if (fence) {
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*(```|~~~)/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (h) { out.push(`<h4>${inline(h[2], knownIds)}</h4>`); i++; continue; }
    if (/^\s*\|/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
      const head = cells(line);
      i += 2;
      let html = '<div class="scroll"><table><thead><tr>' + head.map((c) => `<th>${inline(c, knownIds)}</th>`).join('') + '</tr></thead><tbody>';
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        html += '<tr>' + cells(lines[i]).map((c) => `<td>${inline(c, knownIds)}</td>`).join('') + '</tr>';
        i++;
      }
      out.push(html + '</tbody></table></div>');
      continue;
    }
    if (isBullet(line)) { out.push(renderList(indentOf(line))); continue; }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${markdown(buf.join('\n'), knownIds)}</blockquote>`);
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^\s*(```|~~~)/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i]) && !isBullet(lines[i]) && !/^\s*\|/.test(lines[i])) {
      buf.push(lines[i++].trim());
    }
    if (buf.length === 0) { buf.push(lines[i++].trim()); }
    out.push(`<p>${inline(buf.join(' '), knownIds)}</p>`);
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Git facts (the snapshot stamp and the recently-shipped band). Never throws.
// ---------------------------------------------------------------------------

function git(root, ...args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

export function gitFacts(root, { branches = false } = {}) {
  const commit = git(root, 'rev-parse', '--short', 'HEAD');
  const date = git(root, 'log', '-1', '--format=%as');
  const branch = git(root, 'rev-parse', '--abbrev-ref', 'HEAD');
  const dirty = git(root, 'status', '--porcelain') !== '';
  const ref = git(root, 'rev-parse', '--verify', '--quiet', 'main') ? 'main' : 'HEAD';
  const merges = git(root, 'log', ref, '--merges', '-n', '80', '--format=%h%x09%as%x09%s')
    .split('\n').filter(Boolean).map((l) => {
      const [sha, day, ...rest] = l.split('\t');
      return { sha, date: day, subject: rest.join('\t') };
    });
  return { commit, date, branch, dirty, merges, branches };
}

// Merge commits that name an issue ("Merge 117g: ..."), newest first, one per id.
export function recentlyShipped(merges, byId, limit = 5) {
  const seen = new Set();
  const out = [];
  for (const m of merges) {
    const x = m.subject.match(/^Merge (\d{3}[a-z]?)\b/);
    if (!x || seen.has(x[1]) || !byId.has(x[1])) continue;
    seen.add(x[1]);
    out.push({ id: x[1], date: m.date });
    if (out.length >= limit) break;
  }
  return out;
}

// Local branches issue/NNN-slug whose issue file says something different from the built files.
export function branchOverlay(root, byId) {
  const refs = git(root, 'for-each-ref', 'refs/heads/issue/', '--format=%(refname:short)').split('\n').filter(Boolean);
  const out = [];
  for (const br of refs) {
    const m = br.match(/^issue\/(\d{3}[a-z]?)-/);
    if (!m) continue;
    const names = git(root, 'ls-tree', '--name-only', br, 'issues/').split('\n').filter((n) => n.startsWith(`issues/${m[1]}-`));
    if (!names.length) continue;
    const text = git(root, 'show', `${br}:${names[0]}`);
    const parsed = parseIssue(path.basename(names[0]), text);
    const status = parsed.fm && parsed.fm.status;
    const here = byId.get(m[1]);
    if (!status || (here && here.fm.status === status)) continue;
    out.push({ id: m[1], status, title: (parsed.fm.short || parsed.fm.title || ''), branch: br });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : 1));
}

export const stampText = (g) => {
  const where = g.branch === 'main' || !g.branch ? `main ${g.commit}` : `branch ${g.branch}, ${g.commit}`;
  return `Snapshot ${g.date}, ${where}${g.dirty ? ', plus uncommitted edits' : ''}${g.branches ? ', local branches included' : ''}. If it disagrees with GitHub, GitHub is right.`;
};

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export const CSS = `
/* Colours are the game's palette (docs/art-style.md): warm paper and cream, one accent (tangerine). */
:root {
  --ink: #1a1a2e; --night: #2b2d42; --slate: #3b3e5c; --dusk: #6b6f94; --mist: #a9adc9;
  --paper: #edf2f4; --cream: #e8c9a0; --putty: #cdc7b9; --walnut: #4a2c2a; --tangerine: #f08a4b;
  --bg: #f7f1e6; --surface: #fffaf1; --line: #e2d6c1; --text: #231f2b; --muted: #6a6068;
  --accent: #b4531a; --accent-bg: #fbe6d3;
  --serif: Georgia, "Iowan Old Style", "Palatino Linotype", serif;
  --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #1c1d2e; --surface: #25273b; --line: #3b3e5c; --text: #edf2f4; --muted: #a9adc9;
    --accent: #f08a4b; --accent-bg: #3a2c2c; color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #1c1d2e; --surface: #25273b; --line: #3b3e5c; --text: #edf2f4; --muted: #a9adc9;
  --accent: #f08a4b; --accent-bg: #3a2c2c; color-scheme: dark;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.55 var(--sans); overflow-wrap: anywhere; }
main, header.top, footer { max-width: 46rem; margin: 0 auto; padding: 0 16px; }
header.top { padding-top: 18px; }
nav.site { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 0.9rem; margin-bottom: 14px; }
a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 2px; }
h1, h2, h3 { font-family: var(--serif); font-weight: 600; line-height: 1.25; }
h1 { font-size: 1.7rem; margin: 0.2em 0 0.3em; }
h2 { font-size: 1.15rem; margin: 1.8em 0 0.5em; }
h3 { font-size: 1rem; margin: 1.2em 0 0.4em; }
h4 { font-size: 0.95rem; margin: 1em 0 0.3em; }
p { margin: 0.5em 0; }
.lede { font-size: 1.05rem; margin: 0.2em 0 0.6em; }
.stamp { color: var(--muted); font-size: 0.85rem; margin: 0.4em 0; }
.muted { color: var(--muted); }
.calm { color: var(--muted); font-style: italic; }
ul.plain { list-style: none; padding: 0; margin: 0.3em 0; }
ul.plain li { margin: 0.35em 0; }
.pill { display: inline-block; font-size: 0.78rem; line-height: 1; padding: 4px 9px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); background: transparent; white-space: nowrap; vertical-align: 0.1em; }
.pill.need { color: var(--accent); border-color: var(--accent); background: var(--accent-bg); }
.cards { display: grid; gap: 10px; }
a.card, .card { display: block; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; color: var(--text); text-decoration: none; }
a.card:hover, a.card:focus-visible { border-color: var(--accent); }
.card .name { font-weight: 600; }
.card .id { color: var(--muted); font-weight: 400; }
.card .head { color: var(--text); margin: 2px 0 6px; }
.card .why { margin: 2px 0; }
.card .meta { color: var(--muted); font-size: 0.85rem; margin-top: 4px; }
.group { margin: 1.2em 0 0.4em; font-size: 0.8rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.band { margin-top: 1.6em; }
.band > h2 { margin-top: 0; font-size: 0.82rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); font-family: var(--sans); font-weight: 600; }
.short ul { margin: 0.3em 0; padding-left: 1.2em; }
.row { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; border-bottom: 1px solid var(--line); }
.row .when { color: var(--muted); white-space: nowrap; font-size: 0.85rem; }
.tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 10px 0; }
button { font: inherit; font-size: 0.9rem; color: var(--text); background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px; cursor: pointer; }
button:hover { border-color: var(--accent); }
details { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; margin: 8px 0; }
details > summary { list-style: none; cursor: pointer; padding: 10px 14px 10px 34px; position: relative; }
details > summary::-webkit-details-marker { display: none; }
details > summary::before { content: ""; position: absolute; left: 14px; top: 1.05em; width: 6px; height: 6px; border-right: 2px solid var(--muted); border-bottom: 2px solid var(--muted); transform: rotate(-45deg); transition: transform 0.12s; }
details[open] > summary::before { transform: rotate(45deg); top: 0.95em; }
details > summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 10px; }
summary .t { font-weight: 600; }
summary .role { color: var(--accent); margin-right: 4px; }
summary .peek { display: block; color: var(--muted); font-size: 0.88rem; font-weight: 400; margin-top: 2px; }
.inner { padding: 0 14px 12px 14px; }
.inner details { background: transparent; }
details.leaf > summary { padding-top: 7px; padding-bottom: 7px; font-size: 0.93rem; }
.faint { opacity: 0.65; }
.pager { display: flex; justify-content: space-between; gap: 12px; margin: 22px 0 6px; font-size: 0.92rem; }
.pager a:last-child { text-align: right; }
pre { background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; overflow-x: auto; font-size: 0.85rem; max-width: 100%; }
code { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.88em; background: var(--bg); padding: 0 3px; border-radius: 4px; }
pre code { background: none; padding: 0; }
.scroll { overflow-x: auto; max-width: 100%; }
table { border-collapse: collapse; font-size: 0.88rem; }
th, td { border: 1px solid var(--line); padding: 4px 8px; text-align: left; vertical-align: top; }
blockquote { margin: 0.6em 0; padding-left: 12px; border-left: 3px solid var(--line); color: var(--muted); }
.facts { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 0.9rem; color: var(--muted); margin: 6px 0 4px; }
footer { padding-top: 26px; padding-bottom: 40px; }
@media (min-width: 760px) {
  body { font-size: 17px; }
  main, header.top, footer { padding: 0 24px; }
  .cards.wide { grid-template-columns: 1fr 1fr; }
  h1 { font-size: 2rem; }
}
.js-only { display: none; }
.js .js-only { display: inline-block; }
`;

export const SCRIPT = `(function () {
  document.documentElement.classList.add('js');
  function names(root) { return Array.prototype.slice.call(root.querySelectorAll('details[name], details[data-name]')); }
  document.querySelectorAll('[data-open-all]').forEach(function (btn) {
    var all = false;
    btn.addEventListener('click', function () {
      var ds = document.querySelectorAll('main details');
      all = !all;
      ds.forEach(function (d) {
        if (all) { if (d.getAttribute('name')) { d.setAttribute('data-name', d.getAttribute('name')); d.removeAttribute('name'); } d.open = true; }
        else { if (d.getAttribute('data-name')) { d.setAttribute('name', d.getAttribute('data-name')); d.removeAttribute('data-name'); } d.open = false; }
      });
      btn.textContent = all ? 'Close everything' : 'Open everything';
    });
  });
})();
`;

const pill = (text, need = false) => `<span class="pill${need ? ' need' : ''}">${esc(text)}</span>`;
const needPill = (kind) => pill(NEEDS_PILL[kind] || kind, true);

function layout({ title, stamp, body, headExtra = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<link rel="stylesheet" href="style.css">
${headExtra}</head>
<body>
<header class="top">
<nav class="site"><a href="index.html">Home</a> <a href="needs.html">What needs you</a> <a href="threads.html">All threads</a></nav>
</header>
<main>
${body}
</main>
<footer><p class="stamp">${esc(stamp)}</p></footer>
<script src="site.js"></script>
</body>
</html>
`;
}

const issueLink = (i, text) => `<a href="issue-${esc(i.fm.id)}.html">${text ?? esc(label(i))}</a>`;
const needsLine = (n) => `${n.why}${n.on ? ` (waiting on ${n.on})` : ''}`;

function needCard(n, { issueTitle = true } = {}) {
  const i = n.issue;
  return `<a class="card" href="issue-${esc(i.fm.id)}.html#needs">
<div>${needPill(n.kind)} <span class="name">${esc(label(i))}</span> <span class="id">(${esc(i.fm.id)})</span></div>
<p class="why">${esc(needsLine(n))}</p>
<div class="meta">asked ${esc(n.since)}</div>
</a>`;
}

function threadCard(t) {
  const r = t.root;
  const href = t.page ? `thread-${t.id}.html` : `issue-${t.id}.html`;
  const head = r.fm.summary || '';
  return `<a class="card" href="${href}">
<div class="name">${esc(label(r))} <span class="id">(${esc(t.id)})</span></div>
${head ? `<p class="head">${esc(head)}</p>` : ''}
<div>${pill(t.pill)}${t.progress ? ` <span class="muted">${esc(t.progress)}</span>` : ''}</div>
</a>`;
}

function homePage(ctx) {
  const { model, git: g, inFlight, shipped, stamp } = ctx;
  const { threads, forMarc, elsewhere, byId } = model;
  const rank = { 'In progress': 0, Paused: 1, Planned: 2 };
  const open = threads.filter((t) => t.pill !== 'Shipped').sort((a, b) => rank[a.pill] - rank[b.pill]);
  const live = open.filter((t) => t.pill === 'In progress' || t.pill === 'Paused');

  // The short version: plain facts, no counts.
  const bullets = [];
  bullets.push(live.length
    ? `Live threads: ${live.slice(0, 3).map((t) => esc(label(t.root))).join(', ')}${live.length > 3 ? ' and more' : ''}.`
    : 'No thread is in progress right now.');
  bullets.push(forMarc.length ? 'Something is waiting on you; it is listed below, none of it urgent.' : 'Nothing is waiting on you.');
  bullets.push(inFlight.length ? `In flight: ${inFlight.slice(0, 3).map((x) => esc(x.title)).join(', ')}.` : 'Nothing is in flight.');

  const needCards = forMarc.slice(0, 5).map((n) => needCard(n)).join('\n');
  const more = forMarc.length > 5 ? `<p><a href="needs.html">See everything that is waiting</a></p>` : '';
  const elsewhereHtml = elsewhere.length
    ? `<section class="band"><h2>Waiting on something else</h2><ul class="plain">${elsewhere.slice(0, 5).map((n) => `<li>${needPill(n.kind)} ${issueLink(n.issue)} (${esc(n.id)}): ${esc(needsLine(n))}</li>`).join('')}</ul></section>`
    : '';
  const flightHtml = `<section class="band"><h2>In flight</h2>${inFlight.length
    ? `<ul class="plain">${inFlight.map((x) => `<li>${x.href ? `<a href="${x.href}">${esc(x.title)}</a>` : esc(x.title)} (${esc(x.id)}): ${esc(x.note)}</li>`).join('')}</ul>`
    : '<p class="calm">Nothing is in flight.</p>'}</section>`;
  const shippedHtml = shipped.length
    ? `<section class="band"><h2>Recently shipped</h2>${shipped.map((s) => {
      const i = byId.get(s.id);
      return `<div class="row"><span>${issueLink(i)} <span class="muted">(${esc(s.id)})</span></span><span class="when">${esc(s.date)}</span></div>`;
    }).join('')}</section>`
    : '';

  const body = `<h1>simagotchi: the work</h1>
<p class="stamp">${esc(stamp)}</p>
<section class="band short"><h2>The short version</h2><ul>${bullets.map((b) => `<li>${b}</li>`).join('')}</ul></section>
<section class="band"><h2>What needs you</h2>${forMarc.length ? `<div class="cards">${needCards}</div>${more}` : '<p class="calm">Nothing is waiting on you.</p>'}</section>
${elsewhereHtml}
${flightHtml}
${shippedHtml}
<section class="band"><h2>The threads</h2><div class="cards wide">${open.map(threadCard).join('\n')}</div>
<p><a href="threads.html">Everything else: shipped threads, and every thread in one list</a></p></section>`;
  return layout({ title: 'simagotchi: the work', stamp, body });
}

function needsPage(ctx) {
  const { model, stamp } = ctx;
  const order = ['decide', 'try', 'do', 'review'];
  let groups = '';
  for (const k of order) {
    const list = model.forMarc.filter((n) => n.kind === k);
    if (!list.length) continue;
    groups += `<h3 class="group">${esc(NEEDS_PILL[k])}</h3><div class="cards">${list.map((n) => needCard(n)).join('')}</div>`;
  }
  const waiting = model.elsewhere.length
    ? `<h2>Waiting on something else</h2><ul class="plain">${model.elsewhere.map((n) => `<li>${needPill(n.kind)} ${issueLink(n.issue)} (${esc(n.id)}): ${esc(needsLine(n))} <span class="muted">asked ${esc(n.since)}</span></li>`).join('')}</ul>`
    : '';
  const body = `<h1>What needs you</h1>
<p class="lede">Nothing here is urgent. Newest first.</p>
${model.forMarc.length ? groups : '<p class="calm">Nothing is waiting on you.</p>'}
${waiting}`;
  return layout({ title: 'What needs you', stamp, body });
}

function threadsPage(ctx) {
  const { model, stamp } = ctx;
  const groups = ['In progress', 'Paused', 'Planned', 'Shipped'];
  let body = '<h1>All threads</h1><p class="lede">Every thread, grouped by where it stands.</p>';
  for (const p of groups) {
    const list = model.threads.filter((t) => t.pill === p);
    if (!list.length) continue;
    body += `<h2>${esc(p)}</h2><ul class="plain">${list.map((t) => {
      const href = t.page ? `thread-${t.id}.html` : `issue-${t.id}.html`;
      const sub = t.root.fm.summary ? ` <span class="muted">${esc(t.root.fm.summary)}</span>` : '';
      return `<li><a href="${href}">${esc(label(t.root))}</a> <span class="muted">(${esc(t.id)})</span>${sub}</li>`;
    }).join('')}</ul>`;
  }
  return layout({ title: 'All threads', stamp, body });
}

function threadPage(t, ctx) {
  const { model, stamp } = ctx;
  const known = new Set(model.byId.keys());
  const r = t.root;
  const pages = model.threads.filter((x) => x.page);
  const idx = pages.findIndex((x) => x.id === t.id);
  const prev = pages[idx - 1];
  const next = pages[idx + 1];
  const goal = parseSections(r.body).sections.find((s) => headingRole(s.title) === 'goal');
  const now = goal ? firstSentenceBlock(goal.text) : '';

  const shipped = t.active.filter((m) => m.fm.status === 'done');
  const still = [...(r.fm.status !== 'done' && t.active.length === 0 ? [r] : []), ...t.active.filter((m) => m.fm.status !== 'done')];
  const unverified = [r, ...t.members].flatMap((m) => (Array.isArray(m.fm.unverified) ? m.fm.unverified.map((u) => ({ id: m.fm.id, u })) : []));
  const needsHere = model.needs.filter((n) => n.id === t.id || t.members.some((m) => m.fm.id === n.id));
  const item = (m) => `<li>${issueLink(m, `${esc(m.fm.id)} ${esc(label(m))}`)}${m.fm.summary ? `<span class="muted"> &mdash; ${esc(m.fm.summary)}</span>` : ''}</li>`;

  const branch = (title, peek, inner, { open = false } = {}) => `<details name="branches"${open ? ' open' : ''}><summary><span class="t">${esc(title)}</span>${peek ? `<span class="peek">${peek}</span>` : ''}</summary><div class="inner">${inner}</div></details>`;

  const parts = [];
  parts.push(branch('What it looks like now', '', `<p>${esc(now)}</p>`, { open: true }));
  parts.push(branch('What shipped', shipped.length ? esc(shipped.map((m) => m.fm.id).join(', ')) : 'Nothing yet.',
    shipped.length ? `<ul class="plain">${shipped.map(item).join('')}</ul>` : '<p class="calm">Nothing yet.</p>'));
  parts.push(branch('Still open', still.length ? esc(still.map((m) => `${m.fm.id} (${STATUS_WORDS[m.fm.status]})`).join(', ')) : 'Nothing.',
    still.length ? `<ul class="plain">${still.map((m) => `<li>${issueLink(m, `${esc(m.fm.id)} ${esc(label(m))}`)} <span class="muted">${esc(STATUS_WORDS[m.fm.status])}</span>${m.fm.summary ? `<br><span class="muted">${esc(m.fm.summary)}</span>` : ''}</li>`).join('')}</ul>` : '<p class="calm">Nothing left open.</p>'));
  if (needsHere.length) {
    parts.push(branch('Waiting on', esc(needsHere.map((n) => NEEDS_PILL[n.kind]).join(', ')),
      `<ul class="plain">${needsHere.map((n) => `<li>${needPill(n.kind)} ${issueLink(n.issue, esc(n.id))}: ${esc(needsLine(n))} <span class="muted">asked ${esc(n.since)}</span></li>`).join('')}</ul>`));
  }
  parts.push(branch('Not verified', unverified.length ? esc(unverified[0].u) : 'None recorded yet.',
    unverified.length ? `<ul class="plain">${unverified.map((x) => `<li>${esc(x.u)} <span class="muted">(${esc(x.id)})</span></li>`).join('')}</ul>` : '<p class="calm">None recorded yet.</p>'));
  if (t.superseded.length) {
    parts.push(branch('Superseded', esc(t.superseded.map((m) => `${m.fm.id} replaced by ${m.fm.superseded_by}`).join('; ')),
      `<ul class="plain">${t.superseded.map((m) => `<li>${issueLink(m, `${esc(m.fm.id)} ${esc(label(m))}`)} <span class="muted">replaced by ${issueLink(model.byId.get(m.fm.superseded_by), esc(m.fm.superseded_by))}</span></li>`).join('')}</ul>`));
  }
  parts.push(branch('All the detail', 'Each issue as a tree of its headings.',
    `<ul class="plain">${[r, ...t.members].map((m) => `<li>${issueLink(m, `${esc(m.fm.id)} ${esc(label(m))}`)}</li>`).join('')}</ul>`));

  const body = `<p><a href="index.html">&lsaquo; Home</a></p>
<h1>${esc(label(r))} <span class="muted">(${esc(t.id)})</span></h1>
${r.fm.summary ? `<p class="lede">${esc(r.fm.summary)}</p>` : ''}
<div class="tools">${pill(t.pill)}${t.progress ? `<span class="muted">${esc(t.progress)}</span>` : ''}<button type="button" class="js-only" data-open-all>Open everything</button></div>
${parts.join('\n')}
<div class="pager"><span>${prev ? `<a href="thread-${prev.id}.html">&lsaquo; ${esc(label(prev.root))}</a>` : ''}</span><span>${next ? `<a href="thread-${next.id}.html">${esc(label(next.root))} &rsaquo;</a>` : ''}</span></div>`;
  return layout({ title: `${label(r)} (${t.id})`, stamp, body });
}

function firstSentenceBlock(text) {
  // The first paragraph of a Goal, plain, up to about 300 characters.
  const para = (text || '').split(/\n\s*\n/)[0] || '';
  const plain = para.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*_]+/g, '').replace(/\s+/g, ' ').trim();
  return plain.length > 300 ? plain.slice(0, plain.lastIndexOf(' ', 300)) + '…' : plain;
}

const ROLE_ICON = { goal: '◎', criteria: '☑', decisions: '◆', notes: '✎', unverified: '?', log: '⌛' };

function issuePage(i, ctx) {
  const { model, stamp } = ctx;
  const known = new Set(model.byId.keys());
  const { fm } = i;
  const t = model.threadOf.get(fm.id);
  const tree = parseSections(i.body);

  const sectionHtml = (sec, group, depth) => {
    const role = headingRole(sec.title);
    const isLog = role === 'log';
    const peek = firstSentence(sec.text || (sec.children[0] && sec.children[0].text) || '', 140);
    let inner = '';
    if (isLog) {
      const entries = logEntries(sec.text);
      const leftover = entries.length ? '' : markdown(sec.text, known);
      inner = leftover + entries.map((e) => `<details class="leaf"><summary>${esc(e.label)}</summary><div class="inner">${markdown(e.body, known)}</div></details>`).join('');
    } else if (sec.text) {
      inner = markdown(sec.text, known);
    }
    if (sec.children.length) {
      const g = `${group}-${esc(sec.title)}`;
      inner += sec.children.map((c) => sectionHtml(c, g, depth + 1)).join('');
    }
    const open = role === 'goal';
    return `<details name="${esc(group)}"${open ? ' open' : ''}><summary>${role ? `<span class="role" aria-hidden="true">${ROLE_ICON[role]}</span>` : ''}<span class="t">${esc(sec.title)}</span>${peek ? `<span class="peek">${esc(peek)}</span>` : ''}</summary><div class="inner">${inner}</div></details>`;
  };

  const deps = fm.depends_on.map((d) => (model.byId.has(d) ? `<a href="issue-${d}.html">${d}</a>` : d));
  const unblocks = (model.unblocks.get(fm.id) || []).map((d) => `<a href="issue-${d}.html">${d}</a>`);
  const needs = Array.isArray(fm.needs) ? fm.needs : [];
  const unver = Array.isArray(fm.unverified) ? fm.unverified : [];
  const sup = fm.superseded_by && model.byId.get(fm.superseded_by);

  const body = `<p>${t && t.page ? `<a href="thread-${t.id}.html">&lsaquo; ${esc(label(t.root))} (${esc(t.id)})</a>` : '<a href="index.html">&lsaquo; Home</a>'}</p>
<h1>${esc(fm.title)} <span class="muted">(${esc(fm.id)})</span></h1>
${fm.summary ? `<p class="lede">${esc(fm.summary)}</p>` : ''}
<div class="tools">${pill(STATUS_WORDS[fm.status])}${fm.kind ? pill(fm.kind) : ''}<span class="muted">${esc(fm.owner)}</span><button type="button" class="js-only" data-open-all>Open everything</button></div>
<div class="facts">${deps.length ? `<span>after ${deps.join(', ')}</span>` : ''}${unblocks.length ? `<span>unblocks ${unblocks.join(', ')}</span>` : ''}${fm.note ? `<span>${esc(fm.note)}</span>` : ''}${sup ? `<span>replaced by <a href="issue-${sup.fm.id}.html">${esc(sup.fm.id)}</a></span>` : ''}</div>
${needs.length ? `<section id="needs" class="band"><h2>What this needs</h2><ul class="plain">${needs.map((n) => `<li>${needPill(n.kind)} ${esc(needsLine(n))} <span class="muted">asked ${esc(n.since)}</span></li>`).join('')}</ul></section>` : '<span id="needs"></span>'}
${unver.length ? `<section class="band"><h2>Not verified</h2><ul>${unver.map((u) => `<li>${esc(u)}</li>`).join('')}</ul></section>` : ''}
${tree.intro ? markdown(tree.intro, known) : ''}
<section class="band">${orderSections(tree.sections).map((s) => sectionHtml(s, 'top', 0)).join('\n')}</section>`;
  return layout({ title: `${fm.title} (${fm.id})`, stamp, body });
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

// Returns a map of file name -> contents (strings). No writing here, so tests can look.
export function buildSite(issues, git, { overlay = [] } = {}) {
  const model = buildModel(issues);
  const stamp = stampText(git);
  const shipped = recentlyShipped(git.merges || [], model.byId);

  // In flight is only what the local branches say (--branches). The files on their own
  // can hold stale in-progress or review statuses, which would make this band noisy.
  const inFlight = [];
  for (const o of overlay) {
    if (!inFlight.some((x) => x.id === o.id)) {
      inFlight.push({ id: o.id, title: o.title, note: `${STATUS_WORDS[o.status] || o.status}, on its branch`, href: model.byId.has(o.id) ? `issue-${o.id}.html` : null });
    }
  }
  inFlight.sort((a, b) => (a.id < b.id ? -1 : 1));

  const ctx = { model, git, stamp, inFlight, shipped };
  const files = {
    'style.css': CSS.trim() + '\n',
    'site.js': SCRIPT,
    'index.html': homePage(ctx),
    'needs.html': needsPage(ctx),
    'threads.html': threadsPage(ctx),
  };
  for (const t of model.threads) if (t.page) files[`thread-${t.id}.html`] = threadPage(t, ctx);
  for (const i of issues) files[`issue-${i.fm.id}.html`] = issuePage(i, ctx);
  const json = issuesJson(issues, model, {
    snapshot: { commit: git.commit, date: git.date },
    recentlyShipped: shipped,
  });
  files['issues.json'] = JSON.stringify(json, null, 2) + '\n';
  return files;
}

function main(argv) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const withBranches = argv.includes('--branches');
  const { issues, errors, warnings } = analyze(loadFiles(path.join(root, 'issues')));
  for (const w of warnings) console.log(`warning: ${formatProblem(w)}`);
  if (errors.length) {
    for (const e of errors) console.error(`error: ${formatProblem(e)}`);
    console.error('\nFix the issue files first (npm run issues:check -- --validate).');
    return 1;
  }
  const g = gitFacts(root, { branches: withBranches });
  const byId = new Map(issues.map((i) => [i.fm.id, i]));
  const overlay = withBranches ? branchOverlay(root, byId) : [];
  const files = buildSite(issues, g, { overlay });
  const out = path.join(root, 'dist-issues');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(out, name), text);
  console.log(`Wrote ${Object.keys(files).length} files to dist-issues/. Open dist-issues/index.html.`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
