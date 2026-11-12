import type { Theme } from '../storage/savedData';

/** The theme to use: the saved one, or (first visit) the browser's or system's preference. */
export const chooseTheme = (saved: Theme | null, prefersDark: boolean): Theme =>
  saved ?? (prefersDark ? 'dark' : 'light');
