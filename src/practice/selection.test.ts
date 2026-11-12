import { describe, expect, it } from 'vitest';
import kanjiRecords from '../data/generated/kanji.json';
import { rtkFrames, rtkGroups } from './books';
import type { KanjiRecord } from './items';
import { ALL_KANJI } from './kanjiData';
import { defaultSettings } from '../storage/savedData';
import {
  pickerGroups,
  practicePool,
  selectOnlyList,
  selectionFromSettings,
  toggleExcluded,
} from './selection';

const defaultSelection = () => selectionFromSettings(defaultSettings());

const kanji = kanjiRecords as KanjiRecord[];
const sources = { kanji, lists: [] };

describe('practicePool', () => {
  it('starts with the defaults: basic hiragana on the Kana tab and N5 on the Kanji tab', () => {
    const selection = defaultSelection();
    expect(practicePool('kana', selection, sources)).toHaveLength(46);
    expect(practicePool('kanji', selection, sources)).toHaveLength(79);
  });

  it('adds sets and scripts that are switched on', () => {
    const selection = defaultSelection();
    selection.kanaSets.hiragana.digraph = true;
    selection.scripts.katakana = true;
    expect(practicePool('kana', selection, sources)).toHaveLength(46 + 33 + 46);
  });

  it('ignores the sets of a script that is switched off', () => {
    const selection = defaultSelection();
    selection.kanaSets.katakana.voiced = true; // katakana itself is off
    expect(practicePool('kana', selection, sources)).toHaveLength(46);
  });

  it('leaves out characters switched off in the picker, per tab', () => {
    const selection = defaultSelection();
    toggleExcluded(selection, 'kana', ['hiragana:あ', 'hiragana:い'], false);
    expect(practicePool('kana', selection, sources)).toHaveLength(44);
    expect(practicePool('kanji', selection, sources)).toHaveLength(79);
    toggleExcluded(selection, 'kana', ['hiragana:あ'], true);
    expect(practicePool('kana', selection, sources)).toHaveLength(45);
  });
});

describe('pickerGroups', () => {
  it('groups kanji by level, easiest first', () => {
    const selection = defaultSelection();
    selection.levels[3] = true;
    expect(
      pickerGroups('kanji', selection, sources).map((group) => [group.key, group.items.length]),
    ).toEqual([
      ['n5', 79],
      ['n3', 367],
    ]);
  });
});

describe('the Lists tab with saved lists', () => {
  const lists = [
    {
      name: 'Trip',
      sublists: [
        { name: 'Day 1', itemIds: ['kanji:日', 'hiragana:あ', 'katakana:キャ'] },
        { name: 'Day 2', itemIds: ['kanji:愛', 'kanji:日'] },
      ],
    },
    { name: 'Other', sublists: [{ name: 'A', itemIds: ['kanji:月'] }] },
  ];

  it('practises the chosen sublists of each main list that is on, one group each', () => {
    const selection = defaultSelection();
    selection.listChoices = {
      Trip: { on: true, sublists: ['Day 1', 'Day 2'] },
      Other: { on: true, sublists: ['A'] },
    };
    const groups = pickerGroups('custom', selection, { kanji, lists });
    expect(groups.map((group) => [group.title, group.items.map((item) => item.id)])).toEqual([
      [{ list: 'Trip', sublist: 'Day 1' }, ['kanji:日', 'hiragana:あ', 'katakana:キャ']],
      [{ list: 'Trip', sublist: 'Day 2' }, ['kanji:愛', 'kanji:日']],
      [{ list: 'Other', sublist: 'A' }, ['kanji:月']],
    ]);
    // 日 is in two chosen sublists: practised once.
    expect(practicePool('custom', selection, { kanji, lists })).toHaveLength(5);
  });

  it('leaves out main lists that are off, and sublists or lists that no longer exist', () => {
    const selection = defaultSelection();
    expect(practicePool('custom', selection, { kanji, lists })).toEqual([]);
    selection.listChoices = {
      Trip: { on: false, sublists: ['Day 1'] },
      Other: { on: true, sublists: ['Deleted'] },
      Deleted: { on: true, sublists: ['A'] },
    };
    expect(practicePool('custom', selection, { kanji, lists })).toEqual([]);
  });
});

describe('selectOnlyList', () => {
  it('shows exactly the list’s kana on the Kana tab', () => {
    const selection = defaultSelection();
    selectOnlyList(selection, 'kana', ['hiragana:が', 'katakana:キャ', 'kanji:日'], sources);
    expect(selection.scripts).toEqual({ hiragana: true, katakana: true });
    expect(selection.kanaSets.hiragana).toEqual({ basic: false, voiced: true, digraph: false });
    expect(selection.kanaSets.katakana).toEqual({ basic: false, voiced: false, digraph: true });
    expect(practicePool('kana', selection, sources).map((item) => item.id)).toEqual([
      'hiragana:が',
      'katakana:キャ',
    ]);
  });

  it('shows exactly the list’s kanji on the Kanji tab', () => {
    const selection = defaultSelection();
    selectOnlyList(selection, 'kanji', ['kanji:日', 'kanji:愛'], sources);
    expect(selection.levels).toEqual({ 5: true, 4: false, 3: true, 2: false, 1: false });
    expect(
      practicePool('kanji', selection, sources)
        .map((item) => item.id)
        .sort(),
    ).toEqual(['kanji:愛', 'kanji:日'].sort());
  });
});

describe('the Lists tab with books', () => {
  const rtk1 = rtkGroups(rtkFrames(ALL_KANJI));
  const bookSources = () => ({
    kanji: ALL_KANJI,
    lists: [{ name: 'Mine', sublists: [{ name: 'All', itemIds: ['kanji:一', 'kanji:日'] }] }],
    books: { rtk1 },
  });

  it('shows nothing until a book group or a list is chosen', () => {
    expect(practicePool('custom', defaultSelection(), bookSources())).toEqual([]);
  });

  it('offers the chosen RTK groups of 100 frames, in book order', () => {
    const selection = defaultSelection();
    selection.bookChoices.rtk1 = { on: true, groups: [1, 0] };
    const groups = pickerGroups('custom', selection, bookSources());
    expect(groups.map((g) => g.title)).toEqual([
      { book: 'rtk1', group: '1–100' },
      { book: 'rtk1', group: '101–200' },
    ]);
    expect(practicePool('custom', selection, bookSources())).toHaveLength(200);
  });

  it('practises a character once when it is in a chosen group and a chosen sublist', () => {
    const selection = defaultSelection();
    selection.bookChoices.rtk1 = { on: true, groups: [0] };
    selection.listChoices = { Mine: { on: true, sublists: ['All'] } };
    const pool = practicePool('custom', selection, bookSources());
    expect(pool).toHaveLength(100); // 一 (frame 1) and 日 (frame 12) are in the group too
  });

  it('ignores chosen groups of a book that is switched off', () => {
    const selection = defaultSelection();
    selection.bookChoices.rtk1 = { on: false, groups: [0] };
    expect(practicePool('custom', selection, bookSources())).toEqual([]);
  });
});
