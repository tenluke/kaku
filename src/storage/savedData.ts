import {
  JLPT_LEVELS,
  KANA_SCRIPTS,
  KANA_SETS,
  type JlptLevel,
  type KanaScript,
  type KanaSet,
} from '../practice/items';
import type { SetupTab } from '../practice/selection';
import { BOOKS, type BookId } from '../practice/books';

/*
 * Everything the app saves in the browser, as one versioned record.
 *
 * Rules:
 * - Adding a field is fine without a new version, as long as reading fills in a default when
 *   it is missing (older saved data then still loads). Renaming, removing or changing the
 *   meaning of a field needs a new version and a migration.
 * - The record has a `version`. When its shape changes, CURRENT_VERSION goes up and a step is
 *   added to MIGRATIONS that turns the previous version into the new one, with a test.
 * - Reading is forgiving: a broken part is dropped or reset, the rest is kept.
 * - Data from a newer app version is never overwritten (see store.ts).
 */

export const CURRENT_VERSION = 2;

export type PracticeMode = 'all' | 'random' | 'words';
export type Theme = 'light' | 'dark';
const PRACTICE_MODES: readonly PracticeMode[] = ['all', 'random', 'words'];

export interface SavedSettings {
  tab: SetupTab;
  /** Lists tab: which saved main lists are on, and which of their sublists are chosen. */
  listChoices: Record<string, ListChoice>;
  scripts: Record<KanaScript, boolean>;
  kanaSets: Record<KanaScript, Record<KanaSet, boolean>>;
  levels: Record<JlptLevel, boolean>;
  excluded: Record<SetupTab, string[]>;
  /** "words" is only offered on the Kana tab; the other tabs treat it as "random". */
  mode: PracticeMode;
  count: number;
  /** Lists tab: which books are chosen, and which of their groups (by position). */
  bookChoices: Record<BookId, BookChoice>;
  /** Light or dark look; null until the first visit takes it from the browser (theme.ts). */
  theme: Theme | null;
}

/** A main list's choice: whether it is on, and the chosen sublists (by name). */
export interface ListChoice {
  on: boolean;
  sublists: string[];
}

export interface BookChoice {
  on: boolean;
  groups: number[];
}

/** How well one character is remembered. */
export interface PassRateEntry {
  seen: number; // sessions that included it
  passed: number; // of those, how many passed
  recent: string; // last results, oldest first: "1" pass, "0" fail (at most 10)
  lastSeen: number; // when last practised, in milliseconds since 1970
}

/** A sublist: the characters to practise together. */
export interface SubList {
  name: string;
  itemIds: string[];
}

/** A saved main list: it only holds sublists (Lists tab → Saved lists). */
export interface MainList {
  name: string;
  sublists: SubList[];
}

export interface SavedData {
  version: typeof CURRENT_VERSION;
  settings: SavedSettings;
  passRates: Record<string, PassRateEntry>;
  lists: MainList[];
}

export const RECENT_RESULTS_KEPT = 10;
export const MAX_MAIN_LISTS = 50;
export const MAX_SUBLISTS = 50; // per main list
export const MAX_LIST_NAME_LENGTH = 40;
const MAX_COUNT = 10_000;
// Ids look like "hiragana:あ", "katakana:キャ" or "kanji:日".
export const VALID_ITEM_ID =
  /^kanji:\p{Script=Han}$|^hiragana:\p{Script=Hiragana}{1,2}$|^katakana:\p{Script=Katakana}{1,2}$/u;

export function defaultSettings(): SavedSettings {
  return {
    tab: 'kana',
    listChoices: {},
    scripts: { hiragana: true, katakana: false },
    kanaSets: {
      hiragana: { basic: true, voiced: false, digraph: false },
      katakana: { basic: true, voiced: false, digraph: false },
    },
    levels: { 5: true, 4: false, 3: false, 2: false, 1: false },
    excluded: { kana: [], kanji: [], custom: [] },
    mode: 'all',
    count: 20,
    bookChoices: { rtk1: { on: false, groups: [] } },
    theme: null,
  };
}

