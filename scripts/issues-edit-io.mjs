// Issues API, stage 1 (issue 136): the thin layer that reads and writes the issue file, runs
// the validation and the table, and (only when it is safe) makes the git commit.
// The edits themselves are pure functions in scripts/issues-edit.mjs; a local server
// (issue 137) calls editIssue below with the same functions. Nothing here ever pushes.
//
//   npm run issues -- answer <issue> <decision> "<answer>" [--other] [--by marc]
//   npm run issues -- drop   <issue> <decision> ["reason"]
//   npm run issues -- defer  <issue> <decision> ["note"]
//   npm run issues -- ask    <issue> "<question>" [--option "<text>"]... [--recommend "<text>"] [--who marc] [--id d3] [--doc <path>]
//   npm run issues -- need add     <issue> --who marc --kind try --why "<text>" [--on "<text>"]
//   npm run issues -- need resolve <issue> <number or words from its why>
// Every command takes --dry-run (show the change, write nothing), --no-commit and --date YYYY-MM-DD.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { analyze, loadFiles, generateTable, replaceTable, formatProblem } from './issues.mjs';
import { answerDecision, dropDecision, deferDecision, addDecision, addNeed, resolveNeed } from './issues-edit.mjs';

export const COMMANDS = ['answer', 'drop', 'defer', 'ask', 'need'];
export const hashOf = (text) => crypto.createHash('sha256').update(text).digest('hex');

