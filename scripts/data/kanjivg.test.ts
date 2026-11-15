import { describe, expect, it } from 'vitest';
import { kanjiVgFileName, parseKanjiVgStrokes } from './kanjivg.ts';

describe('kanjiVgFileName', () => {
  it('uses the 5-digit hex code point', () => {
    expect(kanjiVgFileName('日')).toBe('065e5.svg');
    expect(kanjiVgFileName('あ')).toBe('03042.svg');
  });
});

describe('parseKanjiVgStrokes', () => {
  // Shaped like a KanjiVG file: strokes nested in groups, plus stroke-number labels.
  // Stroke 10 comes before stroke 2 in the file, to check sorting is numeric.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:kvg="https://kanjivg.tagaini.net/">
    <g id="kvg:StrokePaths_065e5">
      <g id="kvg:065e5" kvg:element="日">
        <path id="kvg:065e5-s1" d="M1,1"/>
        <g id="kvg:065e5-g1"><path id="kvg:065e5-s10" d="M10,10"/></g>
        <path id="kvg:065e5-s2" d="M2,2"/>
      </g>
    </g>
    <g id="kvg:StrokeNumbers_065e5"><text transform="matrix(1 0 0 1 0 0)">1</text></g>
  </svg>`;

  it('returns path data in stroke order', () => {
    expect(parseKanjiVgStrokes(svg)).toEqual(['M1,1', 'M2,2', 'M10,10']);
  });

  it('returns nothing for an SVG without strokes', () => {
    expect(parseKanjiVgStrokes('<svg></svg>')).toEqual([]);
  });
});
