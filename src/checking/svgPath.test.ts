import { describe, expect, it } from 'vitest';
import strokesN5 from '../data/generated/strokes-n5.json';
import { svgPathToPoints } from './svgPath';

const last = <T>(items: T[]): T => items[items.length - 1] as T;

describe('svgPathToPoints', () => {
  it('starts at M and ends at the end of a relative curve', () => {
    const points = svgPathToPoints('M10,20c0,0,10,0,10,10');
    expect(points[0]).toEqual({ x: 10, y: 20 });
    expect(last(points)).toEqual({ x: 20, y: 30 });
  });

  it('reads several curves after one command letter', () => {
    const points = svgPathToPoints('M0,0c0,0,1,1,1,1,0,0,1,1,1,1');
    expect(last(points)).toEqual({ x: 2, y: 2 });
  });

  it('mirrors the previous control point for S', () => {
    // A straight line drawn as C then S stays on the line y = x.
    const points = svgPathToPoints('M0,0C1,1,2,2,3,3S5,5,6,6');
    expect(last(points)).toEqual({ x: 6, y: 6 });
    points.forEach((point) => expect(point.y).toBeCloseTo(point.x));
  });

  it('reads numbers written without separators, like "1.6-0.16"', () => {
    const points = svgPathToPoints('M0,0c1.6-0.16,1.6-0.16,1.6-0.16');
    expect(last(points).x).toBeCloseTo(1.6);
    expect(last(points).y).toBeCloseTo(-0.16);
  });

  it('rejects commands KanjiVG does not use', () => {
    expect(() => svgPathToPoints('M0,0L5,5')).toThrow('Unsupported path command "L"');
  });

  it('reads every N5 stroke inside the 109 × 109 box', () => {
    for (const paths of Object.values(strokesN5)) {
      for (const path of paths) {
        for (const point of svgPathToPoints(path)) {
          expect(point.x).toBeGreaterThanOrEqual(0);
          expect(point.x).toBeLessThanOrEqual(109);
          expect(point.y).toBeGreaterThanOrEqual(0);
          expect(point.y).toBeLessThanOrEqual(109);
        }
      }
    }
  });
});
