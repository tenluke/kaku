import kanaStrokes from '../data/generated/strokes-kana.json';
import { PASS_PERCENT } from '../checking/scoring';
import type { ItemResult } from './attempt';
import type { JlptLevel, PracticeItem } from './items';
import type { Word } from './words';

/*
 * Words mode on the Kanji tab: real words (from JMdict) written only with the kanji you chose,
 * plus kana (the る of 見る). You see the reading and the meaning and write the word, one box
 * per character. Each kanji's result also counts for its own pass rate.
 */

const HAN = /\p{Script=Han}/u;
// Kana with stroke data: they can be drawn in a box (small ゃ and っ included).
const DRAWABLE_KANA = new Set(Object.keys(kanaStrokes));

const isKanji = (character: string): boolean => HAN.test(character);

/**
 * The words written only with these kanji (and kana that can be drawn), each spelling once:
 * when a spelling has more than one reading (日本: にほん, にっぽん), the most common one is kept.
 *
 * With `hardestLevel`, only words on the JLPT vocabulary lists at that level or easier: N5
 * kanji also write words a learner meets much later (小国, 生物), so those are left out. With
 * N1, the hardest level, words on no list come too: the lists don't have every everyday word.
 * Without a level (kanji outside the JLPT lists), any word will do.
 */
export function kanjiWordsUsing(
  words: readonly Word[],
  allowedKanji: ReadonlySet<string>,
  hardestLevel: JlptLevel | null = null,
): Word[] {
  const bySpelling = new Map<string, Word>();
  for (const word of words) {
    const spelling = word.kanji;
    if (!spelling || ![...spelling].some(isKanji)) continue;
    // Levels count down: N5 is the easiest, so "N4 or easier" is a level of 4 or more.
    if (hardestLevel !== null && hardestLevel > 1 && (word.jlpt ?? 0) < hardestLevel) continue;
    const writable = [...spelling].every((character) =>
      isKanji(character) ? allowedKanji.has(character) : DRAWABLE_KANA.has(character),
    );
    if (!writable) continue;
    const kept = bySpelling.get(spelling);
    if (!kept || word.rank < kept.rank) bySpelling.set(spelling, word);
  }
  return [...bySpelling.values()];
}

/** A word as a practice item: one box per character, prompted with its reading and meaning. */
export function kanjiWordItem(word: Word): PracticeItem {
  const spelling = word.kanji ?? word.kana;
  return {
    id: `word:${spelling}`,
    script: 'kanji',
    characters: [...spelling],
    prompt: `${word.kana} · ${word.meaning}`,
    word: { kana: word.kana, meaning: word.meaning, kanji: spelling },
  };
}

/**
 * What a finished word counts for each of its kanji. A kanji passes when its box passed the
 * last check and showed no hint. Skipping fails every kanji; "I was right" passes every kanji.
 * A kanji used twice passes only if it passed both times. The kana in the word don't count:
 * they are practised on the Kana tab.
 */
export function kanjiResults(
  characters: readonly string[],
  result: ItemResult,
  boxPercents: readonly number[],
  hintedBoxes: ReadonlySet<number>,
): { id: string; passed: boolean }[] {
  const passedById = new Map<string, boolean>();
  characters.forEach((character, box) => {
    if (!isKanji(character)) return;
    const boxPassed = (boxPercents[box] ?? 0) >= PASS_PERCENT && !hintedBoxes.has(box);
    const passed = result.markedCorrect || (!result.skipped && boxPassed);
    const id = `kanji:${character}`;
    passedById.set(id, (passedById.get(id) ?? true) && passed);
  });
  return [...passedById].map(([id, passed]) => ({ id, passed }));
}
