import {
  DIGRAPH_BASES,
  HIRAGANA_BASIC,
  HIRAGANA_VOICED,
  SMALL_YA_YU_YO,
} from '../../src/data/kana.ts';
import type { JmdictEntry, JmdictReading, JmdictSense } from './jmdict.ts';

/*
 * Picks the words for the Kana tab's Words mode from JMdict: common words written only with
 * kana the app teaches, plus small っ and the long-vowel mark ー.
 */

/** One word as stored in src/data/generated/words.json. */
export interface WordRecord {
  kana: string;
  meaning: string; // first English meanings, e.g. "dog"
  kanji?: string; // the usual kanji spelling, if it has one, e.g. "犬"
  /**
   * How common the word is: JMdict's frequency band, 1 (most common 500 words) to 48, or
   * UNRANKED for common words without a band (most loanwords, set phrases like ありがとう).
   */
  rank: number;
}

export const UNRANKED = 49;

/**
 * How a word is written to words.json: [kana, meaning, rank, kanji?]. A short list instead of
 * an object, because the key names repeated 18,000 times would make the file a third bigger.
 */
export type WordRow = [kana: string, meaning: string, rank: number, kanji?: string];

export const toRow = (word: WordRecord): WordRow =>
  word.kanji
    ? [word.kana, word.meaning, word.rank, word.kanji]
    : [word.kana, word.meaning, word.rank];

export const MIN_LENGTH = 2;
export const MAX_LENGTH = 6; // boxes; longer words don't fit on a phone screen
const MEANING_MAX_LENGTH = 30; // a second meaning is added only if both fit
// Words that need a long explanation are hard to tell from their meaning; leave them out.
const MEANING_TOO_LONG = 40;
// Words learners shouldn't be given to practise: vulgar, rude, derogatory or sensitive.
const UNSUITABLE_NOTES = new Set(['vulg', 'X', 'derog', 'sens']);
// Entries that are only word parts (prefixes, suffixes, counters …), not words of their own.
const WORD_PARTS = new Set(['pref', 'suf', 'ctr', 'aux', 'aux-v', 'aux-adj', 'cop', 'unc']);

const OFFSET_TO_KATAKANA = 0x60;
const toKatakana = (text: string): string =>
  [...text].map((c) => String.fromCodePoint((c.codePointAt(0) ?? 0) + OFFSET_TO_KATAKANA)).join('');

const HIRAGANA = [...HIRAGANA_BASIC, ...HIRAGANA_VOICED].map((entry) => entry.kana).join('');
const BASES = DIGRAPH_BASES.map((entry) => entry.kana).join('');
const SMALL = SMALL_YA_YU_YO.map((entry) => entry.kana).join('');

/** A regular expression for words the app can draw, in one script. */
function drawablePattern(full: string, bases: string, small: string, tsu: string, extra = '') {
  // A small ゃゅょ only after a digraph base (きゃ); small っ before another kana.
  const unit = `(?:[${bases}][${small}]|${tsu}(?=[${full}])|[${full}${extra}])`;
  return new RegExp(`^(?:${unit})+$`, 'u');
}

const HIRAGANA_WORD = drawablePattern(HIRAGANA, BASES, SMALL, 'っ');
// ー lengthens the vowel before it, so it never comes first.
const KATAKANA_WORD = drawablePattern(
  toKatakana(HIRAGANA),
  toKatakana(BASES),
  toKatakana(SMALL),
  'ッ',
  'ー',
);

/** True if every character is one the app can draw and in a valid place. */
export function isDrawable(kana: string): boolean {
  const length = [...kana].length;
  if (length < MIN_LENGTH || length > MAX_LENGTH) return false;
  if (kana.startsWith('ー') || /[っッ]ー|ーー/u.test(kana)) return false;
  // ん and っ can't start a word.
  if (/^[んンっッ]/u.test(kana)) return false;
  return HIRAGANA_WORD.test(kana) || KATAKANA_WORD.test(kana);
}

const appliesTo = (sense: JmdictSense, kana: string) =>
  sense.onlyForReadings.length === 0 || sense.onlyForReadings.includes(kana);

function kanjiSpelling(entry: JmdictEntry, reading: JmdictReading): string | undefined {
  if (reading.noKanji) return undefined;
  const spellings = entry.kanji.filter(
    (k) => reading.onlyWithKanji.length === 0 || reading.onlyWithKanji.includes(k.text),
  );
  // Only a common spelling: loanwords like コーヒー have rare ones (珈琲).
  return spellings.find((k) => k.common)?.text;
}

/** Leaves out notes in brackets: "dog (Canis (lupus) familiaris)" becomes "dog". */
export function withoutBrackets(gloss: string): string {
  let text = gloss;
  let previous = '';
  while (text !== previous) {
    previous = text;
    text = text.replace(/\s*\([^()]*\)/g, ''); // innermost brackets first
  }
  return text.trim() || gloss;
}

/** The first meaning, and the second too if both are short: "love, affection". */
export function shortMeaning(glosses: readonly string[]): string {
  const [first = '', second] = glosses.map(withoutBrackets);
  const both = `${first}, ${second}`;
  return second && both.length <= MEANING_MAX_LENGTH ? both : first;
}

function candidate(entry: JmdictEntry, reading: JmdictReading): WordRecord | null {
  if (!reading.common || !isDrawable(reading.kana)) return null;
  // The meaning shown is the first one for this reading.
  const sense = entry.senses.find((s) => appliesTo(s, reading.kana));
  if (!sense || sense.glosses.length === 0) return null;
  if (sense.notes.some((note) => UNSUITABLE_NOTES.has(note))) return null;
  if (sense.partsOfSpeech.length && sense.partsOfSpeech.every((pos) => WORD_PARTS.has(pos)))
    return null;
  const meaning = shortMeaning(sense.glosses);
  if (meaning.length > MEANING_TOO_LONG) return null;
  const kanji = kanjiSpelling(entry, reading);
  return {
    kana: reading.kana,
    meaning,
    ...(kanji ? { kanji } : {}),
    rank: reading.frequencyBand ?? UNRANKED,
  };
}

/**
 * The common, drawable words, one per spelling (when several words share a spelling, like
 * かみ "paper" and "god", the most frequent one is kept), sorted by kana.
 */
export function pickWords(entries: readonly JmdictEntry[]): WordRecord[] {
  const best = new Map<string, WordRecord>();
  for (const entry of entries) {
    for (const reading of entry.readings) {
      const found = candidate(entry, reading);
      const current = best.get(reading.kana);
      if (found && (!current || found.rank < current.rank)) best.set(reading.kana, found);
    }
  }
  return [...best.values()].sort((a, b) => (a.kana < b.kana ? -1 : a.kana > b.kana ? 1 : 0));
}