export const emptySavedData = (): SavedData => ({
  version: CURRENT_VERSION,
  settings: defaultSettings(),
  passRates: {},
  lists: [],
});

// ----- Reading untrusted data: every value is checked, anything odd falls back -----

type Unknown = Record<string, unknown>;
const isObject = (value: unknown): value is Unknown =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const booleanOr = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

function readFlags<K extends string | number>(
  value: unknown,
  keys: readonly K[],
  fallback: Record<K, boolean>,
) {
  const source = isObject(value) ? value : {};
  const flags = { ...fallback };
  for (const key of keys) flags[key] = booleanOr(source[String(key)], fallback[key]);
  return flags;
}

const readIds = (value: unknown): string[] =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter((id): id is string => typeof id === 'string' && VALID_ITEM_ID.test(id)),
        ),
      ]
    : [];

export function readSettings(value: unknown): SavedSettings {
  const fallback = defaultSettings();
  if (!isObject(value)) return fallback;
  const kanaSets = isObject(value.kanaSets) ? value.kanaSets : {};
  const excluded = isObject(value.excluded) ? value.excluded : {};
  const count = value.count;
  return {
    tab: value.tab === 'kanji' || value.tab === 'custom' ? value.tab : 'kana',
    listChoices: readListChoices(value.listChoices),
    scripts: readFlags(value.scripts, KANA_SCRIPTS, fallback.scripts),
    kanaSets: {
      hiragana: readFlags(kanaSets.hiragana, KANA_SETS, fallback.kanaSets.hiragana),
      katakana: readFlags(kanaSets.katakana, KANA_SETS, fallback.kanaSets.katakana),
    },
    levels: readFlags(value.levels, JLPT_LEVELS, fallback.levels),
    excluded: {
      kana: readIds(excluded.kana),
      kanji: readIds(excluded.kanji),
      custom: readIds(excluded.custom),
    },
    mode: PRACTICE_MODES.includes(value.mode as PracticeMode)
      ? (value.mode as PracticeMode)
      : 'all',
    count:
      typeof count === 'number' && Number.isInteger(count) && count >= 1 && count <= MAX_COUNT
        ? count
        : fallback.count,
    bookChoices: readBookChoices(value.bookChoices),
    theme: value.theme === 'light' || value.theme === 'dark' ? value.theme : null,
  };
}

const MAX_BOOK_GROUPS = 100; // more than any book has (RTK 1: 22 groups of 100 frames)

function readBookChoices(value: unknown): Record<BookId, BookChoice> {
  const choices = defaultSettings().bookChoices;
  if (!isObject(value)) return choices;
  for (const book of BOOKS) {
    const raw = value[book];
    if (!isObject(raw)) continue;
    const groups = Array.isArray(raw.groups)
      ? raw.groups.filter(
          (n): n is number =>
            Number.isInteger(n) && (n as number) >= 0 && (n as number) < MAX_BOOK_GROUPS,
        )
      : [];
    choices[book] = { on: booleanOr(raw.on, false), groups: [...new Set(groups)] };
  }
  return choices;
}

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1_000_000;

/** A clean copy of one pass-rate entry, or null if anything about it looks wrong. */
export function readPassRateEntry(value: unknown): PassRateEntry | null {
  if (!isObject(value)) return null;
  const { seen, passed, recent, lastSeen } = value;
  if (!isCount(seen) || seen < 1 || !isCount(passed) || passed > seen) return null;
  if (typeof recent !== 'string' || !/^[01]{0,10}$/.test(recent)) return null;
  if (typeof lastSeen !== 'number' || !Number.isFinite(lastSeen) || lastSeen < 0) return null;
  return { seen, passed, recent, lastSeen };
}

