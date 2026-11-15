import { describe, expect, it } from 'vitest';
import {
  afterCheck,
  canMarkCorrect,
  finalResult,
  markCorrect,
  newAttempt,
  triesLeft,
  withHint,
} from './attempt';

describe('attempts', () => {
  it('passes at 70% or more', () => {
    expect(afterCheck(newAttempt(), 70).outcome).toBe('pass');
  });

  it('gives three tries, keeping the best score', () => {
    let state = newAttempt();
    ({ state } = afterCheck(state, 50));
    expect(triesLeft(state)).toBe(2);
    const second = afterCheck(state, 60);
    expect(second.outcome).toBe('tryAgain');
    const third = afterCheck(second.state, 40);
    expect(third.outcome).toBe('outOfTries');
    expect(third.state.bestPercent).toBe(60);
  });

  it('counts a pass with a hint as failed', () => {
    const state = withHint(newAttempt());
    const result = finalResult(afterCheck(state, 95).state, 'pass');
    expect(result).toMatchObject({ passed: false, usedHint: true, percent: 95 });
  });

  it('scores a skip as 0', () => {
    expect(finalResult(afterCheck(newAttempt(), 50).state, 'skip')).toMatchObject({
      percent: 0,
      skipped: true,
      passed: false,
    });
  });
});

describe('"I was right"', () => {
  const outOfTries = finalResult({ attemptsUsed: 3, hintsUsed: 0, bestPercent: 60 }, 'outOfTries');

  it('turns a fail without hints into a pass', () => {
    expect(markCorrect(outOfTries)).toMatchObject({ passed: true, markedCorrect: true });
  });

  it('is not offered after a skip or a hint', () => {
    expect(canMarkCorrect(finalResult(newAttempt(), 'skip'))).toBe(false);
    const withHints = finalResult({ attemptsUsed: 3, hintsUsed: 1, bestPercent: 60 }, 'outOfTries');
    expect(canMarkCorrect(withHints)).toBe(false);
    expect(markCorrect(withHints).passed).toBe(false);
  });
});
