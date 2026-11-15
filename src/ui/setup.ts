import { ALL_KANJI } from '../practice/kanjiData';
import { sessionItems, type JlptLevel, type KanaSet, type PracticeItem } from '../practice/items';
import {
  JLPT_LEVELS,
  pickerGroups,
  practicePool,
  toggleExcluded,
  type KanaScript,
  selectOnlyList,
  selectionFromSettings,
  type Selection,
  type SetupTab,
} from '../practice/selection';
import { editTabFor, idsOutsideTab, saveSublist } from '../practice/customLists';
import { loadedWords, loadWords } from '../practice/wordData';
import { BOOK_GROUPS, initBooks, renderBooks } from './bookLists';
import { pickWords, wordItem, wordsUsing, type Word } from '../practice/words';
import type { PracticeMode, SavedSettings, SubList } from '../storage/savedData';
import { store } from './appStore';
import { byId, escapeHtml, flashMessage, showLastingMessage } from './dom';
import { initSavedLists, renderSavedLists } from './savedLists';
import { highlightTab, showScreen } from './screens';
import {
  editingListText,
  listSavedText,
  pickerGroupTitle,
  pickerToggleLabel,
  selectionSummary,
  TEXT,
  wordsSummary,
} from './text';

/*
 * The setup screen: Kana, Kanji and Lists tabs, mode (All / Random, and Words on the Kana
 * tab), the character picker, and saving the picked characters as a sublist of a main list.
 */

const kanji = ALL_KANJI;
// The setup starts the way it was left last time (saved settings), or with the defaults.
const saved = store.data.settings;
const selection: Selection = selectionFromSettings(saved);
let tab: SetupTab = saved.tab;
let mode: PracticeMode = saved.mode;
let wordsFailed = false; // the word list could not be loaded

const COUNT_STEP = 5;
const countInput = byId<HTMLInputElement>('random-count');
const picker = byId('character-picker');
const pickerToggle = byId('picker-toggle');
const startButton = byId<HTMLButtonElement>('start-button');

// Read fresh each time: Progress can add a list ("Save weakest as list").
const sources = () => ({
  kanji,
  lists: store.data.lists,
  books: BOOK_GROUPS,
});
// The Kanji tab only has the JLPT kanji; editing a list there keeps its other kanji.
const jlptKanjiIds = new Set(kanji.filter((r) => r.jlpt).map((r) => `kanji:${r.character}`));
const kanjiTabShows = (id: string) => jlptKanjiIds.has(id);
const pool = (): PracticeItem[] => practicePool(tab, selection, sources());

/** Words mode is only on the Kana tab; the other tabs practise at random instead. */
const currentMode = (): PracticeMode => (mode === 'words' && tab !== 'kana' ? 'random' : mode);

/** The words made of the selected kana, or null while the word list is loading. */
function availableWords(): Word[] | null {
  const words = loadedWords();
  if (!words) return null;
  return wordsUsing(words, new Set(pool().map((item) => item.id)));
}

/** What a session can be made of: characters, or in Words mode the words they allow. */
const availableCount = (): number =>
  currentMode() === 'words' ? (availableWords()?.length ?? 0) : pool().length;

/** Loads the word list the first time Words mode is used, then redraws. */
function ensureWordsLoaded(): void {
  if (currentMode() !== 'words' || loadedWords()) return;
  wordsFailed = false;
  loadWords()
    .catch(() => (wordsFailed = true))
    .finally(() => render(false));
}

function setPressed(button: HTMLElement, isOn: boolean): void {
  button.classList.toggle('on', isOn);
  button.setAttribute('aria-pressed', String(isOn));
}

function renderToggles(): void {
  document.querySelectorAll<HTMLElement>('[data-script-toggle]').forEach((button) => {
    const script = button.dataset.scriptToggle as KanaScript;
    setPressed(button, selection.scripts[script]);
    // The sets below a script slide away when the script is off.
    button.closest('.col')?.classList.toggle('off', !selection.scripts[script]);
  });
  document.querySelectorAll<HTMLElement>('[data-set-toggle]').forEach((button) => {
    const [script, set] = (button.dataset.setToggle as string).split(' ') as [KanaScript, KanaSet];
    setPressed(button, selection.kanaSets[script][set]);
  });
  document.querySelectorAll<HTMLElement>('[data-level-toggle]').forEach((button) => {
    setPressed(button, selection.levels[Number(button.dataset.levelToggle) as JlptLevel]);
  });
  document.querySelectorAll<HTMLElement>('[data-mode]').forEach((button) => {
    setPressed(button, button.dataset.mode === currentMode());
  });
  byId('words-mode').hidden = tab !== 'kana';
}

