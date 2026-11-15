// Issue 133: the issue pages' own look. Palette tokens, no outside requests, the embedded
// pixel font, the favicon, and WCAG AA contrast for the main text pairs in both themes.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze } from './issues.mjs';
import { buildSite, buildCss, CSS_TOKENS, LOOK } from './issues-site.mjs';
import { buildPixelFont, readGlyphs } from './pixel-font.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const palette = JSON.parse(fs.readFileSync(path.join(root, 'art', 'palette.json'), 'utf8')).colors;
const byName = Object.fromEntries(Object.values(palette).map((c) => [c.name, c.hex.toLowerCase()]));
const git = { commit: 'abc1234', date: '2026-11-15', branch: 'main', dirty: false, merges: [] };
const issues = analyze([{ name: '001-x.md', text: '---\nid: "001"\ntitle: "T"\nstatus: todo\nowner: claude\ndepends_on: []\n---\n## Goal\ng\n' }]).issues;
const site = buildSite(issues, git);

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe('the theme tokens', () => {
  it('every hex colour in the tokens is a colour of art/palette.json', () => {
    const hexes = [...CSS_TOKENS.matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0].toLowerCase());
    expect(hexes.length).toBeGreaterThan(8);
    for (const h of hexes) expect(Object.values(byName), h).toContain(h);
  });
  it('the text pairs are readable (WCAG AA, 4.5:1) in light and dark', () => {
    const pairs = {
      light: [['ink', 'paper'], ['slate', 'paper'], ['oak', 'paper'], ['walnut', 'cream']],
      dark: [['paper', 'ink'], ['mist', 'ink'], ['tangerine', 'ink'], ['paper', 'night'], ['mist', 'night'], ['tangerine', 'night'], ['butter', 'slate']],
    };
    for (const [theme, list] of Object.entries(pairs)) for (const [f, b] of list) expect(ratio(byName[f], byName[b]), `${theme} ${f} on ${b}`).toBeGreaterThanOrEqual(4.5);
  });
  it('uses no red and no alarm words', () => {
    expect(CSS_TOKENS).not.toMatch(/brick|#d64550|red/i);
  });
});

describe('the pages work offline', () => {
  it('no page, stylesheet or script names an outside URL or a web font', () => {
    for (const [name, content] of Object.entries(site)) {
      if (typeof content !== 'string' || name === 'issues.json') continue;
      expect(content, name).not.toMatch(/(?:src|href)="(?:https?:)?\/\//);
      expect(content, name).not.toMatch(/url\(\s*["']?(?:https?:)?\/\//);
      expect(content, name).not.toMatch(/@import|fonts\.googleapis|gstatic/);
    }
  });
  it('embeds the pixel font as a data URI', () => {
    expect(site['style.css']).toMatch(/@font-face[^}]*src: url\(data:font\/ttf;base64,/);
  });
  it('writes the egg as the favicon and as the header mark', () => {
    expect(Buffer.isBuffer(site['favicon.png'])).toBe(true);
    expect(site['favicon.png'].subarray(1, 4).toString()).toBe('PNG');
    expect(site['favicon.png'].equals(fs.readFileSync(path.join(root, 'public', 'favicon.png')))).toBe(true);
    expect(site['index.html']).toContain('<link rel="icon" type="image/png" href="favicon.png">');
    expect(site['index.html']).toContain('<img src="favicon.png"');
  });
});

describe('the extras are options', () => {
  it('pixel edges are on and the empty-state egg is off by default; both can change', () => {
    expect(LOOK).toEqual({ pixelEdges: true, emptyEgg: false });
    expect(buildCss()).toContain('--edge:');
    expect(buildCss()).not.toContain('favicon.png');
    expect(buildCss({ pixelEdges: false })).not.toContain('--edge:');
    expect(buildCss({ emptyEgg: true })).toContain('url(favicon.png)');
  });
});

describe('the pixel font', () => {
  const font = buildPixelFont();
  it('is a TrueType file with the tables a browser needs', () => {
    expect(font.readUInt32BE(0)).toBe(0x00010000);
    const n = font.readUInt16BE(4);
    const tags = Array.from({ length: n }, (_, i) => font.subarray(12 + i * 16, 16 + i * 16).toString());
    for (const t of ['cmap', 'glyf', 'head', 'hhea', 'hmtx', 'loca', 'maxp', 'name', 'OS/2', 'post']) expect(tags).toContain(t);
  });
  it('reads the game glyphs: capitals, digits and punctuation', () => {
    const g = readGlyphs();
    for (const ch of ['A', 'Z', '0', '9', ':', '(', ')']) expect(g[ch], ch).toHaveLength(7);
    expect(Object.keys(g).length).toBeGreaterThan(60);
  });
});
