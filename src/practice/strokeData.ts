import kanaStrokes from '../data/generated/strokes-kana.json';
import type { JlptLevel, PracticeItem } from './items';

/*
 * Stroke paths for every character. Kana are small and always loaded. Kanji strokes are
 * split per JLPT level (N1 alone is 1.2 MB), so each level is loaded the first time a
 * session needs it. Vite turns each import() below into its own file.
 */

type StrokeTable = Record<string, string[]>;

const LEVEL_LOADERS: Record<JlptLevel, () => Promise<{ default: StrokeTable }>> = {
  5: () => import('../data/generated/strokes-n5.json'),
  4: () => import('../data/generated/strokes-n4.json'),
  3: () => import('../data/generated/strokes-n3.json'),
  2: () => import('../data/generated/strokes-n2.json'),
  1: () => import('../data/generated/strokes-n1.json'),
};

const strokes = new Map<string, string[]>(Object.entries(kanaStrokes as StrokeTable));
const loadedLevels = new Set<JlptLevel>();
let extraLoaded = false; // RTK Book 1 kanji outside the JLPT lists

async function loadLevel(level: JlptLevel): Promise<void> {
  if (loadedLevels.has(level)) return;
  const table = (await LEVEL_LOADERS[level]()).default;
  for (const [character, paths] of Object.entries(table)) strokes.set(character, paths);
  loadedLevels.add(level);
}

async function loadExtra(): Promise<void> {
  if (extraLoaded) return;
  const table = (await import('../data/generated/strokes-extra.json')).default as StrokeTable;
  for (const [character, paths] of Object.entries(table)) strokes.set(character, paths);
  extraLoaded = true;
}

/** Makes sure the stroke data of all these items is loaded. */
export async function loadStrokesFor(items: readonly PracticeItem[]): Promise<void> {
  const levels = new Set(items.flatMap((item) => (item.jlpt ? [item.jlpt] : [])));
  const needsExtra = items.some((item) => item.script === 'kanji' && !item.jlpt);
  await Promise.all([...[...levels].map(loadLevel), ...(needsExtra ? [loadExtra()] : [])]);
}

/** The stroke paths of a loaded character, in stroke order. */
export function strokesOf(character: string): string[] {
  const paths = strokes.get(character);
  if (!paths) throw new Error(`No stroke data loaded for ${character}`);
  return paths;
}
