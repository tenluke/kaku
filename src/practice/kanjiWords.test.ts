import { describe, expect, it } from 'vitest';
import wordRows from '../data/generated/words.json';
import type { ItemResult } from './attempt';
import { ALL_KANJI } from './kanjiData';
import { kanjiResults, kanjiWordItem, kanjiWordsUsing } from './kanjiWords';
import { loadStrokesFor, strokesOf } from './strokeData';
import { wordFromRow, type Word, type WordRow } from './words';

const word = (kanji: string, kana: string, rank = 10): Word => ({
  kana,
  kanji,
  meaning: kana,
  rank,
});
const allowed = (kanji: string) => new Set([...kanji]);

describe('kanjiWordsUsing', () => {
  it('keeps words written only with the chosen kanji, kana allowed', () => {
    const words = [word('毎日', 'まいにち'), word('見る', 'みる'), word('今日', 'きょう')];
    expect(kanjiWordsUsing(words, allowed('毎日見')).map((w) => w.kanji)).toEqual(['毎日', '見る']);
  });

  it('leaves out words with no kanji, or with characters that cannot be drawn', () => {
    const words = [
      { kana: 'ああ', meaning: 'ah', rank: 1 },
      word('ああ', 'ああ'), // a "kanji spelling" without kanji
      word('日々', 'ひび'), // 々 has no stroke data
    ];
    expect(kanjiWordsUsing(words, allowed('日'))).toEqual([]);
  });

  it('keeps each spelling once, with its most common reading', () => {
    const words = [word('日本', 'にっぽん', 20), word('日本', 'にほん', 5)];
    expect(kanjiWordsUsing(words, allowed('日本'))).toEqual([word('日本', 'にほん', 5)]);
  });

  it('keeps only words at the hardest chosen JLPT level or easier, when given one', () => {
    const words = [
      { ...word('今日', 'きょう'), jlpt: 5 as const },
      { ...word('今朝', 'けさ'), jlpt: 4 as const },
      word('今日中', 'きょうじゅう'), // on no JLPT list
    ];
    const chosen = allowed('今日朝中');
    expect(kanjiWordsUsing(words, chosen, 5).map((w) => w.kanji)).toEqual(['今日']);
    expect(kanjiWordsUsing(words, chosen, 4).map((w) => w.kanji)).toEqual(['今日', '今朝']);
    expect(kanjiWordsUsing(words, chosen).map((w) => w.kanji)).toHaveLength(3);
    // With N1 chosen, words on no list come too.
    expect(kanjiWordsUsing(words, chosen, 1).map((w) => w.kanji)).toHaveLength(3);
  });
});

describe('kanjiWordItem', () => {
  it('makes one box per character, prompted with the reading and the meaning', () => {
    const item = kanjiWordItem({ kana: 'みる', kanji: '見る', meaning: 'to see', rank: 1 });
    expect(item).toEqual({
      id: 'word:見る',
      script: 'kanji',
      characters: ['見', 'る'],
      prompt: 'みる · to see',
      word: { kana: 'みる', meaning: 'to see', kanji: '見る' },
    });
  });
});

describe('kanjiResults', () => {
  const result = (overrides: Partial<ItemResult> = {}): ItemResult => ({
    percent: 80,
    passed: true,
    skipped: false,
    usedHint: false,
    markedCorrect: false,
    ...overrides,
  });

  it('counts each kanji by its own box, and leaves out the kana', () => {
    expect(kanjiResults(['見', 'る'], result(), [90, 30], new Set())).toEqual([
      { id: 'kanji:見', passed: true },
    ]);
    expect(kanjiResults(['毎', '日'], result(), [90, 40], new Set())).toEqual([
      { id: 'kanji:毎', passed: true },
      { id: 'kanji:日', passed: false },
    ]);
  });

  it('fails a kanji whose box showed a hint, or that failed one of two uses', () => {
    expect(kanjiResults(['毎', '日'], result(), [90, 90], new Set([0]))).toEqual([
      { id: 'kanji:毎', passed: false },
      { id: 'kanji:日', passed: true },
    ]);
    expect(kanjiResults(['人', '人'], result(), [90, 40], new Set())).toEqual([
      { id: 'kanji:人', passed: false },
    ]);
  });

  it('fails every kanji when skipped, passes every kanji after "I was right"', () => {
    expect(kanjiResults(['日'], result({ skipped: true }), [90], new Set())).toEqual([
      { id: 'kanji:日', passed: false },
    ]);
    expect(kanjiResults(['日'], result({ markedCorrect: true }), [10], new Set())).toEqual([
      { id: 'kanji:日', passed: true },
    ]);
  });
});

describe('the real word list on the Kanji tab', () => {
  const words = (wordRows as WordRow[]).map(wordFromRow);
  const n5 = new Set(ALL_KANJI.filter((k) => k.jlpt === 5).map((k) => k.character));

  it('has about a hundred N5 words for someone who knows the N5 kanji', () => {
    const usable = kanjiWordsUsing(words, n5, 5);
    expect(usable.length).toBeGreaterThan(80);
    expect(usable.map((w) => w.kanji)).toEqual(expect.arrayContaining(['毎日', '今日']));
    // Words written with N5 kanji but learnt later are left out.
    expect(usable.map((w) => w.kanji)).not.toContain('小国');
  });

  it('has stroke data for every character of every word, once their levels are loaded', async () => {
    const all = new Set(ALL_KANJI.filter((k) => k.jlpt).map((k) => k.character));
    const items = kanjiWordsUsing(words, all).map(kanjiWordItem);
    await loadStrokesFor(items);
    for (const item of items) {
      for (const character of item.characters)
        expect(strokesOf(character).length).toBeGreaterThan(0);
    }
  });
});
