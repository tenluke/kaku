import touchIconUrl from '../assets/apple-touch-icon.png';
import logoUrl from '../assets/logo.svg';

/*
 * Adds the browser-tab icon and the phone home-screen icon.
 *
 * They are added from code rather than written in index.html because Vite only packs images
 * into the single offline file when code imports them; icon links in the HTML would stay
 * separate files, and the offline file would have no icon.
 */
export function addAppIcons(): void {
  const add = (rel: string, href: string, type?: string) => {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    if (type) link.type = type;
    document.head.appendChild(link);
  };
  add('icon', logoUrl, 'image/svg+xml');
  // iPhone and iPad use a PNG for the home screen and round its corners themselves.
  add('apple-touch-icon', touchIconUrl);
}
