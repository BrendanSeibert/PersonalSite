import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';

const URL = 'postgres://u:p@localhost:5432/db';

describe('loadConfig', () => {
  it('parses a valid environment', () => {
    expect(loadConfig({ DATABASE_URL: URL, PORT: '4000' })).toEqual({
      DATABASE_URL: URL,
      PORT: 4000,
      COOKIE_SECURE: false,
    });
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('reads COOKIE_SECURE=%s as %s', (value, expected) => {
    expect(loadConfig({ DATABASE_URL: URL, COOKIE_SECURE: value }).COOKIE_SECURE).toBe(expected);
  });

  it('defaults COOKIE_SECURE to false for http://localhost', () => {
    expect(loadConfig({ DATABASE_URL: URL }).COOKIE_SECURE).toBe(false);
  });

  it.each(['yes', '1', 'TRUE', ''])('throws for COOKIE_SECURE=%j instead of guessing', (value) => {
    expect(() => loadConfig({ DATABASE_URL: URL, COOKIE_SECURE: value })).toThrow(
      /Invalid environment variables: COOKIE_SECURE/,
    );
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => loadConfig({ PORT: '3000' })).toThrow(/DATABASE_URL/);
  });

  it('throws when DATABASE_URL is empty', () => {
    expect(() => loadConfig({ DATABASE_URL: '' })).toThrow(/DATABASE_URL is required/);
  });

  it('defaults PORT to 3000 when missing', () => {
    expect(loadConfig({ DATABASE_URL: URL }).PORT).toBe(3000);
  });

  it.each(['abc', '', '0', '99999', '3000.5'])('throws for PORT=%j', (port) => {
    expect(() => loadConfig({ DATABASE_URL: URL, PORT: port })).toThrow(/Invalid environment variables: PORT/);
  });
});
