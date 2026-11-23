import { describe, expect, it } from 'vitest';
import { kanaItems, type PracticeItem } from '../practice/items';
import { wordItem } from '../practice/words';
import { buildCard, CHOICES, lookAlikes } from './cards';
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
