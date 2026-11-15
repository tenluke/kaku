import { describe, expect, it } from 'vitest';
import kanjiRecords from '../data/generated/kanji.json';
import strokesKana from '../data/generated/strokes-kana.json';
import {
  kanaItems,
  kanjiItem,
  kanjiPrompt,
  sessionItems,
  toKatakana,
  type KanjiRecord,
} from './items';

const KANA_SETS = ['basic', 'voiced', 'digraph'] as const;

describe('kana items', () => {
  it('has the usual number of kana in each set', () => {
    expect(KANA_SETS.map((set) => kanaItems('hiragana', set).length)).toEqual([46, 25, 33]);
  });

  it('builds digraphs from two characters', () => {
    expect(kanaItems('hiragana', 'digraph')[0]).toMatchObject({
      id: 'hiragana:きゃ',
      characters: ['き', 'ゃ'],
      prompt: 'kya',
    });
    expect(kanaItems('katakana', 'digraph').map((item) => item.prompt)).toContain('jo');
  });

  it('makes katakana from hiragana', () => {
    expect(toKatakana('あきゃん')).toBe('アキャン');
    expect(kanaItems('katakana', 'basic')[0]).toMatchObject({ id: 'katakana:ア', prompt: 'a' });
  });

  it('has stroke data for every kana it teaches', () => {
    for (const script of ['hiragana', 'katakana'] as const) {
      for (const set of KANA_SETS) {
        for (const item of kanaItems(script, set)) {
          for (const character of item.characters) expect(strokesKana).toHaveProperty(character);
        }
      }
    }
  });
});

describe('kanji items', () => {
  it('uses the first two meanings as the prompt', () => {
    expect(kanjiPrompt(['day', 'sun', 'Japan'])).toBe('day, sun');
    expect(kanjiPrompt(['one'])).toBe('one');
  });

  it('builds an item from a generated record', () => {
    const record = (kanjiRecords as KanjiRecord[])[0] as KanjiRecord;
    expect(kanjiItem(record)).toMatchObject({
      id: 'kanji:日',
      characters: ['日'],
      prompt: 'day, sun',
      jlpt: 5,
    });
  });

  it('marks kanji outside the JLPT lists with their RTK frame', () => {
    const base = { meanings: ['x'], onReadings: [], kunReadings: [], jlpt: null };
    const item = kanjiItem({ ...base, character: '丘', rtkFrame: 1500 });
    expect(item).toMatchObject({ rtkFrame: 1500 });
    expect(item.jlpt).toBeUndefined();
  });

  it('has a prompt for every kanji', () => {
    for (const record of kanjiRecords as KanjiRecord[]) {
      expect(kanjiItem(record).prompt.length).toBeGreaterThan(0);
    }
  });
});

describe('sessionItems', () => {
  const pool = kanaItems('hiragana', 'basic');

  it('keeps every item in All mode', () => {
    const items = sessionItems(pool, 'all', 5);
    expect(items).toHaveLength(46);
    expect(new Set(items.map((item) => item.id)).size).toBe(46);
  });

  it('takes the chosen number in Random mode, within limits', () => {
    expect(sessionItems(pool, 'random', 5)).toHaveLength(5);
    expect(sessionItems(pool, 'random', 500)).toHaveLength(46);
    expect(sessionItems(pool, 'random', 0)).toHaveLength(1);
  });
});
