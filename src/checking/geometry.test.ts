import { describe, expect, it } from 'vitest';
import {
  alignedDistance,
  nearestPointDistance,
  normalizeStrokes,
  resample,
  strokeLength,
} from './geometry';

describe('strokeLength', () => {
  it('adds up the segments', () => {
    expect(
      strokeLength([
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        { x: 3, y: 10 },
      ]),
    ).toBe(11);
  });
});

describe('resample', () => {
  it('spreads points evenly, keeping both ends', () => {
    const points = resample(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 10, y: 0 },
      ],
      11,
    );
    expect(points).toHaveLength(11);
    points.forEach((point, index) => {
      expect(point.x).toBeCloseTo(index);
      expect(point.y).toBe(0);
    });
  });

  it('copies a single point', () => {
    expect(resample([{ x: 2, y: 3 }], 3)).toEqual([
      { x: 2, y: 3 },
      { x: 2, y: 3 },
      { x: 2, y: 3 },
    ]);
  });
});

describe('normalizeStrokes', () => {
  it('centres on (0, 0) and makes the longer side 1 long', () => {
    const [stroke] = normalizeStrokes([
      [
        { x: 100, y: 100 },
        { x: 300, y: 200 },
      ],
    ]);
    expect(stroke).toEqual([
      { x: -0.5, y: -0.25 },
      { x: 0.5, y: 0.25 },
    ]);
  });
});

describe('distances', () => {
  const line = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ];
  const reversed = [...line].reverse();

  it('aligned distance sees direction', () => {
    expect(alignedDistance(line, line)).toBe(0);
    expect(alignedDistance(line, reversed)).toBe(1);
  });

  it('nearest-point distance ignores direction', () => {
    expect(nearestPointDistance(line, reversed)).toBe(0);
  });
});
