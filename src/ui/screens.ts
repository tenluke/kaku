import { byId } from './dom';

/*
 * Which screen is shown, and the top menu that switches between them.
 * The practice screen hides the menu: you leave a session with its ✕ button.
 */

export type ScreenId =
  'setup-screen' | 'practice-screen' | 'results-screen' | 'progress-screen' | 'backup-screen';
const SCREENS: readonly ScreenId[] = [
  'setup-screen',
  'practice-screen',
  'results-screen',
  'progress-screen',
  'backup-screen',
];

const moreButton = byId('more-button');
const moreMenu = byId('more-menu');

export function showScreen(screen: ScreenId): void {
  for (const id of SCREENS) byId(id).hidden = id !== screen;
  byId('topbar').hidden = screen === 'practice-screen';
  closeMoreMenu();
}

/** Marks the tab of the open screen (for example the Kana or Kanji tab). */
export function highlightTab(selector: string): void {
  document.querySelectorAll<HTMLElement>('.tab').forEach((tab) => {
    const isCurrent = tab.matches(selector);
    tab.classList.toggle('on', isCurrent);
    if (isCurrent) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
}

export function closeMoreMenu(): void {
  moreMenu.hidden = true;
  moreButton.setAttribute('aria-expanded', 'false');
}

export function initMenu(): void {
  moreButton.addEventListener('click', () => {
    const willOpen = moreMenu.hidden;
    moreMenu.hidden = !willOpen;
    moreButton.setAttribute('aria-expanded', String(willOpen));
  });
  document.addEventListener('click', (event) => {
    if (!(event.target as Element).closest('#more-button, #more-menu')) closeMoreMenu();
  });
}
