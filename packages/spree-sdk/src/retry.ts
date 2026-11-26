import { isSpreeError, type SpreeErrorKind } from './errors';

export const MAX_RETRIES = 3;
export const BASE_DELAY_MS = 1000;
export const MAX_DELAY_MS = 30_000;

const RETRYABLE: ReadonlySet<SpreeErrorKind> = new Set(['timeout', 'network', 'rateLimited', 'server']);

export function isRetryable(error: unknown): boolean {
  return isSpreeError(error) && RETRYABLE.has(error.kind);
}

/** TanStack Query `retry`: failureCount counts failures before this one. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_RETRIES && isRetryable(error);
}

/** Exponential backoff with equal jitter, never shorter than the server's Retry-After. */
export function retryDelayFor(attempt: number, error: unknown, random: () => number = Math.random): number {
  const exp = BASE_DELAY_MS * 2 ** Math.max(0, attempt);
  const jittered = exp / 2 + random() * (exp / 2);
  const retryAfter = isSpreeError(error) && error.retryAfterMs !== undefined ? error.retryAfterMs : 0;
  return Math.min(MAX_DELAY_MS, Math.round(Math.max(jittered, retryAfter)));
}
