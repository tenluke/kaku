import { PASS_PERCENT, scoreDrawing } from '../checking/scoring';
import {
  afterCheck,
  canMarkCorrect,
  finalResult,
  markCorrect,
  MAX_ATTEMPTS,
  newAttempt,
  triesLeft,
  withHint,
  type AttemptState,
  type ItemResult,
} from '../practice/attempt';
import { nextHintStep } from '../practice/hint';
import type { PracticeItem } from '../practice/items';
import { loadStrokesFor, strokesOf } from '../practice/strokeData';
import { kanaResults, romaji } from '../practice/words';
import { askConfirmation } from './dialog';
import { byId, escapeHtml } from './dom';
import {
  BOX_SIZE,
  boxColumns,
  clearBoxes,
  clearStrokes,
  drawnStrokes,
  hasDrawing,
  initDrawing,
  lockDrawing,
  markBoxes,
  replayHints,
  resetDrawing,
  revealAnswer,
  showHintStroke,
  undoStroke,
  type ReferenceStroke,
} from './drawing';
import { showScreen } from './screens';
import {
  attemptLabel,
  hintLabel,
  mistakeText,
  notQuiteText,
  progressLabel,
  readingsText,
  strokeCountText,
  TEXT,
  triesLeftText,
  wrongBoxesText,
} from './text';

/* One practice session: draw each item, check it, see the answer, go to the next. */

export interface SessionResult {
  item: PracticeItem;
  result: ItemResult;
  /** For a word: each box's score at the last check, and the boxes that showed a hint. */
  boxes?: { percents: number[]; hinted: Set<number> };
}

/**
 * What a session counts for the pass rates: each character's result, and for a word each of
 * its kana's (a word itself has no pass rate).
 */
export const passRateResults = (results: readonly SessionResult[]) =>
  results.flatMap(({ item, result, boxes }) =>
    item.word
      ? kanaResults(item.word.kana, result, boxes?.percents ?? [], boxes?.hinted ?? new Set())
      : [{ id: item.id, passed: result.passed }],
  );

let items: PracticeItem[] = [];
let index = 0;
let results: SessionResult[] = [];
let attempt: AttemptState = newAttempt();
let finished = false; // the current item has been passed, failed or skipped
let strokeCountShown = false; // the first press of Hint tells the stroke count
let referenceStrokes: ReferenceStroke[] = [];
let lastBoxPercents: number[] = []; // each box's score at the last check
let onSessionEnd: (results: SessionResult[]) => void = () => {};

const actions = byId('actions');
const message = byId('message');
const progressFill = byId('progress-bar').querySelector('i') as HTMLElement;

const currentItem = (): PracticeItem => items[index] as PracticeItem;

function showMessage(html: string): void {
  message.innerHTML = html;
}

function setProgress(done: number): void {
  progressFill.style.width = `${(done / items.length) * 100}%`;
}

function updateAttemptText(): void {
  byId('attempt-text').textContent = attemptLabel(
    Math.min(attempt.attemptsUsed + 1, MAX_ATTEMPTS),
    MAX_ATTEMPTS,
  );
}

function updateHintButton(): void {
  const step = nextHintStep(strokeCountShown, attempt.hintsUsed, referenceStrokes.length);
  byId('hint-button').textContent =
    step === 'strokeCount'
      ? TEXT.hint
      : step === 'stroke'
        ? hintLabel(attempt.hintsUsed, referenceStrokes.length)
        : TEXT.replayOrder;
}

function loadItem(): void {
  const item = currentItem();
  attempt = newAttempt();
  finished = false;
  strokeCountShown = false;
  lastBoxPercents = [];
  referenceStrokes = item.characters.flatMap((character, box) =>
    strokesOf(character).map((path) => ({ box, path })),
  );
  resetDrawing(item.characters);
  byId('script-label').textContent = scriptBadge(item);
  // The badge and the drawing area's frame take the script's colour (see style.css).
  byId('practice-screen').dataset.script = item.script;
  // A word: what to write (romaji) big, its meaning smaller below.
  byId('prompt-text').innerHTML = item.word
    ? `${escapeHtml(romaji(item.word.kana))}<small class="prompt-meaning">${escapeHtml(item.word.meaning)}</small>`
    : escapeHtml(item.prompt);
  byId('progress-text').textContent = progressLabel(index, items.length);
  setProgress(index);
  showMessage(TEXT.drawFromMemory);
  actions.classList.remove('lk', 'can-override');
  updateAttemptText();
  updateHintButton();
}

/** The badge above the prompt, e.g. "漢字 · Kanji · N5" or "ひらがな · Hiragana · Word". */
function scriptBadge(item: PracticeItem): string {
  if (item.script !== 'kanji')
    return `${TEXT.scriptBadge[item.script]}${item.word ? TEXT.wordBadge : ''}`;
  if (item.jlpt) return `${TEXT.scriptBadge.kanji} · N${item.jlpt}`;
  return `${TEXT.scriptBadge.kanji}${item.rtkFrame ? ` · RTK ${item.rtkFrame}` : ''}`;
}

