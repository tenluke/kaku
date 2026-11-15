// Writes JSON with one entry per line: still valid JSON, but a change to one character
// shows up as a one-line difference in git.

export function objectPerLine(entries: Record<string, unknown>): string {
  const lines = Object.entries(entries).map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`,
  );
  return `{\n${lines.join(',\n')}\n}\n`;
}

export function arrayPerLine(items: readonly unknown[]): string {
  const lines = items.map((item) => `  ${JSON.stringify(item)}`);
  return `[\n${lines.join(',\n')}\n]\n`;
}