function renderPicker(): void {
  const groups = pickerGroups(tab, selection, sources());
  const excluded = selection.excluded[tab];
  picker.innerHTML =
    groups
      .map((group) => {
        const chosen = group.items.filter((item) => !excluded.has(item.id)).length;
        const tiles = group.items
          .map((item) => {
            const isOn = !excluded.has(item.id);
            return `<button class="tl${isOn ? '' : ' off'}" data-item="${escapeHtml(item.id)}" aria-pressed="${isOn}"><b>${escapeHtml(item.characters.join(''))}</b><small>${escapeHtml(item.prompt)}</small></button>`;
          })
          .join('');
        return `<div class="pg"><div class="ph"><b>${escapeHtml(pickerGroupTitle(group))}</b><span>${chosen} / ${group.items.length}</span><button class="c sm" data-group="${group.key}" data-include="1">${TEXT.all}</button><button class="c sm" data-group="${group.key}" data-include="0">${TEXT.none}</button></div><div class="tiles">${tiles}</div></div>`;
      })
      .join('') ||
    `<p class="note">${tab === 'custom' ? TEXT.chooseList : TEXT.nothingSelected}</p>`;
}

/** Redraws the setup screen. `save` is false when only showing data another tab saved. */
function render(save = true): void {
  const selected = pool().length;
  const total = groupsItemCount();
  const words = currentMode() === 'words' ? availableWords() : null;
  const available = availableCount();
  renderToggles();
  if (tab === 'custom') {
    renderBooks();
    renderSavedLists();
  }
  renderMainListMenu();
  if (!picker.hidden) renderPicker();
  pickerToggle.textContent = pickerToggleLabel(selected, total);
  byId('selection-summary').textContent = summaryText(words, selected);
  byId('count-control').style.display = currentMode() === 'all' ? 'none' : '';
  countInput.max = String(Math.max(1, available));
  startButton.disabled = available === 0;
  renderStorageNote();
  if (save) saveSettings();
}

function summaryText(words: Word[] | null, selected: number): string {
  if (currentMode() !== 'words') return selectionSummary(selected);
  if (wordsFailed) return TEXT.wordsLoadFailed;
  return words ? wordsSummary(words.length, selected) : TEXT.loadingWords;
}

/** Remembers the current choices, so the app opens the same way next time. */
function saveSettings(): void {
  const settings: SavedSettings = {
    tab,
    scripts: { ...selection.scripts },
    kanaSets: {
      hiragana: { ...selection.kanaSets.hiragana },
      katakana: { ...selection.kanaSets.katakana },
    },
    levels: { ...selection.levels },
    listChoices: structuredClone(selection.listChoices),
    excluded: {
      kana: [...selection.excluded.kana],
      kanji: [...selection.excluded.kanji],
      custom: [...selection.excluded.custom],
    },
    mode,
    count: Math.max(1, Math.floor(Number(countInput.value)) || 1),
    bookChoices: structuredClone(selection.bookChoices),
    theme: store.data.settings.theme, // changed by the theme switch, not here
  };
  // Only write when something changed: fewer writes, and no needless "saved" events for
  // other open tabs of the app.
  if (JSON.stringify(settings) === JSON.stringify(store.data.settings)) return;
  store.data.settings = settings;
  store.save();
}

/** Says when progress can't be saved, so it doesn't get lost by surprise. */
function renderStorageNote(): void {
  const note = byId('storage-note');
  const problem = store.problem();
  note.hidden = problem === 'none';
  note.textContent = problem === 'none' ? '' : TEXT.storageProblem[problem];
}

const groupsItemCount = (): number =>
  pickerGroups(tab, selection, sources()).reduce((sum, group) => sum + group.items.length, 0);

function renderLevelToggles(): void {
  byId('level-toggles').innerHTML = JLPT_LEVELS.map(
    (level) =>
      `<button class="c st tg" data-level-toggle="${level}"><em>N${level}</em><span>Kanji</span><small>${kanji.filter((record) => record.jlpt === level).length}</small></button>`,
  ).join('');
}

