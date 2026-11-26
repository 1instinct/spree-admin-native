import { describe, expect, it } from 'vitest';
import { SpreeError } from './errors';
import { retryDelayFor, shouldRetry } from './retry';

describe('retry policy', () => {
  it('retries transient failures up to 3 times', () => {
    const e = new SpreeError({ kind: 'server', status: 502 });
    expect(shouldRetry(0, e)).toBe(true);
    expect(shouldRetry(3, e)).toBe(false);
  });
  it('never retries refusals', () => {
    expect(shouldRetry(0, new SpreeError({ kind: 'invalid', status: 422 }))).toBe(false);
    expect(shouldRetry(0, new SpreeError({ kind: 'auth', status: 401 }))).toBe(false);
    expect(shouldRetry(0, new Error('boom'))).toBe(false);
  });
  it('honours Retry-After and caps the delay', () => {
    const e = new SpreeError({ kind: 'rateLimited', status: 429, retryAfterMs: 9000 });
    expect(retryDelayFor(0, e, () => 0)).toBe(9000);
    expect(retryDelayFor(10, new SpreeError({ kind: 'server', status: 500 }), () => 1)).toBe(30_000);
  });
});
