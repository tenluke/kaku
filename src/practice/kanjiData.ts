import kanjiRecords from '../data/generated/kanji.json';
import type { KanjiRecord } from './items';

/*
 * Every kanji the app can practise: the JLPT kanji, and the RTK Book 1 kanji that aren't in
 * the JLPT lists (jlpt: null).
 */
export const ALL_KANJI: readonly KanjiRecord[] = kanjiRecords as KanjiRecord[];