// ----- "Save as list": a sublist name, saved into an existing or a new main list -----

const mainMenu = byId<HTMLSelectElement>('list-main');
const newMainInput = byId<HTMLInputElement>('list-main-name');
const NEW_MAIN = ''; // the menu's "New main list…" option

/** Fills the main list menu, keeping the chosen main list if it still exists. */
function renderMainListMenu(): void {
  const names = store.data.lists.map((list) => list.name);
  const chosen = names.includes(mainMenu.value) ? mainMenu.value : (names[0] ?? NEW_MAIN);
  mainMenu.innerHTML =
    names
      .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
      .join('') + `<option value="${NEW_MAIN}">${escapeHtml(TEXT.newMainList)}</option>`;
  mainMenu.value = chosen;
  newMainInput.hidden = mainMenu.value !== NEW_MAIN;
}

const chosenMainName = (): string =>
  mainMenu.value === NEW_MAIN ? newMainInput.value : mainMenu.value;

/**
 * "Edit" on a sublist: opens the Kana or Kanji tab with exactly its characters selected, and
 * its main list and name filled in, so pressing "Save as list" updates it.
 */
function editSublist(main: string, sub: SubList): void {
  const editTab = editTabFor(sub.itemIds);
  selectOnlyList(selection, editTab, sub.itemIds, sources());
  showSetup(editTab);
  setPickerOpen(true);
  mainMenu.value = main;
  newMainInput.hidden = true;
  byId<HTMLInputElement>('list-name').value = sub.name;
  const kept = idsOutsideTab(sub.itemIds, editTab, kanjiTabShows).length;
  const otherTab = editTab === 'kana' ? TEXT.scriptLabel.kanji : 'Kana';
  showLastingMessage(byId('list-status'), editingListText(sub.name, kept, otherTab));
}

/** Saves the characters picked on this tab as a sublist (one with the same name is updated). */
function saveCurrentAsList(): void {
  const nameInput = byId<HTMLInputElement>('list-name');
  const status = byId('list-status');
  const mainName = chosenMainName().trim();
  // Updating a sublist from the Kana tab keeps its kanji (and the other way round).
  const existing = store.data.lists
    .find((list) => list.name === mainName)
    ?.sublists.find((sub) => sub.name === nameInput.value.trim());
  const kept = existing ? idsOutsideTab(existing.itemIds, tab, kanjiTabShows) : [];
  const outcome = saveSublist(store.data.lists, mainName, nameInput.value, [
    ...pool().map((item) => item.id),
    ...kept,
  ]);
  if (outcome.kind === 'added' || outcome.kind === 'replaced') {
    store.data.lists = outcome.lists;
    const saved = store.save();
    nameInput.value = '';
    newMainInput.value = '';
    mainMenu.value = outcome.main;
    flashMessage(
      status,
      listSavedText(outcome.main, outcome.name, outcome.count, outcome.kind === 'replaced') +
        (saved ? '' : TEXT.notSavedWarning),
    );
    render();
    return;
  }
  const problems: Partial<Record<typeof outcome.kind, string>> = {
    noName: TEXT.listNameFirst,
    noMainName: TEXT.mainListNameFirst,
    noCharacters: TEXT.selectCharactersFirst,
    tooManyMainLists: TEXT.tooManyMainLists,
    tooManySublists: TEXT.tooManySublists,
  };
  flashMessage(status, problems[outcome.kind] ?? '');
}

function showTabBoxes(): void {
  document.querySelectorAll<HTMLElement>('[data-tab-box]').forEach((box) => {
    box.hidden = box.dataset.tabBox !== tab;
  });
  highlightTab(`[data-tab="${tab}"]`);
}

/** Opens the Kana, Kanji or Custom tab. Each tab keeps its own choices. */
export function showSetup(newTab: SetupTab = tab): void {
  if (newTab !== tab) showLastingMessage(byId('list-status'), ''); // messages belong to one tab
  tab = newTab;
  showTabBoxes();
  showScreen('setup-screen');
  render();
  ensureWordsLoaded();
}

/**
 * After another tab saved: re-read the settings and, if the setup screen is open, redraw it
 * without saving (saving here would make the other tab refresh again, and so on).
 */
