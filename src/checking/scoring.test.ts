import { describe, expect, it } from 'vitest';
import strokesKana from '../data/generated/strokes-kana.json';
import strokesN5 from '../data/generated/strokes-n5.json';
import type { Stroke } from './geometry';
import { referenceStroke, scoreCharacter, scoreDrawing } from './scoring';

const BOX = 400;
const pathsOf = (character: string): string[] => {
  const paths =
    (strokesN5 as Record<string, string[]>)[character] ??
    (strokesKana as Record<string, string[]>)[character];
  if (!paths) throw new Error(`No strokes for ${character}`);
  return paths;
};

/** Pretends a user traced the KanjiVG strokes on a 400 × 400 canvas, moved by the offsets. */
function traced(character: string, scale = BOX / 109, offsetX = 0, offsetY = 0): Stroke[] {
  return pathsOf(character).map((path) =>
    referenceStroke(path).map((point) => ({
      x: point.x * scale + offsetX,
      y: point.y * scale + offsetY,
    })),
  );
}

describe('scoreCharacter', () => {
  it('gives a near-perfect score for the correct strokes', () => {
    const score = scoreCharacter(traced('日'), pathsOf('日'));
    expect(score.fraction).toBeGreaterThan(0.95);
    expect(score.mistake).toEqual({ kind: 'none' });
  });

  it('ignores size and position', () => {
    const small = traced('日', 1).map((s) => s.map((p) => ({ x: p.x + 150, y: p.y + 50 })));
    expect(scoreCharacter(small, pathsOf('日')).fraction).toBeGreaterThan(0.95);
  });

  it('notices a missing stroke', () => {
    const score = scoreCharacter(traced('日').slice(0, 3), pathsOf('日'));
    expect(score.mistake).toEqual({ kind: 'strokeCount', drawn: 3, expected: 4 });
    expect(score.fraction).toBeLessThanOrEqual(0.65);
  });

  it('notices two strokes drawn in the wrong order', () => {
    const [one, two, three, four] = traced('日') as Stroke[];
    const score = scoreCharacter([one, two, four, three] as Stroke[], pathsOf('日'));
    expect(score.mistake).toEqual({ kind: 'strokeOrder' });
    expect(score.fraction).toBeLessThanOrEqual(0.65);
  });

  it('notices a stroke drawn the wrong way round', () => {
    const strokes = traced('一');
    const score = scoreCharacter([[...(strokes[0] as Stroke)].reverse()], pathsOf('一'));
    expect(score.mistake).toEqual({ kind: 'strokeDirection' });
    expect(score.fraction).toBeLessThanOrEqual(0.65);
  });

  it('fails a different character with the same stroke count', () => {
    // 十 and 八 both have 2 strokes.
    expect(scoreCharacter(traced('十'), pathsOf('八')).fraction).toBeLessThan(0.7);
  });

  it('scores 0 when nothing was drawn', () => {
    expect(scoreCharacter([], pathsOf('日'))).toEqual({
      fraction: 0,
      mistake: { kind: 'nothingDrawn' },
    });
  });
});

describe('scoreDrawing', () => {
  it('passes a digraph drawn in two boxes', () => {
    const drawing = [...traced('き'), ...traced('ゃ', BOX / 109, BOX)];
    const score = scoreDrawing(drawing, [pathsOf('き'), pathsOf('ゃ')], BOX);
    expect(score.percent).toBeGreaterThanOrEqual(90);
    expect(score.mistakes).toEqual([{ kind: 'none' }, { kind: 'none' }]);
  });

  it('fails a digraph with everything in the first box', () => {
    const drawing = [...traced('き'), ...traced('ゃ')];
    const score = scoreDrawing(drawing, [pathsOf('き'), pathsOf('ゃ')], BOX);
    expect(score.percent).toBeLessThan(70);
    expect(score.mistakes[1]).toEqual({ kind: 'nothingDrawn' });
  });

  it('scores each box, with boxes in rows', () => {
    // い ぬ / ね in two columns: ね starts the second row.
    const drawing = [
      ...traced('い'),
      ...traced('ぬ', BOX / 109, BOX),
      ...traced('く', BOX / 109, 0, BOX),
    ];
    const score = scoreDrawing(drawing, [pathsOf('い'), pathsOf('ぬ'), pathsOf('ね')], BOX, 2);
    expect(score.boxPercents[0]).toBeGreaterThanOrEqual(90);
    expect(score.boxPercents[1]).toBeGreaterThanOrEqual(90);
    expect(score.boxPercents[2]).toBeLessThan(70); // く drawn where ね was asked
  });

  it('ignores taps (strokes of a single point)', () => {
    const drawing = [...traced('一'), [{ x: 10, y: 10 }]];
    expect(scoreDrawing(drawing, [pathsOf('一')], BOX).mistakes).toEqual([{ kind: 'none' }]);
  });
});
