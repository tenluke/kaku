import { describe, expect, it } from 'vitest';
import { nextHintStep } from './hint';

describe('nextHintStep', () => {
  it('first tells the stroke count', () => {
    expect(nextHintStep(false, 0, 4)).toBe('strokeCount');
  });

  it('then shows strokes one by one', () => {
    expect(nextHintStep(true, 0, 4)).toBe('stroke');
    expect(nextHintStep(true, 3, 4)).toBe('stroke');
  });

  it('replays once every stroke is shown', () => {
    expect(nextHintStep(true, 4, 4)).toBe('replay');
  });
});
