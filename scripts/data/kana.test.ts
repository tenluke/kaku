import { describe, expect, it } from 'vitest';
import { ALL_KANA } from './kana.ts';

describe('ALL_KANA', () => {
  it('covers small and full-size hiragana and katakana', () => {
    for (const kana of ['ぁ', 'あ', 'ん', 'ゃ', 'ァ', 'ア', 'ン', 'ヴ'])
      expect(ALL_KANA).toContain(kana);
  });

  it('adds the long-vowel mark ー, used in katakana words', () => {
    expect(ALL_KANA).toContain('ー');
  });

  it('leaves out other marks that are not letters', () => {
    for (const mark of ['ゝ', 'ヽ', '・']) expect(ALL_KANA).not.toContain(mark);
  });
});
