import type { Theme } from '../storage/savedData';
import { store } from './appStore';
import { chooseTheme } from './chooseTheme';
import { byId } from './dom';

/*
 * Light or dark look. The colours are CSS variables in style.css; this sets data-theme on
 * <html>, which switches them. On the first visit (nothing saved yet) the theme follows the
 * browser's or system's light/dark preference and is saved; after that the switch in the ⋯
 * menu decides.
 */

// The browser's own bar colour (on phones), matching each theme's background.
const BAR_COLORS: Record<Theme, string> = { dark: '#110e2a', light: '#fbf1f4' };

// Without the preference (very old browsers), keep the original dark look.
const prefersDark = (): boolean =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;

function showTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLORS[theme]);
  byId('theme-switch').setAttribute('aria-checked', String(theme === 'dark'));
}

/**
 * Shows the saved theme. With none saved (first visit, or after "Delete all data") it picks
 * one from the browser and saves it, so later visits look the same.
 */
export function applySavedTheme(): void {
  const settings = store.data.settings;
  const theme = chooseTheme(settings.theme, prefersDark());
  if (settings.theme !== theme) {
    settings.theme = theme;
    store.save();
  }
  showTheme(theme);
}

function toggleTheme(): void {
  store.data.settings.theme = store.data.settings.theme === 'light' ? 'dark' : 'light';
  store.save();
  showTheme(store.data.settings.theme);
}

export function initTheme(): void {
  applySavedTheme();
  byId('theme-switch').addEventListener('click', toggleTheme);
}
