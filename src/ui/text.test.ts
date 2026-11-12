import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json' with { type: 'json' };
import { aboutText, versionLabel } from './text';
import { APP_VERSION } from './version';

describe('the app version', () => {
  it('is the version written in package.json', () => {
    expect(APP_VERSION).toBe(packageJson.version);
  });

  it('is shown in the footer label and at the start of the About text', () => {
    expect(versionLabel('1.2.3')).toBe('書く (Kaku) 1.2.3');
    expect(aboutText('1.2.3')).toMatch(/^書く \(Kaku\), version 1\.2\.3\. App code © 2026 Tenluke/);
  });
});
