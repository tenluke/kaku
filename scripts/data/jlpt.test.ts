import { describe, expect, it } from 'vitest';
import { parseJlptLevels } from './jlpt.ts';

describe('parseJlptLevels', () => {
  it('keeps kanji with a modern level and skips the rest', () => {
    const json = JSON.stringify({
      日: { jlpt_new: 5, jlpt_old: 4 },
      丶: { jlpt_new: null },
      勝: { jlpt_new: 3 },
    });
    expect([...parseJlptLevels(json)]).toEqual([
      ['日', 5],
      ['勝', 3],
    ]);
  });
});
