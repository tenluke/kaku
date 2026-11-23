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

/** The right answer of a card. A kana word's reading is written in romaji. */
function answerOf(item: PracticeItem, askFor: AskFor): string {
  if (!item.word) return item.prompt; // a single kana: its romaji
  return askFor === 'meaning' ? item.word.meaning : romaji(item.word.kana);
}

const faceOf = (item: PracticeItem): string => item.word?.kana ?? item.characters.join('');

/** Cards of the same kind can lend each other wrong answers: kana with kana, words with words. */
const sameKind = (a: PracticeItem, b: PracticeItem): boolean => Boolean(a.word) === Boolean(b.word);

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
