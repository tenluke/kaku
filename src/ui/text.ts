// All text the app shows that is built in code. (Fixed labels live in index.html.)
// Keeping it here makes wording easy to review and, later, to translate.

import type { Mistake } from '../checking/scoring';
import type { KanaSet } from '../practice/items';
import type { PickerGroup } from '../practice/selection';
import type { SessionSummary } from '../practice/summary';

export const TEXT = {
  scriptLabel: { hiragana: 'Hiragana', katakana: 'Katakana', kanji: 'Kanji' },
  // Shown above the prompt, so it is clear which script to write.
  scriptBadge: {
    hiragana: 'ひらがな · Hiragana',
    katakana: 'カタカナ · Katakana',
    kanji: '漢字 · Kanji',
  },
  kanaSetLabel: { basic: 'Basic', voiced: 'Voiced', digraph: 'Digraphs' } satisfies Record<
    KanaSet,
    string
  >,
  drawFromMemory: 'Draw it from memory.',
  drawFirst: 'Draw the symbol first.',
  loading: 'Loading…',
  loadingWords: 'Loading words…',
  wordsLoadFailed: 'The word list could not be loaded. Try again.',
  wordBadge: ' · Word',
  books: {
    rtk1: { short: 'RTK 1', title: 'Remembering the Kanji 1', detail: '6th edition' },
  },
  startPractice: 'Start practice',
  loadFailed: 'Could not load the kanji data. Check your connection and try again.',
  endSessionQuestion: 'End this session now? Your results so far will be shown.',
  endSession: 'End session',
  cancel: 'Cancel',
  close: 'Close',
  hint: 'Hint',
  replayOrder: '▶ Replay order',
  skipped: 'Skipped — here is the answer.',
  outOfTries: 'Out of tries — here is the answer.',
  hintsMeanFail: ' — but hints were used, so this counts as failed.',
  markedCorrect: '✓ Marked as correct.',
  storageProblem: {
    blocked:
      'This browser doesn’t allow saving, so your progress and settings will be lost when you close the page.',
    newer:
      'Your saved progress comes from a newer version of 書く. This version leaves it untouched and saves nothing; open the newer version to keep practising with it.',
  },
  progressGroupLabel: {
    all: 'All',
    hiragana: 'Hiragana',
    katakana: 'Katakana',
    n5: 'Kanji N5',
    n4: 'Kanji N4',
    n3: 'Kanji N3',
    n2: 'Kanji N2',
    n1: 'Kanji N1',
    other: 'Other kanji',
  },
  practiseWeakest: 'Practise weakest',
  nothingWeak: 'Nothing to review here: every practised character is at 90% or better.',
  nothingPractised: 'Practise some characters first; your weakest ones will show up here.',
  resetQuestion: 'Reset all pass rates? This cannot be undone. Your settings stay as they are.',
  reset: 'Reset',
  noLists:
    'No lists yet. On the Kana or Kanji tab, open “Pick characters”, choose some, then press “Save as list”.',
  chooseList: 'Choose book groups or saved sublists above to practise them.',
  listNameFirst: 'Give the sublist a name first.',
  mainListNameFirst: 'Give the new main list a name first.',
  selectCharactersFirst: 'Select at least one character first.',
  tooManyMainLists: 'You can keep up to 50 main lists. Delete one first.',
  tooManySublists: 'A main list can hold up to 50 sublists. Delete one first.',
  newMainList: 'New main list…',
  weakestMainList: 'Weakest',
  rename: 'Rename',
  nameTaken: 'Another main list already has that name.',
  sublistNameTaken: 'Another sublist of this main list already has that name.',
  sameListExists: 'A list with exactly these characters already exists.',
  notSavedWarning:
    ' This browser doesn’t allow saving, so it will be lost when you close the page.',
  deleteList: 'Delete',
  saveListHint: 'Change the characters, then press “Save as list”.',
  backup: {
    chooseExportFirst: 'Choose what to export first.',
    downloaded: 'Backup file created. If nothing was downloaded, copy the text below instead.',
    copied: 'Copied to the clipboard.',
    copyByHand: 'Select the text below and copy it.',
    chooseImportFirst: 'Choose what to import first.',
    fileUnreadable: 'That file could not be read.',
    replaceQuestion:
      'Replace your current data with the backup? What you have now in the chosen parts will be lost.',
    replace: 'Replace',
    deleteAllQuestion:
      'Delete all your saved lists, pass rates and settings on this device? This cannot be undone.',
    deleteAll: 'Delete everything',
    deletedAll: 'All data deleted. The app is as new.',
    errors: {
      empty: 'Nothing to read. Choose a file or paste the backup text.',
      tooBig: 'This is too big to be a backup.',
      notJson: 'This is not a valid backup: it could not be read.',
      notOurs: 'This was not made by this app.',
      newer: 'This backup comes from a newer version of the app. Update the app first.',
      nothingUsable: 'This backup has no lists, pass rates or settings that can be used.',
    },
  },
  noFailed: 'No failed symbols — excellent! 🎉',
  nothingSelected: 'Nothing selected yet.',
  allCharacters: 'All characters',
  all: 'All',
  none: 'None',
  passedWithHints: 'passed with hints',
  skippedShort: 'skipped',
  about:
    'App code © 2026 Tenluke, free software under the GNU Affero General Public ' +
    'License, version 3 or later (AGPL-3.0-or-later); the source code is at github.com/tenluke/kaku. The character data is not ours: stroke data ' +
    'from KanjiVG © Ulrich Apel (CC BY-SA 3.0), converted for this app; kanji meanings, readings and ' +
    'stroke counts from KANJIDIC2 © James William Breen and the Electronic Dictionary Research and ' +
    'Development Group (CC BY-SA 4.0); words and their meanings from JMdict, by the same group under the ' +
    'same licence, shortened for this app; JLPT levels from Jonathan Waller’s lists via kanji-data. ' +
    'Remembering the Kanji frame numbers (6th edition) also come from KANJIDIC2. The app can be used ' +
    'alongside Remembering the Kanji by James W. Heisig; it is not affiliated with the author or ' +
    'publisher and contains none of the book’s text. ' +
    'Links to all sources and licences are at the bottom of the page. Your data stays on this device.',
} as const;

