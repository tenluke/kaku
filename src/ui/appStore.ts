import { browserStorage, createStore, STORAGE_KEY } from '../storage/store';

/** The app's saved data, shared by all screens. Call `store.save()` after changing it. */
export const store = createStore(browserStorage());

const changeListeners: (() => void)[] = [];

/** Runs `refresh` after another tab of the app saved new data (and this tab re-read it). */
export function onDataChangedInOtherTab(refresh: () => void): void {
  changeListeners.push(refresh);
}

// The browser fires "storage" in every *other* tab of the same site when one tab saves.
// Re-reading here keeps this tab from saving its older copy over the newer data.
window.addEventListener('storage', (event) => {
  if (event.key !== null && event.key !== STORAGE_KEY) return; // null: all storage was cleared
  store.reload();
  changeListeners.forEach((refresh) => refresh());
});
