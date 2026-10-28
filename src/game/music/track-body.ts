// A made track's identity for syncing (issue 102, docs/sync.md section 4.2): its `.track` text without
// the title line, so a copy that was renamed on arrival is still the same track.

const TITLE_LINE = /^[ \t]*title[ \t]*:.*$/im;

export function trackBody(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(TITLE_LINE, "").replace(/^\n/, "");
}

// The same text with a different title line.
export function withTitle(text: string, title: string): string {
  return text.replace(TITLE_LINE, `title: ${title}`);
}