/** The About box: the app's name and version, then the licence and credits. */
export const aboutText = (version: string): string =>
  `書く (Kaku), version ${version}. ${TEXT.about}`;

/** The app's name and version at the start of the footer. */
export const versionLabel = (version: string): string => `書く (Kaku) ${version}`;

export const pickerGroupTitle = (group: PickerGroup): string =>
  group.title
    ? 'book' in group.title
      ? `${TEXT.books[group.title.book].short} · ${group.title.group}`
      : `${group.title.list} · ${group.title.sublist}`
    : TEXT.progressGroupLabel[
        group.key as Exclude<PickerGroup['key'], `book:${string}` | `list:${string}`>
      ];

export const pickerToggleLabel = (selected: number, total: number): string =>
  (selected === total ? TEXT.allCharacters : `${selected} of ${total} characters`) + ' ▾';

export const practiseWeakestLabel = (count: number): string => `Practise weakest ${count}`;

export const progressSummaryText = (practised: number, total: number, below50: number) => ({
  main: `${practised} of ${total} practised`,
  detail: `${below50} below 50%`,
});

/** What a progress tile says to screen readers and on hover. */
export function progressTileLabel(
  characters: string,
  prompt: string,
  entry: { seen: number; recent: string } | undefined,
): string {
  if (!entry) return `${characters} (${prompt}): not practised yet`;
  const passed = [...entry.recent].filter((result) => result === '1').length;
  return `${characters} (${prompt}): ${passed} of the last ${entry.recent.length} passed, practised ${entry.seen} times`;
}

export const listSavedText = (
  main: string,
  name: string,
  count: number,
  replaced: boolean,
): string => `${replaced ? 'Updated' : 'Saved'} “${name}” in “${main}” (${count} characters).`;

export const sublistCountText = (count: number): string =>
  `${count} ${count === 1 ? 'sublist' : 'sublists'}`;

