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

export const HIRAGANA_BASIC: readonly KanaEntry[] = pair(
  'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
  'a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa wo n',
);

export const HIRAGANA_VOICED: readonly KanaEntry[] = pair(
  'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ',
  'ga gi gu ge go za ji zu ze zo da ji zu de do ba bi bu be bo pa pi pu pe po',
);

/** Digraphs: one of these kana + small ゃ, ゅ or ょ, e.g. き + ゃ = きゃ (kya). */
export const DIGRAPH_BASES: readonly KanaEntry[] = pair(
  'きしちにひみりぎじびぴ',
  // The start of the romaji; the vowel comes from the small kana.
  'ky sh ch ny hy my ry gy j by py',
);

export const SMALL_YA_YU_YO: readonly KanaEntry[] = pair('ゃゅょ', 'a u o');
