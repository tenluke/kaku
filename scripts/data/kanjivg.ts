import { XMLParser } from 'fast-xml-parser';

/** KanjiVG names each file after the character's Unicode code point: 5 hex digits. */
export const kanjiVgFileName = (character: string): string =>
  (character.codePointAt(0) ?? 0).toString(16).padStart(5, '0') + '.svg';

interface SvgElement {
  '@_id'?: string;
  '@_d'?: string;
  [childName: string]: unknown;
}

// Child elements always become arrays (one shape to walk); attributes stay plain strings.
const parser = new XMLParser({
  ignoreAttributes: false,
  isArray: (_tagName, _path, _isLeafNode, isAttribute) => !isAttribute,
});

// Stroke paths have ids like "kvg:065e5-s3" (stroke 3 of 日).
const STROKE_ID = /^kvg:[0-9a-f]+-s(\d+)$/;

/** Walks the whole SVG tree and collects every stroke path with its stroke number. */
function collectStrokes(node: unknown, found: { number: number; path: string }[]): void {
  if (Array.isArray(node)) return node.forEach((child) => collectStrokes(child, found));
  if (typeof node !== 'object' || node === null) return;
  const element = node as SvgElement;
  const match = STROKE_ID.exec(element['@_id'] ?? '');
  if (match && element['@_d']) found.push({ number: Number(match[1]), path: element['@_d'] });
  Object.entries(element)
    .filter(([key]) => !key.startsWith('@_'))
    .forEach(([, child]) => collectStrokes(child, found));
}

/** The SVG path of every stroke, in stroke order. Coordinates are in a 109 × 109 box. */
export function parseKanjiVgStrokes(svg: string): string[] {
  const strokes: { number: number; path: string }[] = [];
  collectStrokes(parser.parse(svg), strokes);
  return strokes.sort((a, b) => a.number - b.number).map((stroke) => stroke.path);
}
