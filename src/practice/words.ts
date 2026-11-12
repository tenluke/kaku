import { PASS_PERCENT } from '../checking/scoring';
import type { ItemResult } from './attempt';
import { KANA_SCRIPTS, KANA_SETS, kanaItems, shuffled, type PracticeItem } from './items';

/*
 * Words mode on the Kana tab: real words (from JMdict) made only of the kana you selected,
 * written one kana per box. Each kana's result also counts for its own pass rate.
 */

/** A word from src/data/generated/words.json. */
export interface Word {
  kana: string;
  meaning: string;
  /** JMdict frequency band: 1 = among the most common words; UNRANKED = no band. */
  rank: number;
  kanji?: string;
}

/** How words.json stores a word. Must match `WordRow` in scripts/data/words.ts. */
export type WordRow = [kana: string, meaning: string, rank: number, kanji?: string];

export const UNRANKED = 49;

export const wordFromRow = ([kana, meaning, rank, kanji]: WordRow): Word =>
  kanji ? { kana, meaning, rank, kanji } : { kana, meaning, rank };

/** One kana to write: a single kana, or a digraph like きゃ (two boxes, one pass rate). */
export interface KanaUnit {
  characters: string[];
  /** The kana's item id for pass rates; null for small っ and ー, which aren't taught alone. */
  itemId: string | null;
  romaji: string;
}

// Every kana the app teaches, by its characters: "か" → hiragana:か "ka".
const KANA_BY_TEXT = new Map(
  KANA_SCRIPTS.flatMap((script) =>
    KANA_SETS.flatMap((set) => kanaItems(script, set)).map(
      (item) => [item.characters.join(''), item] as const,
    ),
  ),
);
const SMALL_TSU = new Set(['っ', 'ッ']);
const LONG_VOWEL = 'ー';

/** Splits a word into the kana to write: きゃっと → きゃ, っ, と. */
export function kanaUnits(word: string): KanaUnit[] {
  const characters = [...word];
  const units: KanaUnit[] = [];
  for (let index = 0; index < characters.length; index++) {
    const pair = characters.slice(index, index + 2).join('');
    const single = characters[index] as string;
    const digraph = pair.length === 2 ? KANA_BY_TEXT.get(pair) : undefined;
    const item = digraph ?? KANA_BY_TEXT.get(single);
    if (digraph) index++;
    if (item) units.push({ characters: item.characters, itemId: item.id, romaji: item.prompt });
    else if (SMALL_TSU.has(single) || single === LONG_VOWEL)
      units.push({ characters: [single], itemId: null, romaji: '' });
    else throw new Error(`Not a kana the app teaches: ${single} in ${word}`);
  }
  return units;
}

const MACRONS: Record<string, string> = { a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō' };

/**
 * The word in Hepburn romaji, one-to-one with what you write: がっこう → gakkou,
 * コーヒー → kōhī, きんえん → kin'en.
 */
export function romaji(word: string): string {
  const units = kanaUnits(word);
  let text = '';
  units.forEach((unit, index) => {
    const next = units[index + 1]?.romaji ?? '';
    if (SMALL_TSU.has(unit.characters[0] as string)) {
      // A small っ doubles the next consonant; before ch Hepburn writes t (まっちゃ → matcha).
      text += next.startsWith('ch') ? 't' : next.charAt(0);
    } else if (unit.characters[0] === LONG_VOWEL) {
      const vowel = text.charAt(text.length - 1);
      text = MACRONS[vowel] ? text.slice(0, -1) + MACRONS[vowel] : text + '-';
    } else if (unit.romaji === 'n' && /^[aiueoy]/.test(next)) {
      text += "n'"; // so きんえん (kin'en) isn't read as きねん (kinen)
    } else text += unit.romaji;
  });
  return text;
}

/** The words that use only these kana (by item id). Small っ and ー are always allowed. */
export function wordsUsing(words: readonly Word[], allowedIds: ReadonlySet<string>): Word[] {
  return words.filter((word) =>
    kanaUnits(word.kana).every((unit) => unit.itemId === null || allowedIds.has(unit.itemId)),
  );
}

// Most words without a frequency band are common loanwords (コーヒー); sort them in the middle.
const sortRank = (word: Word) => (word.rank === UNRANKED ? 24 : word.rank);
const MIN_CHOICE = 300;
const scriptOf = (word: Word) => (/\p{Script=Katakana}/u.test(word.kana) ? 'katakana' : 'hiragana');

/**
 * Picks `count` different words for a session, favouring common ones: per script, the words
 * are put in order of frequency (in random order within a band), and the session draws at
 * random from the first 300 (or three times `count`, if more) of each script. Per script, so
 * that katakana words still come up when common hiragana words are many more.
 */
export function pickWords(
  words: readonly Word[],
  count: number,
  random: () => number = Math.random,
): Word[] {
  const choiceSize = Math.max(MIN_CHOICE, count * 3);
  const choice = (['hiragana', 'katakana'] as const).flatMap((script) =>
    shuffled(
      words.filter((word) => scriptOf(word) === script),
      random,
    )
      .sort((a, b) => sortRank(a) - sortRank(b))
      .slice(0, choiceSize),
  );
  return shuffled(choice, random).slice(0, Math.max(0, count));
}

/** A word as a practice item: one box per character, prompted with romaji and meaning. */
export function wordItem(word: Word): PracticeItem {
  const characters = [...word.kana];
  return {
    id: `word:${word.kana}`,
    script: scriptOf(word),
    characters,
    prompt: `${romaji(word.kana)} · ${word.meaning}`,
    word: { kana: word.kana, meaning: word.meaning, ...(word.kanji ? { kanji: word.kanji } : {}) },
  };
}

/**
 * What a finished word counts for each of its kana. A kana passes when its box(es) passed the
 * last check and showed no hint. Skipping fails every kana; "I was right" passes every kana.
 * A kana used twice passes only if it passed both times.
 */
export function kanaResults(
  word: string,
  result: ItemResult,
  boxPercents: readonly number[],
  hintedBoxes: ReadonlySet<number>,
): { id: string; passed: boolean }[] {
  const passedById = new Map<string, boolean>();
  let box = 0;
  for (const unit of kanaUnits(word)) {
    const boxes = unit.characters.map(() => box++);
    if (!unit.itemId) continue;
    const boxesPassed = boxes.every(
      (b) => (boxPercents[b] ?? 0) >= PASS_PERCENT && !hintedBoxes.has(b),
    );
    const passed = result.markedCorrect || (!result.skipped && boxesPassed);
    passedById.set(unit.itemId, (passedById.get(unit.itemId) ?? true) && passed);
  }
  return [...passedById].map(([id, passed]) => ({ id, passed }));
}
