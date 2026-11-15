import {
  deleteMainList,
  deleteSublist,
  renameMainList,
  renameSublist,
} from '../practice/customLists';
import type { Selection } from '../practice/selection';
import type { MainList, SubList } from '../storage/savedData';
import { store } from './appStore';
import { askConfirmation, askForText } from './dialog';
import { byId, escapeHtml, flashMessage } from './dom';
import { rollIn, rollOut, VISIBLE_TILES } from './rollout';
import {
  deleteListLabel,
  deleteListQuestion,
  deleteMainListQuestion,
  editListLabel,
  renameListLabel,
  renameQuestion,
  sublistCountText,
  TEXT,
} from './text';

/*
 * Saved lists on the Lists tab, laid out like Books: each main list's tile on top and its
 * sublists below it (three visible, the rest scroll). Several main lists can be on at once.
 * The chosen tiles get icons: on a main list rename (I-beam) and delete (×); on a sublist edit
 * its characters (✎) with rename (I-beam) just below it, and delete (×).
 */

// The text-cursor (I-beam) icon for renaming, drawn so it looks the same in every font.
const RENAME_ICON =
  '<svg class="ibeam" viewBox="0 0 12 16" aria-hidden="true"><path d="M3 1.5h6M3 14.5h6M6 1.5v13" /></svg>';

let selection: Selection;
let onChange: () => void = () => {};
let onEditSublist: (main: string, sub: SubList) => void = () => {};

const choiceOf = (main: string) => selection.listChoices[main];

/** A small round icon on a tile: on the left (edit, or stacked upper/lower) or right (delete). */
function icon(action: string, label: string, symbol: string, place: string): string {
  return `<button class="list-icon ${place}" data-list-action="${action}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${symbol}</button>`;
}

function sublistHtml(main: MainList, sub: SubList, mainIndex: number, subIndex: number): string {
  const isOn = choiceOf(main.name)?.sublists.includes(sub.name) ?? false;
  const where = `data-main="${mainIndex}" data-sub="${subIndex}"`;
  const icons = isOn
    ? icon('edit-sub', editListLabel(sub.name), '✎', 'edit upper') +
      icon('rename-sub', renameListLabel(sub.name), RENAME_ICON, 'edit lower') +
      icon('delete-sub', deleteListLabel(sub.name), '×', 'delete')
    : '';
  const far = subIndex >= VISIBLE_TILES ? ' data-far' : '';
  return `<div class="custom-item" style="--i: ${subIndex}"${far} ${where}><button class="c st tg${isOn ? ' on' : ''}" data-list-action="toggle-sub" aria-pressed="${isOn}" title="${escapeHtml(sub.name)}"><span>${escapeHtml(sub.name)}</span><small>${sub.itemIds.length}</small></button>${icons}</div>`;
}

function mainListHtml(main: MainList, index: number): string {
  const isOn = choiceOf(main.name)?.on ?? false;
  const icons = isOn
    ? icon('rename-main', renameListLabel(main.name), RENAME_ICON, 'edit') +
      icon('delete-main', deleteListLabel(main.name), '×', 'delete')
    : '';
  const sublists = main.sublists.map((sub, subIndex) => sublistHtml(main, sub, index, subIndex));
  return `<div class="col deck${isOn ? '' : ' off'}" data-deck="list:${index}"><div class="custom-item" data-main="${index}"><button class="c sc tg book-tile list-tile${isOn ? ' on' : ''}" data-list-action="toggle-main" aria-pressed="${isOn}" title="${escapeHtml(main.name)}"><em>${escapeHtml(main.name)}</em><small>${sublistCountText(main.sublists.length)}</small></button>${icons}</div><div class="sets-wrap"><div class="sets book-groups" role="group" aria-label="${escapeHtml(main.name)}">${sublists.join('')}</div></div></div>`;
}

/** Draws the saved lists. Each sublists column keeps its scroll position. */
export function renderSavedLists(): void {
  const container = byId('custom-sets');
  const lists = store.data.lists;
  if (!lists.length) {
    container.innerHTML = `<p class="empty-note">${escapeHtml(TEXT.noLists)}</p>`;
    return;
  }
  const scroll = [...container.querySelectorAll('.book-groups')].map((column) => column.scrollTop);
  container.innerHTML = `<div class="cols">${lists.map(mainListHtml).join('')}</div>`;
  container.querySelectorAll('.book-groups').forEach((column, i) => {
    column.scrollTop = scroll[i] ?? 0;
  });
}

