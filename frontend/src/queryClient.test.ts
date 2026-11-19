import { describe, expect, it } from 'vitest';
import { ApiError } from './api/favorites';
import { createQueryClient, shouldRetry } from './queryClient';

describe('shouldRetry', () => {
  it('retries a network failure once', () => {
    expect(shouldRetry(0, new TypeError('fetch failed'))).toBe(true);
    expect(shouldRetry(1, new TypeError('fetch failed'))).toBe(false);
  });

  it('retries a 5xx once', () => {
    expect(shouldRetry(0, new ApiError(500, 'x'))).toBe(true);
    expect(shouldRetry(1, new ApiError(500, 'x'))).toBe(false);
  });

  it('never retries a 4xx', () => {
    expect(shouldRetry(0, new ApiError(429, 'x'))).toBe(false);
    expect(shouldRetry(0, new ApiError(404, 'x'))).toBe(false);
  });
});

describe('createQueryClient', () => {
  it('uses shouldRetry for queries', () => {
    expect(createQueryClient().getDefaultOptions().queries?.retry).toBe(shouldRetry);
  });
});
