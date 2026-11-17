import { z } from 'zod';
import { DEV_VISITOR_SECRET } from './visitor.js';

const EnvSchema = z
  .object({
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    // "production" turns on the rate limits and the Origin check, and refuses COOKIE_SECURE=false.
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // Must be "true" on any server reached over HTTPS, so the visitor cookie is never sent over plain
    // HTTP. Only "true" or "false": a typo such as "yes" fails at startup instead of meaning "false".
    COOKIE_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    // How many proxies sit in front of the app. 0 locally; 1 on any host with its own proxy.
    // A number, never "true": "true" would let a visitor forge X-Forwarded-For and dodge rate limits.
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
    // Where the built frontend lives. Unset (development, tests): serve no files at all.
    STATIC_DIR: z.string().min(1).optional(),
    // The PEM text of the database provider's own root certificate, for providers whose certificates
    // aren't signed by a public authority. Unset: Node's trusted authorities. Some host dashboards store
    // line breaks as a literal "\n"; turn those back into real ones so the PEM text stays valid.
    DATABASE_CA_CERT: z
      .string()
      .min(1)
      .transform((pem) => pem.replace(/\\n/g, '\n'))
      .optional(),
    // "true" only when the database is reached over the host's private network (Railway's
    // *.railway.internal, Render's internal URL, the self-hosted Compose network). It is what lets
    // production connect without TLS; anywhere else production insists on TLS.
    DATABASE_PRIVATE_NETWORK: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    // The key that signs the visitor cookie. Required in production: 32 or more random characters,
    // for example from `openssl rand -base64 48`. Unset elsewhere: a fixed development key.
    VISITOR_SECRET: z.string().min(32, 'must be at least 32 characters').optional(),
  })
  .superRefine((env, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    const production = env.NODE_ENV === 'production';

    if (production && !env.COOKIE_SECURE) {
      issue('COOKIE_SECURE', 'must be "true" in production (the site is reached over HTTPS)');
    }
    if (production && (!env.VISITOR_SECRET || env.VISITOR_SECRET === DEV_VISITOR_SECRET)) {
      issue('VISITOR_SECRET', 'must be set to your own random value in production');
    }

    // Never echo the URL in a message: it holds the database password.
    let params: URLSearchParams;
    try {
      params = new URL(env.DATABASE_URL).searchParams;
    } catch {
      return issue('DATABASE_URL', 'is not a valid URL');
    }

    // Every URL parameter pg reads for TLS. pg uses the LAST copy of a repeated parameter, so a check
    // that read only the first could be fooled by "?sslmode=verify-full&sslmode=disable".
    const tlsParams = [...new Set([...params.keys()].filter((key) => key.startsWith('ssl')))];
    for (const key of tlsParams) {
      if (params.getAll(key).length > 1) issue('DATABASE_URL', `${key} appears more than once`);
    }
    const sslmode = params.get('sslmode');
    // Only verify-full keeps verifying after a pg upgrade; require, prefer and verify-ca weaken in pg 9.
    if (sslmode !== null && sslmode !== 'verify-full') {
      issue(
        'DATABASE_URL',
        `sslmode=${sslmode} is not allowed: use sslmode=verify-full, or no sslmode on a private network`,
      );
    }
    // ssl=0 turns TLS off, and ssl=true is a vaguer spelling of verify-full: one way to say it is enough.
    if (params.has('ssl')) {
      issue('DATABASE_URL', 'the ssl parameter is not allowed: use sslmode=verify-full');
    }
    if (params.has('uselibpqcompat')) {
      issue('DATABASE_URL', 'uselibpqcompat is not allowed: it makes sslmode=require trust any certificate');
    }
    // pg lets the URL's settings replace the ssl options from code, so the CA would be silently dropped.
    if (env.DATABASE_CA_CERT && tlsParams.length > 0) {
      issue('DATABASE_URL', 'must carry no sslmode or other ssl parameter when DATABASE_CA_CERT is set');
    }
    // Without sslmode or a CA, pg connects in plain text. Fine on a private network; refused elsewhere
    // in production, so dropping "?sslmode=verify-full" from a public URL fails loudly.
    const tls = sslmode === 'verify-full' || env.DATABASE_CA_CERT !== undefined;
    if (production && !tls && !env.DATABASE_PRIVATE_NETWORK) {
      issue(
        'DATABASE_URL',
        'needs TLS in production: add ?sslmode=verify-full, set DATABASE_CA_CERT, or set ' +
          'DATABASE_PRIVATE_NETWORK=true if the database is on the host\'s private network',
      );
    }
  });

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment variables: ${problems}`);
  }
  return result.data;
}
