// Basic geometry for comparing strokes. A stroke is the list of points a pen passed through.

export interface Point {
  x: number;
  y: number;
}

export type Stroke = Point[];

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Total length of the line through all points. */
export function strokeLength(points: readonly Point[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index++) {
    length += distance(points[index - 1] as Point, points[index] as Point);
  }
  return length;
}

/**
 * Returns `count` points spread evenly along the line, so two strokes drawn at different
 * speeds (and so with different numbers of points) can be compared point by point.
 */
export function resample(points: readonly Point[], count: number): Point[] {
  const first = points[0];
  if (!first) return [];
  if (points.length === 1) return Array.from({ length: count }, () => ({ ...first }));

  const cumulative = [0];
  for (let index = 1; index < points.length; index++) {
    const previousTotal = cumulative[index - 1] as number;
    cumulative.push(previousTotal + distance(points[index - 1] as Point, points[index] as Point));
  }
  const totalLength = cumulative[cumulative.length - 1] as number;

  const result: Point[] = [];
  let segment = 1;
  for (let sample = 0; sample < count; sample++) {
    const target = count === 1 ? 0 : (totalLength * sample) / (count - 1);
    while (segment < points.length - 1 && (cumulative[segment] as number) < target) segment++;
    const start = points[segment - 1] as Point;
    const end = points[segment] as Point;
    const segmentStart = cumulative[segment - 1] as number;
    const segmentLength = (cumulative[segment] as number) - segmentStart || 1;
    const fraction = Math.min(1, Math.max(0, (target - segmentStart) / segmentLength));
    result.push({
      x: start.x + (end.x - start.x) * fraction,
      y: start.y + (end.y - start.y) * fraction,
    });
  }
  return result;
}

/**
 * Moves and scales all strokes of one character together so their bounding box is centred
 * on (0, 0) with its longer side 1 long. After this, size and position on the canvas no
 * longer matter, only shape.
 */
export function normalizeStrokes(strokes: readonly Stroke[]): Stroke[] {
  const allPoints = strokes.flat();
  const xs = allPoints.map((point) => point.x);
  const ys = allPoints.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const size = Math.max(maxX - minX, maxY - minY, 1e-6); // avoid dividing by 0 for a single dot
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return strokes.map((stroke) =>
    stroke.map((point) => ({ x: (point.x - centerX) / size, y: (point.y - centerY) / size })),
  );
}

/** Average distance between the 1st point of A and the 1st of B, the 2nd and the 2nd, … */
export function alignedDistance(pointsA: readonly Point[], pointsB: readonly Point[]): number {
  let sum = 0;
  pointsA.forEach((point, index) => (sum += distance(point, pointsB[index] as Point)));
  return sum / pointsA.length;
}

/** Average distance from each point of `from` to the closest point of `to`. */
function oneWayNearestDistance(from: readonly Point[], to: readonly Point[]): number {
  let sum = 0;
  for (const point of from) sum += Math.min(...to.map((other) => distance(point, other)));
  return sum / from.length;
}

/**
 * How far apart two shapes are, ignoring the order of their points. Measured both ways
 * so a short stroke lying on top of a long one still counts as different.
 */
export function nearestPointDistance(pointsA: readonly Point[], pointsB: readonly Point[]): number {
  return (oneWayNearestDistance(pointsA, pointsB) + oneWayNearestDistance(pointsB, pointsA)) / 2;
}
