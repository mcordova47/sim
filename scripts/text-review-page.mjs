// Text review walkthrough, stage 2 (issue 141; design: issue 139): the card model, the markup, the
// styles and the script of text.html, the page in the local issues server where Marc marks the
// lines of docs/text-review.md one at a time. The page exists only in served builds (the static
// pages never get it). It reads cards from GET api/text/card and writes through POST
// api/text/mark, which calls the tested mark function (scripts/text-review.mjs) in the I/O layer.
import { readGlyphs } from './pixel-font.mjs';

// ---- the one switch for open decision d1 (issue 141) -----------------------------------------
// The dialog tree appears twice in the text review (under Dialogs and under contemplate), so 19
// lines are duplicates (items carry `duplicateOf`: the id of the first copy).
//   'once'      (the recommendation) the walkthrough shows each such line once, and its mark is
//               written to every copy in the same edit and the same commit.
//   'separately' every copy is its own card, marked on its own.
// Marc has not answered yet; changing this one word is the whole change.
export const DUPLICATE_POLICY = 'once';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const sameMark = (a, b) => (!a && !b) || (!!a && !!b && a.kind === b.kind && (a.note || '') === (b.note || ''));

// A copy is "in step" when it carries the same mark as its first copy (both unmarked counts).
// A copy that is out of step (hand-marked differently, or left unmarked when the first copy is
// marked) is never overwritten by a mark on the first copy, and is shown as a card of its own.
const inStep = (items, copy) => sameMark(copy.mark, (items.find((x) => x.id === copy.duplicateOf) || {}).mark);

// The items the walkthrough walks through, in order.
export function visibleItems(items, policy = DUPLICATE_POLICY) {
  return policy === 'once' ? items.filter((x) => !x.duplicateOf || !inStep(items, x)) : items;
}

// The ids a mark on `item` also covers: its later copies that are in step with it (policy 'once').
export function copiesOf(items, item, policy = DUPLICATE_POLICY) {
  if (policy !== 'once') return [];
  return items.filter((x) => x.duplicateOf === item.id && sameMark(x.mark, item.mark));
}

