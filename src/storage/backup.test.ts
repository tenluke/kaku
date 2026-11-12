import { describe, expect, it } from 'vitest';
import { applyBackup, buildBackup, mergePassRates, parseBackup } from './backup';
import { defaultSettings, emptySavedData, type MainList, type SavedData } from './savedData';

const known = new Set(['hiragana:あ', 'hiragana:い', 'kanji:日', 'kanji:月']);
const entry = (seen: number, lastSeen: number) => ({ seen, passed: 0, recent: '0', lastSeen });
const main = (name: string, ...subs: [string, string[]][]): MainList => ({
  name,
  sublists: subs.map(([subName, itemIds]) => ({ name: subName, itemIds })),
});

const myData = (): SavedData => ({
  ...emptySavedData(),
  settings: {
    ...defaultSettings(),
    count: 7,
    listChoices: { Mine: { on: true, sublists: ['All'] } },
  },
  passRates: { 'kanji:日': entry(3, 100) },
  lists: [main('Mine', ['All', ['kanji:日']])],
});

describe('buildBackup + parseBackup', () => {
  it('round-trips the chosen parts', () => {
    const text = buildBackup(myData(), ['lists', 'passRates'], new Date('2026-11-11T10:00:00Z'));
    const parsed = parseBackup(text, known);
    expect(parsed).toEqual({
      ok: true,
      backup: {
        exportedAt: '2026-11-11',
        lists: [main('Mine', ['All', ['kanji:日']])],
        passRates: { 'kanji:日': entry(3, 100) },
        skipped: 0,
      },
    });
  });

  it('rejects things that are not our backups', () => {
    const error = (text: string) => {
      const parsed = parseBackup(text, known);
      return parsed.ok ? null : parsed.error;
    };
    expect(error('   ')).toBe('empty');
    expect(error('{nope')).toBe('notJson');
    expect(error('{"app":"other","format":2}')).toBe('notOurs');
    expect(error('{"app":"kaku","format":3}')).toBe('newer');
    expect(error('{"app":"kaku","format":2,"lists":[]}')).toBe('nothingUsable');
    expect(error('x'.repeat(5_000_001))).toBe('tooBig');
  });

  it('leaves out and counts broken or unknown entries', () => {
    const text = JSON.stringify({
      app: 'kaku',
      format: 2,
      lists: [
        {
          name: 'Trip',
          sublists: [
            { name: 'Good', itemIds: ['kanji:日', 'kanji:龘'] }, // 龘 is not in the app: dropped
            { name: 'Unknown only', itemIds: ['kanji:龘'] },
            { name: '<b>Bad</b>', itemIds: 'not a list' },
          ],
        },
      ],
      passRates: { 'kanji:月': entry(1, 1), 'kanji:龘': entry(1, 1), 'hiragana:あ': { seen: -1 } },
    });
    const parsed = parseBackup(text, known);
    expect(parsed.ok && parsed.backup).toEqual({
      exportedAt: '',
      lists: [main('Trip', ['Good', ['kanji:日']])],
      passRates: { 'kanji:月': entry(1, 1) },
      skipped: 4,
    });
  });

  it('still imports a format 1 backup, without its one-level lists', () => {
    const text = JSON.stringify({
      app: 'kaku',
      format: 1,
      customLists: [{ name: 'Old', itemIds: ['kanji:日'] }],
      passRates: { 'kanji:日': entry(1, 1) },
    });
    const parsed = parseBackup(text, known);
    expect(parsed.ok && parsed.backup).toEqual({
      exportedAt: '',
      passRates: { 'kanji:日': entry(1, 1) },
      skipped: 1,
    });
  });
});

describe('merging pass rates', () => {
  it('keeps the pass rate with more history', () => {
    const mine = { 'kanji:日': entry(5, 1), 'kanji:月': entry(1, 1) };
    const theirs = { 'kanji:日': entry(2, 9), 'kanji:月': entry(1, 2), 'hiragana:あ': entry(1, 1) };
    expect(mergePassRates(mine, theirs)).toEqual({
      'kanji:日': entry(5, 1),
      'kanji:月': entry(1, 2),
      'hiragana:あ': entry(1, 1),
    });
  });
});

describe('applyBackup', () => {
  const backup = {
    exportedAt: '',
    lists: [main('Theirs', ['Day 1', ['kanji:月']])],
    passRates: { 'kanji:月': entry(1, 1) },
    settings: { ...defaultSettings(), count: 3 },
    skipped: 0,
  };

  it('merges only the chosen parts', () => {
    const next = applyBackup(myData(), backup, ['lists'], 'merge');
    expect(next.lists.map((list) => list.name)).toEqual(['Mine', 'Theirs']);
    expect(next.passRates).toEqual(myData().passRates);
    expect(next.settings.count).toBe(7);
  });

  it('replaces, and forgets choices of main lists that no longer exist', () => {
    const next = applyBackup(myData(), backup, ['lists', 'passRates'], 'replace');
    expect(next.lists).toEqual(backup.lists);
    expect(next.passRates).toEqual(backup.passRates);
    expect(next.settings.listChoices).toEqual({});
  });
});
