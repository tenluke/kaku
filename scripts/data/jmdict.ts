import { XMLParser } from 'fast-xml-parser';

/*
 * Reads JMdict (the EDRDG's Japanese–English dictionary). The file is about 60 MB of XML, so
 * it is read one <entry> at a time instead of as one big document.
 */

/** One way to read (spell in kana) a dictionary entry. */
export interface JmdictReading {
  kana: string;
  /** Marked as a common word (in the news1, ichi1, spec1/2 or gai1 lists). */
  common: boolean;
  /** Word-frequency band from nf01 (most common) to nf48; null if not ranked. */
  frequencyBand: number | null;
  /** Only used with these kanji spellings (empty: with all of them). */
  onlyWithKanji: string[];
  /** This reading is not a reading of the entry's kanji (e.g. a separate kana word). */
  noKanji: boolean;
}

export interface JmdictSense {
  glosses: string[]; // English
  /** Part-of-speech codes, e.g. "n", "v5r", "suf". */
  partsOfSpeech: string[];
  /** Other notes, e.g. "uk" (usually written in kana), "vulg", "derog". */
  notes: string[];
  /** Only for these readings (empty: for all of them). */
  onlyForReadings: string[];
}

export interface JmdictEntry {
  kanji: { text: string; common: boolean }[];
  readings: JmdictReading[];
  senses: JmdictSense[];
}

export interface Jmdict {
  dateOfCreation: string;
  entries: JmdictEntry[];
}

// Priority codes that make a word "common", as JMdict defines it.
const COMMON_CODES = new Set(['news1', 'ichi1', 'spec1', 'spec2', 'gai1']);
// The XML's own escapes; every other entity (&n; &uk; …) is a JMdict code.
const XML_ENTITIES = new Set(['amp', 'lt', 'gt', 'quot', 'apos']);
const ALWAYS_ARRAYS = new Set([
  'k_ele',
  'ke_pri',
  'r_ele',
  're_pri',
  're_restr',
  'sense',
  'gloss',
  'pos',
  'misc',
  'stagr',
]);

const parser = new XMLParser({
  ignoreAttributes: true,
  isArray: (tagName) => ALWAYS_ARRAYS.has(tagName),
  parseTagValue: false,
});

interface XmlEntry {
  k_ele?: { keb: string; ke_pri?: string[] }[];
  r_ele?: { reb: string; re_pri?: string[]; re_restr?: string[]; re_nokanji?: unknown }[];
  sense?: { gloss?: string[]; pos?: string[]; misc?: string[]; stagr?: string[] }[];
}

const isCommon = (codes: readonly string[] = []) => codes.some((code) => COMMON_CODES.has(code));

function frequencyBand(codes: readonly string[] = []): number | null {
  const band = codes.find((code) => /^nf\d\d$/.test(code));
  return band ? Number(band.slice(2)) : null;
}

/**
 * JMdict writes its codes as XML entities defined in its DTD (<pos>&n;</pos> means "n").
 * Writing them as the bare codes is simpler than having the parser read the DTD.
 */
const entitiesToCodes = (xml: string): string =>
  xml.replace(/&([\w-]+);/g, (whole, name: string) => (XML_ENTITIES.has(name) ? whole : name));

function toSenses(xmlSenses: NonNullable<XmlEntry['sense']>): JmdictSense[] {
  const senses: JmdictSense[] = [];
  for (const sense of xmlSenses) {
    // A sense without its own part of speech has the same as the one before it.
    const previous = senses[senses.length - 1];
    senses.push({
      glosses: (sense.gloss ?? []).map(String),
      partsOfSpeech: sense.pos?.length ? sense.pos.map(String) : (previous?.partsOfSpeech ?? []),
      notes: (sense.misc ?? []).map(String),
      onlyForReadings: (sense.stagr ?? []).map(String),
    });
  }
  return senses;
}

function toEntry(xml: XmlEntry): JmdictEntry {
  return {
    kanji: (xml.k_ele ?? []).map((k) => ({ text: String(k.keb), common: isCommon(k.ke_pri) })),
    readings: (xml.r_ele ?? []).map((r) => ({
      kana: String(r.reb),
      common: isCommon(r.re_pri),
      frequencyBand: frequencyBand(r.re_pri),
      onlyWithKanji: (r.re_restr ?? []).map(String),
      noKanji: r.re_nokanji !== undefined,
    })),
    senses: toSenses(xml.sense ?? []),
  };
}

export function parseJmdict(xml: string): Jmdict {
  const date = /<!-- JMdict created: (\d{4}-\d\d-\d\d) -->/.exec(xml)?.[1] ?? '';
  const entries: JmdictEntry[] = [];
  for (const match of xml.matchAll(/<entry>[\s\S]*?<\/entry>/g)) {
    const parsed = parser.parse(entitiesToCodes(match[0])) as { entry: XmlEntry };
    entries.push(toEntry(parsed.entry));
  }
  return { dateOfCreation: date, entries };
}
