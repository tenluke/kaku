import { XMLParser } from 'fast-xml-parser';

/** The parts of a KANJIDIC2 entry that the app uses. */
export interface KanjidicEntry {
  character: string;
  meanings: string[]; // English only
  onReadings: string[]; // katakana, e.g. "ニチ"
  kunReadings: string[]; // hiragana, "." marks where okurigana start, e.g. "あか.るい"
  strokeCount: number;
  grade: number | null; // school grade; null if not taught at school
  frequency: number | null; // rank among the 2500 most used kanji in newspapers; null if rarer
  /** Frame number in Remembering the Kanji, 6th edition (1–2200 Book 1, 2201–3000 Book 3). */
  rtkFrame: number | null;
}

export interface Kanjidic {
  dateOfCreation: string;
  entries: KanjidicEntry[];
}

// The raw XML shapes we read. Elements that can repeat are always parsed as arrays.
interface XmlText {
  '#text': string;
}
interface XmlReading extends XmlText {
  '@_r_type': string;
}
interface XmlMeaning extends XmlText {
  '@_m_lang'?: string;
}
interface XmlDicRef extends XmlText {
  '@_dr_type': string;
}
interface XmlCharacter {
  literal: string;
  dic_number?: { dic_ref?: XmlDicRef[] };
  misc: { grade?: number; stroke_count: number[]; freq?: number };
  reading_meaning?: { rmgroup: { reading?: XmlReading[]; meaning?: XmlMeaning[] }[] };
}

const ALWAYS_ARRAYS = new Set([
  'character',
  'stroke_count',
  'rmgroup',
  'reading',
  'meaning',
  'dic_ref',
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  // Keep text in '#text' even without attributes, so every reading/meaning has one shape.
  alwaysCreateTextNode: true,
  isArray: (tagName) => ALWAYS_ARRAYS.has(tagName),
  // Leave readings and meanings as text; numbers are converted below where needed.
  parseTagValue: false,
  // KANJIDIC2 has a large internal DTD; we don't need it.
  processEntities: true,
});

const textOf = (node: unknown): string =>
  typeof node === 'object' && node !== null && '#text' in node ? String(node['#text']) : '';

const toNumberOrNull = (node: unknown): number | null => {
  const text = textOf(node);
  return text === '' ? null : Number(text);
};

function toEntry(character: XmlCharacter): KanjidicEntry {
  const groups = character.reading_meaning?.rmgroup ?? [];
  const readings = groups.flatMap((group) => group.reading ?? []);
  const meanings = groups.flatMap((group) => group.meaning ?? []);
  const readingsOfType = (type: string) =>
    readings.filter((reading) => reading['@_r_type'] === type).map(textOf);
  return {
    character: textOf(character.literal),
    // Meanings without m_lang are English; others are French, Spanish or Portuguese.
    meanings: meanings.filter((meaning) => meaning['@_m_lang'] === undefined).map(textOf),
    onReadings: readingsOfType('ja_on'),
    kunReadings: readingsOfType('ja_kun'),
    // The first stroke count is the accepted one; later ones are common miscounts.
    strokeCount: Number(textOf(character.misc.stroke_count[0])),
    grade: toNumberOrNull(character.misc.grade),
    frequency: toNumberOrNull(character.misc.freq),
    rtkFrame: toNumberOrNull(
      character.dic_number?.dic_ref?.find((ref) => ref['@_dr_type'] === 'heisig6'),
    ),
  };
}

export function parseKanjidic(xml: string): Kanjidic {
  const document = parser.parse(xml) as {
    kanjidic2: { header: { date_of_creation: unknown }; character: XmlCharacter[] };
  };
  return {
    dateOfCreation: textOf(document.kanjidic2.header.date_of_creation),
    entries: document.kanjidic2.character.map(toEntry),
  };
}
