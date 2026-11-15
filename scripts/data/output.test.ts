import { describe, expect, it } from 'vitest';
import { arrayPerLine, objectPerLine } from './output.ts';

describe('per-line JSON', () => {
  it('writes valid JSON with one entry per line', () => {
    const text = objectPerLine({ 日: ['M1,1'], 月: ['M2,2'] });
    expect(text).toBe('{\n  "日": ["M1,1"],\n  "月": ["M2,2"]\n}\n');
    expect(JSON.parse(text)).toEqual({ 日: ['M1,1'], 月: ['M2,2'] });
  });

  it('writes arrays the same way', () => {
    expect(JSON.parse(arrayPerLine([{ a: 1 }, { a: 2 }]))).toEqual([{ a: 1 }, { a: 2 }]);
  });
});
