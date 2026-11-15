import { describe, expect, it } from 'vitest';
import { rtkFrames, rtkGroups } from './books';
import { ALL_KANJI } from './kanjiData';

describe('Remembering the Kanji, Book 1', () => {
  const byFrame = rtkFrames(ALL_KANJI);

  it('has every frame, starting like the book', () => {
    expect(byFrame.size).toBe(2200);
    const first = Array.from({ length: 10 }, (_, i) => byFrame.get(i + 1)).join('');
    expect(first).toBe('一二三四五六七八九十');
  });

  it('comes in 22 groups of 100 frames, in frame order', () => {
    const groups = rtkGroups(byFrame);
    expect(groups).toHaveLength(22);
    expect(groups.map((g) => g.name).slice(0, 2)).toEqual(['1–100', '101–200']);
    expect(groups.every((g) => g.itemIds.length === 100)).toBe(true);
    expect(groups[0]?.itemIds.slice(0, 3)).toEqual(['kanji:一', 'kanji:二', 'kanji:三']);
  });
});
