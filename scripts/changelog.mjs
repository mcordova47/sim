// A draft changelog for a production release (issue 160).
//
//   npm run changelog                      what main has that production does not
//   npm run changelog -- --from <ref> --to <ref>
//
// Prints Markdown. Reads the issue files at the --to ref (not the working
// tree), so it works on a clean checkout. Commits nothing, changes nothing.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseIssue } from './issues.mjs';
import { buildChangelog, mergedId, renderChangelog } from './changelog-lib.mjs';

const git = (args, opts = {}) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'], ...opts });
const refExists = (ref) => { try { git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]); return true; } catch { return false; } };

export function resolveRange({ from, to = 'HEAD' }) {
  if (from) {
    if (!refExists(from)) throw new Error(`The ref "${from}" does not exist.`);
    return { from, to, note: null };
  }
  for (const ref of ['origin/production', 'production']) {
    if (refExists(ref)) return { from: ref, to, note: null };
  }
  return {
    from: null, to,
    note: 'No production branch was found, so this lists everything since the first commit.',
  };
}

const idOf = (file) => (/(?:^|\/)(\d{3}[a-z]?)-[^/]*\.md$/.exec(file) || [])[1];

function issuesAt(ref) {
  const out = {};
  const files = git(['ls-tree', '-r', '--name-only', ref, 'issues/']).split('\n').filter((f) => idOf(f));
  for (const f of files) {
    const issue = parseIssue(path.basename(f), git(['show', `${ref}:${f}`]));
    if (!issue.errors.length) out[idOf(f)] = issue.fm;
  }
  return out;
}

export function collect({ from, to }) {
  const after = issuesAt(to);
  const before = from ? issuesAt(from) : {};
  const range = from ? `${from}..${to}` : to;
  // Newest time per id: from "Merge NNN:" commits and from commits touching the issue file.
  const times = {};
  const bump = (id, t) => { if (!(times[id] >= t)) times[id] = t; };
  for (const line of git(['log', '--format=%ct%x09%s', range]).split('\n').filter(Boolean)) {
    const [t, ...s] = line.split('\t');
    const id = mergedId(s.join('\t'));
    if (id) bump(id, Number(t));
  }
  const ids = new Set(Object.keys(times));
  for (const id of Object.keys(after)) {
    if (after[id].status === 'done' && before[id]?.status !== 'done') ids.add(id);
  }
  const items = [];
  for (const id of ids) {
    if (!after[id]) continue;
    if (!(id in times)) {
      const t = git(['log', '-1', '--format=%ct', range, '--', `issues/${id}-*.md`]).trim();
      times[id] = Number(t) || 0;
    }
    items.push({ id, fm: after[id], time: times[id] });
  }
  return items;
}

function main(argv) {
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--from' || argv[i] === '--to') opt[argv[i].slice(2)] = argv[++i];
    else { console.error('usage: npm run changelog -- [--from <ref>] [--to <ref>]'); return 2; }
  }
  try {
    const range = resolveRange(opt);
    process.stdout.write(renderChangelog(buildChangelog(collect(range)), { note: range.note }));
    return 0;
  } catch (e) {
    console.error(`error: ${e.message}`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
