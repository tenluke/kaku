import { describe, expect, it } from 'vitest';
import type { JlptLevel } from './jlpt.ts';
import { addJlptWords, csvFields, entryForms, wordKey } from './jlptWords.ts';

describe('csvFields', () => {
  it('splits at commas, but not inside double quotes', () => {
    expect(csvFields('会う,あう,"to meet, to see",JLPT')).toEqual([
      '会う',
      'あう',
      'to meet, to see',
      'JLPT',
    ]);
    expect(csvFields('a,"say ""hi""",c')).toEqual(['a', 'say "hi"', 'c']);
  });
});

describe('entryForms', () => {
  it('splits alternative spellings and readings', () => {
    expect(entryForms('足; 脚', 'あし')).toEqual([
      ['足', 'あし'],
      ['脚', 'あし'],
    ]);
    expect(entryForms('行く', 'いく; ゆく')).toEqual([
      ['行く', 'いく'],
      ['行く', 'ゆく'],
    ]);
  });

  it('drops affix marks and notes, and also counts a する verb as its noun', () => {
    expect(entryForms('～円', '～えん')).toEqual([['円', 'えん']]);
    expect(entryForms('〜(日本) 式', '～(にほん) しき')).toEqual([['式', 'しき']]);
    expect(entryForms('運動', 'うんどうする')).toEqual([
      ['運動', 'うんどうする'],
      ['運動', 'うんどう'],
    ]);
  });
});

describe('addJlptWords', () => {
  const header = 'expression,reading,meaning,tags,guid\n';

  it('reads the level of each word by spelling and reading', () => {
    const levels = new Map<string, JlptLevel>();
    addJlptWords(
      levels,
      `${header}今日,きょう,today,JLPT,x\n会う,あう,"to meet, to see",JLPT,y\n`,
      5,
    );
    expect(levels.get(wordKey('今日', 'きょう'))).toBe(5);
    expect(levels.get(wordKey('会う', 'あう'))).toBe(5);
    expect(levels.get(wordKey('今日', 'こんにち'))).toBeUndefined();
  });

  it('keeps the easier level for a word on two lists', () => {
    const levels = new Map<string, JlptLevel>();
    addJlptWords(levels, `${header}間,あいだ,between,JLPT,x\n`, 3);
    addJlptWords(levels, `${header}間,あいだ,between,JLPT,x\n`, 4);
    addJlptWords(levels, `${header}間,あいだ,between,JLPT,x\n`, 2);
    expect(levels.get(wordKey('間', 'あいだ'))).toBe(4);
  });

  it('refuses a file without the expected columns', () => {
    expect(() => addJlptWords(new Map(), 'word,kana\n', 5)).toThrow();
  });
});
