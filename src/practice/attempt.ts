import { PASS_PERCENT } from '../checking/scoring';

/*
 * The rules for one character in a practice session:
 * - You get MAX_ATTEMPTS tries. 70% or more passes.
 * - A hint shows strokes of the answer, so a character practised with hints counts as failed.
 * - After running out of tries (without hints), you may say "I was right", for when the
 *   checker was too strict.
 */

export const MAX_ATTEMPTS = 3;

export interface AttemptState {
  attemptsUsed: number;
  hintsUsed: number;
  bestPercent: number;
}

export type Outcome = 'pass' | 'tryAgain' | 'outOfTries';

export interface ItemResult {
  percent: number; // best score; 0 when skipped
  passed: boolean;
  skipped: boolean;
  usedHint: boolean;
  markedCorrect: boolean; // passed only because of "I was right"
}

export const newAttempt = (): AttemptState => ({ attemptsUsed: 0, hintsUsed: 0, bestPercent: 0 });

export const withHint = (state: AttemptState): AttemptState => ({
  ...state,
  hintsUsed: state.hintsUsed + 1,
});

/** Records one press of "Check" with the drawing's score. */
export function afterCheck(
  state: AttemptState,
  percent: number,
): { state: AttemptState; outcome: Outcome } {
  const next: AttemptState = {
    ...state,
    attemptsUsed: state.attemptsUsed + 1,
    bestPercent: Math.max(state.bestPercent, percent),
  };
  if (percent >= PASS_PERCENT) return { state: next, outcome: 'pass' };
  if (next.attemptsUsed < MAX_ATTEMPTS) return { state: next, outcome: 'tryAgain' };
  return { state: next, outcome: 'outOfTries' };
}

export const triesLeft = (state: AttemptState): number => MAX_ATTEMPTS - state.attemptsUsed;

/** The final result once a character is passed, failed or skipped. */
export function finalResult(
  state: AttemptState,
  outcome: 'pass' | 'outOfTries' | 'skip',
): ItemResult {
  const usedHint = state.hintsUsed > 0;
  return {
    percent: outcome === 'skip' ? 0 : state.bestPercent,
    passed: outcome === 'pass' && !usedHint,
    skipped: outcome === 'skip',
    usedHint,
    markedCorrect: false,
  };
}

/** "I was right" is only offered after running out of tries without using a hint. */
export const canMarkCorrect = (result: ItemResult): boolean =>
  !result.passed && !result.skipped && !result.usedHint;

export const markCorrect = (result: ItemResult): ItemResult =>
  canMarkCorrect(result) ? { ...result, passed: true, markedCorrect: true } : result;
