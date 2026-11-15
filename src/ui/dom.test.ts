import { describe, expect, it } from 'vitest';
import { escapeHtml } from './dom';

describe('escapeHtml', () => {
  it('escapes every character that could start markup', () => {
    expect(escapeHtml(`<img src=x onerror="a('b')"> & co`)).toBe(
      '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt; &amp; co',
    );
  });
});
