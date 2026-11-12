/*
 * Builds the app's data files in src/data/generated/ from the open sources in sources.ts:
 *   kanji.json         – every JLPT and RTK Book 1 kanji with meanings, readings, level, frame
 *   strokes-kana.json  – stroke paths of all kana
 *   strokes-n5.json …  – stroke paths of the kanji of each JLPT level (loaded per level)
 *   strokes-extra.json – stroke paths of the RTK Book 1 kanji that aren't in the JLPT lists
 *   words.json         – common words written in kana, for the Kana tab's Words mode
 *   sources.json       – which source versions were used
 * Run with: npm run data
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { downloadGzipText, downloadMany, downloadText } from './download.ts';
import { parseJlptLevels, type JlptLevel } from './jlpt.ts';
import { parseJmdict } from './jmdict.ts';
import { ALL_KANA } from './kana.ts';
import { parseKanjidic, type KanjidicEntry } from './kanjidic.ts';
import { kanjiVgFileName, parseKanjiVgStrokes } from './kanjivg.ts';
import { arrayPerLine, objectPerLine } from './output.ts';
import { pickWords, toRow } from './words.ts';
import {
  JMDICT_URL,
  KANJI_DATA_COMMIT,
  KANJI_DATA_URL,
  KANJIDIC2_URL,
  KANJIVG_VERSION,
  kanjiVgSvgUrl,
} from './sources.ts';

const OUTPUT_DIR = join(import.meta.dirname, '..', '..', 'src', 'data', 'generated');
const LEVELS: readonly JlptLevel[] = [5, 4, 3, 2, 1];

interface KanjiRecord extends KanjidicEntry {
  jlpt: JlptLevel | null; // null: in RTK Book 1 but not in the JLPT lists
}

const RTK1_FRAMES = 2200; // Remembering the Kanji Book 1, 6th edition
const inRtk1 = (entry: KanjidicEntry) => entry.rtkFrame !== null && entry.rtkFrame <= RTK1_FRAMES;

/**
 * Easiest level first; inside a level the most frequent kanji first. Kanji that are only in
 * RTK come last, in frame order.
 */
function byLevelThenFrequency(a: KanjiRecord, b: KanjiRecord): number {
  if (a.jlpt === null || b.jlpt === null) {
    if (a.jlpt !== b.jlpt) return a.jlpt === null ? 1 : -1;
    return (a.rtkFrame ?? 0) - (b.rtkFrame ?? 0);
  }
  if (a.jlpt !== b.jlpt) return b.jlpt - a.jlpt;
  const frequencyA = a.frequency ?? Infinity;
  const frequencyB = b.frequency ?? Infinity;
  if (frequencyA !== frequencyB) return frequencyA - frequencyB;
  return (a.character.codePointAt(0) ?? 0) - (b.character.codePointAt(0) ?? 0);
}

async function loadKanji(): Promise<{ kanji: KanjiRecord[]; kanjidicDate: string }> {
  const kanjidic = parseKanjidic(await downloadGzipText(KANJIDIC2_URL, 'kanjidic2.xml.gz'));
  const levels = parseJlptLevels(
    await downloadText(KANJI_DATA_URL, `kanji-data-${KANJI_DATA_COMMIT}.json`),
  );
  const entriesByCharacter = new Map(kanjidic.entries.map((entry) => [entry.character, entry]));
  const kanji: KanjiRecord[] = [];
  for (const [character, jlpt] of levels) {
    const entry = entriesByCharacter.get(character);
    if (!entry) throw new Error(`JLPT kanji ${character} is missing from KANJIDIC2`);
    kanji.push({ ...entry, jlpt });
  }
  const rtk1 = kanjidic.entries.filter(inRtk1);
  if (rtk1.length !== RTK1_FRAMES)
    throw new Error(`KANJIDIC2 has ${rtk1.length} RTK Book 1 frames, expected ${RTK1_FRAMES}`);
  for (const entry of rtk1) if (!levels.has(entry.character)) kanji.push({ ...entry, jlpt: null });
  return { kanji: kanji.sort(byLevelThenFrequency), kanjidicDate: kanjidic.dateOfCreation };
}

