import {
  DIGRAPH_BASES,
  HIRAGANA_BASIC,
  HIRAGANA_VOICED,
  SMALL_YA_YU_YO,
  type KanaEntry,
} from '../data/kana';

export type Script = 'hiragana' | 'katakana' | 'kanji';
export type KanaSet = 'basic' | 'voiced' | 'digraph';
export type JlptLevel = 1 | 2 | 3 | 4 | 5;
export type KanaScript = 'hiragana' | 'katakana';

export const KANA_SCRIPTS: readonly KanaScript[] = ['hiragana', 'katakana'];
export const KANA_SETS: readonly KanaSet[] = ['basic', 'voiced', 'digraph'];
export const JLPT_LEVELS: readonly JlptLevel[] = [5, 4, 3, 2, 1];

/** One thing to draw in a practice session. */
export interface PracticeItem {
  /** Stable id used for saved data, e.g. "hiragana:きゃ" or "kanji:日". */
  id: string;
  script: Script;
  /** The characters to draw; two for digraphs (きゃ). */
  characters: string[];
  /** What you are asked to draw: romaji for kana, meanings for kanji. */
  prompt: string;
  kanaSet?: KanaSet;
  jlpt?: JlptLevel;
  /** Frame number in Remembering the Kanji (6th edition), for kanji outside the JLPT lists. */
  rtkFrame?: number;
  onReadings?: string[];
  kunReadings?: string[];
  /** Set for a word of the Kana tab's Words mode (each character is one kana to write). */
  word?: { kana: string; meaning: string; kanji?: string };
}

/** The fields of a generated kanji record (src/data/generated/kanji.json) that we use. */
export interface KanjiRecord {
  character: string;
  meanings: string[];
  onReadings: string[];
  kunReadings: string[];
  jlpt: JlptLevel | null; // null: not in the JLPT lists (RTK Book 1 only)
  rtkFrame?: number | null;
}

const KATAKANA_OFFSET = 0x60; // ア (U+30A2) − あ (U+3042)

export const toKatakana = (hiragana: string): string =>
  [...hiragana]
    .map((c) => String.fromCodePoint((c.codePointAt(0) ?? 0) + KATAKANA_OFFSET))
    .join('');

const makeId = (script: Script, characters: string[]): string => `${script}:${characters.join('')}`;

function kanaItem(
  script: 'hiragana' | 'katakana',
  kanaSet: KanaSet,
  hiragana: string[],
  prompt: string,
): PracticeItem {
  const characters = script === 'katakana' ? hiragana.map(toKatakana) : hiragana;
  return { id: makeId(script, characters), script, characters, prompt, kanaSet };
}

/** All kana items of one script and set, in the usual table order. */
export function kanaItems(script: 'hiragana' | 'katakana', kanaSet: KanaSet): PracticeItem[] {
  const single = (entries: readonly KanaEntry[]) =>
    entries.map((entry) => kanaItem(script, kanaSet, [entry.kana], entry.romaji));
  if (kanaSet === 'basic') return single(HIRAGANA_BASIC);
  if (kanaSet === 'voiced') return single(HIRAGANA_VOICED);
  return DIGRAPH_BASES.flatMap((base) =>
    SMALL_YA_YU_YO.map((small) =>
      kanaItem(script, kanaSet, [base.kana, small.kana], base.romaji + small.romaji),
    ),
  );
}

const PROMPT_MEANINGS = 2;

/** The kanji prompt: its first two KANJIDIC meanings, e.g. "day, sun". */
export const kanjiPrompt = (meanings: readonly string[]): string =>
  meanings.slice(0, PROMPT_MEANINGS).join(', ');

export function kanjiItem(record: KanjiRecord): PracticeItem {
  return {
    id: makeId('kanji', [record.character]),
    script: 'kanji',
    characters: [record.character],
    prompt: kanjiPrompt(record.meanings),
    ...(record.jlpt ? { jlpt: record.jlpt } : {}),
    ...(!record.jlpt && record.rtkFrame ? { rtkFrame: record.rtkFrame } : {}),
    onReadings: record.onReadings,
    kunReadings: record.kunReadings,
  };
}

/** Fisher–Yates shuffle into a new array. `random` can be replaced in tests. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex] as T, copy[index] as T];
  }
  return copy;
}

/** Practice order: all items shuffled, or (Random mode) only `count` of them. */
export function sessionItems(
  pool: readonly PracticeItem[],
  mode: 'all' | 'random',
  count: number,
  random: () => number = Math.random,
): PracticeItem[] {
  const order = shuffled(pool, random);
  if (mode === 'all') return order;
  return order.slice(0, Math.max(1, Math.min(order.length, Math.floor(count) || 1)));
}
