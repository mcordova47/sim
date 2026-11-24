// Release changelog (issue 160): pure functions. No git, no file access here;
// scripts/changelog.mjs gathers the facts and calls these.
//
// A release lists the done issues that landed in a range. Each line is the
// issue's `changelog:` sentence, else its `summary`, else its title.
export const CHANGELOG_LIMIT = 140;
export const LISTED_KINDS = ['build', 'fix'];

// "Merge 153: takeout" -> "153"; "Merge 091d: x" -> "091d"; anything else -> null.
export function mergedId(subject) {
  const m = /^Merge (\d{3}[a-z]?)(?::|\s)/.exec(subject || '');
  return m ? m[1] : null;
}

// Decide what one issue contributes: { group: 'new' | 'fixes', text } or null.
export function entryFor(fm) {
  if (!fm || fm.status !== 'done') return null;
  const own = typeof fm.changelog === 'string' ? fm.changelog.trim() : '';
  if (own.toLowerCase() === 'none') return null;
  const group = fm.kind === 'fix' ? 'fixes' : 'new';
  if (own) return { group, text: own };
  // No sentence of its own: only player-facing kinds are listed.
  if (!LISTED_KINDS.includes(fm.kind)) return null;
  const text = (fm.summary || fm.title || '').trim();
  return text ? { group, text } : null;
}

const withStop = (t) => (/[.!?]$/.test(t) ? t : `${t}.`);

// items: [{ id, fm, time }]. Newest first within a group (ties: higher id first).
export function buildChangelog(items) {
  const groups = { new: [], fixes: [] };
  for (const it of items) {
    const e = entryFor(it.fm);
    if (e) groups[e.group].push({ id: it.id, time: it.time || 0, text: e.text });
  }
  const order = (a, b) => b.time - a.time || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
  for (const g of Object.values(groups)) g.sort(order);
  return groups;
}

export function renderChangelog(groups, { note } = {}) {
  const out = [];
  if (note) out.push(`_${note}_`, '');
  const sections = [['New', groups.new], ['Fixes', groups.fixes]];
  let any = false;
  for (const [title, list] of sections) {
    if (!list.length) continue;
    any = true;
    out.push(`## ${title}`, '');
    for (const e of list) out.push(`- ${withStop(e.text)} (${e.id})`);
    out.push('');
  }
  if (!any) out.push('Nothing new for players in this release.', '');
  return out.join('\n');
}

// For the validator: one problem message for a bad `changelog` value, or null.
export function changelogProblem(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return '"changelog" must be one short sentence, or none to leave the issue out.';
  }
  if (/[\r\n]/.test(value)) return 'The changelog sentence must be a single line.';
  if (value.length > CHANGELOG_LIMIT) {
    return `The changelog sentence is ${value.length} characters; at most ${CHANGELOG_LIMIT}.`;
  }
  return null;
}
