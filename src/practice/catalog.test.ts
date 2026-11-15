import { describe, expect, it } from 'vitest';
import { itemsInGroup, PROGRESS_GROUPS } from './catalog';
import { ALL_KANJI } from './kanjiData';

const kanji = ALL_KANJI;

describe('itemsInGroup', () => {
  it('has every kana set, every JLPT level, and the other kanji', () => {
    const counts = Object.fromEntries(
      PROGRESS_GROUPS.map((group) => [group, itemsInGroup(group, kanji).length]),
    );
    expect(counts).toEqual({
      all: 104 + 104 + 2211 + 193,
      hiragana: 104,
      katakana: 104,
      n5: 79,
      n4: 166,
      n3: 367,
      n2: 367,
      n1: 1232,
      other: 193, // RTK Book 1 kanji outside the JLPT lists
    });
  });
});
