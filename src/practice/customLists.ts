import {
  MAX_LIST_NAME_LENGTH,
  MAX_MAIN_LISTS,
  MAX_SUBLISTS,
  type MainList,
  type SubList,
} from '../storage/savedData';
import type { SetupTab } from './selection';

/*
 * Saved lists, in two levels: main lists that hold sublists of characters. These functions
 * never change the lists they are given; they return new ones, so the caller decides when to
 * save. A main list with no sublists left is removed.
 */

export type SaveOutcome =
  | { kind: 'added' | 'replaced'; lists: MainList[]; main: string; name: string; count: number }
  | {
      kind:
        | 'noName'
        | 'noMainName'
        | 'noCharacters'
        | 'tooManyMainLists'
        | 'tooManySublists'
        | 'sameCharactersExist';
    };

/** Normal list names: spaces trimmed and the length limited. */
export const cleanListName = (name: string): string => name.trim().slice(0, MAX_LIST_NAME_LENGTH);

/** The name with " (2)", " (3)" … added until no name in `taken` has it. */
function freeName(base: string, taken: readonly string[]): string {
  let name = base;
  for (let copy = 2; taken.includes(name); copy++) {
    const suffix = ` (${copy})`;
    name = base.slice(0, MAX_LIST_NAME_LENGTH - suffix.length) + suffix;
  }
  return name;
}

/**
 * Saves `itemIds` as the sublist `subName` of the main list `mainName`, making the main list
 * if it doesn't exist yet. A sublist with the same name there is replaced (that's how you
 * update one).
 */
export function saveSublist(
  lists: readonly MainList[],
  mainName: string,
  subName: string,
  itemIds: readonly string[],
): SaveOutcome {
  const main = cleanListName(mainName);
  const name = cleanListName(subName);
  const ids = [...new Set(itemIds)];
  if (!main) return { kind: 'noMainName' };
  if (!name) return { kind: 'noName' };
  if (!ids.length) return { kind: 'noCharacters' };
  const sublist: SubList = { name, itemIds: ids };
  const done = (kind: 'added' | 'replaced', next: MainList[]): SaveOutcome => ({
    kind,
    lists: next,
    main,
    name,
    count: ids.length,
  });
  const mainIndex = lists.findIndex((list) => list.name === main);
  if (mainIndex < 0) {
    if (lists.length >= MAX_MAIN_LISTS) return { kind: 'tooManyMainLists' };
    return done('added', [...lists, { name: main, sublists: [sublist] }]);
  }
  const current = lists[mainIndex] as MainList;
  const subIndex = current.sublists.findIndex((sub) => sub.name === name);
  if (subIndex < 0 && current.sublists.length >= MAX_SUBLISTS) return { kind: 'tooManySublists' };
  const sublists =
    subIndex < 0
      ? [...current.sublists, sublist]
      : current.sublists.map((sub, i) => (i === subIndex ? sublist : sub));
  const next = lists.map((list, i) => (i === mainIndex ? { name: main, sublists } : list));
  return done(subIndex < 0 ? 'added' : 'replaced', next);
}

const sameCharacters = (a: readonly string[], b: readonly string[]): boolean => {
  const set = new Set(a);
  return a.length === b.length && b.every((id) => set.has(id));
};

/**
 * Saves an automatically named sublist (e.g. the weakest characters into "Weakest"), unless the
 * main list already has a sublist with exactly these characters. A taken name gets " (2)" …
 */
export function saveNewSublist(
  lists: readonly MainList[],
  mainName: string,
  baseName: string,
  itemIds: readonly string[],
): SaveOutcome {
  const sublists = lists.find((list) => list.name === cleanListName(mainName))?.sublists ?? [];
  if (sublists.some((sub) => sameCharacters(sub.itemIds, [...new Set(itemIds)]))) {
    return { kind: 'sameCharactersExist' };
  }
  const name = freeName(
    cleanListName(baseName),
    sublists.map((sub) => sub.name),
  );
  return saveSublist(lists, mainName, name, itemIds);
}

export type RenameOutcome =
  | { kind: 'renamed'; lists: MainList[]; name: string }
  | { kind: 'noName' | 'nameTaken' | 'unchanged' };

export function renameMainList(
  lists: readonly MainList[],
  oldName: string,
  newName: string,
): RenameOutcome {
  const name = cleanListName(newName);
  if (!name) return { kind: 'noName' };
  if (name === oldName) return { kind: 'unchanged' };
  if (lists.some((list) => list.name === name)) return { kind: 'nameTaken' };
  return {
    kind: 'renamed',
    lists: lists.map((list) => (list.name === oldName ? { ...list, name } : list)),
    name,
  };
}

/** Renames one sublist of a main list; names must stay unique within that main list. */
export function renameSublist(
  lists: readonly MainList[],
  main: string,
  oldName: string,
  newName: string,
): RenameOutcome {
  const name = cleanListName(newName);
  const sublists = lists.find((list) => list.name === main)?.sublists ?? [];
  if (!name) return { kind: 'noName' };
  if (name === oldName) return { kind: 'unchanged' };
  if (sublists.some((sub) => sub.name === name)) return { kind: 'nameTaken' };
  return {
    kind: 'renamed',
    lists: lists.map((list) =>
      list.name === main
        ? {
            ...list,
            sublists: list.sublists.map((sub) => (sub.name === oldName ? { ...sub, name } : sub)),
          }
        : list,
    ),
    name,
  };
}

export const deleteMainList = (lists: readonly MainList[], main: string): MainList[] =>
  lists.filter((list) => list.name !== main);

/** Removes one sublist; its main list goes too when it has no sublists left. */
export const deleteSublist = (lists: readonly MainList[], main: string, sub: string): MainList[] =>
  lists
    .map((list) =>
      list.name === main
        ? { ...list, sublists: list.sublists.filter((s) => s.name !== sub) }
        : list,
    )
    .filter((list) => list.sublists.length > 0);

/** Merges incoming main lists into yours (Backup & transfer, "Merge"). */
export function mergeLists(
  existing: readonly MainList[],
  incoming: readonly MainList[],
): MainList[] {
  let merged = [...existing];
  for (const main of incoming) {
    for (const sub of main.sublists) {
      const outcome = saveNewSublist(merged, main.name, sub.name, sub.itemIds);
      if (outcome.kind === 'added') merged = outcome.lists;
    }
  }
  return merged;
}

/** Which setup tab a character belongs to: kana (hiragana or katakana) or kanji. */
export const tabOfId = (id: string): 'kana' | 'kanji' =>
  id.startsWith('kanji:') ? 'kanji' : 'kana';

/**
 * The ids of a list that the given tab cannot show. Saving a list from the Kana tab keeps
 * these (its kanji), so editing one part never loses the other. The Lists tab shows all.
 * `kanjiTabShows` says which kanji the Kanji tab has (it has no RTK-only kanji).
 */
export const idsOutsideTab = (
  itemIds: readonly string[],
  tab: SetupTab,
  kanjiTabShows: (id: string) => boolean = () => true,
): string[] =>
  tab === 'custom'
    ? []
    : itemIds.filter((id) => tabOfId(id) !== tab || (tab === 'kanji' && !kanjiTabShows(id)));

/** The tab where a list is edited: Kana if it has any kana, otherwise Kanji. */
export const editTabFor = (itemIds: readonly string[]): 'kana' | 'kanji' =>
  itemIds.some((id) => tabOfId(id) === 'kana') ? 'kana' : 'kanji';
