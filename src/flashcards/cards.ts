import { LOOK_ALIKE_KANA } from '../data/lookAlikeKana';
import { KANA_SCRIPTS, KANA_SETS, kanaItems, shuffled, type PracticeItem } from '../practice/items';
import { romaji } from '../practice/words';

/*
 * Flashcards: a character or word is shown, and you pick its meaning or reading from four
 * answers. This file builds one card: what is shown, the right answer, and three wrong answers
 * that are plausible (look-alike kana first, readings of a similar length).
 */

export type { AskFor } from '../storage/savedData';
import type { AskFor } from '../storage/savedData';

export interface Card {
  /** For the flashcard results: what is asked about which item, e.g. "reading:hiragana:あ". */
  id: string;
  item: PracticeItem;
  askFor: AskFor;
  /** What the card shows: the character or the word. */
  face: string;
  answer: string;
  /** The answer and up to three wrong answers, in random order. */
  choices: string[];
}

export const CHOICES = 4;

// Every kana the app teaches, by its characters, for the romaji of look-alikes.
const KANA_BY_TEXT = new Map(
  KANA_SCRIPTS.flatMap((script) =>
    KANA_SETS.flatMap((set) => kanaItems(script, set)).map(
      (item) => [item.characters.join(''), item] as const,
    ),
  ),
);

const isKanaCharacter = (item: PracticeItem): boolean => !item.word && item.script !== 'kanji';

/** Kana have readings, not meanings: a card for a single kana always asks for its reading. */
export const askedFor = (item: PracticeItem, askFor: AskFor): AskFor =>
  isKanaCharacter(item) ? 'reading' : askFor;

/** How many on and kun readings a kanji's answer shows: the main ones, so answers stay short. */
export const MAIN_READINGS = 2;

/**
 * A kun reading as shown on a card: KANJIDIC marks the okurigana with a dot (た.べる) and
 * prefix and suffix forms with a dash (ひと-, -び). The okurigana go in brackets: た(べる).
 */
const kunText = (reading: string): string => {
  const [stem = '', okurigana] = reading.replace(/-/g, '').split('.');
  return okurigana ? `${stem}(${okurigana})` : stem;
};

/**
 * The main readings of a kanji, e.g. "ニチ, ジツ · ひ": up to two on readings (katakana) and two
 * kun readings (hiragana). Suffix forms (-び, -か of 日) are sound changes inside words, so
 * they are left out unless the kanji has no other kun reading.
 */
export function mainReadings(
  onReadings: readonly string[],
  kunReadings: readonly string[],
): string {
  const standalone = kunReadings.filter((reading) => !reading.startsWith('-'));
  const kun = [...new Set((standalone.length ? standalone : kunReadings).map(kunText))];
  const on = [...new Set(onReadings)];
  return [on.slice(0, MAIN_READINGS).join(', '), kun.slice(0, MAIN_READINGS).join(', ')]
    .filter(Boolean)
    .join(' · ');
}

/**
 * The right answer of a card. A kana word's reading is written in romaji (the card shows the
 * kana already); a kanji's or kanji word's reading in kana.
 */
function answerOf(item: PracticeItem, askFor: AskFor): string {
  const word = item.word;
  if (word) {
    if (askFor === 'meaning') return word.meaning;
    return item.script === 'kanji' ? word.kana : romaji(word.kana);
  }
  if (item.script !== 'kanji') return item.prompt; // a single kana: its romaji
  return askFor === 'meaning'
    ? item.prompt
    : mainReadings(item.onReadings ?? [], item.kunReadings ?? []);
}

/** What the card shows: a kanji word in kanji (今日), a kana word in kana, or the character. */
const faceOf = (item: PracticeItem): string =>
  item.script === 'kanji'
    ? (item.word?.kanji ?? item.characters.join(''))
    : (item.word?.kana ?? item.characters.join(''));

/**
 * Cards of the same kind lend each other wrong answers: kana with kana, kanji with kanji, kana
 * words with kana words and kanji words with kanji words, so no answer stands out by its form.
 */
const kindOf = (item: PracticeItem): string =>
  `${item.word ? 'word' : 'character'}:${item.script === 'kanji' ? 'kanji' : 'kana'}`;
const sameKind = (a: PracticeItem, b: PracticeItem): boolean => kindOf(a) === kindOf(b);

/** The kana that look like this one, with their romaji: シ → ツ tsu, ソ so, ン n. */
export function lookAlikes(face: string): { kana: string; romaji: string }[] {
  return LOOK_ALIKE_KANA.filter((group) => group.includes(face))
    .flatMap((group) => [...group])
    .filter((kana) => kana !== face)
    .flatMap((kana) => {
      const item = KANA_BY_TEXT.get(kana);
      return item ? [{ kana, romaji: item.prompt }] : [];
    });
}

const lookAlikeAnswers = (face: string): string[] => lookAlikes(face).map((alike) => alike.romaji);

/**
 * One card for an item. `pool` lends the wrong answers (other items of the selection; the more
 * the better). The answers are all different, and no wrong answer equals the right one.
 */
export function buildCard(
  item: PracticeItem,
  askFor: AskFor,
  pool: readonly PracticeItem[],
  random: () => number = Math.random,
): Card {
  const asked = askedFor(item, askFor);
  const answer = answerOf(item, asked);
  let others = shuffled(
    pool.filter((other) => other.id !== item.id && sameKind(other, item)),
    random,
  ).map((other) => answerOf(other, asked));
  if (isKanaCharacter(item)) {
    others = [...shuffled(lookAlikeAnswers(faceOf(item)), random), ...others];
  } else if (asked === 'reading') {
    // Readings of a similar length are harder to tell apart than short against long.
    others.sort((a, b) => Math.abs(a.length - answer.length) - Math.abs(b.length - answer.length));
  }
  const wrong = [...new Set(others)].filter((other) => other !== answer).slice(0, CHOICES - 1);
  return {
    id: `${asked}:${item.id}`,
    item,
    askFor: asked,
    face: faceOf(item),
    answer,
    choices: shuffled([answer, ...wrong], random),
  };
}
