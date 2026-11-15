import { mergeLists } from '../practice/customLists';
import {
  readLists,
  readPassRates,
  readSettings,
  type MainList,
  type PassRateEntry,
  type SavedData,
  type SavedSettings,
} from './savedData';

/*
 * Backup & transfer: your data as a JSON file (or text) that can be moved to another browser.
 * A backup is untrusted when it comes back: it is checked as carefully as saved data, and
 * anything unknown or broken is left out and counted.
 */

const BACKUP_APP = 'kaku';
/**
 * 2: saved lists became main lists with sublists (`lists`). Format 1 backups still import,
 * except their lists (`customLists`), which are counted as left out.
 */
export const BACKUP_FORMAT = 2;
export const MAX_BACKUP_LENGTH = 5_000_000; // characters; a real backup is far smaller

export type BackupPart = 'lists' | 'passRates' | 'settings';
export const BACKUP_PARTS: readonly BackupPart[] = ['lists', 'passRates', 'settings'];

export function buildBackup(data: SavedData, parts: readonly BackupPart[], now: Date): string {
  const backup: Record<string, unknown> = {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: now.toISOString(),
  };
  for (const part of parts) backup[part] = data[part];
  return JSON.stringify(backup, null, 1);
}

export interface ParsedBackup {
  exportedAt: string; // the day it was made, e.g. "2026-11-11", or "" if unknown
  lists?: MainList[];
  passRates?: Record<string, PassRateEntry>;
  settings?: SavedSettings;
  skipped: number; // entries left out because they were broken or unknown
}

export type BackupError = 'empty' | 'tooBig' | 'notJson' | 'notOurs' | 'newer' | 'nothingUsable';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Checks a backup. `knownIds` are the characters the app has (others are left out). */
export function parseBackup(
  text: string,
  knownIds: ReadonlySet<string>,
): { ok: true; backup: ParsedBackup } | { ok: false; error: BackupError } {
  if (!text.trim()) return { ok: false, error: 'empty' };
  if (text.length > MAX_BACKUP_LENGTH) return { ok: false, error: 'tooBig' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'notJson' };
  }
  if (!isObject(raw) || raw.app !== BACKUP_APP || !Number.isInteger(raw.format)) {
    return { ok: false, error: 'notOurs' };
  }
  if ((raw.format as number) > BACKUP_FORMAT) return { ok: false, error: 'newer' };

  const backup: ParsedBackup = {
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt.slice(0, 10) : '',
    skipped: 0,
  };
  if (Array.isArray(raw.lists)) {
    const lists = readLists(raw.lists)
      .map((main) => ({
        ...main,
        sublists: main.sublists
          .map((sub) => ({ ...sub, itemIds: sub.itemIds.filter((id) => knownIds.has(id)) }))
          .filter((sub) => sub.itemIds.length > 0),
      }))
      .filter((main) => main.sublists.length > 0);
    const count = (all: readonly MainList[]) => all.reduce((n, m) => n + m.sublists.length, 0);
    const rawCount = raw.lists.reduce<number>(
      (n, m) => n + (isObject(m) && Array.isArray(m.sublists) ? m.sublists.length : 0),
      0,
    );
    backup.skipped += rawCount - count(lists);
    if (lists.length) backup.lists = lists;
  }
  // Lists from a format 1 backup had only one level; they are not imported (decided when the
  // two-level lists came, before the first release).
  if (Array.isArray(raw.customLists)) backup.skipped += raw.customLists.length;
  if (isObject(raw.passRates)) {
    const rates = Object.fromEntries(
      Object.entries(readPassRates(raw.passRates)).filter(([id]) => knownIds.has(id)),
    );
    backup.skipped += Object.keys(raw.passRates).length - Object.keys(rates).length;
    if (Object.keys(rates).length) backup.passRates = rates;
  }
  if (isObject(raw.settings)) backup.settings = readSettings(raw.settings);

  if (!backup.lists && !backup.passRates && !backup.settings) {
    return { ok: false, error: 'nothingUsable' };
  }
  return { ok: true, backup };
}

/** For each character keeps the entry with more history (ties: the more recent one). */
export function mergePassRates(
  existing: Readonly<Record<string, PassRateEntry>>,
  incoming: Readonly<Record<string, PassRateEntry>>,
): Record<string, PassRateEntry> {
  const merged = { ...existing };
  for (const [id, theirs] of Object.entries(incoming)) {
    const mine = merged[id];
    if (
      !mine ||
      theirs.seen > mine.seen ||
      (theirs.seen === mine.seen && theirs.lastSeen > mine.lastSeen)
    ) {
      merged[id] = theirs;
    }
  }
  return merged;
}

/** The data after importing the chosen parts. Settings are always replaced (they can't merge). */
export function applyBackup(
  data: SavedData,
  backup: ParsedBackup,
  parts: readonly BackupPart[],
  mode: 'merge' | 'replace',
): SavedData {
  const next: SavedData = { ...data };
  if (parts.includes('lists') && backup.lists) {
    next.lists = mode === 'replace' ? [...backup.lists] : mergeLists(data.lists, backup.lists);
  }
  if (parts.includes('passRates') && backup.passRates) {
    next.passRates =
      mode === 'replace'
        ? { ...backup.passRates }
        : mergePassRates(data.passRates, backup.passRates);
  }
  if (parts.includes('settings') && backup.settings) next.settings = backup.settings;
  // Choices of main lists that are gone after the import are forgotten.
  const names = new Set(next.lists.map((list) => list.name));
  next.settings = {
    ...next.settings,
    listChoices: Object.fromEntries(
      Object.entries(next.settings.listChoices).filter(([name]) => names.has(name)),
    ),
  };
  return next;
}