// A label that sits inside the text ("Fixed phone-view line (one is chosen ...): You scroll ...")
// is shown apart from the string itself. Only the clear cases: the first string of a line that
// holds several, or a label with a bracketed remark before the colon.
export function splitLabel(item) {
  if (item.shape !== 'bullet' || item.tag) return { label: null, body: item.text };
  const m = /^([^:()]{2,70}\([^()]{0,300}\)|[^:()]{2,70}): (\S[\s\S]*)$/.exec(item.text);
  if (!m) return { label: null, body: item.text };
  const bracketed = /\(/.test(m[1]);
  if (bracketed || (item.segments > 1 && item.segment === 0)) return { label: m[1], body: m[2] };
  return { label: null, body: item.text };
}

let covered = null;
const glyphs = () => (covered ||= new Set([...Object.keys(readGlyphs()), ' ']));
// The game's pixel font draws capitals, digits and a little punctuation. A string reads well in it
// when every character is drawn and it is not a long paragraph.
export const PIXEL_MAX = 110;
export function pixelFits(text) {
  if (text.length > PIXEL_MAX) return false;
  const g = glyphs();
  return [...text.toUpperCase()].every((c) => g.has(c));
}

export function cardOf(item, items = []) {
  const { label, body } = splitLabel(item);
  const copies = copiesOf(items, item);
  const big = item.shape === 'table' ? (item.cells[1] || item.cells[0] || item.text) : body;
  const mark = item.mark && item.mark.kind !== 'unknown' ? { kind: item.mark.kind, note: item.mark.note || '' }
    : item.mark ? { kind: 'unknown', note: item.mark.note || '' } : null;
  return {
    id: item.id, shape: item.shape, label, body, big, pixel: pixelFits(big),
    cells: item.shape === 'table' ? item.cells.map((c, k) => ({ name: item.columns[k], value: c })) : null,
    heading: item.heading, path: (item.sectionPath || []).slice(1), group: item.group || null, context: item.context || '',
    tag: item.tag || null, mark, copies: [...new Set(copies.map((c) => c.heading))],
  };
}

// A calm line about the section the card is in. Words, not a count that nags.
export function progressWords(items, item) {
  const inSection = visibleItems(items).filter((x) => x.section === item.section);
  const left = inSection.filter((x) => !x.mark && x.id !== item.id).length;
  if (left === 0) return 'This is the last line in this section.';
  if (left <= 4) return 'A few left in this section.';
  return 'There is more in this section, and no rush.';
}

// ---- markup ----------------------------------------------------------------------------------

export function textBody() {
  return `<h1>Text review</h1>
<p class="lede">One line at a time. A mark is written into <code>docs/text-review.md</code>; nothing changes in the game until an agent applies the marks later.</p>
<section class="tr" id="tr" aria-live="polite">
<p class="calm" id="tr-loading">Looking for the next line...</p>
<article class="tr-card" id="tr-card" hidden>
<p class="tr-progress muted" id="tr-progress"></p>
<p class="tr-label muted" id="tr-label" hidden></p>
<p class="tr-big" id="tr-big"></p>
<p class="tr-asis muted" id="tr-asis" hidden></p>
<dl class="tr-cells" id="tr-cells" hidden></dl>
<p class="tr-status" id="tr-status" hidden></p>
<div class="tr-actions tools" id="tr-actions">
<button type="button" data-tr="keep"><u>K</u>eep</button>
<button type="button" data-tr="soften"><u>S</u>often</button>
<button type="button" data-tr="rewrite"><u>R</u>ewrite</button>
<button type="button" data-tr="skip">Skip</button>
<button type="button" data-tr="back">Back</button>
<button type="button" data-tr="clear" hidden>Clear the mark</button>
</div>
<form class="tr-note" id="tr-note" hidden>
<label class="field" for="tr-note-input" id="tr-note-label"></label>
<input type="text" id="tr-note-input" autocomplete="off" spellcheck="true">
<div class="tools"><button type="submit">Save</button><button type="button" data-tr="cancel">Cancel</button></div>
</form>
<p class="answer-msg" id="tr-msg" role="status" aria-live="polite"></p>
<h2 class="tr-heading" id="tr-heading"></h2>
<p class="tr-context muted" id="tr-context"></p>
<p class="tr-also muted" id="tr-also" hidden></p>
<p class="tr-keys muted">Keys: K keep, S soften, R rewrite, left arrow back, right arrow skip.</p>
</article>
<div id="tr-empty" hidden><p class="calm">Nothing is waiting for a mark.</p><p><button type="button" data-tr="back">Go back to the last one</button></p></div>
</section>`;
}

export const TEXT_CSS = `
.tr { margin-top: 8px; }
.tr-card { background: var(--surface); padding: 16px 16px 12px; box-shadow: var(--edge, 0 0 0 1px var(--line)); margin: 2px; min-width: 0; }
.tr-progress { font-size: 0.85rem; margin: 0 0 8px; }
.tr-label { font-size: 0.9rem; margin: 0 0 6px; }
.tr-big { font-family: var(--sans); font-size: 1.35rem; line-height: 1.5; margin: 4px 0 8px; overflow-wrap: anywhere; word-break: normal; hyphens: manual; }
.tr-big.pixel { font-family: var(--pixel); font-size: 24px; line-height: 1.7; text-transform: uppercase; color: var(--text); }
@media (max-width: 480px) { .tr-big.pixel { font-size: 16px; } }
.tr-asis { font-size: 0.9rem; margin: 0 0 8px; }
.tr-cells { margin: 6px 0 10px; display: grid; grid-template-columns: max-content 1fr; gap: 2px 12px; font-size: 0.9rem; }
.tr-cells dt { color: var(--muted); } .tr-cells dd { margin: 0; min-width: 0; }
.tr-status { margin: 4px 0; padding: 4px 10px; background: var(--need-bg); color: var(--need-text); }
.tr-actions { margin: 12px 0 6px; }
.tr-actions button u { text-decoration-thickness: 1px; }
.tr-note { display: grid; gap: 8px; margin: 8px 0; }
.tr-note input[type="text"] { display: block; width: calc(100% - 4px); margin: 3px 2px 0; font: inherit; font-size: 1rem; color: var(--text); background: var(--bg); border: 0; border-radius: 0; box-shadow: var(--edge, 0 0 0 1px var(--line)); padding: 8px; }
.tr-note .field { font-size: 0.9rem; color: var(--muted); }
.tr-heading { font-size: 12px; color: var(--muted); margin: 18px 0 4px; }
.tr-context { font-size: 0.88rem; margin: 2px 0 8px; white-space: pre-line; }
.tr-also, .tr-keys { font-size: 0.82rem; margin: 6px 0 2px; }
@media (max-width: 480px) { .tr-actions button { flex: 1 1 28%; } }
`;

export const TEXT_SCRIPT = `(function () {
  var meta = document.querySelector('meta[name="issues-token"]');
  var el = function (id) { return document.getElementById(id); };
  if (!el('tr') || !meta || !window.fetch) return;
  var token = meta.getAttribute('content');
  var S = { hash: '', trail: [], pos: -1, skipped: [], originals: {}, busy: false, note: null };

  function say(text, kind) { var m = el('tr-msg'); m.textContent = text || ''; m.className = 'answer-msg' + (kind ? ' ' + kind : ''); }
  function getJson(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) { return r.json(); });
  }
  function post(body) {
    return fetch('api/text/mark', { method: 'POST', headers: { 'content-type': 'application/json', 'x-issues-token': token }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, message: 'The server gave an answer this page could not read.' }; }); });
  }
  var unreachable = 'The page could not reach the local server. Nothing was changed.';

  function withCode(node, text) {
    node.textContent = '';
    text.split('\`').forEach(function (part, k) {
      if (k % 2) { var c = document.createElement('code'); c.textContent = part; node.appendChild(c); }
      else node.appendChild(document.createTextNode(part.replace(/\\*\\*/g, '')));
    });
  }
  function current() { return S.trail[S.pos] || null; }

  function render() {
    var c = current();
    el('tr-loading').hidden = true;
    if (S.empty) c = null;
    el('tr-card').hidden = !c;
    el('tr-empty').hidden = !!c;
    closeNote();
    if (!c) { setBusy(false); return; }
    var card = c.card;
    el('tr-progress').textContent = c.card.mark ? '' : (c.words || '');
    el('tr-progress').hidden = !!card.mark;
    var lab = el('tr-label');
    lab.hidden = !card.label; lab.textContent = card.label ? 'Label (not part of the string): ' + card.label : '';
    var big = el('tr-big');
    big.textContent = card.big; big.className = 'tr-big' + (card.pixel ? ' pixel' : '');
    var asis = el('tr-asis');
    asis.hidden = !card.pixel; asis.textContent = card.pixel ? 'As written: ' + card.big : '';
    var cells = el('tr-cells'); cells.textContent = '';
    if (card.cells) {
      card.cells.forEach(function (x, k) {
        if (!x.value || x.name === 'id') return;
        var dt = document.createElement('dt'); dt.textContent = x.name;
        var dd = document.createElement('dd'); dd.textContent = x.value;
        cells.appendChild(dt); cells.appendChild(dd);
      });
    }
    cells.hidden = !card.cells;
    var st = el('tr-status');
    if (card.mark) {
      var k = card.mark.kind;
      st.textContent = k === 'unknown' ? 'This line has a mark this page does not recognize: ' + card.mark.note
        : 'Marked ' + k + (card.mark.note ? ': ' + card.mark.note : '') + '.';
    }
    st.hidden = !card.mark;
    document.querySelector('[data-tr="clear"]').hidden = !card.mark;
    document.querySelector('#tr-actions [data-tr="back"]').disabled = S.pos <= 0;
    var h = el('tr-heading'); h.textContent = (card.path.length ? card.path.join(' / ') + ' / ' : '') + card.heading;
    withCode(el('tr-context'), (card.group ? card.group.replace(/\\*\\*/g, '') + '\\n' : '') + (card.context || ''));
    var also = el('tr-also');
    also.hidden = !card.copies.length;
    also.textContent = card.copies.length ? 'This line also appears under ' + card.copies.join(' and ') + '. One mark covers every copy.' : '';
    setBusy(false);
  }

  function setBusy(b) {
    S.busy = b;
    document.querySelectorAll('#tr-actions button').forEach(function (x) { x.disabled = b || (x.getAttribute('data-tr') === 'back' && S.pos <= 0); });
  }

  function fetchNext(after) {
    var q = 'api/text/card?after=' + encodeURIComponent(after || '') + '&skipped=' + encodeURIComponent(S.skipped.join(','));
    return getJson(q).then(function (res) {
      if (!res.ok) { say(res.message || 'Nothing could be loaded.', 'refused'); el('tr-loading').hidden = true; return false; }
      S.hash = res.hash;
      if (!res.card) { S.empty = true; render(); return true; }
      S.empty = false;
      S.trail.push({ card: res.card, words: res.words });
      S.pos = S.trail.length - 1;
      render();
      return true;
    }).catch(function () { el('tr-loading').hidden = true; say(unreachable, 'refused'); setBusy(false); return false; });
  }

  function advance() {
    // After a mark or a skip: the next card in the trail if we went back, else a new one.
    var c = current();
    if (S.pos < S.trail.length - 1) { S.pos += 1; render(); return Promise.resolve(); }
    return fetchNext(c ? c.card.id : '');
  }

  function closeNote() { S.note = null; el('tr-note').hidden = true; }
  function openNote(kind) {
    var c = current(); if (!c) return;
    S.note = kind;
    var lab = el('tr-note-label'); var inp = el('tr-note-input');
    lab.textContent = kind === 'rewrite' ? 'The new text' : 'A note about what to soften (optional)';
    inp.value = kind === 'rewrite' ? (c.card.mark && c.card.mark.kind === 'rewrite' ? c.card.mark.note : c.card.body) : (c.card.mark && c.card.mark.kind === 'soften' ? c.card.mark.note : '');
    el('tr-note').hidden = false;
    say('');
    inp.focus(); inp.select();
  }

  function doMark(mark, note) {
    var c = current(); if (!c || S.busy) return;
    var placeholders = {};
    Object.keys(S.originals).forEach(function (id) { placeholders[id] = S.originals[id].placeholder; });
    setBusy(true); say('Saving...', '');
    post({ id: c.card.id, hash: S.hash, mark: mark, note: note || '', placeholders: mark === 'clear' ? placeholders : undefined }).then(function (res) {
      if (!res.ok) { setBusy(false); say(res.message || 'Nothing was changed.', 'refused'); return; }
      S.hash = res.hash || S.hash;
      var prev = res.previousAll || {};
      Object.keys(prev).forEach(function (id) { if (!S.originals[id]) S.originals[id] = prev[id]; });
      if (mark === 'clear') Object.keys(prev).forEach(function (id) { delete S.originals[id]; });
      c.card.mark = res.card ? res.card.mark : null;
      var t = res.message || '';
      if (res.committed) t += ' Committed on main. Nothing was pushed.';
      else if (res.notCommitted) t += ' ' + res.notCommitted + ' Commit it yourself when you are ready; nothing was pushed.';
      if (mark === 'clear') { render(); say(t, 'confirm'); return; }
      advance().then(function () { say(t, 'confirm'); });
    }).catch(function () { setBusy(false); say(unreachable, 'refused'); });
  }

  function act(name) {
    if (S.busy) return;
    var c = current();
    if (S.empty && name !== 'back') return;
    if (name === 'keep') doMark('keep');
    else if (name === 'soften' || name === 'rewrite') openNote(name);
    else if (name === 'clear') doMark('clear');
    else if (name === 'cancel') { closeNote(); say(''); }
    else if (name === 'back') {
      if (S.empty && S.trail.length) { S.empty = false; S.pos = S.trail.length - 1; say(''); render(); }
      else if (S.pos > 0) { S.pos -= 1; say(''); render(); }
    }
    else if (name === 'skip') {
      if (!c) return;
      if (!c.card.mark && S.skipped.indexOf(c.card.id) < 0) S.skipped.push(c.card.id);
      say(''); advance();
    }
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('button[data-tr]');
    if (!b || !el('tr').contains(b)) return;
    ev.preventDefault(); act(b.getAttribute('data-tr'));
  });
  el('tr-note').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var v = el('tr-note-input').value.trim();
    if (S.note === 'rewrite' && !v) { say('Write the new text first, or press Cancel.', 'refused'); return; }
    doMark(S.note, v);
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var t = ev.target; var tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { if (ev.key === 'Escape' && S.note) { ev.preventDefault(); act('cancel'); } return; }
    if (!current() && !S.empty) return;
    var k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    var map = { k: 'keep', s: 'soften', r: 'rewrite', ArrowLeft: 'back', ArrowRight: 'skip' };
    if (!map[k]) return;
    ev.preventDefault(); act(map[k]);
  });

  fetchNext('');
})();
`;
