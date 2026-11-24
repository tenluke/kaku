import { describe, expect, it } from 'vitest';
import type { JmdictEntry, JmdictReading, JmdictSense } from './jmdict.ts';
import { wordKey } from './jlptWords.ts';
import { isDrawable, pickWords, shortMeaning, toRow, UNRANKED, withoutBrackets } from './words.ts';

const reading = (kana: string, extra: Partial<JmdictReading> = {}): JmdictReading => ({
  kana,
  common: true,
  frequencyBand: 10,
  onlyWithKanji: [],
  noKanji: false,
  ...extra,
});
const sense = (glosses: string[], extra: Partial<JmdictSense> = {}): JmdictSense => ({
  glosses,
  partsOfSpeech: ['n'],
  notes: [],
  onlyForReadings: [],
  ...extra,
});
const entry = (readings: JmdictReading[], senses: JmdictSense[], kanji: string[] = []) =>
  ({ kanji: kanji.map((text) => ({ text, common: true })), readings, senses }) as JmdictEntry;

describe('isDrawable', () => {
  it('accepts words made of the kana the app teaches', () => {
    for (const word of ['いぬ', 'がっこう', 'しゃしん', 'コーヒー', 'チョコレート', 'きって']) {
      expect(isDrawable(word), word).toBe(true);
    }
  });

  it('rejects kana the app does not teach, and kana in impossible places', () => {
    for (const word of [
      'ね', // too short
      'あいうえおかき', // too long
      'ファイル', // small ァ is not taught
      'ヴァイオリン',
      'いぬー', // ー only in katakana
      'ーヒ',
      'っと',
      'あっ', // small っ needs a kana after it
      'ゃく', // small ゃ needs a base like き
      'あゃ',
      'かタ', // mixed scripts
      '犬',
    ]) {
      expect(isDrawable(word), word).toBe(false);
    }
  });
});

describe('meanings', () => {
  it('leaves out notes in brackets, nested ones too', () => {
    expect(withoutBrackets('dog (Canis (lupus) familiaris)')).toBe('dog');
    expect(withoutBrackets('(sound of) laughter')).toBe('laughter');
    expect(withoutBrackets('(only a note)')).toBe('(only a note)');
  });

  it('adds the second meaning only when both are short', () => {
    expect(shortMeaning(['love', 'affection'])).toBe('love, affection');
    expect(shortMeaning(['photograph', 'photo'])).toBe('photograph, photo');
    expect(shortMeaning(['school'])).toBe('school');
    expect(shortMeaning(['education of gifted young people', 'support'])).toBe(
      'education of gifted young people',
    );
  });
});

describe('pickWords', () => {
  it('keeps common drawable words with their meaning, kanji and rank', () => {
    const words = pickWords([
      entry([reading('いぬ', { frequencyBand: 3 })], [sense(['dog (Canis)', 'canine'])], ['犬']),
      entry([reading('コーヒー', { frequencyBand: null })], [sense(['coffee'])]),
    ]);
    expect(words).toEqual([
      { kana: 'いぬ', meaning: 'dog, canine', kanji: '犬', rank: 3 },
      { kana: 'コーヒー', meaning: 'coffee', rank: UNRANKED },
    ]);
  });

  it('leaves out rare, unsuitable and part-only words', () => {
    expect(
      pickWords([
        entry([reading('あいこ', { common: false })], [sense(['tie'])]),
        entry([reading('あほ')], [sense(['idiot'], { notes: ['derog'] })]),
        entry([reading('さん')], [sense(['Mr.'], { partsOfSpeech: ['suf'] })]),
      ]),
    ).toEqual([]);
  });

  it('judges a word by the meaning it shows (the first one for that reading)', () => {
    const words = pickWords([
      entry([reading('いぬ')], [sense(['dog']), sense(['snitch'], { notes: ['derog'] })]),
      entry(
        [reading('あそこ'), reading('あすこ')],
        [sense(['over there'], { onlyForReadings: ['あそこ'] }), sense(['that place'])],
      ),
    ]);
    expect(words.map((word) => `${word.kana} ${word.meaning}`)).toEqual([
      'あすこ that place',
      'あそこ over there',
      'いぬ dog',
    ]);
  });

  it('keeps each kanji spelling of a reading, the most frequent first', () => {
    const words = pickWords([
      entry([reading('かみ', { frequencyBand: 20 })], [sense(['god'])], ['神']),
      entry([reading('かみ', { frequencyBand: 3 })], [sense(['paper'])], ['紙']),
    ]);
    expect(words).toEqual([
      { kana: 'かみ', meaning: 'paper', kanji: '紙', rank: 3 },
      { kana: 'かみ', meaning: 'god', kanji: '神', rank: 20 },
    ]);
  });

  it('keeps the most frequent word when reading and spelling are the same', () => {
    const words = pickWords([
      entry([reading('かみ', { frequencyBand: 20 })], [sense(['top'])], ['上']),
      entry([reading('かみ', { frequencyBand: 8 })], [sense(['upper part'])], ['上']),
    ]);
    expect(words).toEqual([{ kana: 'かみ', meaning: 'upper part', kanji: '上', rank: 8 }]);
  });

  it('shows only a common kanji spelling that goes with the reading', () => {
    const rareKanji = { kanji: [{ text: '珈琲', common: false }] };
    const words = pickWords([
      { ...entry([reading('コーヒー')], [sense(['coffee'])]), ...rareKanji },
      entry([reading('ひと', { noKanji: true })], [sense(['person'])], ['人']),
    ]);
    expect(words.map((word) => word.kanji)).toEqual([undefined, undefined]);
  });
});

