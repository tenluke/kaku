import type { Point } from './geometry';

/*
 * Turns the SVG path of a KanjiVG stroke into points along that stroke.
 *
 * KanjiVG strokes only use these SVG path commands:
 *   M x,y                  move to the start point
 *   C / c  6 numbers       cubic Bézier curve (capital = absolute, small = relative)
 *   S / s  4 numbers       smooth cubic curve: its first control point mirrors the
 *                          previous curve's last one
 * A command letter can be followed by several curves' worth of numbers.
 * Other commands are rejected, so new kinds of data can't be silently mis-read.
 */

const POINTS_PER_CURVE = 16; // enough for a smooth outline; strokes are resampled later anyway

type Token = string | number;

function tokenize(pathData: string): Token[] {
  // A number: optional minus, digits, optional decimals. "1.5-0.2" is two numbers.
  const parts = pathData.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)/g) ?? [];
  return parts.map((part) => (/[A-Za-z]/.test(part) ? part : Number(part)));
}

function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

export function svgPathToPoints(pathData: string): Point[] {
  const tokens = tokenize(pathData);
  const points: Point[] = [];
  let current: Point = { x: 0, y: 0 };
  let lastControl: Point | null = null; // second control point of the previous curve
  let command = '';
  let index = 0;

  const readNumber = (): number => {
    const token = tokens[index++];
    if (typeof token !== 'number') throw new Error(`Expected a number in path: ${pathData}`);
    return token;
  };
  const readPoint = (relative: boolean): Point => {
    const x = readNumber();
    const y = readNumber();
    return relative ? { x: current.x + x, y: current.y + y } : { x, y };
  };
  const addCurvePoints = (control1: Point, control2: Point, end: Point): void => {
    for (let step = 1; step <= POINTS_PER_CURVE; step++) {
      points.push(cubicPoint(current, control1, control2, end, step / POINTS_PER_CURVE));
    }
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (typeof token === 'string') {
      command = token;
      index++;
    }
    // A number right after a curve means another curve of the same kind.
    const relative = command === command.toLowerCase();
    switch (command.toUpperCase()) {
      case 'M':
        current = readPoint(relative);
        lastControl = null;
        points.push(current);
        break;
      case 'C': {
        const control1 = readPoint(relative);
        const control2 = readPoint(relative);
        const end = readPoint(relative);
        addCurvePoints(control1, control2, end);
        lastControl = control2;
        current = end;
        break;
      }
      case 'S': {
        const mirrored: Point = lastControl
          ? { x: 2 * current.x - lastControl.x, y: 2 * current.y - lastControl.y }
          : current;
        const control2 = readPoint(relative);
        const end = readPoint(relative);
        addCurvePoints(mirrored, control2, end);
        lastControl = control2;
        current = end;
        break;
      }
      default:
        throw new Error(`Unsupported path command "${command}" in: ${pathData}`);
    }
  }
  return points;
}
