import { describe, expect, it } from 'vitest';
import { kanaItems, kanjiItem, type PracticeItem } from '../practice/items';
import { kanjiWordItem } from '../practice/kanjiWords';
import { wordItem } from '../practice/words';
import { buildCard, CHOICES, lookAlikes, mainReadings } from './cards';
import { afterAnswer, REPEAT_GAP } from './queue';

/** A repeatable stand-in for Math.random. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

const katakana = kanaItems('katakana', 'basic');
const hiragana = kanaItems('hiragana', 'basic');
const find = (items: PracticeItem[], kana: string) => {
  const item = items.find((i) => i.characters.join('') === kana);
  if (!item) throw new Error(`No item ${kana}`);
  return item;
};
const word = (kana: string, meaning: string) => wordItem({ kana, meaning, rank: 1 });
const words = [
  word('かお', 'face'),
  word('いけ', 'pond'),
  word('おかし', 'sweets'),
  word('あそこ', 'over there'),
  word('あい', 'love'),
];

describe('a card for a single kana', () => {
  it('asks for the reading, even when meaning was chosen', () => {
    const card = buildCard(find(katakana, 'シ'), 'meaning', katakana, seededRandom(1));
    expect(card).toMatchObject({
      id: 'reading:katakana:シ',
      askFor: 'reading',
      face: 'シ',
      answer: 'shi',
    });
  });

  it('offers look-alikes as the wrong answers first', () => {
    const card = buildCard(find(katakana, 'シ'), 'reading', katakana, seededRandom(2));
    expect([...card.choices].sort()).toEqual(['n', 'shi', 'so', 'tsu']);
  });

  it('fills up with other kana when there are fewer look-alikes', () => {
    const card = buildCard(find(hiragana, 'ぬ'), 'reading', hiragana, seededRandom(3));
    expect(card.choices).toHaveLength(CHOICES);
    expect(card.choices).toContain('nu');
    expect(card.choices).toContain('me');
  });

  it('never offers the right answer twice, even for kana that sound alike', () => {
    const voiced = kanaItems('hiragana', 'voiced'); // じ and ぢ are both "ji"
    for (let seed = 0; seed < 20; seed++) {
      const card = buildCard(find(voiced, 'じ'), 'reading', voiced, seededRandom(seed));
      expect(card.choices.filter((choice) => choice === 'ji')).toHaveLength(1);
      expect(new Set(card.choices).size).toBe(card.choices.length);
    }
  });
});

describe('look-alikes', () => {
  it('names the kana that look like this one, with their romaji', () => {
    expect(lookAlikes('ぬ')).toEqual([{ kana: 'め', romaji: 'me' }]);
    expect(lookAlikes('な')).toEqual([]);
  });
});

describe('a card for a kana word', () => {
  it('asks for its meaning, with other words’ meanings as wrong answers', () => {
    const card = buildCard(words[2] as PracticeItem, 'meaning', words, seededRandom(4));
    expect(card).toMatchObject({ id: 'meaning:word:おかし', face: 'おかし', answer: 'sweets' });
    expect(card.choices).toHaveLength(CHOICES);
    expect(card.choices).toContain('sweets');
  });

  it('asks for its reading in romaji, preferring readings of a similar length', () => {
    const card = buildCard(words[2] as PracticeItem, 'reading', words, seededRandom(5));
    expect(card.answer).toBe('okashi');
    expect(card.choices).toContain('asoko'); // the closest in length
  });

  it('takes wrong answers only from words, never from single kana', () => {
    const card = buildCard(
      words[0] as PracticeItem,
      'reading',
      [...words, ...hiragana],
      seededRandom(6),
    );
    expect(card.choices.every((choice) => choice.length > 2 || choice === 'ai')).toBe(true);
  });

  it('gives fewer choices rather than repeating when the pool is small', () => {
    const card = buildCard(words[0] as PracticeItem, 'meaning', words.slice(0, 2), seededRandom(7));
    expect([...card.choices].sort()).toEqual(['face', 'pond']);
  });
});

const kanji = (character: string, meanings: string[], on: string[], kun: string[]) =>
  kanjiItem({ character, meanings, onReadings: on, kunReadings: kun, jlpt: 5 });
const sun = kanji('日', ['day', 'sun', 'Japan'], ['ニチ', 'ジツ'], ['ひ', '-び', '-か']);
const kanjiPool = [
  sun,
  kanji('月', ['month', 'moon'], ['ゲツ', 'ガツ'], ['つき']),
  kanji('人', ['person'], ['ジン', 'ニン'], ['ひと', '-り', '-と']),
  kanji('木', ['tree', 'wood'], ['ボク', 'モク'], ['き', 'こ-']),
];

describe('the main readings of a kanji', () => {
  it('shows up to two on and two kun readings, without suffix forms', () => {
    expect(mainReadings(['ニチ', 'ジツ'], ['ひ', '-び', '-か'])).toBe('ニチ, ジツ · ひ');
    expect(mainReadings(['ジュウ', 'ジッ', 'ジュッ'], ['とお', 'と', 'そ'])).toBe(
      'ジュウ, ジッ · とお, と',
    );
  });

  it('puts the okurigana in brackets and drops prefix dashes', () => {
    expect(mainReadings(['イチ'], ['ひと-', 'ひと.つ'])).toBe('イチ · ひと, ひと(つ)');
    expect(mainReadings([], ['た.べる'])).toBe('た(べる)');
  });

  it('keeps suffix forms when there is no other kun reading', () => {
    expect(mainReadings(['ショ'], ['-ら'])).toBe('ショ · ら');
  });
});

describe('a card for a single kanji', () => {
  it('asks for its meaning, with other kanji meanings as wrong answers', () => {
    const card = buildCard(sun, 'meaning', kanjiPool, seededRandom(3));
    expect(card).toMatchObject({ id: 'meaning:kanji:日', face: '日', answer: 'day, sun' });
    expect([...card.choices].sort()).toEqual(['day, sun', 'month, moon', 'person', 'tree, wood']);
  });

  it('asks for its main readings in kana', () => {
    const card = buildCard(sun, 'reading', kanjiPool, seededRandom(3));
    expect(card).toMatchObject({ id: 'reading:kanji:日', answer: 'ニチ, ジツ · ひ' });
    expect(card.choices).toContain('ゲツ, ガツ · つき');
  });

  it('takes wrong answers only from kanji, never from words or kana', () => {
    const today = kanjiWordItem({ kana: 'きょう', meaning: 'today', rank: 1, kanji: '今日' });
    const card = buildCard(sun, 'meaning', [...hiragana, today, kanjiPool[1] as PracticeItem]);
    expect([...card.choices].sort()).toEqual(['day, sun', 'month, moon']);
  });
});

describe('a card for a kanji word', () => {
  const kanjiWord = (kana: string, spelling: string, meaning: string) =>
    kanjiWordItem({ kana, meaning, rank: 1, kanji: spelling });
  const today = kanjiWord('きょう', '今日', 'today');
  const pool = [
    today,
    kanjiWord('あした', '明日', 'tomorrow'),
    kanjiWord('にほん', '日本', 'Japan'),
    kanjiWord('ひとり', '一人', 'one person'),
    word('かお', 'face'),
  ];

  it('shows the word in kanji and asks for its reading in kana', () => {
    const card = buildCard(today, 'reading', pool, seededRandom(5));
    expect(card).toMatchObject({ id: 'reading:word:今日', face: '今日', answer: 'きょう' });
    expect([...card.choices].sort()).toEqual(['あした', 'きょう', 'にほん', 'ひとり']);
  });

  it('asks for its meaning, with other kanji words as wrong answers', () => {
    const card = buildCard(today, 'meaning', pool, seededRandom(5));
    expect(card.answer).toBe('today');
    expect(card.choices).not.toContain('face');
  });
});

describe('the card queue', () => {
  it('drops a card answered right', () => {
    expect(afterAnswer(['a', 'b', 'c'], true)).toEqual(['b', 'c']);
  });

  it('brings a wrongly answered card back a few cards later', () => {
    expect(REPEAT_GAP).toBe(3);
    expect(afterAnswer(['a', 'b', 'c', 'd', 'e'], false)).toEqual(['b', 'c', 'd', 'a', 'e']);
  });

  it('asks again at once when it is the last card left', () => {
    expect(afterAnswer(['a'], false)).toEqual(['a']);
    expect(afterAnswer(['a', 'b'], false)).toEqual(['b', 'a']);
    expect(afterAnswer([], true)).toEqual([]);
  });
});
