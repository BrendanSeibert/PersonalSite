import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { readVisitorId } from './visitor.js';

// The site loads nothing from anywhere else: scripts, styles, images, fonts and fetches are all
// same-origin. `default-src 'none'` blocks anything this list forgets. No 'unsafe-inline': the
// Vite build has no inline script or style, and React sets styles through the CSSOM.
const CSP_DIRECTIVES = {
  'default-src': ["'none'"],
  'script-src': ["'self'"],
  'style-src': ["'self'"],
  'img-src': ["'self'", 'data:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'manifest-src': ["'self'"],
  'base-uri': ["'none'"],
  'form-action': ["'none'"],
  'frame-ancestors': ["'none'"],
  'object-src': ["'none'"],
} as const;

export const CSP = Object.entries(CSP_DIRECTIVES)
  .map(([name, values]) => `${name} ${values.join(' ')}`)
  .join(';'); // exported so the test can assert the exact header (Helmet joins with ";")

export const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), payment=(), usb=()';

// One day to start. Raise to a year (31_536_000) after a week of HTTPS without trouble;
// add includeSubDomains only once every subdomain of the domain serves HTTPS.
export const HSTS_MAX_AGE = 86_400;

export function securityHeaders({ https }: { https: boolean }): RequestHandler[] {
  const directives = Object.fromEntries(Object.entries(CSP_DIRECTIVES).map(([name, values]) => [name, [...values]]));
  const helmetHandler = helmet({
    contentSecurityPolicy: { useDefaults: false, directives },
    // Only meaningful (and only sent) over HTTPS.
    strictTransportSecurity: https ? { maxAge: HSTS_MAX_AGE, includeSubDomains: false } : false,
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
  });
  const permissions: RequestHandler = (_req, res, next) => {
    res.set('Permissions-Policy', PERMISSIONS_POLICY);
    next();
  };
  return [helmetHandler, permissions];
}

export type Limits = { reads: number; writes: number; newVisitors: number };

// reads: every /api request; a page load is three, so 600 in 15 minutes is forty page loads a minute.
// writes: likes and unlikes; enough to toggle every frog three times in 15 minutes.
// newVisitors: likes without a valid cookie, per hour; each would create a new visitor, so a new vote.
// The cookie is signed, so a script can't skip this limit with made-up IDs. 30 leaves room for many
// people behind one address (a mobile carrier, a campus, an office) while still capping one address
// at about 720 new visitors a day.
export const PRODUCTION_LIMITS: Limits = { reads: 600, writes: 60, newVisitors: 30 };

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const isWrite = (method: string) => method === 'PUT' || method === 'DELETE';

// Fresh counters on every call, so two apps (or two tests) never share a count.
export function createLimiters(limits: Limits, visitorSecret: string): RequestHandler[] {
  const common = {
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests' }, // the app's usual { error } shape
  } as const;
  return [
    rateLimit({ ...common, windowMs: FIFTEEN_MINUTES, limit: limits.reads }),
    rateLimit({ ...common, windowMs: FIFTEEN_MINUTES, limit: limits.writes, skip: (req) => !isWrite(req.method) }),
    // A like with a valid (signed) cookie is idempotent, so only likes without one can add votes. A real
    // person needs one every 400 days; a script dropping or forging its cookie needs one per like.
    rateLimit({
      ...common,
      windowMs: ONE_HOUR,
      limit: limits.newVisitors,
      skip: (req) => req.method !== 'PUT' || readVisitorId(req, visitorSecret) !== undefined,
    }),
  ];
}

// Browsers send Origin on every PUT and DELETE. One that names another site is refused.
// No Origin at all (curl, scripts) passes: such a request carries no visitor's cookie, and the limits cover it.
export const sameOriginWrites: RequestHandler = (req, res, next) => {
  const origin = req.get('origin');
  if (!isWrite(req.method) || origin === undefined) return next();
  let originHost: string | undefined;
  try {
    originHost = new URL(origin).host; // "null" and other junk throw
  } catch {
    originHost = undefined;
  }
  if (originHost !== req.get('host')) return void res.status(403).json({ error: 'Forbidden' });
  next();
};
