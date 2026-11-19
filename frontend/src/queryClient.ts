import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/favorites';

// Reads retry once, for a network blip or a 5xx, so a dead API shows "unavailable" within about
// a second instead of about 7 (the default is 3 retries with backoff). Never on a 4xx: a 429
// means slow down, and a 404 won't change on a retry. Saves (mutations) keep the default, no retry.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

export const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } });
