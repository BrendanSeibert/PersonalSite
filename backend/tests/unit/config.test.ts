import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { DEV_VISITOR_SECRET } from '../../src/visitor.js';

const URL = 'postgres://u:p@localhost:5432/db';
const SECRET = 'a-real-production-secret-of-48-random-characters';
// A production environment that passes every rule; each test changes one thing.
const PROD = {
  DATABASE_URL: `${URL}?sslmode=verify-full`,
  NODE_ENV: 'production',
  COOKIE_SECURE: 'true',
  VISITOR_SECRET: SECRET,
};

describe('loadConfig', () => {
  it('parses a valid environment', () => {
    expect(loadConfig({ DATABASE_URL: URL, PORT: '4000' })).toEqual({
      DATABASE_URL: URL,
      PORT: 4000,
      NODE_ENV: 'development',
      COOKIE_SECURE: false,
      TRUST_PROXY: 0,
      DATABASE_PRIVATE_NETWORK: false,
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

  it('reads a complete production environment', () => {
    const config = loadConfig(PROD);
    expect(config.NODE_ENV).toBe('production');
    expect(config.COOKIE_SECURE).toBe(true);
    expect(config.VISITOR_SECRET).toBe(SECRET);
  });

  it.each([
    ['unset', {}],
    ['the development key', { VISITOR_SECRET: DEV_VISITOR_SECRET }],
  ])('refuses production with VISITOR_SECRET %s', (_name, extra) => {
    const env: Record<string, string> = { ...PROD, ...extra };
    if (!('VISITOR_SECRET' in extra)) delete env.VISITOR_SECRET;
    expect(() => loadConfig(env)).toThrow(/VISITOR_SECRET: must be set to your own random value in production/);
  });

  it('refuses a VISITOR_SECRET shorter than 32 characters, in any environment', () => {
    expect(() => loadConfig({ DATABASE_URL: URL, VISITOR_SECRET: 'short' })).toThrow(
      /VISITOR_SECRET: must be at least 32 characters/,
    );
  });

  it('leaves VISITOR_SECRET unset outside production (the app uses the development key)', () => {
    expect(loadConfig({ DATABASE_URL: URL }).VISITOR_SECRET).toBeUndefined();
  });

  it('refuses a plain-text database connection in production', () => {
    expect(() => loadConfig({ ...PROD, DATABASE_URL: URL })).toThrow(/DATABASE_URL: needs TLS in production/);
  });

  it.each([
    ['sslmode=verify-full', { DATABASE_URL: `${URL}?sslmode=verify-full` }],
    ['DATABASE_CA_CERT', { DATABASE_URL: URL, DATABASE_CA_CERT: 'PEM' }],
    ['DATABASE_PRIVATE_NETWORK=true', { DATABASE_URL: URL, DATABASE_PRIVATE_NETWORK: 'true' }],
  ])('accepts a production database reached with %s', (_name, extra) => {
    expect(() => loadConfig({ ...PROD, ...extra })).not.toThrow();
  });

  it('allows a plain-text database outside production (the dev and test stacks)', () => {
    expect(loadConfig({ DATABASE_URL: URL }).DATABASE_PRIVATE_NETWORK).toBe(false);
  });

  it.each(['yes', '1', ''])('throws for DATABASE_PRIVATE_NETWORK=%j instead of guessing', (value) => {
    expect(() => loadConfig({ DATABASE_URL: URL, DATABASE_PRIVATE_NETWORK: value })).toThrow(
      /Invalid environment variables: DATABASE_PRIVATE_NETWORK/,
    );
  });

  it.each([{ COOKIE_SECURE: 'false' }, {}])('refuses production without a Secure cookie (%j)', (extra) => {
    expect(() => loadConfig({ DATABASE_URL: URL, NODE_ENV: 'production', ...extra })).toThrow(
      /COOKIE_SECURE.*production/,
    );
  });

  it('throws for an unknown NODE_ENV', () => {
    expect(() => loadConfig({ DATABASE_URL: URL, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('reads TRUST_PROXY as a hop count', () => {
    expect(loadConfig({ DATABASE_URL: URL, TRUST_PROXY: '1' }).TRUST_PROXY).toBe(1);
  });

  it.each(['true', '-1', '1.5'])('throws for TRUST_PROXY=%j', (value) => {
    expect(() => loadConfig({ DATABASE_URL: URL, TRUST_PROXY: value })).toThrow(
      /Invalid environment variables: TRUST_PROXY/,
    );
  });

  it('reads STATIC_DIR and refuses an empty one', () => {
    expect(loadConfig({ DATABASE_URL: URL, STATIC_DIR: '/app/public' }).STATIC_DIR).toBe('/app/public');
    expect(() => loadConfig({ DATABASE_URL: URL, STATIC_DIR: '' })).toThrow(/STATIC_DIR/);
  });

  it('accepts sslmode=verify-full', () => {
    const url = `${URL}?sslmode=verify-full`;
    expect(loadConfig({ DATABASE_URL: url }).DATABASE_URL).toBe(url);
  });

  it.each(['require', 'prefer', 'verify-ca', 'no-verify', 'disable'])('throws for sslmode=%s', (mode) => {
    expect(() => loadConfig({ DATABASE_URL: `${URL}?sslmode=${mode}` })).toThrow(
      new RegExp(`sslmode=${mode} is not allowed`),
    );
  });

  it('throws for uselibpqcompat', () => {
    expect(() => loadConfig({ DATABASE_URL: `${URL}?sslmode=verify-full&uselibpqcompat=true` })).toThrow(
      /uselibpqcompat is not allowed/,
    );
  });

  it('accepts DATABASE_CA_CERT with a URL without sslmode', () => {
    expect(loadConfig({ DATABASE_URL: URL, DATABASE_CA_CERT: 'PEM' }).DATABASE_CA_CERT).toBe('PEM');
  });

  it.each(['sslmode=verify-full', 'sslrootcert=/ca.pem', 'sslcert=/c.pem', 'sslnegotiation=direct'])(
    'refuses DATABASE_CA_CERT together with %s',
    (param) => {
      expect(() => loadConfig({ DATABASE_URL: `${URL}?${param}`, DATABASE_CA_CERT: 'PEM' })).toThrow(
        /must carry no sslmode or other ssl parameter when DATABASE_CA_CERT is set/,
      );
    },
  );

  it('turns literal \\n in DATABASE_CA_CERT back into line breaks', () => {
    const stored = '-----BEGIN CERTIFICATE-----\\nMIIB\\nabc=\\n-----END CERTIFICATE-----';
    expect(loadConfig({ DATABASE_URL: URL, DATABASE_CA_CERT: stored }).DATABASE_CA_CERT).toBe(
      '-----BEGIN CERTIFICATE-----\nMIIB\nabc=\n-----END CERTIFICATE-----',
    );
  });

  it('keeps real line breaks in DATABASE_CA_CERT as they are', () => {
    const pem = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';
    expect(loadConfig({ DATABASE_URL: URL, DATABASE_CA_CERT: pem }).DATABASE_CA_CERT).toBe(pem);
  });

  it.each([
    // pg uses the last copy, so these would really connect with the second value.
    'sslmode=verify-full&sslmode=disable',
    'sslmode=verify-full&sslmode=verify-full',
    'sslrootcert=/a.pem&sslrootcert=/b.pem',
  ])('refuses a repeated TLS parameter (%s)', (query) => {
    expect(() => loadConfig({ DATABASE_URL: `${URL}?${query}` })).toThrow(/appears more than once/);
  });

  it.each(['ssl=true', 'ssl=1', 'ssl=0', 'sslmode=verify-full&ssl=0'])('refuses the ssl parameter (%s)', (query) => {
    expect(() => loadConfig({ DATABASE_URL: `${URL}?${query}` })).toThrow(/the ssl parameter is not allowed/);
  });

  it('throws for a DATABASE_URL that is not a URL', () => {
    expect(() => loadConfig({ DATABASE_URL: 'not a url' })).toThrow(/not a valid URL/);
  });

  it.each([
    'postgres://u:hunter2secret@localhost:5432/db?sslmode=require',
    'postgres://u:hunter2secret@localhost:5432/db?uselibpqcompat=true',
    'postgres://u:hunter2secret@exa mple/db',
  ])('never prints the password in an error (%s)', (url) => {
    let message = '';
    try {
      loadConfig({ DATABASE_URL: url });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toMatch(/Invalid environment variables: DATABASE_URL/);
    expect(message).not.toContain('hunter2secret');
  });
});
