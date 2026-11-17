import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json' with { type: 'json' };
import { versionLabel } from './text';
import { APP_VERSION } from './version';

describe('the app version', () => {
  it('is the version written in package.json', () => {
    expect(APP_VERSION).toBe(packageJson.version);
  });

  it('is shown after the app name, in the footer and as the title of the About box', () => {
    expect(versionLabel('1.2.3')).toBe('書く (Kaku) 1.2.3');
  });
});