export const deleteMainListQuestion = (name: string, sublists: number): string =>
  `Delete the main list “${name}” and its ${sublistCountText(sublists)}?`;

export const renameQuestion = (name: string): string => `New name for “${name}”:`;

export const editingListText = (name: string, keptCount: number, otherTab: string): string =>
  `Editing “${name}”. ${TEXT.saveListHint}` +
  (keptCount
    ? ` Its ${keptCount} other characters stay in the list; edit them on the ${otherTab} tab.`
    : '');

export const editListLabel = (name: string): string => `Edit ${name}`;

export const renameListLabel = (name: string): string => `Rename “${name}”`;

export const deleteListLabel = (name: string): string => `Delete ${name}`;

export const deleteListQuestion = (main: string, name: string): string =>
  `Delete the sublist “${name}” from “${main}”?`;

/** The sublist name for "Save weakest as list", e.g. "20 · Kanji N5 · 2026-11-12". */
export const weakestListName = (count: number, groupLabel: string | null, date: string): string =>
  `${count} · ${groupLabel ? `${groupLabel} · ` : ''}${date}`;

export const weakestListSavedText = (name: string): string =>
  `Saved “${name}” in Lists → Saved lists → ${TEXT.weakestMainList}.`;

export function backupSummary(
  exportedAt: string,
  lists: number,
  rates: number,
  hasSettings: boolean,
  skipped: number,
): string {
  // Only what the backup contains, e.g. "2 list(s), settings".
  const parts: string[] = [];
  if (lists) parts.push(`${lists} list(s)`);
  if (rates) parts.push(`${rates} character(s) with pass rates`);
  if (hasSettings) parts.push('settings');
  return (
    `Backup${exportedAt ? ` from ${exportedAt}` : ''}: ${parts.join(', ')}.` +
    (skipped ? ` ${skipped} unusable entries were left out.` : '')
  );
}

export const importedText = (parts: readonly string[]): string => `Imported ${parts.join(', ')}.`;

export const selectionSummary = (count: number): string => `${count} symbols in selection`;

export const wordsSummary = (words: number, kana: number): string =>
  `${words} ${words === 1 ? 'word uses' : 'words use'} only these ${kana} kana`;

/** The stroke count told by the first press of Hint; digraphs list each character. */
export const strokeCountText = (counts: readonly number[]): string => {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const strokes = total === 1 ? 'stroke' : 'strokes';
  if (counts.length === 1) return `This character has ${total} ${strokes}.`;
  return `These characters have ${counts.join(' + ')} = ${total} ${strokes}.`;
};

export const hintLabel = (used: number, total: number): string => `Hint (${used}/${total})`;

export const attemptLabel = (attempt: number, max: number): string => `Attempt ${attempt} / ${max}`;

export const progressLabel = (index: number, total: number): string => `${index + 1} / ${total}`;

export function mistakeText(mistake: Mistake): string {
  switch (mistake.kind) {
    case 'nothingDrawn':
      return 'Nothing drawn in one box.';
    case 'strokeCount':
      return `You drew ${mistake.drawn} strokes, expected ${mistake.expected}.`;
    case 'strokeOrder':
      return 'Stroke order looks wrong.';
    case 'strokeDirection':
      return 'Check stroke direction.';
    case 'none':
      return '';
  }
}

export const wrongBoxesText = (wrong: number, total: number): string =>
  `${wrong} of ${total} boxes need another try (marked red); the others are kept.`;

export const triesLeftText = (left: number): string =>
  `${left} ${left === 1 ? 'try' : 'tries'} left.`;

export const notQuiteText = (percent: number): string => `${percent}% — not quite.`;

export const readingsText = (
  onReadings: readonly string[],
  kunReadings: readonly string[],
): string => `On: ${onReadings.join(', ') || '–'} · Kun: ${kunReadings.join(', ') || '–'}`;

export function summaryText(summary: SessionSummary): string {
  let text = `${summary.passed} of ${summary.total} passed · average accuracy ${summary.averagePercent}%`;
  if (summary.markedCorrect) text += ` · ${summary.markedCorrect} marked correct by you`;
  return text;
}
