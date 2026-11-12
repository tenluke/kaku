import { describe, expect, it } from 'vitest';
import { chooseTheme } from './chooseTheme';

describe('chooseTheme', () => {
  it('keeps the saved theme, whatever the browser prefers', () => {
    expect(chooseTheme('light', true)).toBe('light');
    expect(chooseTheme('dark', false)).toBe('dark');
  });

  it('on the first visit follows the browser or system preference', () => {
    expect(chooseTheme(null, true)).toBe('dark');
    expect(chooseTheme(null, false)).toBe('light');
  });
});
