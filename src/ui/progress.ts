import { ALL_KANJI } from '../practice/kanjiData';
import { itemsInGroup, PROGRESS_GROUPS, type ProgressGroup } from '../practice/catalog';
import type { PracticeItem } from '../practice/items';
import {
  MIN_SESSIONS_FOR_CONFIDENCE,
  passRateColor,
  progressSummary,
  rateItems,
  weakest,
  weakestFirst,
  type RatedItem,
} from '../practice/passRates';
import { saveNewSublist } from '../practice/customLists';
import { store } from './appStore';
import { askConfirmation } from './dialog';
import { byId, escapeHtml, flashMessage } from './dom';
import { highlightTab, showScreen } from './screens';
import {
  practiseWeakestLabel,
  progressSummaryText,
  progressTileLabel,
  TEXT,
  weakestListName,
  weakestListSavedText,
} from './text';

/* The Progress page: the pass rate of every character, and "Practise weakest". */

const kanji = ALL_KANJI;
let group: ProgressGroup = 'all';
let order: 'normal' | 'weakest' = 'normal';

const rated = (): RatedItem<PracticeItem>[] =>
  rateItems(itemsInGroup(group, kanji), store.data.passRates);

function renderSummary(entries: RatedItem<PracticeItem>[]): void {
  const summary = progressSummary(entries);
  const ring = byId('progress-ring');
  if (summary.average === null) {
    ring.style.background = 'var(--ln)';
    byId('progress-ring-text').textContent = '–';
  } else {
    const percent = Math.round(summary.average * 100);
    ring.style.background = `conic-gradient(${passRateColor(summary.average)} ${percent}%, var(--ln) 0)`;
    byId('progress-ring-text').textContent = `${percent}%`;
  }
  const text = progressSummaryText(summary.practised, summary.total, summary.below50);
  byId('progress-summary').innerHTML =
    `<b>${escapeHtml(text.main)}</b><br>${escapeHtml(text.detail)}`;
}

function renderWeakestButton(entries: RatedItem<PracticeItem>[]): void {
  const weak = weakest(entries);
  const button = byId<HTMLButtonElement>('practise-weakest');
  button.textContent = weak.length ? practiseWeakestLabel(weak.length) : TEXT.practiseWeakest;
  button.disabled = weak.length === 0;
  byId<HTMLButtonElement>('save-weakest').disabled = weak.length === 0;
  const practised = entries.some((entry) => entry.rate !== null);
  byId('progress-status').textContent = weak.length
    ? ''
    : practised
      ? TEXT.nothingWeak
      : TEXT.nothingPractised;
}

function renderControls(): void {
  byId('progress-groups').innerHTML = PROGRESS_GROUPS.map(
    (key) =>
      `<button class="c${key === group ? ' on' : ''}" data-progress-group="${key}" aria-pressed="${key === group}">${escapeHtml(TEXT.progressGroupLabel[key])}</button>`,
  ).join('');
  document.querySelectorAll<HTMLElement>('[data-progress-order]').forEach((button) => {
    const isOn = button.dataset.progressOrder === order;
    button.classList.toggle('on', isOn);
    button.setAttribute('aria-pressed', String(isOn));
  });
}

function renderGrid(entries: RatedItem<PracticeItem>[]): void {
  const shown = order === 'weakest' ? weakestFirst(entries) : entries;
  const grid = byId('progress-grid');
  grid.innerHTML = shown
    .map(({ item, entry, rate }, index) => {
      const characters = item.characters.join('');
      const label = escapeHtml(progressTileLabel(characters, item.prompt, entry));
      const classes = ['meter-tile'];
      if (rate === null) classes.push('none');
      else if ((entry?.seen ?? 0) < MIN_SESSIONS_FOR_CONFIDENCE) classes.push('low');
      const percent = rate === null ? '–' : `${Math.round(rate * 100)}%`;
      return `<div class="${classes.join(' ')}" data-index="${index}" role="img" title="${label}" aria-label="${label}"><b>${escapeHtml(characters)}</b><small>${percent}</small><i></i></div>`;
    })
    .join('');
  // Bar length and colour are set as CSS variables (read by .meter-tile i in style.css).
  grid.querySelectorAll<HTMLElement>('.meter-tile:not(.none)').forEach((tile) => {
    const rate = shown[Number(tile.dataset.index)]?.rate ?? 0;
    tile.style.setProperty('--rate', String(rate));
    tile.style.setProperty('--color', passRateColor(rate));
  });
}

function render(): void {
  const entries = rated();
  renderControls();
  renderSummary(entries);
  renderWeakestButton(entries);
  renderGrid(entries);
}

/** Saves the weakest characters of the shown group as a sublist of "Weakest", named by date. */
function saveWeakestAsList(): void {
  const weak = weakest(rated());
  if (!weak.length) return;
  const today = new Date().toISOString().slice(0, 10);
  const groupLabel = group === 'all' ? null : TEXT.progressGroupLabel[group];
  const outcome = saveNewSublist(
    store.data.lists,
    TEXT.weakestMainList,
    weakestListName(weak.length, groupLabel, today),
    weak.map((entry) => entry.item.id),
  );
  let message: string;
  if (outcome.kind === 'added' || outcome.kind === 'replaced') {
    store.data.lists = outcome.lists;
    message = weakestListSavedText(outcome.name) + (store.save() ? '' : TEXT.notSavedWarning);
  } else if (outcome.kind === 'tooManyMainLists') message = TEXT.tooManyMainLists;
  else if (outcome.kind === 'tooManySublists') message = TEXT.tooManySublists;
  else message = TEXT.sameListExists;
  render();
  // After render (which sets the lasting status); render again once the message has faded.
  flashMessage(byId('progress-status'), message, render);
}

export function showProgress(): void {
  render();
  showScreen('progress-screen');
  highlightTab('#open-progress');
}

export function initProgress(onPractise: (items: PracticeItem[]) => void): void {
  // The legend shows the same colour scale as the tiles, from 0% to 100%.
  const steps = Array.from({ length: 21 }, (_, step) => `${passRateColor(step / 20)} ${step * 5}%`);
  byId('legend-bar').style.background = `linear-gradient(90deg, ${steps.join(', ')})`;

  byId('open-progress').addEventListener('click', showProgress);
  byId('progress-screen').addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('button');
    if (button?.dataset.progressGroup) group = button.dataset.progressGroup as ProgressGroup;
    else if (button?.dataset.progressOrder)
      order = button.dataset.progressOrder as 'normal' | 'weakest';
    else return;
    render();
  });
  byId('practise-weakest').addEventListener('click', () => {
    const weak = weakest(rated()).map((entry) => entry.item);
    if (weak.length) onPractise(weak);
  });
  byId('save-weakest').addEventListener('click', saveWeakestAsList);
  byId('reset-progress').addEventListener('click', () =>
    askConfirmation(TEXT.resetQuestion, TEXT.reset, () => {
      store.data.passRates = {};
      store.save();
      render();
    }),
  );
}
