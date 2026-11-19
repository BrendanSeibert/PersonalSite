import { describe, expect, it } from 'vitest';
import { parseTheme, resolveTheme, toggleTheme } from './theme';

describe('parseTheme', () => {
  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
  ])('accepts %s', (value, expected) => {
    expect(parseTheme(value)).toBe(expected);
  });

  it.each([null, '', 'Dark', ' dark', 'system', '<script>', 42])('rejects %j', (value) => {
    expect(parseTheme(value)).toBeNull();
  });
});

describe('resolveTheme', () => {
  it.each([
    ['light', true, 'light'],
    ['light', false, 'light'],
    ['dark', true, 'dark'],
    ['dark', false, 'dark'],
    [null, true, 'dark'],
    [null, false, 'light'],
  ] as const)('stored %s, prefers dark %s gives %s', (stored, prefersDark, expected) => {
    expect(resolveTheme(stored, prefersDark)).toBe(expected);
  });
});

describe('toggleTheme', () => {
  it('flips both ways', () => {
    expect(toggleTheme('light')).toBe('dark');
    expect(toggleTheme('dark')).toBe('light');
  });
});