const git = (root, args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const gitTry = (root, args) => { try { return git(root, args).trim(); } catch { return null; } };

export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function findIssueFile(root, ref) {
  const id = String(ref || '').trim();
  if (!/^\d{3}[a-z]?$/.test(id)) return { error: `"${ref}" is not an issue number like 134 or 117g.` };
  const dir = path.join(root, 'issues');
  const hits = fs.readdirSync(dir).filter((n) => n.endsWith('.md') && n.startsWith(`${id}-`));
  if (hits.length !== 1) return { error: hits.length ? `More than one file starts with ${id}-.` : `There is no issue ${id}.` };
  return { id, name: hits[0], file: path.join(dir, hits[0]) };
}

// A small line diff for the one changed area (the edits only ever change a contiguous region).
export function showDiff(name, before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  let s = 0;
  while (s < a.length && s < b.length && a[s] === b[s]) s++;
  let e = 0;
  while (e < a.length - s && e < b.length - s && a[a.length - 1 - e] === b[b.length - 1 - e]) e++;
  const out = [`--- issues/${name}`, `+++ issues/${name}`, `@@ line ${s + 1} @@`];
  for (const l of a.slice(Math.max(0, s - 2), s)) out.push(` ${l}`);
  for (const l of a.slice(s, a.length - e)) out.push(`-${l}`);
  for (const l of b.slice(s, b.length - e)) out.push(`+${l}`);
  for (const l of a.slice(a.length - e, a.length - e + 2)) out.push(` ${l}`);
  return out.join('\n');
}

// Is it safe to commit? Returns { ok: true } or { ok: false, why }.
export function commitCheck(root, file) {
  const top = gitTry(root, ['rev-parse', '--show-toplevel']);
  if (!top) return { ok: false, why: 'this folder is not a git checkout' };
  if (fs.realpathSync(top) !== fs.realpathSync(root)) return { ok: false, why: 'the project is not at the top of its git checkout' };
  const branch = gitTry(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch !== 'main') return { ok: false, why: `the checkout is on ${branch || 'no branch'}, not main` };
  const status = git(root, ['status', '--porcelain', '--untracked-files=all']).split('\n').filter(Boolean);
  if (status.length) {
    const rel = path.relative(root, file);
    const mine = status.some((l) => l.slice(3) === rel);
    return { ok: false, why: mine ? 'the issue file already had uncommitted changes' : `the checkout has uncommitted changes (${status.length} file${status.length === 1 ? '' : 's'})` };
  }
  if (!gitTry(root, ['config', 'user.name']) || !gitTry(root, ['config', 'user.email'])) return { ok: false, why: 'no git name and email are set' };
  return { ok: true };
}

// Do one edit end to end. `edit(text, name)` is one of the pure functions. Returns
// { ok, message, lines, committed, wrote, diff }; never throws for ordinary refusals.
export function editIssue({ root, issue, edit, dryRun = false, commit = true, expectHash = null, label }) {
  const found = findIssueFile(root, issue);
  if (found.error) return { ok: false, message: found.error };
  const before = fs.readFileSync(found.file, 'utf8');
  if (expectHash && hashOf(before) !== expectHash) {
    return { ok: false, message: `Issue ${found.id} changed on disk since it was shown, so nothing was changed. Reload and try again.` };
  }
  const r = edit(before, found.name);
  if (r.ok === false) return { ok: false, message: r.message };
  const diff = showDiff(found.name, before, r.text);

  // Validate the whole set as it would be after the write; refuse anything new that is wrong.
  const docExists = (p) => fs.existsSync(path.join(root, p));
  const files = loadFiles(path.join(root, 'issues'));
  const known = new Set(analyze(files, { docExists }).errors.map(formatProblem));
  const after = analyze(files.map((f) => (f.name === found.name ? { name: f.name, text: r.text } : f)), { docExists });
  const fresh = after.errors.filter((e) => !known.has(formatProblem(e)));
  if (fresh.length) return { ok: false, message: `The edit would leave the issue files invalid, so nothing was changed: ${formatProblem(fresh[0])}` };

  const planPath = path.join(root, 'PLAN.md');
  const plan = fs.existsSync(planPath) ? fs.readFileSync(planPath, 'utf8') : null;
  const table = plan === null ? null : replaceTable(plan, generateTable(after.issues));
  const planChanges = table && table.ok && table.text !== plan;

  const head = `Issue ${found.id}: ${r.summary}.`;
  if (dryRun) return { ok: true, dryRun: true, wrote: false, committed: false, diff, message: `${head} (dry run: nothing was written)`, summary: r.summary, id: found.id };

  const gate = commit ? commitCheck(root, found.file) : { ok: false, why: 'it was asked not to' };
  const tmp = `${found.file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, r.text);
  fs.renameSync(tmp, found.file);
  if (planChanges) fs.writeFileSync(planPath, table.text);
  const res = { ok: true, wrote: true, committed: false, diff, summary: r.summary, id: found.id, message: `${head} Edited issues/${found.name}.` };
  if (!gate.ok) {
    res.notCommitted = `Not committed: ${gate.why}.`;
    return res;
  }
  const msg = `${found.id}: ${label || r.summary}`;
  try {
    const paths = [path.relative(root, found.file), ...(planChanges ? ['PLAN.md'] : [])];
    git(root, ['add', '--', ...paths]);
    git(root, ['commit', '-m', msg, '--', ...paths]);
    res.committed = true;
    res.commitMessage = msg;
  } catch (e) {
    res.notCommitted = `Not committed: git said ${String(e.stderr || e.message).trim().split('\n')[0]}.`;
  }
  return res;
}

// ---- command line --------------------------------------------------------------------------------

const VALUE_FLAGS = ['by', 'date', 'who', 'kind', 'why', 'on', 'id', 'option', 'recommend', 'doc'];
export function parseArgs(argv) {
  const pos = [];
  const flags = { option: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--') && a.length > 2) {
      const k = a.slice(2);
      if (['dry-run', 'no-commit', 'other'].includes(k)) flags[k] = true;
      else if (VALUE_FLAGS.includes(k)) {
        if (i + 1 >= argv.length) return { error: `--${k} needs a value.` };
        const v = argv[++i];
        if (k === 'option') flags.option.push(v); else flags[k] = v;
      } else return { error: `I do not know --${k}.` };
    } else pos.push(a);
  }
  return { pos, flags };
}

const USAGE = `Usage:
  npm run issues -- answer <issue> <decision> "<answer>" [--other]
  npm run issues -- drop <issue> <decision> ["reason"]
  npm run issues -- defer <issue> <decision> ["note"]
  npm run issues -- ask <issue> "<question>" [--option "<text>"]... [--recommend "<text>"] [--who marc] [--doc <path>]
  npm run issues -- need add <issue> --who marc --kind try --why "<text>" [--on "<text>"]
  npm run issues -- need resolve <issue> <number or words from its why>
Add --dry-run to see the change without writing it, --no-commit to skip the commit.`;

export function runCommand(argv, { root, out = console.log, err = console.error, now = today } = {}) {
  const parsed = parseArgs(argv);
  if (parsed.error) { err(`${parsed.error}\n${USAGE}`); return 1; }
  const { pos, flags } = parsed;
  const [cmd, ...rest] = pos;
  const on = flags.date || now();
  const by = flags.by || 'marc';
  let issue;
  let edit;
  let label;
  const need = (n, what) => { if (rest.length < n) { err(`Missing ${what}.\n${USAGE}`); return false; } return true; };
  if (cmd === 'answer') {
    if (!need(3, 'the issue, decision and answer')) return 1;
    [issue] = rest;
    edit = (t, name) => answerDecision(t, rest[1], rest.slice(2).join(' '), { by, on, other: !!flags.other, name });
    label = `answered ${rest[1]}`;
  } else if (cmd === 'drop' || cmd === 'defer') {
    if (!need(2, 'the issue and decision')) return 1;
    [issue] = rest;
    const fn = cmd === 'drop' ? dropDecision : deferDecision;
    edit = (t, name) => fn(t, rest[1], rest.slice(2).join(' ') || undefined, { by, on, name });
    label = `${cmd === 'drop' ? 'dropped' : 'deferred'} ${rest[1]}`;
  } else if (cmd === 'ask') {
    if (!need(2, 'the issue and the question')) return 1;
    [issue] = rest;
    edit = (t, name) => addDecision(t, {
      q: rest.slice(1).join(' '), id: flags.id, who: flags.who, options: flags.option.length ? flags.option : undefined,
      recommendation: flags.recommend, doc: flags.doc,
    }, { name });
  } else if (cmd === 'need' && rest[0] === 'add') {
    if (!need(2, 'the issue')) return 1;
    issue = rest[1];
    edit = (t, name) => addNeed(t, { who: flags.who, kind: flags.kind, why: flags.why, on: flags.on, since: on }, { name });
  } else if (cmd === 'need' && rest[0] === 'resolve') {
    if (!need(3, 'the issue and which need')) return 1;
    issue = rest[1];
    edit = (t, name) => resolveNeed(t, rest.slice(2).join(' '), { name });
  } else {
    err(USAGE);
    return 1;
  }
  const r = editIssue({ root, issue, edit, dryRun: !!flags['dry-run'], commit: !flags['no-commit'], label });
  if (!r.ok) { err(r.message); return 1; }
  out(r.message);
  out(r.diff);
  if (r.committed) out(`Committed on main: ${r.commitMessage}. Nothing was pushed.`);
  else if (r.notCommitted) out(`${r.notCommitted} Commit it yourself when you are ready; nothing was pushed.`);
  return 0;
}
