import { wordFromRow, type Word, type WordRow } from './words';

/*
 * The word list (about 0.9 MB) is only needed for Words mode, so it is loaded the first time
 * that mode is chosen. Vite turns the import() into its own file.
 */

let words: Word[] | null = null;
let loading: Promise<Word[]> | null = null;

/** The words, or null while they haven't been loaded yet. */
export const loadedWords = (): Word[] | null => words;

export function loadWords(): Promise<Word[]> {
  loading ??= import('../data/generated/words.json')
    .then((module) => (words = (module.default as WordRow[]).map(wordFromRow)))
    .catch((error: unknown) => {
      loading = null; // so the next try loads again
      throw error;
    });
  return loading;
}