/** Saves the lists and redraws (the choices are saved with the settings when redrawing). */
function saveLists(lists: MainList[]): void {
  store.data.lists = lists;
  store.save();
  onChange();
}

function forgetChoice(main: string): void {
  selection.listChoices = Object.fromEntries(
    Object.entries(selection.listChoices).filter(([name]) => name !== main),
  );
}

/** Switches a main list on (its sublists roll out) or off (they roll back in first). */
function toggleMain(main: MainList, column: Element | null): void {
  const choice = choiceOf(main.name) ?? { on: false, sublists: [] };
  if (choice.on) {
    rollIn(column, () => {
      selection.listChoices[main.name] = { ...choice, on: false };
      onChange();
    });
    return;
  }
  selection.listChoices[main.name] = { ...choice, on: true };
  const index = store.data.lists.indexOf(main);
  onChange();
  rollOut(document.querySelector(`[data-deck="list:${index}"]`));
}

function toggleSublist(main: MainList, sub: SubList): void {
  const choice = choiceOf(main.name) ?? { on: true, sublists: [] };
  const sublists = choice.sublists.includes(sub.name)
    ? choice.sublists.filter((name) => name !== sub.name)
    : [...choice.sublists, sub.name];
  selection.listChoices[main.name] = { ...choice, sublists };
  onChange();
}

function renameMain(main: MainList): void {
  askForText(renameQuestion(main.name), TEXT.rename, main.name, (text) => {
    const outcome = renameMainList(store.data.lists, main.name, text);
    if (outcome.kind === 'nameTaken') flashMessage(byId('list-status'), TEXT.nameTaken);
    if (outcome.kind !== 'renamed') return;
    const choice = choiceOf(main.name);
    forgetChoice(main.name);
    if (choice) selection.listChoices[outcome.name] = choice;
    saveLists(outcome.lists);
  });
}

function renameSub(main: MainList, sub: SubList): void {
  askForText(renameQuestion(sub.name), TEXT.rename, sub.name, (text) => {
    const outcome = renameSublist(store.data.lists, main.name, sub.name, text);
    if (outcome.kind === 'nameTaken') flashMessage(byId('list-status'), TEXT.sublistNameTaken);
    if (outcome.kind !== 'renamed') return;
    const choice = choiceOf(main.name);
    if (choice) {
      selection.listChoices[main.name] = {
        ...choice,
        sublists: choice.sublists.map((name) => (name === sub.name ? outcome.name : name)),
      };
    }
    saveLists(outcome.lists);
  });
}

function deleteMain(main: MainList): void {
  askConfirmation(deleteMainListQuestion(main.name, main.sublists.length), TEXT.deleteList, () => {
    forgetChoice(main.name);
    saveLists(deleteMainList(store.data.lists, main.name));
  });
}

function deleteSub(main: MainList, sub: SubList): void {
  askConfirmation(deleteListQuestion(main.name, sub.name), TEXT.deleteList, () => {
    const choice = choiceOf(main.name);
    if (choice) {
      selection.listChoices[main.name] = {
        ...choice,
        sublists: choice.sublists.filter((name) => name !== sub.name),
      };
    }
    const lists = deleteSublist(store.data.lists, main.name, sub.name);
    // The main list goes when its last sublist is deleted.
    if (!lists.some((list) => list.name === main.name)) forgetChoice(main.name);
    saveLists(lists);
  });
}

function onListsClick(event: MouseEvent): void {
  const button = (event.target as Element).closest<HTMLElement>('[data-list-action]');
  const item = button?.closest<HTMLElement>('[data-main]');
  if (!button || !item) return;
  const main = store.data.lists[Number(item.dataset.main)];
  const sub = item.dataset.sub === undefined ? undefined : main?.sublists[Number(item.dataset.sub)];
  if (!main) return;
  const action = button.dataset.listAction;
  if (action === 'toggle-main') toggleMain(main, button.closest('.deck'));
  else if (action === 'rename-main') renameMain(main);
  else if (action === 'delete-main') deleteMain(main);
  else if (sub && action === 'toggle-sub') toggleSublist(main, sub);
  else if (sub && action === 'edit-sub') onEditSublist(main.name, sub);
  else if (sub && action === 'rename-sub') renameSub(main, sub);
  else if (sub && action === 'delete-sub') deleteSub(main, sub);
}

export function initSavedLists(
  setupSelection: Selection,
  whenChanged: () => void,
  editSublist: (main: string, sub: SubList) => void,
): void {
  selection = setupSelection;
  onChange = whenChanged;
  onEditSublist = editSublist;
  byId('custom-sets').addEventListener('click', onListsClick);
}
