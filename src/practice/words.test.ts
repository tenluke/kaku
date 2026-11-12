import { describe, expect, it } from 'vitest';
import wordRows from '../data/generated/words.json';
import type { ItemResult } from './attempt';
import {
  kanaResults,
  kanaUnits,
  pickWords,
  romaji,
  UNRANKED,
  wordFromRow,
  wordItem,
  wordsUsing,
  type Word,
  type WordRow,
} from './words';

const word = (kana: string, rank = 10): Word => ({ kana, meaning: kana, rank });

/** A repeatable stand-in for Math.random, so tests that shuffle always give the same result. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

describe('kanaUnits', () => {
  it('splits a word into the kana to write, digraphs as one', () => {
    expect(kanaUnits('しゃしん').map((unit) => unit.itemId)).toEqual([
      'hiragana:しゃ',
      'hiragana:し',
      'hiragana:ん',
    ]);
    expect(kanaUnits('しゃしん')[0]?.characters).toEqual(['し', 'ゃ']);
  });

  it('keeps small っ and ー as their own boxes without a pass rate', () => {
    expect(kanaUnits('キッチン').map((unit) => unit.itemId)).toEqual([
      'katakana:キ',
      null,
      'katakana:チ',
      'katakana:ン',
    ]);
    expect(kanaUnits('ケーキ')[1]).toEqual({ characters: ['ー'], itemId: null, romaji: '' });
  });

  it('refuses kana the app does not teach', () => {
    expect(() => kanaUnits('ファン')).toThrow();
  });
});

describe('romaji', () => {
  it.each([
    ['いぬ', 'inu'],
    ['がっこう', 'gakkou'],
    ['まっちゃ', 'matcha'],
    ['しゃしん', 'shashin'],
    ['きんえん', "kin'en"],
    ['こんや', "kon'ya"],
    ['ほんとう', 'hontou'],
    ['コーヒー', 'kōhī'],
    ['チョコレート', 'chokorēto'],
    ['ぢめん', 'jimen'],
    ['をかし', 'wokashi'],
  ])('%s → %s', (kana, expected) => {
    expect(romaji(kana)).toBe(expected);
  });
});

describe('wordsUsing', () => {
  const words = [word('いぬ'), word('ねこ'), word('きって'), word('しゃしん')];

  it('keeps only words made of the selected kana (っ is always allowed)', () => {
    const allowed = new Set(['hiragana:い', 'hiragana:ぬ', 'hiragana:き', 'hiragana:て']);
    expect(wordsUsing(words, allowed).map((w) => w.kana)).toEqual(['いぬ', 'きって']);
  });

  it('needs the digraph itself selected, not only its first kana', () => {
    const allowed = new Set(['hiragana:し', 'hiragana:ん']);
    expect(wordsUsing(words, allowed)).toEqual([]);
    allowed.add('hiragana:しゃ');
    expect(wordsUsing(words, allowed).map((w) => w.kana)).toEqual(['しゃしん']);
  });
});

describe('pickWords', () => {
  it('gives the asked number of different words', () => {
    const words = Array.from({ length: 50 }, (_, i) =>
      word(`あ${'いうえおかきくけこさ'[i % 10]}${i}`),
    );
    const picked = pickWords(words, 20);
    expect(picked).toHaveLength(20);
    expect(new Set(picked.map((w) => w.kana)).size).toBe(20);
  });

  it('gives all words when there are fewer than asked', () => {
    expect(pickWords([word('いぬ'), word('ねこ')], 5)).toHaveLength(2);
  });

  it('prefers common words when there are many', () => {
    const common = Array.from({ length: 300 }, (_, i) => word(`common${i}`, 1));
    const rare = Array.from({ length: 300 }, (_, i) => word(`rare${i}`, 40));
    const picked = pickWords([...rare, ...common], 30);
    expect(picked.every((w) => w.kana.startsWith('common'))).toBe(true);
  });

  it('gives katakana words a fair share next to many common hiragana words', () => {
    const hiragana = Array.from({ length: 1000 }, (_, i) => word(`あ${i}`, 1));
    const katakana = Array.from({ length: 50 }, (_, i) => word(`ア${i}`, UNRANKED));
    const picked = pickWords([...hiragana, ...katakana], 40, seededRandom(1));
    expect(picked.filter((w) => w.kana.startsWith('ア')).length).toBeGreaterThan(0);
  });

  it('counts unranked words (mostly loanwords) as middling, not as the rarest', () => {
    const loanwords = Array.from({ length: 300 }, (_, i) => word(`loan${i}`, UNRANKED));
    const rare = Array.from({ length: 300 }, (_, i) => word(`rare${i}`, 40));
    expect(pickWords([...rare, ...loanwords], 30).every((w) => w.kana.startsWith('loan'))).toBe(
      true,
    );
  });
});

describe('wordItem', () => {
  it('makes a practice item with one box per character', () => {
    expect(wordItem(wordFromRow(['いぬ', 'dog', 3, '犬']))).toEqual({
      id: 'word:いぬ',
      script: 'hiragana',
      characters: ['い', 'ぬ'],
      prompt: 'inu · dog',
      word: { kana: 'いぬ', meaning: 'dog', kanji: '犬' },
    });
    expect(wordItem(wordFromRow(['ケーキ', 'cake', UNRANKED])).script).toBe('katakana');
  });
});

describe('kanaResults', () => {
  const result = (extra: Partial<ItemResult> = {}): ItemResult => ({
    percent: 80,
    passed: true,
    skipped: false,
    usedHint: false,
    markedCorrect: false,
    ...extra,
  });

  it('passes each kana whose boxes passed, a digraph only if both boxes did', () => {
    // し ゃ し ん: the ゃ box failed, so しゃ fails; し and ん pass.
    expect(kanaResults('しゃしん', result({ passed: false }), [90, 50, 90, 90], new Set())).toEqual(
      [
        { id: 'hiragana:しゃ', passed: false },
        { id: 'hiragana:し', passed: true },
        { id: 'hiragana:ん', passed: true },
      ],
    );
  });

  it('fails kana whose box showed a hint, and leaves out っ', () => {
    expect(kanaResults('きって', result({ usedHint: true }), [90, 90, 90], new Set([2]))).toEqual([
      { id: 'hiragana:き', passed: true },
      { id: 'hiragana:て', passed: false },
    ]);
  });

  it('fails a kana used twice unless it passed both times', () => {
    expect(kanaResults('ここ', result({ passed: false }), [90, 40], new Set())).toEqual([
      { id: 'hiragana:こ', passed: false },
    ]);
  });

  it('fails every kana when skipped, passes every kana after "I was right"', () => {
    const skipped = result({ skipped: true, passed: false, percent: 0 });
    expect(kanaResults('いぬ', skipped, [], new Set()).every((r) => !r.passed)).toBe(true);
    const marked = result({ markedCorrect: true });
    expect(kanaResults('いぬ', marked, [10, 10], new Set()).every((r) => r.passed)).toBe(true);
  });
});

describe('the generated word list', () => {
  const words = (wordRows as WordRow[]).map(wordFromRow);

  it('has only words the app can split into kana and write in romaji', () => {
    expect(words.length).toBeGreaterThan(10000);
    for (const w of words) expect(() => romaji(w.kana), w.kana).not.toThrow();
  });

  it('has words for a beginner who knows only あ to こ', () => {
    const allowed = new Set([...'あいうえおかきくけこ'].map((kana) => `hiragana:${kana}`));
    expect(wordsUsing(words, allowed).length).toBeGreaterThan(100);
  });
});
