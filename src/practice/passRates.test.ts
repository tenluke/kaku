import { describe, expect, it } from 'vitest';
import {
  passRateColor,
  progressSummary,
  rateItems,
  recentPassRate,
  recordResults,
  weakest,
  weakestFirst,
} from './passRates';

describe('recordResults', () => {
  it('counts sessions and passes and keeps the last 10 results', () => {
    let rates = {};
    for (let session = 0; session < 12; session++) {
      rates = recordResults(rates, [{ id: 'kanji:日', passed: session % 2 === 0 }], 1000 + session);
    }
    expect(rates).toEqual({
      'kanji:日': { seen: 12, passed: 6, recent: '1010101010', lastSeen: 1011 },
    });
  });

  it('ignores invalid ids and leaves the old object unchanged', () => {
    const before = {};
    const after = recordResults(before, [{ id: 'nonsense', passed: true }], 1);
    expect(after).toEqual({});
    expect(recordResults(before, [{ id: 'hiragana:あ', passed: true }], 1)).not.toBe(before);
  });
});

describe('recentPassRate', () => {
  it('is the share of passes among recent results', () => {
    expect(recentPassRate({ seen: 4, passed: 3, recent: '1101', lastSeen: 0 })).toBe(0.75);
  });
  it('is null when never practised', () => {
    expect(recentPassRate(undefined)).toBeNull();
  });
});

describe('weakest', () => {
  const items = ['あ', 'い', 'う', 'え', 'お'].map((kana) => ({ id: `hiragana:${kana}` }));
  const rates = {
    'hiragana:あ': { seen: 2, passed: 0, recent: '00', lastSeen: 5 }, // 0%
    'hiragana:い': { seen: 9, passed: 1, recent: '0', lastSeen: 5 }, // 0%, practised more
    'hiragana:う': { seen: 2, passed: 1, recent: '10', lastSeen: 5 }, // 50%
    'hiragana:え': { seen: 1, passed: 1, recent: '1', lastSeen: 5 }, // 100%: not weak
  };
  const rated = rateItems(items, rates);

  it('lists practised characters below 90%, worst first', () => {
    expect(weakest(rated).map((r) => r.item.id)).toEqual([
      'hiragana:い',
      'hiragana:あ',
      'hiragana:う',
    ]);
  });

  it('can sort everything weakest first, unpractised last', () => {
    expect(weakestFirst(rated).map((r) => r.item.id)).toEqual([
      'hiragana:い',
      'hiragana:あ',
      'hiragana:う',
      'hiragana:え',
      'hiragana:お',
    ]);
  });

  it('summarises', () => {
    expect(progressSummary(rated)).toEqual({ total: 5, practised: 4, below50: 2, average: 0.375 });
  });
});

describe('passRateColor', () => {
  it('goes from red to green', () => {
    expect(passRateColor(0.3)).toBe('hsl(0 75% var(--rate-lightness, 55%))');
    expect(passRateColor(0.95)).toBe('hsl(120 75% var(--rate-lightness, 55%))');
    expect(passRateColor(null)).toBe('var(--dim)');
  });
});
