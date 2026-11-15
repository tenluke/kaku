import { RECENT_RESULTS_KEPT, VALID_ITEM_ID, type PassRateEntry } from '../storage/savedData';

/*
 * Pass rates: how well each character is remembered, from its last 10 results.
 * Only the final pass/fail of a character in a session counts ("I was right" included).
 */

export type PassRates = Record<string, PassRateEntry>;

/** Adds one session's results. Returns a new object; the old one is not changed. */
export function recordResults(
  rates: PassRates,
  results: readonly { id: string; passed: boolean }[],
  now: number,
): PassRates {
  const next = { ...rates };
  for (const { id, passed } of results) {
    if (!VALID_ITEM_ID.test(id)) continue;
    const entry = next[id] ?? { seen: 0, passed: 0, recent: '', lastSeen: 0 };
    next[id] = {
      seen: entry.seen + 1,
      passed: entry.passed + (passed ? 1 : 0),
      recent: (entry.recent + (passed ? '1' : '0')).slice(-RECENT_RESULTS_KEPT),
      lastSeen: now,
    };
  }
  return next;
}

/** Share of passes among the last results (0 … 1), or null if never practised. */
export function recentPassRate(entry: PassRateEntry | undefined): number | null {
  if (!entry || !entry.recent) return null;
  return [...entry.recent].filter((result) => result === '1').length / entry.recent.length;
}

/** Below this many sessions, a rate is only a first guess (shown with a dashed border). */
export const MIN_SESSIONS_FOR_CONFIDENCE = 3;
export const WEAKEST_COUNT = 20;
/** Characters at 90% or better are "green": not worth drilling. */
export const WEAK_BELOW_RATE = 0.9;

export interface RatedItem<T> {
  item: T;
  entry: PassRateEntry | undefined;
  rate: number | null;
}

export function rateItems<T extends { id: string }>(
  items: readonly T[],
  rates: PassRates,
): RatedItem<T>[] {
  return items.map((item) => {
    const entry = rates[item.id];
    return { item, entry, rate: recentPassRate(entry) };
  });
}

/**
 * The (up to 20) practised characters below 90%, lowest rate first. Ties: the one practised
 * more often first (it keeps failing), then the one practised longest ago.
 */
export function weakest<T>(rated: readonly RatedItem<T>[]): RatedItem<T>[] {
  return rated
    .filter((r) => r.rate !== null && r.rate < WEAK_BELOW_RATE)
    .sort(
      (a, b) =>
        (a.rate as number) - (b.rate as number) ||
        (b.entry?.seen ?? 0) - (a.entry?.seen ?? 0) ||
        (a.entry?.lastSeen ?? 0) - (b.entry?.lastSeen ?? 0),
    )
    .slice(0, WEAKEST_COUNT);
}

/** All items, weakest first; never-practised ones last. */
export function weakestFirst<T>(rated: readonly RatedItem<T>[]): RatedItem<T>[] {
  return [...rated].sort((a, b) => {
    if (a.rate === null || b.rate === null)
      return (a.rate === null ? 1 : 0) - (b.rate === null ? 1 : 0);
    return a.rate - b.rate || (b.entry?.seen ?? 0) - (a.entry?.seen ?? 0);
  });
}

export interface ProgressSummary {
  total: number;
  practised: number;
  below50: number;
  average: number | null; // average recent pass rate of practised characters
}

export function progressSummary<T>(rated: readonly RatedItem<T>[]): ProgressSummary {
  const rates = rated.flatMap((r) => (r.rate === null ? [] : [r.rate]));
  return {
    total: rated.length,
    practised: rates.length,
    below50: rates.filter((rate) => rate < 0.5).length,
    average: rates.length ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : null,
  };
}

/** Colour scale: red at 50% and below, green at 90% and above, orange/yellow/lime between. */
export function passRateColor(rate: number | null): string {
  if (rate === null) return 'var(--dim)';
  const position = Math.min(1, Math.max(0, (rate - 0.5) / 0.4));
  // The lightness comes from the theme (darker colours on the light theme, for contrast).
  return `hsl(${Math.round(position * 120)} 75% var(--rate-lightness, 55%))`;
}
