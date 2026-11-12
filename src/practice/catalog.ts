import {
  JLPT_LEVELS,
  KANA_SETS,
  kanaItems,
  kanjiItem,
  type JlptLevel,
  type KanjiRecord,
  type PracticeItem,
} from './items';

/* Every character the app teaches, in the groups the Progress page shows. */

export type ProgressGroup = 'all' | 'hiragana' | 'katakana' | `n${JlptLevel}` | 'other';

export const PROGRESS_GROUPS: readonly ProgressGroup[] = [
  'all',
  'hiragana',
  'katakana',
  ...JLPT_LEVELS.map((level) => `n${level}` as const),
  'other', // RTK Book 1 kanji outside the JLPT lists
];

const allKana = (script: 'hiragana' | 'katakana'): PracticeItem[] =>
  KANA_SETS.flatMap((set) => kanaItems(script, set));

export function itemsInGroup(group: ProgressGroup, kanji: readonly KanjiRecord[]): PracticeItem[] {
  if (group === 'hiragana' || group === 'katakana') return allKana(group);
  if (group === 'all')
    return [...allKana('hiragana'), ...allKana('katakana'), ...kanji.map(kanjiItem)];
  if (group === 'other') return kanji.filter((record) => record.jlpt === null).map(kanjiItem);
  const level = Number(group.slice(1)) as JlptLevel;
  return kanji.filter((record) => record.jlpt === level).map(kanjiItem);
}
