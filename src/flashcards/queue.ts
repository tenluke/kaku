/*
 * The order of cards in a session. A card answered right leaves the queue; a card answered
 * wrong comes back a few cards later, until it is answered right or the session ends. Only the
 * first answer to a card counts for the results.
 */

/** How many other cards come before a wrongly answered card is asked again. */
export const REPEAT_GAP = 3;

/** The queue after answering its first card. */
export function afterAnswer<T>(queue: readonly T[], answeredRight: boolean): T[] {
  const [current, ...rest] = queue;
  if (current === undefined || answeredRight) return rest;
  const at = Math.min(REPEAT_GAP, rest.length);
  return [...rest.slice(0, at), current, ...rest.slice(at)];
}
