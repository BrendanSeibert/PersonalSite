import { http, HttpResponse } from 'msw';

// Default handlers: the happy path. Tests override them with server.use(...).
export const handlers = [http.get('/api/health', () => HttpResponse.json({ status: 'ok', db: 'up' }))];
