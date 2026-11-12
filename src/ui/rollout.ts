/*
 * The "deck" animation on the Lists tab: when a book or main list is switched on, its tiles
 * roll out from under it, one after another; when it is switched off they roll back in.
 *
 * Books and saved lists are redrawn from HTML after every click, so a CSS transition would
 * never see a change. Opening therefore folds the newly drawn column at once (".off" without
 * transitions) and then unfolds it; closing folds the column that is on screen and redraws only
 * afterwards.
 * The movement itself is CSS (".deck" in style.css).
 */

/** Tiles a column shows without scrolling; the ones after them don't animate (style.css). */
export const VISIBLE_TILES = 3;

// How long rolling back in takes (style.css: the last tile's delay + its transition).
const ROLL_IN_MS = 450;

const reducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Unfolds a column that was just drawn, so its tiles roll out. */
export function rollOut(column: Element | null): void {
  if (!column || reducedMotion()) return;
  // The column may already have been laid out open (redrawing restores scroll positions), so
  // jump to the folded state without animating, then unfold with the animation.
  column.classList.add('instant', 'off');
  column.getBoundingClientRect(); // makes the browser apply the folded state now
  column.classList.remove('instant');
  column.getBoundingClientRect();
  column.classList.remove('off');
}

// Columns that are rolling in, with the timer that will switch them off.
const closingTimers = new WeakMap<Element, number>();

/**
 * Rolls a column's tiles back in, then calls `done` (which switches it off and redraws).
 * Clicking again while it rolls in changes your mind: the tiles roll back out and the column
 * stays open, just as clicking during opening rolls them back in.
 */
export function rollIn(column: Element | null, done: () => void): void {
  if (!column || reducedMotion()) {
    done();
    return;
  }
  const pending = closingTimers.get(column);
  if (pending !== undefined) {
    window.clearTimeout(pending);
    closingTimers.delete(column);
    column.classList.remove('off', 'closing');
    return;
  }
  column.classList.add('off', 'closing');
  closingTimers.set(
    column,
    window.setTimeout(() => {
      closingTimers.delete(column);
      done();
    }, ROLL_IN_MS),
  );
}
