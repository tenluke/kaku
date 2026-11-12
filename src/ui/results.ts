import { PASS_PERCENT } from '../checking/scoring';
import { summarize } from '../practice/summary';
import type { PracticeItem } from '../practice/items';
import { byId, escapeHtml } from './dom';
import type { SessionResult } from './practice';
import { showScreen } from './screens';
import { readingsText, summaryText, TEXT } from './text';

/* The end-of-session screen: overall score, every character, and the failed ones. */

let lastResults: SessionResult[] = [];

const chipHtml = ({ item, result }: SessionResult): string =>
  `<span class="chip ${result.passed ? 'ok' : 'no'}">${escapeHtml(item.characters.join(''))}<small>${result.percent}%</small></span>`;

function failedRowHtml({ item, result }: SessionResult): string {
  const readings =
    item.script === 'kanji'
      ? `<br>${escapeHtml(readingsText(item.onReadings ?? [], item.kunReadings ?? []))}`
      : item.word?.kanji
        ? `<br><span lang="ja">${escapeHtml(item.word.kanji)}</span>`
        : '';
  const status = result.skipped
    ? TEXT.skippedShort
    : result.usedHint && result.percent >= PASS_PERCENT
      ? TEXT.passedWithHints
      : `${result.percent}%`;
  return `<div class="row2"><span class="g">${escapeHtml(item.characters.join(''))}</span><div><b>${escapeHtml(item.prompt)}</b>${readings}<br><small class="dim">${escapeHtml(status)}</small></div></div>`;
}

export function showResults(results: SessionResult[]): void {
  lastResults = results;
  const summary = summarize(results.map((entry) => entry.result));
  const failed = results.filter((entry) => !entry.result.passed);
  byId('final-percent').textContent = `${summary.passedPercent}%`;
  byId('final-summary').textContent = summaryText(summary);
  byId('all-results').innerHTML = results.map(chipHtml).join('');
  byId('failed-list').innerHTML = failed.length
    ? failed.map(failedRowHtml).join('')
    : `<p>${escapeHtml(TEXT.noFailed)}</p>`;
  byId('retry-button').hidden = failed.length === 0;
  showScreen('results-screen');
}

export function initResults(
  onRetry: (items: PracticeItem[]) => void,
  onAgain: () => void,
  onNewSession: () => void,
): void {
  byId('again-button').addEventListener('click', onAgain);
  byId('retry-button').addEventListener('click', () =>
    onRetry(lastResults.filter((entry) => !entry.result.passed).map((entry) => entry.item)),
  );
  byId('new-session-button').addEventListener('click', onNewSession);
}
