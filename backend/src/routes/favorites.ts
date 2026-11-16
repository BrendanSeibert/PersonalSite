import { Router, type Response } from 'express';
import type { Db } from '../db.js';
import { ensureVisitorId, readVisitorId } from '../visitor.js';

export const TOP_FAVORITES = 10; // how many frogs All Time Favorites shows (not how many exist)
const FROG_ID = /^[a-z0-9]{1,32}$/; // the frogs.id format: junk never reaches the database
const FOREIGN_KEY_VIOLATION = '23503'; // PostgreSQL's code: the frog was removed mid-request

async function frogExists(db: Db, entryId: string): Promise<boolean> {
  if (!FROG_ID.test(entryId)) return false;
  const { rows } = await db.query('SELECT 1 FROM frogs WHERE id = $1', [entryId]);
  return rows.length > 0;
}

async function countFor(db: Db, entryId: string): Promise<number> {
  const { rows } = await db.query('SELECT COUNT(*)::int AS count FROM favorites WHERE entry_id = $1', [entryId]);
  return (rows[0] as { count: number }).count;
}

const unknownFrog = (res: Response) => void res.status(404).json({ error: 'Unknown frog' });

export function favoritesRouter(db: Db, { cookieSecure }: { cookieSecure: boolean }): Router {
  const router = Router();
  router.use('/favorites', (_req, res, next) => {
    res.set('Cache-Control', 'no-store'); // per-visitor and always changing: never cache
    next();
  });

  // Your favorites, in the frogs' display order. No cookie: an empty list, and no cookie is created.
  router.get('/favorites/mine', async (req, res) => {
    const visitor = readVisitorId(req);
    if (!visitor) return void res.json({ entryIds: [] });
    const { rows } = await db.query(
      `SELECT f.entry_id FROM favorites f JOIN frogs ON frogs.id = f.entry_id
       WHERE f.visitor_id = $1 ORDER BY frogs.position`,
      [visitor],
    );
    res.json({ entryIds: rows.map((row) => (row as { entry_id: string }).entry_id) });
  });

  // The most-liked frogs, most first, ties in display order. Only frogs with at least one like.
  router.get('/favorites/top', async (_req, res) => {
    const { rows } = await db.query(
      `SELECT f.entry_id, COUNT(*)::int AS count FROM favorites f JOIN frogs ON frogs.id = f.entry_id
       GROUP BY f.entry_id, frogs.position ORDER BY count DESC, frogs.position LIMIT $1`,
      [TOP_FAVORITES],
    );
    const top = rows.map((row) => row as { entry_id: string; count: number });
    res.json({ top: top.map(({ entry_id, count }) => ({ entryId: entry_id, count })) });
  });

  // Like: idempotent, so a retry or a double click never counts twice. The frog is checked first,
  // so asking for a made-up frog never creates a visitor cookie.
  router.put('/favorites/:entryId', async (req, res) => {
    const { entryId } = req.params;
    if (!(await frogExists(db, entryId))) return unknownFrog(res);
    const visitor = ensureVisitorId(req, res, { secure: cookieSecure });
    try {
      await db.query('INSERT INTO favorites (visitor_id, entry_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
        visitor,
        entryId,
      ]);
    } catch (err) {
      if ((err as { code?: string }).code === FOREIGN_KEY_VIOLATION) return unknownFrog(res);
      throw err;
    }
    res.json({ entryId, favorited: true, count: await countFor(db, entryId) });
  });

  // Unlike: removes only this visitor's like. No cookie: nothing to remove, and none is created.
  router.delete('/favorites/:entryId', async (req, res) => {
    const { entryId } = req.params;
    if (!(await frogExists(db, entryId))) return unknownFrog(res);
    const visitor = readVisitorId(req);
    if (visitor) await db.query('DELETE FROM favorites WHERE visitor_id = $1 AND entry_id = $2', [visitor, entryId]);
    res.json({ entryId, favorited: false, count: await countFor(db, entryId) });
  });

  return router;
}
