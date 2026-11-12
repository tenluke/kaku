export type JlptLevel = 1 | 2 | 3 | 4 | 5;

const isJlptLevel = (value: unknown): value is JlptLevel =>
  value === 1 || value === 2 || value === 3 || value === 4 || value === 5;

/**
 * Reads the modern JLPT level (N5–N1) of each kanji from kanji-data's kanji.json.
 * Only the `jlpt_new` field is used; everything else there comes from KANJIDIC, which we
 * read directly instead.
 */
export function parseJlptLevels(kanjiDataJson: string): Map<string, JlptLevel> {
  const data = JSON.parse(kanjiDataJson) as Record<string, { jlpt_new?: unknown }>;
  const levels = new Map<string, JlptLevel>();
  for (const [character, entry] of Object.entries(data)) {
    if (isJlptLevel(entry.jlpt_new)) levels.set(character, entry.jlpt_new);
  }
  return levels;
}
