// Where the app's data comes from. Versions are pinned so a rebuild gives the same result;
// change a version here on purpose, then rebuild and review the differences.

/** KanjiVG release tag (https://github.com/KanjiVG/kanjivg/releases). */
export const KANJIVG_VERSION = 'r20260714';
export const kanjiVgSvgUrl = (fileName: string): string =>
  `https://raw.githubusercontent.com/KanjiVG/kanjivg/${KANJIVG_VERSION}/kanji/${fileName}`;

/** KANJIDIC2 has no versions; the file is rebuilt daily. Its date is saved in the output. */
export const KANJIDIC2_URL = 'https://www.edrdg.org/kanjidic/kanjidic2.xml.gz';

/** JMdict (English meanings only) has no versions either; its date is saved in the output. */
export const JMDICT_URL = 'https://www.edrdg.org/pub/Nihongo/JMdict_e.gz';

/**
 * Only the modern JLPT levels (N5–N1) are taken from kanji-data (MIT licence), which in turn
 * took them from Jonathan Waller's JLPT lists. Pinned to a commit.
 */
export const KANJI_DATA_COMMIT = '00fd7079c3890f430759536f91aa5e854ec0ca4f';
export const KANJI_DATA_URL = `https://raw.githubusercontent.com/davidluzgouveia/kanji-data/${KANJI_DATA_COMMIT}/kanji.json`;
