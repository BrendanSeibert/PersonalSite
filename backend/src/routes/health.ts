import { Router } from 'express';
import type { Db } from '../db.js';

export function healthRouter(db: Db): Router {
  const router = Router();
  router.get('/health', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok', db: 'up' });
    } catch (err) {
      // The browser only sees "down"; the reason goes to the server log.
      console.error('Health check: database query failed:', err instanceof Error ? err.message : err);
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  });
  return router;
}
