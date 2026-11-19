import { describe, expect, it } from 'vitest';
import { nextTab, type Mode } from './favoritesTabs';

describe('nextTab', () => {
  const cases: [Mode, string, Mode | undefined][] = [
    ['mine', 'ArrowRight', 'allTime'],
    ['allTime', 'ArrowRight', 'mine'],
    ['mine', 'ArrowLeft', 'allTime'],
    ['allTime', 'ArrowLeft', 'mine'],
    ['mine', 'Home', 'mine'],
    ['allTime', 'Home', 'mine'],
    ['mine', 'End', 'allTime'],
    ['allTime', 'End', 'allTime'],
    ['mine', 'a', undefined],
    ['mine', 'Enter', undefined],
  ];
  it.each(cases)('from %s, %s gives %s', (current, key, expected) => {
    expect(nextTab(current, key)).toBe(expected);
  });
});
