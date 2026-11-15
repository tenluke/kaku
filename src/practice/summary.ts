import type { ItemResult } from './attempt';

export interface SessionSummary {
  total: number;
  passed: number;
  passedPercent: number; // share of characters passed, 0 … 100
  averagePercent: number; // average best score, 0 … 100
  markedCorrect: number; // passed thanks to "I was right"
}

export function summarize(results: readonly ItemResult[]): SessionSummary {
  const total = results.length;
  const passed = results.filter((result) => result.passed).length;
  const scoreSum = results.reduce((sum, result) => sum + result.percent, 0);
  return {
    total,
    passed,
    passedPercent: total ? Math.round((passed / total) * 100) : 0,
    averagePercent: total ? Math.round(scoreSum / total) : 0,
    markedCorrect: results.filter((result) => result.markedCorrect).length,
  };
}
