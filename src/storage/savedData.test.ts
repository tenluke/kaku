import { describe, expect, it } from 'vitest';
import {
  CURRENT_VERSION,
  defaultSettings,
  emptySavedData,
  readSavedData,
  VALID_ITEM_ID,
} from './savedData';

const saved = (data: object) => JSON.stringify({ version: CURRENT_VERSION, ...data });

describe('readSavedData', () => {
  it('starts empty when nothing is saved', () => {
    expect(readSavedData(null)).toEqual({ kind: 'empty', data: emptySavedData() });
  });

  it('reads back what was saved', () => {
    const data = {
      ...emptySavedData(),
      settings: { ...defaultSettings(), mode: 'random' as const, count: 7, tab: 'kanji' as const },
      passRates: { 'kanji:日': { seen: 2, passed: 1, recent: '01', lastSeen: 123 } },
      lists: [
        { name: 'Trip', sublists: [{ name: 'Day 1', itemIds: ['hiragana:きゃ', 'kanji:日'] }] },
      ],
    };
    expect(readSavedData(JSON.stringify(data))).toEqual({ kind: 'ok', data });
  });

  it('treats text that is not our format as unreadable', () => {
    for (const text of ['not json', '[]', '{"version":0}', '{"hello":1}']) {
      expect(readSavedData(text).kind).toBe('unreadable');
    }
  });

  it('recognises data from a newer app version', () => {
    const result = readSavedData(JSON.stringify({ version: CURRENT_VERSION + 1 }));
    expect(result).toMatchObject({ kind: 'newer', version: CURRENT_VERSION + 1 });
  });

  it('loads settings saved before the Custom tab existed (new fields get defaults)', () => {
    const before = {
      tab: 'kanji',
      scripts: { hiragana: true, katakana: true },
      kanaSets: defaultSettings().kanaSets,
      levels: { 5: true, 4: true, 3: false, 2: false, 1: false },
      excluded: { kana: ['hiragana:あ'], kanji: [] },
      mode: 'random',
      count: 15,
    };
    expect(readSavedData(saved({ settings: before })).data.settings).toEqual({
      ...before,
      listChoices: {},
      excluded: { kana: ['hiragana:あ'], kanji: [], custom: [] },
      bookChoices: defaultSettings().bookChoices,
      theme: null,
    });
  });

  it('ignores the removed "show stroke numbers" setting', () => {
    const settings = { ...defaultSettings(), count: 9, showStrokeNumbers: false };
    expect(readSavedData(saved({ settings })).data.settings).toEqual({
      ...defaultSettings(),
      count: 9,
    });
  });

  it('reads every practice mode, Words included', () => {
    for (const mode of ['all', 'random', 'words'] as const) {
      const settings = { ...defaultSettings(), mode };
      expect(readSavedData(saved({ settings })).data.settings.mode).toBe(mode);
    }
  });

  it('reads which RTK groups are chosen, dropping broken entries and unknown books', () => {
    const result = readSavedData(
      saved({
        settings: {
          ...defaultSettings(),
          bookChoices: {
            rtk1: { on: true, groups: [0, 2, -1, 'x', 2] },
            'some other book': { on: true, groups: [1] },
          },
        },
      }),
    );
    expect(result.data.settings.bookChoices).toEqual({ rtk1: { on: true, groups: [0, 2] } });
  });

  it('reads the light or dark theme; anything else means "not chosen yet"', () => {
    const themeOf = (theme: unknown) =>
      readSavedData(saved({ settings: { ...defaultSettings(), theme } })).data.settings.theme;
    expect(themeOf('light')).toBe('light');
    expect(themeOf('dark')).toBe('dark');
    expect(themeOf('purple')).toBeNull();
    expect(themeOf(undefined)).toBeNull();
  });

  it('repairs broken settings field by field', () => {
    const result = readSavedData(
      saved({
        settings: {
          mode: 'sideways',
          count: -3,
          scripts: { katakana: true },
          levels: { 3: 'yes' },
        },
      }),
    );
    expect(result.data.settings).toEqual({
      ...defaultSettings(),
      scripts: { hiragana: true, katakana: true },
    });
  });

  it('drops broken pass-rate entries and lists, keeping the good ones', () => {
    const result = readSavedData(
      saved({
        passRates: {
          'kanji:日': { seen: 1, passed: 1, recent: '1', lastSeen: 1 },
          'kanji:月': { seen: 1, passed: 2, recent: '1', lastSeen: 1 }, // more passes than sessions
          '<script>': { seen: 1, passed: 1, recent: '1', lastSeen: 1 }, // not an item id
        },
        lists: [
          {
            name: '  Trip  ',
            sublists: [
              { name: ' Day 1 ', itemIds: ['kanji:日', 'kanji:日', 'bad id'] },
              { name: 'Day 1', itemIds: ['kanji:月'] }, // same name again: dropped
              { name: '', itemIds: ['kanji:日'] },
              { name: 'Empty', itemIds: [] },
            ],
          },
          { name: 'Only broken sublists', sublists: [{ name: 'x', itemIds: [] }] },
          { name: '', sublists: [{ name: 'x', itemIds: ['kanji:日'] }] },
        ],
      }),
    );
    expect(Object.keys(result.data.passRates)).toEqual(['kanji:日']);
    expect(result.data.lists).toEqual([
      { name: 'Trip', sublists: [{ name: 'Day 1', itemIds: ['kanji:日'] }] },
    ]);
  });

  it('reads which saved lists are on and which sublists are chosen', () => {
    const settings = {
      ...defaultSettings(),
      listChoices: {
        Trip: { on: true, sublists: ['Day 1', 'Day 1', 7, ''] },
        Weakest: { on: 'yes' },
        '': { on: true, sublists: [] },
      },
    };
    expect(readSavedData(saved({ settings })).data.settings.listChoices).toEqual({
      Trip: { on: true, sublists: ['Day 1'] },
      Weakest: { on: false, sublists: [] },
    });
  });

  it('moves version 1 data to version 2: old lists start fresh, progress and settings stay', () => {
    const version1 = {
      version: 1,
      settings: { ...defaultSettings(), count: 12, activeList: 'Mine' },
      passRates: { 'kanji:日': { seen: 2, passed: 1, recent: '01', lastSeen: 5 } },
      customLists: [{ name: 'Mine', itemIds: ['kanji:日'] }],
    };
    const result = readSavedData(JSON.stringify(version1));
    expect(result.kind).toBe('ok');
    expect(result.data.version).toBe(2);
    expect(result.data.lists).toEqual([]);
    expect(result.data.passRates).toEqual(version1.passRates);
    expect(result.data.settings.count).toBe(12);
    expect(result.data.settings).not.toHaveProperty('activeList');
  });
});

describe('VALID_ITEM_ID', () => {
  it('accepts the app’s item ids only', () => {
    for (const id of ['hiragana:あ', 'katakana:キャ', 'kanji:日'])
      expect(VALID_ITEM_ID.test(id)).toBe(true);
    for (const id of ['kanji:あ', 'hiragana:日', 'kanji:日月', 'hiragana:', 'x:あ']) {
      expect(VALID_ITEM_ID.test(id)).toBe(false);
    }
  });
});

describe('VALID_ITEM_ID and the real data', () => {
  it('accepts every item the app can practise', async () => {
    const { kanaItems, kanjiItem } = await import('../practice/items');
    const { ALL_KANJI: kanji } = await import('../practice/kanjiData');
    const ids = [
      ...(['hiragana', 'katakana'] as const).flatMap((script) =>
        (['basic', 'voiced', 'digraph'] as const).flatMap((set) => kanaItems(script, set)),
      ),
      ...kanji.map(kanjiItem),
    ].map((item) => item.id);
    expect(ids.filter((id) => !VALID_ITEM_ID.test(id))).toEqual([]);
  });
});
