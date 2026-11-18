// Kana sets taught by the app, in hiragana with Hepburn romaji. Katakana uses the same
// tables: each katakana is its hiragana's Unicode code point plus 0x60 (see items.ts).

export interface KanaEntry {
  kana: string;
  romaji: string;
}

const pair = (kana: string, romaji: string): KanaEntry[] => {
  const characters = [...kana];
  const names = romaji.split(' ');
  if (characters.length !== names.length) throw new Error(`Kana and romaji differ: ${kana}`);
  return characters.map((character, index) => ({
    kana: character,
    romaji: names[index] as string,
  }));
};

/**
 * The basic kana, one row of the kana table each (あ row, か row, …). The character picker
 * shows each row on its own line. ん shares the わ row's line, as in many kana charts.
 */
export const HIRAGANA_BASIC_ROWS: readonly (readonly KanaEntry[])[] = [
  pair('あいうえお', 'a i u e o'),
  pair('かきくけこ', 'ka ki ku ke ko'),
  pair('さしすせそ', 'sa shi su se so'),
  pair('たちつてと', 'ta chi tsu te to'),
  pair('なにぬねの', 'na ni nu ne no'),
  pair('はひふへほ', 'ha hi fu he ho'),
  pair('まみむめも', 'ma mi mu me mo'),
  pair('やゆよ', 'ya yu yo'),
  pair('らりるれろ', 'ra ri ru re ro'),
  pair('わをん', 'wa wo n'),
];

export const HIRAGANA_BASIC: readonly KanaEntry[] = HIRAGANA_BASIC_ROWS.flat();

/** The voiced kana (with ゛ or ゜), one row of the kana table each (が row, ざ row, …). */
export const HIRAGANA_VOICED_ROWS: readonly (readonly KanaEntry[])[] = [
  pair('がぎぐげご', 'ga gi gu ge go'),
  pair('ざじずぜぞ', 'za ji zu ze zo'),
  pair('だぢづでど', 'da ji zu de do'),
  pair('ばびぶべぼ', 'ba bi bu be bo'),
  pair('ぱぴぷぺぽ', 'pa pi pu pe po'),
];

export const HIRAGANA_VOICED: readonly KanaEntry[] = HIRAGANA_VOICED_ROWS.flat();

/** Digraphs: one of these kana + small ゃ, ゅ or ょ, e.g. き + ゃ = きゃ (kya). */
export const DIGRAPH_BASES: readonly KanaEntry[] = pair(
  'きしちにひみりぎじびぴ',
  // The start of the romaji; the vowel comes from the small kana.
  'ky sh ch ny hy my ry gy j by py',
);

export const SMALL_YA_YU_YO: readonly KanaEntry[] = pair('ゃゅょ', 'a u o');
