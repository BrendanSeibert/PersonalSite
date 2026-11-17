import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

export const VISITOR_COOKIE = 'ex3_visitor';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const VISITOR_MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000; // browsers cap cookie lifetimes at 400 days

// The signing key for development and tests only. config.ts refuses it in production, where
// VISITOR_SECRET must be set: anyone who knows the key can mint visitors, and so votes.
export const DEV_VISITOR_SECRET = 'ex3-development-only-visitor-secret-not-for-production';

// The cookie holds "<uuid>.<signature>". Only the server can make a signature that matches, so a
// script can't invent fresh visitors (fresh votes) by sending made-up UUIDs.
const signature = (id: string, secret: string) => createHmac('sha256', secret).update(id).digest('base64url');

export const signVisitorId = (id: string, secret: string) => `${id}.${signature(id, secret)}`;

function verify(value: string, secret: string): string | undefined {
  const dot = value.indexOf('.');
  if (dot === -1) return undefined;
  const id = value.slice(0, dot);
  if (!UUID_V4.test(id)) return undefined;
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(signature(id, secret));
  // Constant time, so the signature can't be guessed one character at a time.
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : undefined;
}

// The visitor's ID, or undefined if there is no cookie or its value isn't one we issued.
// Only the first ex3_visitor cookie counts.
export function readVisitorId(req: Request, secret: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== VISITOR_COOKIE) continue;
    return verify(part.slice(separator + 1).trim(), secret);
  }
  return undefined;
}

// Only called by a like: the cookie is created on the first one, and every like renews its lifetime.
export function ensureVisitorId(
  req: Request,
  res: Response,
  { secure, secret }: { secure: boolean; secret: string },
): string {
  const id = readVisitorId(req, secret) ?? randomUUID();
  res.cookie(VISITOR_COOKIE, signVisitorId(id, secret), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/api',
    maxAge: VISITOR_MAX_AGE_MS,
  });
  return id;
}
