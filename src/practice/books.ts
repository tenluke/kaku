import type { KanjiRecord } from './items';

/*
 * Books the app can be used alongside. For now only Remembering the Kanji, Book 1 (6th
 * edition): its frame numbers come from KANJIDIC2, which publishes them under an open licence.
 * The book's lessons, keywords and primitives are its own content, so they are not shipped.
 */

export type BookId = 'rtk1';

export const BOOKS: readonly BookId[] = ['rtk1'];

export const isBookId = (value: unknown): value is BookId => BOOKS.includes(value as BookId);

/** A group of a book's kanji, e.g. RTK frames 1–100. */
export interface BookGroup {
  name: string;
  itemIds: string[];
}

const RTK1_FRAMES = 2200;
const FRAMES_PER_GROUP = 100;

/** RTK Book 1 frame number → kanji, from the app's kanji data. */
export function rtkFrames(records: readonly KanjiRecord[]): Map<number, string> {
  const byFrame = new Map<number, string>();
  for (const record of records) {
    if (record.rtkFrame && record.rtkFrame <= RTK1_FRAMES) {
      byFrame.set(record.rtkFrame, record.character);
    }
  }
  return byFrame;
}

/** RTK Book 1 in groups of 100 frames, in frame order: "1–100", "101–200", … */
export function rtkGroups(byFrame: ReadonlyMap<number, string>): BookGroup[] {
  const groups: BookGroup[] = [];
  for (let first = 1; first <= byFrame.size; first += FRAMES_PER_GROUP) {
    const last = Math.min(byFrame.size, first + FRAMES_PER_GROUP - 1);
    const itemIds: string[] = [];
    for (let frame = first; frame <= last; frame++) {
      const kanji = byFrame.get(frame);
      if (kanji) itemIds.push(`kanji:${kanji}`);
    }
    groups.push({ name: `${first}–${last}`, itemIds });
  }
  return groups;
}