describe('the kanji spelling of a word', () => {
  it('goes with the usual reading only: the first common one JMdict lists', () => {
    const today = entry(
      [reading('きょう', { frequencyBand: null }), reading('こんにち', { frequencyBand: 2 })],
      [sense(['today'])],
      ['今日'],
    );
    expect(pickWords([today]).map((word) => `${word.kana} ${word.kanji}`)).toEqual([
      'きょう 今日',
      'こんにち undefined',
    ]);
  });

  it('skips rare readings when finding the usual one', () => {
    const japan = entry(
      [reading('ひのもと', { common: false }), reading('にほん'), reading('にっぽん')],
      [sense(['Japan'])],
      ['日本'],
    );
    expect(pickWords([japan]).find((word) => word.kanji)?.kana).toBe('にほん');
  });
});

describe('the JLPT level of a word', () => {
  it('is given to kanji words on the lists, by spelling and reading', () => {
    const levels = new Map([[wordKey('今日', 'きょう'), 5 as const]]);
    const words = pickWords(
      [
        entry([reading('きょう'), reading('こんにち')], [sense(['today'])], ['今日']),
        entry([reading('きょう')], [sense(['capital'])], ['京']),
      ],
      levels,
    );
    expect(words.map((word) => `${word.kanji} ${word.kana} ${word.jlpt}`)).toEqual([
      '今日 きょう 5',
      '京 きょう undefined',
      'undefined こんにち undefined',
    ]);
  });

  it('is found under another spelling of the same word (終る for 終わる)', () => {
    const levels = new Map([[wordKey('終る', 'おわる'), 5 as const]]);
    const end = {
      ...entry([reading('おわる')], [sense(['to end'])]),
      kanji: [
        { text: '終わる', common: true },
        { text: '終る', common: false },
      ],
    };
    expect(pickWords([end], levels)).toMatchObject([{ kanji: '終わる', jlpt: 5 }]);
  });
});

describe('toRow', () => {
  it('writes the JLPT level last, only for kanji words that have one', () => {
    expect(toRow({ kana: 'きょう', meaning: 'today', rank: 49, kanji: '今日', jlpt: 5 })).toEqual([
      'きょう',
      'today',
      49,
      '今日',
      5,
    ]);
  });

  it('writes a word as [kana, meaning, rank, kanji?]', () => {
    expect(toRow({ kana: 'いぬ', meaning: 'dog', kanji: '犬', rank: 3 })).toEqual([
      'いぬ',
      'dog',
      3,
      '犬',
    ]);
    expect(toRow({ kana: 'コーヒー', meaning: 'coffee', rank: UNRANKED })).toEqual([
      'コーヒー',
      'coffee',
      UNRANKED,
    ]);
  });
});
