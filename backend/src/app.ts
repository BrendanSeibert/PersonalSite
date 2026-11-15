import { STATUS_CODES } from 'node:http';
import express, { type ErrorRequestHandler, type Express } from 'express';
import { healthRouter, type Db } from './routes/health.js';

export function createApp({ db, extraRoutes }: { db: Db; extraRoutes?: (app: Express) => void }) {
  const app = express();
  app.disable('x-powered-by'); // don't advertise "Express" in every response
  app.use(express.json()); // 1. parse JSON request bodies
  app.use('/api', healthRouter(db)); // 2. real routes
  extraRoutes?.(app); // 3. test-only routes

  // 4. Not-found handler: only reached if no route above answered.
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // 5. Error handler: Express recognises it because it takes FOUR arguments.
  const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
    // 5a. Too late to send an error response: let Express close the connection.
    if (res.headersSent) return next(err);

    // 5b. Use the error's own status only if it is a real error status (400-599).
    const status =
      typeof err.status === 'number' && err.status >= 400 && err.status <= 599 ? err.status : 500;

    // 5c. Decide what the client is allowed to see.
    let message: string;
    if (status >= 500) {
      console.error(err); // full details go to the server log only
      message = 'Internal server error';
    } else if (err.expose === true) {
      message = err.message; // the library marked this message as safe to show
    } else {
      message = STATUS_CODES[status] ?? 'Request error'; // generic text, e.g. "Not Found"
    }
    res.status(status).json({ error: message });
  };
  app.use(errorHandler);

  return app;
}
