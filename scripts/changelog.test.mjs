import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze } from './issues.mjs';
import { buildChangelog, changelogProblem, entryFor, mergedId, renderChangelog } from './changelog-lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const done = (extra) => ({ status: 'done', title: 'A title', ...extra });

describe('mergedId', () => {
  it('reads the issue id from a merge subject', () => {
    expect(mergedId('Merge 153: takeout')).toBe('153');
    expect(mergedId('Merge 091d: x')).toBe('091d');
    expect(mergedId('Merge remote-tracking branch origin/main')).toBeNull();
    expect(mergedId('Merge main into 111d')).toBeNull();
    expect(mergedId('153: takeout')).toBeNull();
  });
});

describe('entryFor', () => {
  it('lists build and fix issues, preferring the changelog sentence over the summary', () => {
    expect(entryFor(done({ kind: 'build', summary: 'S', changelog: 'C' }))).toEqual({ group: 'new', text: 'C' });
    expect(entryFor(done({ kind: 'build', summary: 'S' }))).toEqual({ group: 'new', text: 'S' });
    expect(entryFor(done({ kind: 'fix' }))).toEqual({ group: 'fixes', text: 'A title' });
  });
  it('leaves out process kinds, unkinded issues and "none"', () => {
    for (const kind of ['design', 'research', 'chore', 'umbrella', undefined]) {
      expect(entryFor(done({ kind, summary: 'S' }))).toBeNull();
    }
    expect(entryFor(done({ kind: 'build', changelog: 'none' }))).toBeNull();
    expect(entryFor(done({ kind: 'build', changelog: 'None' }))).toBeNull();
  });
  it('lets an issue say a sentence even when its kind is a process kind', () => {
    expect(entryFor(done({ kind: 'design', changelog: 'Hi' }))).toEqual({ group: 'new', text: 'Hi' });
  });
  it('skips issues that are not done', () => {
    expect(entryFor({ status: 'review', kind: 'build', summary: 'S' })).toBeNull();
  });
});

describe('render', () => {
  const items = [
    { id: '151', time: 1, fm: done({ kind: 'build', summary: 'Older' }) },
    { id: '153', time: 3, fm: done({ kind: 'build', summary: 'Newest.' }) },
    { id: '150', time: 2, fm: done({ kind: 'fix', summary: 'Fixed' }) },
  ];
  it('groups, orders newest first and ends each line with the id', () => {
    expect(renderChangelog(buildChangelog(items))).toBe(
      '## New\n\n- Newest. (153)\n- Older. (151)\n\n## Fixes\n\n- Fixed. (150)\n',
    );
  });
  it('says so calmly when there is nothing to list, and shows a note', () => {
    expect(renderChangelog(buildChangelog([]))).toMatch(/^Nothing new for players/);
    expect(renderChangelog(buildChangelog([]), { note: 'N' }).startsWith('_N_\n')).toBe(true);
  });
});

describe('the changelog field in the validator', () => {
  it('accepts a short sentence and none, rejects empty and long ones', () => {
    expect(changelogProblem('Order takeout.')).toBeNull();
    expect(changelogProblem('none')).toBeNull();
    expect(changelogProblem('')).toMatch(/short sentence/);
    expect(changelogProblem('x'.repeat(141))).toMatch(/141 characters/);
    expect(changelogProblem('x'.repeat(140))).toBeNull();
    expect(changelogProblem('a\nb')).toMatch(/single line/);
  });
  it('reaches the issue checker', () => {
    const f = (c) => ({ name: '001-x.md', text: `---\nid: 001\ntitle: T\nstatus: todo\nowner: claude\ndepends_on: []\nchangelog: "${c}"\n---\n## Goal\ng\n` });
    expect(analyze([f('ok')]).errors).toEqual([]);
    expect(analyze([f('x'.repeat(200))]).errors.map((e) => e.message).join()).toMatch(/200 characters/);
  });
});

// The command over a tiny throwaway repository.
describe('npm run changelog over a small history', () => {
  const dir = mkdtempSync(join(tmpdir(), 'changelog-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.com' } });
  const issue = (id, status, extra = '') =>
    writeFileSync(join(dir, 'issues', `${id}-x.md`), `---\nid: "${id}"\ntitle: "Title ${id}"\nstatus: ${status}\nowner: claude\ndepends_on: []\n${extra}---\n## Goal\ng\n`);
  const run = (...args) => execFileSync('node', [resolve(here, 'changelog.mjs'), ...args], { cwd: dir, encoding: 'utf8' });

  git('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'issues'));
  issue('001', 'done', 'kind: build\nsummary: "Old thing"\n');
  git('add', '.'); git('commit', '-q', '-m', 'Merge 001: old');
  git('branch', 'production');
  issue('002', 'done', 'kind: build\nsummary: "Summary two"\nchangelog: "Two, for players"\n');
  issue('003', 'done', 'kind: fix\nsummary: "Three fixed"\n');
  issue('004', 'done', 'kind: design\nsummary: "Process"\n');
  issue('005', 'review', 'kind: build\nsummary: "Not yet"\n');
  git('add', '.'); git('commit', '-q', '-m', 'Merge 002: two');
  git('commit', '-q', '--allow-empty', '-m', 'Merge 003: three');

  it('lists what production lacks, found from files that turned done', () => {
    const out = run();
    expect(out).toContain('- Two, for players. (002)');
    expect(out).toContain('## Fixes');
    expect(out).toContain('- Three fixed. (003)');
    expect(out).not.toMatch(/Old thing|Process|Not yet/);
  });
  it('falls back to the first commit with a note when there is no production branch', () => {
    git('branch', '-m', 'production', 'gone');
    const out = run();
    git('branch', '-m', 'gone', 'production');
    expect(out).toMatch(/^_No production branch/);
    expect(out).toContain('Old thing. (001)');
  });
  it('honours --from and --to and says when nothing is new', () => {
    expect(run('--from', 'main', '--to', 'main')).toMatch(/Nothing new/);
    expect(run('--from', 'HEAD~1', '--to', 'HEAD')).toContain('(003)');
  });
  it('fails plainly on an unknown ref', () => {
    expect(() => run('--from', 'nope')).toThrow();
  });
});
