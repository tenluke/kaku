import type { JlptLevel } from './jlpt.ts';

/*
 * The JLPT level of words, from Jonathan Waller's JLPT vocabulary lists (CC BY), as kept in
 * open-anki-jlpt-decks (MIT): one CSV file per level, columns expression, reading, meaning, …
 * The JLPT has published no official lists since 2010; these are the most widely used.
 */

/** Splits one CSV line into fields; a field in double quotes may contain commas and "". */
export function csvFields(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quoted && char === '"' && line[index + 1] === '"') {
      field += '"';
      index++;
    } else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      fields.push(field);
      field = '';
    } else field += char;
  }
  fields.push(field);
  return fields;
}

/** The key of a word in the lists and in words.json: its spelling and its reading. */
export const wordKey = (spelling: string, reading: string): string => `${spelling}|${reading}`;

/** "～円" → "円", "(日本) 式" → "式": affix marks, notes in brackets and spaces left out. */
const cleanForm = (text: string): string =>
  text
    .replace(/[(（][^)）]*[)）]/g, '')
    .replace(/[～〜~\s]/g, '')
    .trim();

/**
 * The spelling and reading pairs of one list entry. The lists write alternatives as
 * "足; 脚" or "いく; ゆく", and verbs with する as "運動 うんどうする": JMdict has the noun
 * (うんどう), so the reading without する counts too.
 */
export function entryForms(expression: string, reading: string): [string, string][] {
  const spellings = expression.split(/[;；]/).map(cleanForm).filter(Boolean);
  const readings = reading.split(/[;；]/).map(cleanForm).filter(Boolean);
  const withoutSuru = readings.flatMap((kana) =>
    kana.endsWith('する') && kana.length > 2 ? [kana.slice(0, -2)] : [],
  );
  return spellings.flatMap((spelling) =>
    [...readings, ...withoutSuru].map((kana): [string, string] => [spelling, kana]),
  );
}

/**
 * Reads one level's list into `levels` (spelling|reading → level). A word on two lists keeps
 * the easier level (the higher N number), so read the lists in any order.
 */
export function addJlptWords(levels: Map<string, JlptLevel>, csv: string, level: JlptLevel): void {
  const [header = '', ...lines] = csv.split(/\r?\n/);
  const columns = csvFields(header);
  const spellingColumn = columns.indexOf('expression');
  const readingColumn = columns.indexOf('reading');
  if (spellingColumn < 0 || readingColumn < 0) throw new Error(`Unexpected JLPT list: ${header}`);
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = csvFields(line);
    const forms = entryForms(fields[spellingColumn] ?? '', fields[readingColumn] ?? '');
    for (const [spelling, kana] of forms) {
      const key = wordKey(spelling, kana);
      const known = levels.get(key);
      if (!known || level > known) levels.set(key, level);
    }
  }
}
