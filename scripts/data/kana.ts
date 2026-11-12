// Every kana in the Unicode hiragana and katakana blocks that is a real letter
// (small kana included, iteration marks and punctuation left out), and the long-vowel mark ー
// used in katakana words. The app picks the ones it teaches; having stroke data for all of
// them keeps later additions (e.g. ヴ) easy.
const HIRAGANA_FIRST = 0x3041; // ぁ
const HIRAGANA_LAST = 0x3096; // ゖ
const KATAKANA_FIRST = 0x30a1; // ァ
const KATAKANA_LAST = 0x30fa; // ヺ

const range = (first: number, last: number): string[] =>
  Array.from({ length: last - first + 1 }, (_, index) => String.fromCodePoint(first + index));

export const ALL_KANA: readonly string[] = [
  ...range(HIRAGANA_FIRST, HIRAGANA_LAST),
  ...range(KATAKANA_FIRST, KATAKANA_LAST),
  'ー',
];
