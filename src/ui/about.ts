import { byId } from './dom';
import { versionLabel } from './text';
import { APP_VERSION } from './version';

/*
 * The About & credits box: the app's version, its licence, and where the character data comes
 * from. Its text is in index.html. It opens from the ⋯ menu and from the footer, which only
 * shows the name and version.
 */

const overlay = byId('about-overlay');
const closeButton = byId<HTMLButtonElement>('about-close');

export const isAboutOpen = (): boolean => !overlay.hidden;

export function openAbout(): void {
  overlay.hidden = false;
  closeButton.focus();
}

export function closeAbout(): void {
  overlay.hidden = true;
}

export function initAbout(): void {
  const label = versionLabel(APP_VERSION);
  byId('app-version').textContent = label;
  byId('about-title').textContent = label;
  byId('footer-about').addEventListener('click', openAbout);
  closeButton.addEventListener('click', closeAbout);
  // A click beside the box closes it too.
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeAbout();
  });
}
