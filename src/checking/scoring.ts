import {
  alignedDistance,
  nearestPointDistance,
  normalizeStrokes,
  resample,
  strokeLength,
  type Stroke,
} from './geometry';
import { svgPathToPoints } from './svgPath';

/*
 * Scoring a drawing, ported unchanged from the prototype:
 * - Every stroke (yours and KanjiVG's) is resampled to 32 points and the whole character is
 *   scaled to its own bounding box, so size and position don't matter.
 * - A stroke's score blends point-by-point distance (shape and direction) with nearest-point
 *   distance (shape only).
 * - Wrong stroke count, order or direction caps the character at 65%, which is a fail.
 */

export const PASS_PERCENT = 70;
const RESAMPLE_POINTS = 32;
const MISTAKE_CAP = 0.65;
// How forgiving the score is: distances up to TOLERANCE are perfect, and a stroke scores 0
// once it is TOLERANCE + FALLOFF away. Distances are relative to the character's size.
const TOLERANCE = 0.07;
const FALLOFF = 0.25;

/** The first mistake found, so the UI can explain why the score is low. */
export type Mistake =
  | { kind: 'none' }
  | { kind: 'nothingDrawn' }
  | { kind: 'strokeCount'; drawn: number; expected: number }
  | { kind: 'strokeOrder' }
  | { kind: 'strokeDirection' };

export interface CharacterScore {
  fraction: number; // 0 … 1
  mistake: Mistake;
}

const referenceCache = new Map<string, Stroke>();

/** The points of one KanjiVG stroke (cached: the same strokes are compared again and again). */
export function referenceStroke(pathData: string): Stroke {
  let stroke = referenceCache.get(pathData);
  if (!stroke) {
    stroke = svgPathToPoints(pathData);
    referenceCache.set(pathData, stroke);
  }
  return stroke;
}

function scoreOneStroke(drawn: Stroke, reference: Stroke): { score: number; reversed: boolean } {
  const forward = alignedDistance(drawn, reference);
  const backward = alignedDistance([...drawn].reverse(), reference);
  const blended = 0.4 * forward + 0.6 * nearestPointDistance(drawn, reference);
  let score = Math.max(0, 1 - Math.max(0, blended - TOLERANCE) / FALLOFF);
  // Drawn the wrong way round: it matches much better reversed. Very short strokes
  // (dots) are skipped, because their direction is hard to see and hard to draw.
  const reversed = backward < forward * 0.6 && strokeLength(reference) > 0.25;
  if (reversed) score *= 0.3;
  return { score, reversed };
}

/** True if this drawn stroke fits another reference stroke much better than its own. */
function looksLikeAnotherStroke(drawn: Stroke, ownIndex: number, references: Stroke[]): boolean {
  const ownDistance = alignedDistance(drawn, references[ownIndex] as Stroke);
  return references.some((other, otherIndex) => {
    if (otherIndex === ownIndex) return false;
    const otherDistance = alignedDistance(drawn, other);
    return otherDistance < 0.12 && otherDistance < ownDistance * 0.6;
  });
}

/** Scores the strokes drawn for one character against its KanjiVG strokes. */
export function scoreCharacter(drawnStrokes: Stroke[], referencePaths: string[]): CharacterScore {
  if (!drawnStrokes.length) return { fraction: 0, mistake: { kind: 'nothingDrawn' } };
  const drawn = normalizeStrokes(drawnStrokes.map((s) => resample(s, RESAMPLE_POINTS)));
  const references = normalizeStrokes(
    referencePaths.map((path) => resample(referenceStroke(path), RESAMPLE_POINTS)),
  );
  const sameCount = drawn.length === references.length;

  let total = 0;
  let reversedCount = 0;
  let wrongOrderCount = 0;
  references.forEach((reference, index) => {
    const stroke = drawn[index];
    if (!stroke) return; // a missing stroke scores 0
    const { score, reversed } = scoreOneStroke(stroke, reference);
    total += score;
    if (reversed) reversedCount++;
    if (sameCount && looksLikeAnotherStroke(stroke, index, references)) wrongOrderCount++;
  });
  const fraction = total / Math.max(drawn.length, references.length);

  if (!sameCount) {
    return {
      fraction: Math.min(fraction, MISTAKE_CAP),
      mistake: { kind: 'strokeCount', drawn: drawn.length, expected: references.length },
    };
  }
  if (wrongOrderCount) {
    return { fraction: Math.min(fraction, MISTAKE_CAP), mistake: { kind: 'strokeOrder' } };
  }
  if (reversedCount) {
    return { fraction: Math.min(fraction, MISTAKE_CAP), mistake: { kind: 'strokeDirection' } };
  }
  return { fraction, mistake: { kind: 'none' } };
}

export interface DrawingScore {
  percent: number; // 0 … 100, rounded: the average of the boxes
  boxPercents: number[]; // 0 … 100 per box (character)
  mistakes: Mistake[]; // one per character
}

/**
 * Scores a drawing of one or more characters, each in its own box (digraphs like きゃ use
 * two, words one per kana). Boxes go left to right in rows of `columns`. Each stroke belongs
 * to the box where it starts.
 */
export function scoreDrawing(
  drawnStrokes: Stroke[],
  referencePathsPerCharacter: string[][],
  boxWidth: number,
  columns = referencePathsPerCharacter.length,
): DrawingScore {
  const usable = drawnStrokes.filter((stroke) => stroke.length > 1);
  const lastBox = referencePathsPerCharacter.length - 1;
  const boxOf = (stroke: Stroke) => {
    const start = stroke[0] as { x: number; y: number };
    const column = Math.min(columns - 1, Math.max(0, Math.floor(start.x / boxWidth)));
    const row = Math.max(0, Math.floor(start.y / boxWidth));
    return Math.min(lastBox, row * columns + column);
  };
  const scores = referencePathsPerCharacter.map((paths, boxIndex) =>
    scoreCharacter(
      usable.filter((stroke) => boxOf(stroke) === boxIndex),
      paths,
    ),
  );
  const boxPercents = scores.map((score) => Math.round(score.fraction * 100));
  const average = scores.reduce((sum, score) => sum + score.fraction, 0) / scores.length;
  return {
    percent: Math.round(average * 100),
    boxPercents,
    mistakes: scores.map((score) => score.mistake),
  };
}
