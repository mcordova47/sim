// Text review walkthrough, stage 1 (issue 140): the thin layer that reads docs/text-review.md,
// writes one mark into it (through the pure functions in scripts/text-review.mjs) and, only
// when it is safe, makes the git commit. The same pattern as scripts/issues-edit-io.mjs
// (whose hash and commit checks it reuses). Nothing here ever pushes.
//
// The commit rule is the issues one: commit only in a clean checkout of main (the doc is
// edited either way), as the git identity already configured for the repository; if any
// of that is not true the file is still written and the result says "Not committed: why".
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { hashOf, commitCheck, showDiff } from './issues-edit-io.mjs';
import { parseReview, markLine, nextUnmarked, progress } from './text-review.mjs';

export const REVIEW_PATH = 'docs/text-review.md';
export { hashOf };

const git = (root, args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

export const reviewFile = (root) => path.join(root, REVIEW_PATH);

// The doc as the page needs it: items in walkthrough order, a hash of the file for the stale guard.
export function readReview(root) {
  const file = reviewFile(root);
  if (!fs.existsSync(file)) return { ok: false, message: `There is no ${REVIEW_PATH} in this checkout.` };
  const text = fs.readFileSync(file, 'utf8');
  const parsed = parseReview(text);
  return { ok: true, hash: hashOf(text), items: parsed.items, unparsed: parsed.unparsed, sections: parsed.sections, progress: progress(parsed.items) };
}

// Mark (or clear: mark null) one item. Returns { ok, message, wrote, committed, diff, item, hash }.
// expectHash is the hash the page was shown; a different file on disk is refused.
export function markReviewLine({ root, itemId, mark, note, placeholder, expectHash = null, dryRun = false, commit = true }) {
  const file = reviewFile(root);
  if (!fs.existsSync(file)) return { ok: false, message: `There is no ${REVIEW_PATH} in this checkout.` };
  const before = fs.readFileSync(file, 'utf8');
  if (expectHash && hashOf(before) !== expectHash) {
    return { ok: false, message: 'The text review changed on disk since it was shown, so nothing was changed. Reload and try again.' };
  }
  const r = markLine(before, itemId, mark, note, placeholder === undefined ? {} : { placeholder });
  if (r.ok === false) return { ok: false, message: r.message };
  const base = { ok: true, wrote: false, committed: false, summary: r.summary, item: r.item, previous: r.previous, hash: hashOf(r.text) };
  if (r.unchanged) return { ...base, message: 'Already marked that way. Nothing to change.', hash: hashOf(before) };
  const diff = showDiff('text-review.md', before, r.text).split('\n').map((l) => l.replace(/^(---|\+\+\+) issues\//, '$1 docs/')).join('\n');
  if (dryRun) return { ...base, diff, message: `${r.summary} (dry run: nothing was written)` };

  const gate = commit ? commitCheck(root, file) : { ok: false, why: 'it was asked not to' };
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, r.text);
  fs.renameSync(tmp, file);
  const res = { ...base, wrote: true, diff, message: `Text review: ${r.summary}.` };
  if (!gate.ok) return { ...res, notCommitted: `Not committed: ${gate.why}.` };
  const msg = `text review: ${r.summary}`;
  try {
    git(root, ['add', '--', REVIEW_PATH]);
    git(root, ['commit', '-m', msg, '--', REVIEW_PATH]);
    return { ...res, committed: true, commitMessage: msg };
  } catch (e) {
    return { ...res, notCommitted: `Not committed: git said ${String(e.stderr || e.message).trim().split('\n')[0]}.` };
  }
}

// The next card for the walkthrough: the next unmarked item after `afterId`, skipped ids last.
export function nextCard({ root, afterId = null, skipped = [] }) {
  const r = readReview(root);
  if (!r.ok) return r;
  return { ok: true, hash: r.hash, item: nextUnmarked(r.items, afterId, skipped), progress: r.progress };
}