export function readPassRates(value: unknown): Record<string, PassRateEntry> {
  const rates: Record<string, PassRateEntry> = {};
  if (!isObject(value)) return rates;
  for (const [id, raw] of Object.entries(value)) {
    const entry = readPassRateEntry(raw);
    if (entry && VALID_ITEM_ID.test(id)) rates[id] = entry;
  }
  return rates;
}

const readName = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, MAX_LIST_NAME_LENGTH) : null;

/** Keeps the first of each name: names must be unique (they identify lists and choices). */
const uniqueByName = <T extends { name: string }>(items: T[]): T[] =>
  items.filter((item, index) => items.findIndex((other) => other.name === item.name) === index);

function readSublist(value: unknown): SubList | null {
  if (!isObject(value)) return null;
  const name = readName(value.name);
  const itemIds = readIds(value.itemIds);
  return name && itemIds.length ? { name, itemIds } : null;
}

/** Saved main lists: broken sublists and main lists left empty are dropped, the rest kept. */
export function readLists(value: unknown): MainList[] {
  if (!Array.isArray(value)) return [];
  const lists: MainList[] = [];
  for (const raw of value.filter(isObject)) {
    const name = readName(raw.name);
    const sublists = Array.isArray(raw.sublists)
      ? uniqueByName(
          raw.sublists.map(readSublist).filter((sub): sub is SubList => sub !== null),
        ).slice(0, MAX_SUBLISTS)
      : [];
    if (name && sublists.length) lists.push({ name, sublists });
  }
  return uniqueByName(lists).slice(0, MAX_MAIN_LISTS);
}

function readListChoices(value: unknown): Record<string, ListChoice> {
  const choices: Record<string, ListChoice> = {};
  if (!isObject(value)) return choices;
  for (const [rawName, raw] of Object.entries(value).slice(0, MAX_MAIN_LISTS)) {
    const name = readName(rawName);
    if (!name || !isObject(raw)) continue;
    const sublists = Array.isArray(raw.sublists)
      ? [...new Set(raw.sublists.map(readName).filter((n): n is string => n !== null))]
      : [];
    choices[name] = { on: booleanOr(raw.on, false), sublists: sublists.slice(0, MAX_SUBLISTS) };
  }
  return choices;
}

/*
 * One step per old version: MIGRATIONS[n] turns version n data into version n + 1.
 * - 1 → 2: saved lists became main lists with sublists. Starting the lists fresh was agreed
 *   (before the first release); pass rates and settings are kept.
 */
const MIGRATIONS: Record<number, (old: Unknown) => Unknown> = {
  1: (old) => ({ version: 2, settings: old.settings, passRates: old.passRates, lists: [] }),
};

export type ReadResult =
  | { kind: 'empty'; data: SavedData }
  | { kind: 'ok'; data: SavedData }
  | { kind: 'unreadable'; data: SavedData } // not JSON or not our format: start fresh
  | { kind: 'newer'; data: SavedData; version: number }; // saved by a newer app version

/** Turns the saved text (or null when nothing is saved) into data the app can use. */
export function readSavedData(text: string | null): ReadResult {
  if (text === null) return { kind: 'empty', data: emptySavedData() };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: 'unreadable', data: emptySavedData() };
  }
  if (!isObject(parsed) || !Number.isInteger(parsed.version) || (parsed.version as number) < 1) {
    return { kind: 'unreadable', data: emptySavedData() };
  }
  let record: Unknown = parsed;
  let version = record.version as number;
  if (version > CURRENT_VERSION) return { kind: 'newer', data: emptySavedData(), version };
  while (version < CURRENT_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) return { kind: 'unreadable', data: emptySavedData() };
    record = migrate(record);
    version = record.version as number;
  }
  return {
    kind: 'ok',
    data: {
      version: CURRENT_VERSION,
      settings: readSettings(record.settings),
      passRates: readPassRates(record.passRates),
      lists: readLists(record.lists),
    },
  };
}
