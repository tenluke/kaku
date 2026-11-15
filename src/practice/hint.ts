/*
 * What the Hint button does next. Hints come in three stages:
 *   1. tell how many strokes the character has (this alone does not count as a hint),
 *   2. show the strokes one by one (each counts as a hint, so the character fails),
 *   3. once every stroke is shown, replay them all in order.
 */

export type HintStep = 'strokeCount' | 'stroke' | 'replay';

export function nextHintStep(
  strokeCountShown: boolean,
  strokesShown: number,
  totalStrokes: number,
): HintStep {
  if (!strokeCountShown) return 'strokeCount';
  if (strokesShown < totalStrokes) return 'stroke';
  return 'replay';
}
