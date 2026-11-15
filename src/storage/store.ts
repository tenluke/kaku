import { emptySavedData, readSavedData, type ReadResult, type SavedData } from './savedData';

/*
 * Keeps the saved data in the browser's localStorage. The storage is passed in, so tests
 * can use a fake one and a browser that blocks storage (some private windows) still works.
 */

export const STORAGE_KEY = 'kaku.data';
/** Where unreadable data is kept instead of being thrown away, in case it can be rescued. */
export const UNREADABLE_KEY = 'kaku.data.unreadable';

/** The methods of the browser's `Storage` that we use. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StoreProblem = 'none' | 'blocked' | 'newer';

export interface Store {
  data: SavedData;
  /** Why saving may not work: blocked storage, or data from a newer app version. */
  problem: () => StoreProblem;
  /** Writes `data` to storage. Returns false if it could not be saved. */
  save: () => boolean;
  /**
   * Starts over: everything as on first use, and the kept copy of unreadable data removed.
   * The user asked for this, so it also replaces data from a newer app version.
   */
  resetAll: () => boolean;
  /**
   * Re-reads the saved data, after another tab of the app saved it. Without this, an older
   * copy in this tab would be saved over the newer one at the next click.
   */
  reload: () => void;
}

export function createStore(storage: StorageLike | null): Store {
  let problem: StoreProblem = storage ? 'none' : 'blocked';
  let text: string | null = null;
  try {
    text = storage ? storage.getItem(STORAGE_KEY) : null;
  } catch {
    problem = 'blocked';
  }
  let result: ReadResult = readSavedData(text);

  if (result.kind === 'unreadable' && storage && text !== null) {
    try {
      storage.setItem(UNREADABLE_KEY, text);
    } catch {
      // Keeping the copy is a courtesy; the app works without it.
    }
  }
  if (result.kind === 'newer') problem = 'newer';

  const store: Store = {
    data: result.data,
    problem: () => problem,
    save: () => {
      // Never overwrite data written by a newer version of the app.
      if (!storage || problem === 'newer') return false;
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(store.data));
        problem = 'none';
        return true;
      } catch {
        problem = 'blocked';
        return false;
      }
    },
    reload: () => {
      let latest: string | null;
      try {
        latest = storage ? storage.getItem(STORAGE_KEY) : null;
      } catch {
        return; // storage blocked: nothing to re-read
      }
      result = readSavedData(latest);
      store.data = result.data;
      problem = result.kind === 'newer' ? 'newer' : problem === 'newer' ? 'none' : problem;
    },
    resetAll: () => {
      store.data = emptySavedData();
      if (problem === 'newer') problem = 'none';
      try {
        storage?.removeItem(UNREADABLE_KEY);
      } catch {
        // Nothing to clean up, or storage is blocked: save() below reports that.
      }
      return store.save();
    },
  };
  return store;
}

/** The browser's localStorage, or null if the browser does not allow it. */
export function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null; // reading `localStorage` itself can throw when storage is disabled
  }
}
