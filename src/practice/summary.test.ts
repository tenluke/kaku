import { describe, expect, it } from 'vitest';
import type { ItemResult } from './attempt';
import { summarize } from './summary';

const result = (percent: number, passed: boolean, markedCorrect = false): ItemResult => ({
  percent,
  passed,
  markedCorrect,
  skipped: false,
  usedHint: false,
});

describe('summarize', () => {
  it('counts passes and averages scores', () => {
    expect(summarize([result(90, true), result(60, true, true), result(30, false)])).toEqual({
      total: 3,
      passed: 2,
      passedPercent: 67,
      averagePercent: 60,
      markedCorrect: 1,
    });
  });

  it('handles an empty session', () => {
    expect(summarize([])).toMatchObject({ total: 0, passedPercent: 0, averagePercent: 0 });
  });
});
