import type { BookChoice, ListChoice, MainList, SavedSettings } from '../storage/savedData';
import { BOOKS, type BookId, type BookGroup } from './books';
import { itemsInGroup } from './catalog';
import {
  JLPT_LEVELS,
  KANA_SCRIPTS,
  KANA_SETS,
  kanaItems,
  type KanaScript,
  kanjiItem,
  type JlptLevel,
  type KanaSet,
  type KanjiRecord,
  type PracticeItem,
} from './items';

/*
 * What the setup screen has switched on, and which characters that gives.
 * The Kana, Kanji and Custom tabs each keep their own choices.
 */

export type SetupTab = 'kana' | 'kanji' | 'custom';
export type { KanaScript } from './items';

// The constants live in items.ts (so catalog.ts can use them without a circular import);
// they are re-exported here because the setup code thinks of them as "what can be selected".
export { JLPT_LEVELS, KANA_SCRIPTS, KANA_SETS } from './items';

export interface Selection {
  scripts: Record<KanaScript, boolean>;
  kanaSets: Record<KanaScript, Record<KanaSet, boolean>>;
  levels: Record<JlptLevel, boolean>;
  /** Lists tab: the saved main lists that are on, and their chosen sublists (by name). */
  listChoices: Record<string, ListChoice>;
  /** Characters switched off in the picker, by item id, per tab. */
  excluded: Record<SetupTab, Set<string>>;
  /** Lists tab: the books chosen, and which of their groups (by position). */
  bookChoices: Record<BookId, BookChoice>;
}

/** The selection described by saved settings (the defaults on first use). */
export function selectionFromSettings(settings: SavedSettings): Selection {
  return {
    scripts: { ...settings.scripts },
    kanaSets: {
      hiragana: { ...settings.kanaSets.hiragana },
      katakana: { ...settings.kanaSets.katakana },
    },
    levels: { ...settings.levels },
    listChoices: structuredClone(settings.listChoices),
    excluded: {
      kana: new Set(settings.excluded.kana),
      kanji: new Set(settings.excluded.kanji),
      custom: new Set(settings.excluded.custom),
    },
    bookChoices: structuredClone(settings.bookChoices),
  };
}

/** What the selection is made from: the kanji data, saved lists and the books' groups. */
export interface Sources {
  kanji: readonly KanjiRecord[];
  lists: readonly MainList[];
  /** Each book's groups of kanji (RTK 1: groups of 100 frames). */
  books?: Readonly<Record<BookId, readonly BookGroup[]>>;
}

/**
 * A block of characters in the picker, e.g. all switched-on hiragana, all N5 kanji, or one
 * group of a book ("book:rtk1:3", with its title).
 */
export interface PickerGroup {
  key: KanaScript | `n${JlptLevel}` | 'other' | `book:${string}` | `list:${string}`;
  /** Shown instead of the usual group name (for book groups and saved sublists). */
  title?: { book: BookId; group: string } | { list: string; sublist: string };
  items: PracticeItem[];
}

const recordsByCharacter = new WeakMap<readonly KanjiRecord[], Map<string, KanjiRecord>>();

/** The practice item of a book's kanji. */
function bookItem(id: string, kanji: readonly KanjiRecord[]): PracticeItem | null {
  let byCharacter = recordsByCharacter.get(kanji);
  if (!byCharacter) {
    byCharacter = new Map(kanji.map((record) => [record.character, record]));
    recordsByCharacter.set(kanji, byCharacter);
  }
  const record = byCharacter.get(id.slice('kanji:'.length));
  return record ? kanjiItem(record) : null;
}

/** The chosen groups of the chosen books, one picker group each. */
function bookGroups(selection: Selection, sources: Sources): PickerGroup[] {
  const books = sources.books;
  if (!books) return [];
  return BOOKS.filter((book) => selection.bookChoices[book].on).flatMap((book) =>
    [...selection.bookChoices[book].groups]
      .filter((index) => index < books[book].length)
      .sort((a, b) => a - b)
      .map((index) => {
        const group = books[book][index] as BookGroup;
        return {
          key: `book:${book}:${index}` as const,
          title: { book, group: group.name },
          items: group.itemIds
            .map((id) => bookItem(id, sources.kanji))
            .filter((item): item is PracticeItem => item !== null),
        };
      }),
  );
}

