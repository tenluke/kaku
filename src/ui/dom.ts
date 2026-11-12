// Small helpers for working with the page.

/** The element with this id. Throws early if index.html and the code disagree. */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

const fadeTimers = new WeakMap<HTMLElement, number>();
const SHOW_MESSAGE_MS = 4000;

/**
 * Shows a short confirmation (like "Saved …") that fades away after a few seconds, so it
 * doesn't stay around after it stops being news. `afterFade` can put back a lasting text.
 */
export function flashMessage(element: HTMLElement, text: string, afterFade?: () => void): void {
  window.clearTimeout(fadeTimers.get(element));
  element.classList.remove('faded');
  element.textContent = text;
  const timer = window.setTimeout(() => {
    element.classList.add('faded');
    // Wait for the fade (style.css) to finish before removing the text.
    fadeTimers.set(
      element,
      window.setTimeout(() => {
        element.textContent = '';
        element.classList.remove('faded');
        afterFade?.();
      }, 600),
    );
  }, SHOW_MESSAGE_MS);
  fadeTimers.set(element, timer);
}

/** Shows a message that stays (and stops any fade in progress). */
export function showLastingMessage(element: HTMLElement, text: string): void {
  window.clearTimeout(fadeTimers.get(element));
  element.classList.remove('faded');
  element.textContent = text;
}

/** Makes text safe to put inside HTML, so data can never turn into markup. */
export const escapeHtml = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ] as string,
  );
