import { describe, expect, it } from 'vitest';
import { CURRENT_VERSION } from './savedData';
import { createStore, STORAGE_KEY, UNREADABLE_KEY, type StorageLike } from './store';

function fakeStorage(
  initial: Record<string, string> = {},
): StorageLike & { items: Map<string, string> } {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

describe('createStore', () => {
  it('saves and loads again', () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    store.data.settings.count = 9;
    expect(store.save()).toBe(true);
    expect(createStore(storage).data.settings.count).toBe(9);
  });

  it('keeps a copy of unreadable data instead of losing it', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: '{oops' });
    const store = createStore(storage);
    expect(storage.items.get(UNREADABLE_KEY)).toBe('{oops');
    expect(store.problem()).toBe('none');
  });

  it('never overwrites data from a newer app version', () => {
    const newer = JSON.stringify({ version: CURRENT_VERSION + 1, future: true });
    const storage = fakeStorage({ [STORAGE_KEY]: newer });
    const store = createStore(storage);
    expect(store.problem()).toBe('newer');
    expect(store.save()).toBe(false);
    expect(storage.items.get(STORAGE_KEY)).toBe(newer);
  });

  it('starts over: fresh data, unreadable copy removed, even over newer data', () => {
    const storage = fakeStorage({
      [STORAGE_KEY]: JSON.stringify({ version: CURRENT_VERSION + 1 }),
      [UNREADABLE_KEY]: '{old',
    });
    const store = createStore(storage);
    store.data.settings.count = 99;
    expect(store.resetAll()).toBe(true);
    expect(store.problem()).toBe('none');
    expect(storage.items.get(UNREADABLE_KEY)).toBeUndefined();
    expect(createStore(storage).data).toEqual(createStore(null).data);
  });

  it('picks up what another tab saved, instead of saving an old copy over it', () => {
    const storage = fakeStorage();
    const thisTab = createStore(storage);
    const otherTab = createStore(storage);
    otherTab.data.passRates = { 'kanji:日': { seen: 1, passed: 1, recent: '1', lastSeen: 1 } };
    otherTab.save();
    thisTab.reload();
    thisTab.data.settings.count = 3;
    thisTab.save();
    expect(createStore(storage).data.passRates).toEqual(otherTab.data.passRates);
  });

  it('works without storage, reporting the problem', () => {
    const store = createStore(null);
    expect(store.save()).toBe(false);
    expect(store.problem()).toBe('blocked');
  });

  it('reports when the browser refuses to save', () => {
    const storage: StorageLike = {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const store = createStore(storage);
    expect(store.save()).toBe(false);
    expect(store.problem()).toBe('blocked');
  });
});
