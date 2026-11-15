import {
  BOOKS,
  isBookId,
  rtkFrames,
  rtkGroups,
  type BookId,
  type BookGroup,
} from '../practice/books';
import { ALL_KANJI } from '../practice/kanjiData';
import type { Selection } from '../practice/selection';
import { byId, escapeHtml } from './dom';
import { rollIn, rollOut, VISIBLE_TILES } from './rollout';
import { TEXT } from './text';

/*
 * The Books part of the Lists tab, laid out like the Kana tab: each book's tile on top, and its
 * groups below it. Three groups are visible; the rest scroll. The groups fold away when the
 * book is switched off; what was chosen in them is kept.
 */

/** Each book's groups of kanji (RTK 1: 22 groups of 100 frames). */
export const BOOK_GROUPS: Readonly<Record<BookId, readonly BookGroup[]>> = {
  rtk1: rtkGroups(rtkFrames(ALL_KANJI)),
};

let selection: Selection;
let onChange: () => void = () => {};

function groupTileHtml(book: BookId, group: BookGroup, index: number): string {
  const isOn = selection.bookChoices[book].groups.includes(index);
  return `<button class="c st tg${isOn ? ' on' : ''}" style="--i: ${index}"${index >= VISIBLE_TILES ? ' data-far' : ''} data-group-toggle="${book} ${index}" aria-pressed="${isOn}"><em>${escapeHtml(group.name)}</em><span>${TEXT.scriptLabel.kanji}</span><small>${group.itemIds.length}</small></button>`;
}

function bookColumnHtml(book: BookId): string {
  const isOn = selection.bookChoices[book].on;
  const text = TEXT.books[book];
  const groups = BOOK_GROUPS[book].map((group, index) => groupTileHtml(book, group, index));
  return `<div class="col deck${isOn ? '' : ' off'}" data-deck="book:${book}"><button class="c sc tg book-tile${isOn ? ' on' : ''}" data-book-toggle="${book}" aria-pressed="${isOn}"><em>${escapeHtml(text.short)}</em>${escapeHtml(text.title)}<small>${escapeHtml(text.detail)}</small></button><div class="sets-wrap"><div class="sets book-groups" role="group" aria-label="${escapeHtml(text.title)}">${groups.join('')}</div></div></div>`;
}

/** Draws the books. Each groups column keeps its scroll position. */
export function renderBooks(): void {
  const container = byId('book-rows');
  const scroll = [...container.querySelectorAll('.book-groups')].map((column) => column.scrollTop);
  container.innerHTML = `<div class="cols">${BOOKS.map(bookColumnHtml).join('')}</div>`;
  container.querySelectorAll('.book-groups').forEach((column, i) => {
    column.scrollTop = scroll[i] ?? 0;
  });
}

function onBooksClick(event: MouseEvent): void {
  const button = (event.target as Element).closest<HTMLElement>('button');
  if (!button) return;
  const { bookToggle, groupToggle } = button.dataset;
  if (bookToggle && isBookId(bookToggle)) {
    const choice = selection.bookChoices[bookToggle];
    if (choice.on) {
      // Roll the groups back in first, then switch the book off.
      rollIn(button.closest('.deck'), () => {
        choice.on = false;
        onChange();
      });
    } else {
      choice.on = true;
      onChange();
      rollOut(document.querySelector(`[data-deck="book:${bookToggle}"]`));
    }
    return;
  } else if (groupToggle) {
    const [book, index] = groupToggle.split(' ');
    if (!isBookId(book)) return;
    const choice = selection.bookChoices[book];
    const n = Number(index);
    choice.groups = choice.groups.includes(n)
      ? choice.groups.filter((i) => i !== n)
      : [...choice.groups, n];
  } else return;
  onChange();
}

export function initBooks(setupSelection: Selection, whenChanged: () => void): void {
  selection = setupSelection;
  onChange = whenChanged;
  byId('book-rows').addEventListener('click', onBooksClick);
}
