import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

export const VISITOR_COOKIE = 'ex3_visitor';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const VISITOR_MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000; // browsers cap cookie lifetimes at 400 days

// The visitor's ID, or undefined if there is no cookie or its value isn't one we could have issued.
// Only the first ex3_visitor cookie counts.
export function readVisitorId(req: Request): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== VISITOR_COOKIE) continue;
    const value = part.slice(separator + 1).trim();
    return UUID_V4.test(value) ? value : undefined;
  }
  return undefined;
}

// Only called by a like: the cookie is created on the first one, and every like renews its lifetime.
export function ensureVisitorId(req: Request, res: Response, { secure }: { secure: boolean }): string {
  const id = readVisitorId(req) ?? randomUUID();
  res.cookie(VISITOR_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure, path: '/api', maxAge: VISITOR_MAX_AGE_MS });
  return id;
}