function answerHtml(item: PracticeItem): string {
  if (item.word?.kanji) {
    return `<br><span class="g2">${escapeHtml(item.word.kana)}</span> · <span class="g2" lang="ja">${escapeHtml(item.word.kanji)}</span>`;
  }
  if (item.script === 'kanji') {
    return `<br>${escapeHtml(readingsText(item.onReadings ?? [], item.kunReadings ?? []))}`;
  }
  return `<br><span class="g2">${escapeHtml(item.characters.join(''))}</span>`;
}

function finishItem(outcome: 'pass' | 'outOfTries' | 'skip'): void {
  const item = currentItem();
  const result = finalResult(attempt, outcome);
  results.push({
    item,
    result,
    ...(item.word ? { boxes: { percents: lastBoxPercents, hinted: hintedBoxes() } } : {}),
  });
  markBoxes([]);
  finished = true;
  lockDrawing();

  let html: string;
  if (outcome === 'pass')
    html = `✓ <b>${result.percent}%</b>${result.usedHint ? escapeHtml(TEXT.hintsMeanFail) : ''}`;
  else html = escapeHtml(outcome === 'skip' ? TEXT.skipped : TEXT.outOfTries);
  showMessage(html + answerHtml(item));

  actions.classList.add('lk');
  actions.classList.toggle('can-override', canMarkCorrect(result));
  revealAnswer(referenceStrokes);
  setProgress(index + 1);
}

function check(): void {
  if (finished) return;
  if (!hasDrawing()) return showMessage(escapeHtml(TEXT.drawFirst));
  const item = currentItem();
  const paths = item.characters.map(strokesOf);
  const score = scoreDrawing(drawnStrokes(), paths, BOX_SIZE, boxColumns());
  lastBoxPercents = score.boxPercents;
  // A word passes only when every kana does, so its score is its weakest kana's.
  const percent = item.word ? Math.min(...score.boxPercents) : score.percent;
  const { state, outcome } = afterCheck(attempt, percent);
  attempt = state;
  if (outcome === 'tryAgain') {
    const reason = item.word
      ? wrongBoxesText(wrongBoxes().length, item.characters.length)
      : (score.mistakes.map(mistakeText).find(Boolean) ?? '');
    showMessage(
      `${escapeHtml(notQuiteText(percent))} ${escapeHtml(reason)}<br>${escapeHtml(triesLeftText(triesLeft(attempt)))}`,
    );
    // A word keeps its right kana: only the red boxes are cleared for the next try.
    if (item.word) {
      clearBoxes(wrongBoxes());
      markBoxes(wrongBoxes());
    } else clearStrokes();
    updateAttemptText();
  } else finishItem(outcome);
}

/** The boxes that failed the last check. */
const wrongBoxes = (): number[] =>
  lastBoxPercents.flatMap((percent, box) => (percent < PASS_PERCENT ? [box] : []));

/** The boxes in which a hint showed at least one stroke. */
const hintedBoxes = (): Set<number> =>
  new Set(referenceStrokes.slice(0, attempt.hintsUsed).map((stroke) => stroke.box));

function giveHint(): void {
  if (finished) return;
  const step = nextHintStep(strokeCountShown, attempt.hintsUsed, referenceStrokes.length);
  if (step === 'strokeCount') {
    strokeCountShown = true; // only the count: not a hint, so it doesn't fail the character
    const counts = currentItem().characters.map((character) => strokesOf(character).length);
    showMessage(escapeHtml(strokeCountText(counts)));
  } else if (step === 'stroke') {
    showHintStroke(referenceStrokes[attempt.hintsUsed] as ReferenceStroke);
    attempt = withHint(attempt);
  } else {
    replayHints(referenceStrokes);
  }
  updateHintButton();
}

function next(): void {
  index++;
  if (index < items.length) loadItem();
  else onSessionEnd(results);
}

function markLastCorrect(): void {
  const last = results[results.length - 1];
  if (!last || !canMarkCorrect(last.result)) return;
  last.result = markCorrect(last.result);
  actions.classList.remove('can-override');
  message.insertAdjacentHTML('beforeend', `<br>${escapeHtml(TEXT.markedCorrect)}`);
}

function endEarly(): void {
  askConfirmation(TEXT.endSessionQuestion, TEXT.endSession, () => onSessionEnd(results));
}

/** Loads the stroke data the items need (kanji levels on first use), then starts. */
export async function startSession(sessionItems: PracticeItem[]): Promise<void> {
  await loadStrokesFor(sessionItems);
  items = sessionItems;
  index = 0;
  results = [];
  showScreen('practice-screen');
  loadItem();
}

/** Enter/Space checks (or goes to the next item once answered); H shows a hint; Escape ends. */
export function handlePracticeKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') endEarly();
  else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (finished) next();
    else check();
  } else if (event.key === 'h' || event.key === 'H') giveHint();
}

export function initPractice(whenSessionEnds: (results: SessionResult[]) => void): void {
  onSessionEnd = whenSessionEnds;
  initDrawing();
  byId('undo-button').addEventListener('click', undoStroke);
  byId('clear-button').addEventListener('click', clearStrokes);
  byId('hint-button').addEventListener('click', giveHint);
  byId('skip-button').addEventListener('click', () => !finished && finishItem('skip'));
  byId('check-button').addEventListener('click', check);
  byId('next-button').addEventListener('click', next);
  byId('right-button').addEventListener('click', markLastCorrect);
  byId('end-session-button').addEventListener('click', endEarly);
}
