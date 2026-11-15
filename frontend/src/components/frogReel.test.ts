import { describe, expect, it } from 'vitest';
import { pickNextIndex, REPEATS, restingOffset, spinOffset } from './frogReel';

const COUNT = 20;
const indices = Array.from({ length: COUNT }, (_, i) => i);

describe('pickNextIndex', () => {
  it.each(indices)('stays in range and never repeats %i', (previous) => {
    for (let k = 0; k < 1000; k++) {
      const next = pickNextIndex(COUNT, previous, () => k / 1000);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(COUNT);
      expect(next).not.toBe(previous);
    }
  });

  it.each(indices)('picks each other entry exactly once over evenly spread randoms (previous %i)', (previous) => {
    const picks = Array.from({ length: COUNT - 1 }, (_, k) =>
      pickNextIndex(COUNT, previous, () => (k + 0.5) / (COUNT - 1)),
    );
    expect([...picks].sort((a, b) => a - b)).toEqual(indices.filter((i) => i !== previous));
  });

  it.each([1, 0.9999999999, -0.1])('stays in range for a random() of %d', (value) => {
    for (const previous of indices) {
      const next = pickNextIndex(COUNT, previous, () => value);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(COUNT);
      expect(next).not.toBe(previous);
    }
  });

  it('returns 0 when there is only one entry', () => {
    expect(pickNextIndex(1, 0)).toBe(0);
  });

  it.each([0, -1, 2.5])('throws for a count of %d', (count) => {
    expect(() => pickNextIndex(count, 0)).toThrow(RangeError);
  });

  it('never repeats with the default Math.random', () => {
    let previous = 0;
    for (let k = 0; k < 200; k++) {
      const next = pickNextIndex(COUNT, previous);
      expect(next).not.toBe(previous);
      previous = next;
    }
  });
});

describe('offsets', () => {
  it.each(indices)('put entry %i on the payline', (index) => {
    expect(restingOffset(index, COUNT) % COUNT).toBe(index);
    expect(spinOffset(index, COUNT) % COUNT).toBe(index);
  });

  it('always spin more than one full turn', () => {
    for (const a of indices) {
      for (const b of indices) {
        if (a !== b) expect(spinOffset(b, COUNT) - restingOffset(a, COUNT)).toBeGreaterThan(COUNT);
      }
    }
  });

  it('always leave rows above and below the payline', () => {
    expect(restingOffset(0, COUNT)).toBeGreaterThanOrEqual(1);
    expect(spinOffset(COUNT - 1, COUNT)).toBeLessThanOrEqual(COUNT * REPEATS - 2);
  });
});