/** Downloads KanjiVG strokes; characters KanjiVG doesn't have are returned as `missing`. */
async function loadStrokes(
  characters: readonly string[],
): Promise<{ strokes: Map<string, string[]>; missing: string[] }> {
  const svgs = await downloadMany(characters, async (character) => {
    const fileName = kanjiVgFileName(character);
    try {
      return await downloadText(kanjiVgSvgUrl(fileName), `kanjivg-${KANJIVG_VERSION}/${fileName}`);
    } catch {
      return null;
    }
  });
  const strokes = new Map<string, string[]>();
  const missing: string[] = [];
  characters.forEach((character, index) => {
    const paths = svgs[index] ? parseKanjiVgStrokes(svgs[index]) : [];
    if (paths.length) strokes.set(character, paths);
    else missing.push(character);
  });
  return { strokes, missing };
}

/** KANJIDIC2 and KanjiVG are separate projects; a different stroke count hints at an error. */
function strokeCountMismatches(kanji: KanjiRecord[], strokes: Map<string, string[]>): string[] {
  return kanji
    .filter((record) => strokes.get(record.character)?.length !== record.strokeCount)
    .map(
      (record) =>
        `${record.character}: KANJIDIC2 ${record.strokeCount}, KanjiVG ${strokes.get(record.character)?.length}`,
    );
}

const pick = (strokes: Map<string, string[]>, characters: readonly string[]) =>
  Object.fromEntries(characters.flatMap((c) => (strokes.has(c) ? [[c, strokes.get(c)]] : [])));

async function main(): Promise<void> {
  const { kanji, kanjidicDate } = await loadKanji();
  const kanjiCharacters = kanji.map((record) => record.character);
  const kanjiStrokes = await loadStrokes(kanjiCharacters);
  if (kanjiStrokes.missing.length)
    throw new Error(`KanjiVG has no strokes for: ${kanjiStrokes.missing.join(' ')}`);
  const rtkOnly = kanji.filter((record) => record.jlpt === null).map((r) => r.character);
  const kanaStrokes = await loadStrokes(ALL_KANA);
  const jmdict = parseJmdict(await downloadGzipText(JMDICT_URL, 'JMdict_e.gz'));
  const words = pickWords(jmdict.entries);

  await mkdir(OUTPUT_DIR, { recursive: true });
  const write = (name: string, text: string) => writeFile(join(OUTPUT_DIR, name), text);
  await write('kanji.json', arrayPerLine(kanji));
  await write('strokes-kana.json', objectPerLine(pick(kanaStrokes.strokes, ALL_KANA)));
  for (const level of LEVELS) {
    const characters = kanji.filter((r) => r.jlpt === level).map((r) => r.character);
    await write(`strokes-n${level}.json`, objectPerLine(pick(kanjiStrokes.strokes, characters)));
  }
  await write('strokes-extra.json', objectPerLine(pick(kanjiStrokes.strokes, rtkOnly)));
  await write('words.json', arrayPerLine(words.map(toRow)));
  const mismatches = strokeCountMismatches(kanji, kanjiStrokes.strokes);
  await write(
    'sources.json',
    JSON.stringify(
      {
        kanjiVg: KANJIVG_VERSION,
        kanjidic2: kanjidicDate,
        jmdict: jmdict.dateOfCreation,
        kanjiDataCommit: KANJI_DATA_COMMIT,
        kanjiCount: {
          ...Object.fromEntries(
            LEVELS.map((level) => [`n${level}`, kanji.filter((r) => r.jlpt === level).length]),
          ),
          rtk1NotInJlpt: rtkOnly.length,
        },
        wordCount: words.length,
        kanaWithoutStrokes: kanaStrokes.missing.join(''),
        strokeCountMismatches: mismatches,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `Wrote ${kanji.length} kanji, ${kanaStrokes.strokes.size} kana and ${words.length} words to ${OUTPUT_DIR}`,
  );
  if (mismatches.length)
    console.log(`Stroke count differs for ${mismatches.length} kanji (see sources.json).`);
}

await main();
