import { buildCard, lookAlikes, type AskFor, type Card } from '../flashcards/cards';
import { afterAnswer } from '../flashcards/queue';
import { shuffled, type PracticeItem } from '../practice/items';
import { askConfirmation } from './dialog';
import { byId, escapeHtml } from './dom';
import type { SessionResult } from './practice';
import { showScreen } from './screens';
import { cardProgressText, cardVerdictText, TEXT } from './text';

/*
 * A flashcard session: a character or word is shown, you pick its meaning or reading from four
 * answers. A card answered wrong comes back a few cards later until it is answered right or
 * the session ends (src/flashcards/queue.ts). Only the first answer counts for the results.
 */

/** How a session ended: each card's first answer, for the results screen and the card results. */
export interface CardsOutcome {
  results: SessionResult[];
  /** For the saved flashcard results, e.g. { id: "reading:hiragana:あ", passed: true }. */
  rates: { id: string; passed: boolean }[];
}

let queue: Card[] = [];
let total = 0;
let done = 0; // cards answered right, so out of the queue
let firstAnswers = new Map<string, { card: Card; right: boolean }>();
let answered = false;
let lastRight = false;
let askFor: AskFor = 'reading';
let onEnd: (outcome: CardsOutcome) => void = () => {};

const options = byId('card-options');
const verdict = byId('card-verdict');
const info = byId('card-info');
const nextButton = byId<HTMLButtonElement>('card-next');

const currentCard = (): Card => queue[0] as Card;

/** The badge above the card, e.g. "カタカナ · Katakana" or "ひらがな · Hiragana · Word". */
function badge(item: PracticeItem): string {
  return `${TEXT.scriptBadge[item.script]}${item.word ? TEXT.wordBadge : ''}`;
}

/** What is worth knowing after answering, besides the answer itself. */
function infoHtml(card: Card): string {
  const word = card.item.word;
  if (word) return `<span lang="ja">${escapeHtml(word.kana)}</span> · ${escapeHtml(word.meaning)}`;
  const alike = lookAlikes(card.face)
    .map(({ kana, romaji }) => `<span lang="ja">${escapeHtml(kana)}</span> ${escapeHtml(romaji)}`)
    .join(', ');
  return alike ? `${escapeHtml(TEXT.cards.looksLike)}: ${alike}` : '';
}

function showCard(): void {
  const card = currentCard();
  answered = false;
  const screen = byId('cards-screen');
  screen.dataset.script = card.item.script;
  byId('cards-script-label').textContent = badge(card.item);
  byId('cards-progress-text').textContent = cardProgressText(done, total);
  byId('cards-mode-text').textContent = TEXT.cards.mode[askFor];
  byId('cards-progress-fill').style.width = `${(done / total) * 100}%`;
  const face = byId('card-face');
  face.textContent = card.face;
  face.classList.toggle('word', [...card.face].length > 1);
  face.style.setProperty('--chars', String([...card.face].length));
  const isRepeat = firstAnswers.has(card.id);
  byId('card-question').innerHTML =
    escapeHtml(TEXT.cards.question[card.askFor]) +
    (isRepeat ? `<small>${escapeHtml(TEXT.cards.once)}</small>` : '');
  // Shuffled again for a repeat, so the right answer isn't remembered by its place.
  const choices = isRepeat ? shuffled(card.choices) : card.choices;
  options.innerHTML = choices
    .map(
      (choice, index) =>
        `<button class="card-option" data-choice="${escapeHtml(choice)}"><kbd>${index + 1}</kbd><span>${escapeHtml(choice)}</span></button>`,
    )
    .join('');
  verdict.textContent = '';
  verdict.className = 'card-verdict';
  info.hidden = true;
  nextButton.hidden = true;
}

function answer(choice: string): void {
  if (answered) return;
  answered = true;
  const card = currentCard();
  lastRight = choice === card.answer;
  if (!firstAnswers.has(card.id)) firstAnswers.set(card.id, { card, right: lastRight });
  options.querySelectorAll<HTMLElement>('.card-option').forEach((button) => {
    const value = button.dataset.choice;
    button.classList.toggle('right', value === card.answer);
    button.classList.toggle('wrong', value === choice && !lastRight);
    button.classList.toggle('faded', value !== card.answer && value !== choice);
  });
  verdict.textContent = cardVerdictText(lastRight, card.face, card.answer);
  verdict.className = `card-verdict ${lastRight ? 'right' : 'wrong'}`;
  const details = infoHtml(card);
  info.innerHTML = details;
  info.hidden = !details;
  nextButton.hidden = false;
  nextButton.focus();
}

function finish(): void {
  const answers = [...firstAnswers.values()];
  onEnd({
    results: answers.map(({ card, right }) => ({
      item: card.item,
      result: {
        percent: right ? 100 : 0,
        passed: right,
        skipped: false,
        usedHint: false,
        markedCorrect: false,
      },
    })),
    rates: answers.map(({ card, right }) => ({ id: card.id, passed: right })),
  });
}

function next(): void {
  if (!answered) return;
  if (lastRight) done++;
  queue = afterAnswer(queue, lastRight);
  if (queue.length) showCard();
  else finish();
}

function leave(): void {
  askConfirmation(TEXT.cards.leaveQuestion, TEXT.cards.end, finish);
}

/**
 * Starts flashcards for these items. `pool` lends the wrong answers: the more items, the better
 * the choice of plausible ones.
 */
export function startCards(
  items: readonly PracticeItem[],
  ask: AskFor,
  pool: readonly PracticeItem[],
): void {
  askFor = ask;
  queue = items.map((item) => buildCard(item, ask, [...items, ...pool]));
  total = queue.length;
  done = 0;
  firstAnswers = new Map();
  showScreen('cards-screen');
  showCard();
}

/** 1–4 answer; Enter or Space goes on once answered; Escape ends the session. */
export function handleCardsKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') return leave();
  const number = Number(event.key);
  if (Number.isInteger(number) && number >= 1 && number <= 4) {
    const button = options.querySelectorAll<HTMLElement>('.card-option')[number - 1];
    if (button?.dataset.choice !== undefined) answer(button.dataset.choice);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    next();
  }
}

export function initCards(whenEnded: (outcome: CardsOutcome) => void): void {
  onEnd = whenEnded;
  options.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('.card-option');
    if (button?.dataset.choice !== undefined) answer(button.dataset.choice);
  });
  nextButton.addEventListener('click', next);
  byId('end-cards-button').addEventListener('click', leave);
}