const itemsById = new WeakMap<readonly KanjiRecord[], Map<string, PracticeItem>>();

/** Every character the app has, by id (kana and kanji), for looking up a saved list's ids. */
function itemById(id: string, kanji: readonly KanjiRecord[]): PracticeItem | undefined {
  let byId = itemsById.get(kanji);
  if (!byId) {
    byId = new Map(itemsInGroup('all', kanji).map((item) => [item.id, item]));
    itemsById.set(kanji, byId);
  }
  return byId.get(id);
}

/** The chosen sublists of every saved main list that is on, one picker group each. */
function savedListGroups(selection: Selection, sources: Sources): PickerGroup[] {
  return sources.lists.flatMap((main) => {
    const choice = selection.listChoices[main.name];
    if (!choice?.on) return [];
    return main.sublists
      .filter((sub) => choice.sublists.includes(sub.name))
      .map((sub) => ({
        key: `list:${main.name}:${sub.name}` as const,
        title: { list: main.name, sublist: sub.name },
        items: sub.itemIds
          .map((id) => itemById(id, sources.kanji))
          .filter((item): item is PracticeItem => item !== undefined),
      }));
  });
}

export function pickerGroups(tab: SetupTab, selection: Selection, sources: Sources): PickerGroup[] {
  const kanji = sources.kanji;
  if (tab === 'custom')
    return [...bookGroups(selection, sources), ...savedListGroups(selection, sources)];
  if (tab === 'kana') {
    return KANA_SCRIPTS.filter((script) => selection.scripts[script]).map((script) => ({
      key: script,
      items: KANA_SETS.filter((set) => selection.kanaSets[script][set]).flatMap((set) =>
        kanaItems(script, set),
      ),
    }));
  }
  return JLPT_LEVELS.filter((level) => selection.levels[level]).map((level) => ({
    key: `n${level}` as const,
    items: kanji.filter((record) => record.jlpt === level).map(kanjiItem),
  }));
}

/** Every character the tab's switches allow, before the picker's exclusions. */
export const allowedItems = (tab: SetupTab, selection: Selection, sources: Sources) =>
  pickerGroups(tab, selection, sources).flatMap((group) => group.items);

/**
 * The characters a session on this tab would practise. A character in two chosen groups (or
 * a group and the chosen list) is practised once.
 */
export function practicePool(
  tab: SetupTab,
  selection: Selection,
  sources: Sources,
): PracticeItem[] {
  const seen = new Set<string>();
  return allowedItems(tab, selection, sources).filter((item) => {
    if (selection.excluded[tab].has(item.id) || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function toggleExcluded(
  selection: Selection,
  tab: SetupTab,
  ids: readonly string[],
  include: boolean,
): void {
  for (const id of ids) {
    if (include) selection.excluded[tab].delete(id);
    else selection.excluded[tab].add(id);
  }
}

/**
 * Sets up the Kana or Kanji tab to show exactly a list's characters: switches on the scripts,
 * sets or levels that contain them, and switches off every other character in the picker.
 * Used by "Edit" on a custom list.
 */
export function selectOnlyList(
  selection: Selection,
  tab: 'kana' | 'kanji',
  itemIds: readonly string[],
  sources: Sources,
): void {
  const wanted = new Set(itemIds);
  const hasAny = (items: readonly PracticeItem[]) => items.some((item) => wanted.has(item.id));
  if (tab === 'kana') {
    for (const script of KANA_SCRIPTS) {
      for (const set of KANA_SETS) selection.kanaSets[script][set] = hasAny(kanaItems(script, set));
      selection.scripts[script] = KANA_SETS.some((set) => selection.kanaSets[script][set]);
    }
  } else {
    for (const level of JLPT_LEVELS) {
      const levelItems = sources.kanji.filter((record) => record.jlpt === level).map(kanjiItem);
      selection.levels[level] = hasAny(levelItems);
    }
  }
  const allowed = allowedItems(tab, selection, sources);
  selection.excluded[tab] = new Set(
    allowed.filter((item) => !wanted.has(item.id)).map((item) => item.id),
  );
}
