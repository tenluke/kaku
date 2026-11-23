import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json' with { type: 'json' };
import { summaryText, versionLabel } from './text';
import { APP_VERSION } from './version';

describe('the app version', () => {
  it('is the version written in package.json', () => {
    expect(APP_VERSION).toBe(packageJson.version);
  });

  it('is shown after the app name, in the footer and as the title of the About box', () => {
    expect(versionLabel('1.2.3')).toBe('書く (Kaku) 1.2.3');
  });
});

describe('the results summary', () => {
  const summary = { total: 5, passed: 3, passedPercent: 60, averagePercent: 72, markedCorrect: 0 };

  it('shows the average accuracy of a writing session', () => {
    expect(summaryText(summary)).toBe('3 of 5 passed · average accuracy 72%');
  });

  it('leaves it out for flashcards, where it would only repeat the score', () => {
    expect(summaryText(summary, true)).toBe('3 of 5 passed');
  });
});
