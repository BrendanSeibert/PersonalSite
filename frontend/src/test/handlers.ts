import { http } from 'msw';
import { answerFavorites } from './favoritesFake';

// Default handlers: the happy path. Tests override them with server.use(...).
export const handlers = [
  // The favorites endpoints, answered by the shared in-memory fake (reset after every test).
  http.all('/api/favorites/*', ({ request }) => answerFavorites(request.method, request.url)),
];
