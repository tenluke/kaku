import { describe, expect, it } from 'vitest';
import { MAX_MAIN_LISTS, MAX_SUBLISTS, type MainList } from '../storage/savedData';
import {
  deleteMainList,
  deleteSublist,
  editTabFor,
  idsOutsideTab,
  mergeLists,
  renameMainList,
  renameSublist,
  saveNewSublist,
  saveSublist,
} from './customLists';

const trip = (): MainList[] => [
  {
    name: 'Trip',
    sublists: [
      { name: 'Day 1', itemIds: ['kanji:日'] },
      { name: 'Day 2', itemIds: ['kanji:月'] },
    ],
  },
];

describe('saveSublist', () => {
  it('makes the main list when it is new, with trimmed names and no duplicate characters', () => {
    expect(saveSublist([], ' Verbs ', '  Week 1  ', ['kanji:行', 'kanji:行', 'kanji:来'])).toEqual({
      kind: 'added',
      lists: [{ name: 'Verbs', sublists: [{ name: 'Week 1', itemIds: ['kanji:行', 'kanji:来'] }] }],
      main: 'Verbs',
      name: 'Week 1',
      count: 2,
    });
  });

  it('adds a sublist to an existing main list, or replaces one with the same name', () => {
    const added = saveSublist(trip(), 'Trip', 'Day 3', ['kanji:火']);
    expect(added.kind === 'added' && added.lists[0]?.sublists.map((s) => s.name)).toEqual([
      'Day 1',
      'Day 2',
      'Day 3',
    ]);
    const replaced = saveSublist(trip(), 'Trip', 'Day 1', ['kanji:水']);
    expect(replaced.kind).toBe('replaced');
    expect(replaced.kind === 'replaced' && replaced.lists[0]?.sublists[0]).toEqual({
      name: 'Day 1',
      itemIds: ['kanji:水'],
    });
  });

  it('needs names and characters, and keeps to the limits', () => {
    expect(saveSublist([], '  ', 'A', ['kanji:日']).kind).toBe('noMainName');
    expect(saveSublist([], 'A', '  ', ['kanji:日']).kind).toBe('noName');
    expect(saveSublist([], 'A', 'B', []).kind).toBe('noCharacters');
    const manyMains = Array.from({ length: MAX_MAIN_LISTS }, (_, i) => ({
      name: `M${i}`,
      sublists: [{ name: 'S', itemIds: ['kanji:日'] }],
    }));
    expect(saveSublist(manyMains, 'One more', 'S', ['kanji:日']).kind).toBe('tooManyMainLists');
    const fullMain = [
      {
        name: 'Full',
        sublists: Array.from({ length: MAX_SUBLISTS }, (_, i) => ({
          name: `S${i}`,
          itemIds: ['kanji:日'],
        })),
      },
    ];
    expect(saveSublist(fullMain, 'Full', 'One more', ['kanji:日']).kind).toBe('tooManySublists');
    expect(saveSublist(fullMain, 'Full', 'S3', ['kanji:月']).kind).toBe('replaced');
  });

  it('cuts names to 40 characters', () => {
    const outcome = saveSublist([], 'm'.repeat(60), 's'.repeat(60), ['kanji:日']);
    expect(outcome.kind === 'added' && [outcome.main.length, outcome.name.length]).toEqual([
      40, 40,
    ]);
  });
});

describe('saveNewSublist', () => {
  it('numbers a taken name, and skips the same characters in that main list', () => {
    const weakest = [
      { name: 'Weakest', sublists: [{ name: '2026-11-12', itemIds: ['kanji:日'] }] },
    ];
    expect(saveNewSublist(weakest, 'Weakest', '2026-11-12', ['kanji:月'])).toMatchObject({
      kind: 'added',
      name: '2026-11-12 (2)',
    });
    expect(saveNewSublist(weakest, 'Weakest', 'x', ['kanji:日']).kind).toBe('sameCharactersExist');
  });
});

describe('renaming and deleting', () => {
  it('renames a main list unless the name is empty or taken', () => {
    const lists = [...trip(), { name: 'Other', sublists: [{ name: 'A', itemIds: ['kanji:日'] }] }];
    expect(renameMainList(lists, 'Trip', ' Japan ')).toMatchObject({
      kind: 'renamed',
      name: 'Japan',
    });
    expect(renameMainList(lists, 'Trip', 'Other').kind).toBe('nameTaken');
    expect(renameMainList(lists, 'Trip', ' ').kind).toBe('noName');
    expect(renameMainList(lists, 'Trip', 'Trip').kind).toBe('unchanged');
  });

  it('renames a sublist unless the name is empty or taken in that main list', () => {
    const renamed = renameSublist(trip(), 'Trip', 'Day 1', ' Monday ');
    expect(renamed.kind === 'renamed' && renamed.lists[0]?.sublists.map((s) => s.name)).toEqual([
      'Monday',
      'Day 2',
    ]);
    expect(renameSublist(trip(), 'Trip', 'Day 1', 'Day 2').kind).toBe('nameTaken');
    expect(renameSublist(trip(), 'Trip', 'Day 1', '').kind).toBe('noName');
    expect(renameSublist(trip(), 'Trip', 'Day 1', 'Day 1').kind).toBe('unchanged');
  });

  it('deletes a sublist, and the main list once it is empty', () => {
    const once = deleteSublist(trip(), 'Trip', 'Day 1');
    expect(once[0]?.sublists.map((s) => s.name)).toEqual(['Day 2']);
    expect(deleteSublist(once, 'Trip', 'Day 2')).toEqual([]);
  });

  it('deletes a main list with all its sublists', () => {
    expect(deleteMainList(trip(), 'Trip')).toEqual([]);
  });
});

describe('mergeLists', () => {
  it('adds new sublists, skips identical ones, and numbers clashing names', () => {
    const incoming: MainList[] = [
      {
        name: 'Trip',
        sublists: [
          { name: 'Day 1', itemIds: ['kanji:日'] }, // identical: skipped
          { name: 'Day 2', itemIds: ['kanji:火'] }, // name taken: "Day 2 (2)"
        ],
      },
      { name: 'New', sublists: [{ name: 'A', itemIds: ['kanji:水'] }] },
    ];
    const merged = mergeLists(trip(), incoming);
    expect(merged.map((m) => [m.name, m.sublists.map((s) => s.name)])).toEqual([
      ['Trip', ['Day 1', 'Day 2', 'Day 2 (2)']],
      ['New', ['A']],
    ]);
    expect(mergeLists(merged, incoming)).toEqual(merged); // importing twice changes nothing
  });
});

describe('editing a list on one tab', () => {
  const mixed = ['hiragana:あ', 'katakana:キャ', 'kanji:日'];

  it('keeps the characters the tab cannot show', () => {
    expect(idsOutsideTab(mixed, 'kana')).toEqual(['kanji:日']);
    expect(idsOutsideTab(mixed, 'kanji')).toEqual(['hiragana:あ', 'katakana:キャ']);
    // Kanji the Kanji tab can't show (RTK Book 1 only) are kept too.
    const onKanjiTab = (id: string) => id === 'kanji:日';
    expect(idsOutsideTab(['kanji:日', 'kanji:丘'], 'kanji', onKanjiTab)).toEqual(['kanji:丘']);
    expect(idsOutsideTab(mixed, 'custom')).toEqual([]);
  });

  it('edits on the Kana tab when the list has kana, else on the Kanji tab', () => {
    expect(editTabFor(mixed)).toBe('kana');
    expect(editTabFor(['kanji:日'])).toBe('kanji');
  });
});