export function refreshSetupFromStorage(): void {
  reloadSettings();
  if (byId('setup-screen').hidden) return;
  showTabBoxes();
  render(false);
}

function setPickerOpen(isOpen: boolean): void {
  picker.hidden = !isOpen;
  byId('save-list-row').hidden = !isOpen;
  pickerToggle.setAttribute('aria-expanded', String(isOpen));
  render();
}

function changeCount(step: number): void {
  const next = (Number(countInput.value) || 1) + step;
  countInput.value = String(Math.max(1, Math.min(Number(countInput.max) || 1, next)));
  render();
}

function onPickerClick(event: MouseEvent): void {
  const button = (event.target as Element).closest<HTMLElement>('button');
  if (!button) return;
  if (button.dataset.item) {
    const id = button.dataset.item;
    toggleExcluded(selection, tab, [id], selection.excluded[tab].has(id));
  } else if (button.dataset.group) {
    const group = pickerGroups(tab, selection, sources()).find(
      (g) => g.key === button.dataset.group,
    );
    const ids = group ? group.items.map((item) => item.id) : [];
    toggleExcluded(selection, tab, ids, button.dataset.include === '1');
  }
  render();
}

export function initSetup(onStart: (items: PracticeItem[]) => void): void {
  renderLevelToggles();
  initBooks(selection, () => render());
  document
    .querySelectorAll<HTMLElement>('[data-tab]')
    .forEach((button) =>
      button.addEventListener('click', () => showSetup(button.dataset.tab as SetupTab)),
    );
  byId('setup-screen').addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('button');
    if (!button) return;
    if (button.dataset.scriptToggle) {
      const script = button.dataset.scriptToggle as KanaScript;
      selection.scripts[script] = !selection.scripts[script];
    } else if (button.dataset.setToggle) {
      const [script, set] = button.dataset.setToggle.split(' ') as [KanaScript, KanaSet];
      selection.kanaSets[script][set] = !selection.kanaSets[script][set];
    } else if (button.dataset.levelToggle) {
      const level = Number(button.dataset.levelToggle) as JlptLevel;
      selection.levels[level] = !selection.levels[level];
    } else if (button.dataset.mode) {
      mode = button.dataset.mode as PracticeMode;
    } else return;
    render();
    ensureWordsLoaded();
  });
  byId('count-minus').addEventListener('click', () => changeCount(-COUNT_STEP));
  byId('count-plus').addEventListener('click', () => changeCount(COUNT_STEP));
  pickerToggle.addEventListener('click', () => setPickerOpen(picker.hidden !== false));
  picker.addEventListener('click', onPickerClick);
  initSavedLists(selection, () => render(), editSublist);
  mainMenu.addEventListener('change', () => {
    newMainInput.hidden = mainMenu.value !== NEW_MAIN;
    if (!newMainInput.hidden) newMainInput.focus();
  });
  byId('save-list').addEventListener('click', saveCurrentAsList);
  newMainInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') saveCurrentAsList();
  });
  byId('list-name').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') saveCurrentAsList();
  });
  startButton.addEventListener('click', () => {
    const items = newSessionItems();
    if (items.length) onStart(items);
  });
  countInput.value = String(saved.count);
  countInput.addEventListener('change', () => render());
  showSetup(tab);
}

/**
 * Re-reads the saved settings into the setup screen: after "Backup & transfer" imported
 * settings or deleted all data, or after another tab saved. The screen is redrawn the next
 * time it is shown.
 */
export function reloadSettings(): void {
  const settings = store.data.settings;
  Object.assign(selection, selectionFromSettings(settings));
  tab = settings.tab;
  mode = settings.mode;
  countInput.value = String(settings.count);
  showLastingMessage(byId('list-status'), '');
}

/** A new, freshly shuffled session with the current settings (also used by "Again"). */
export function newSessionItems(): PracticeItem[] {
  const count = Number(countInput.value);
  const modeNow = currentMode();
  if (modeNow === 'words') return pickWords(availableWords() ?? [], count).map(wordItem);
  return sessionItems(pool(), modeNow, count);
}

/** Shows "Loading…" on the start button while kanji stroke data downloads. */
export function setStartLoading(isLoading: boolean): void {
  startButton.disabled = isLoading || availableCount() === 0;
  startButton.textContent = isLoading ? TEXT.loading : TEXT.startPractice;
}
