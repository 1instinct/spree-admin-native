import { z } from 'zod';

/** Opaque id. Spree 4.x sends numeric ids, Spree 6 sends prefixed ids; we never parse them. */
export const Id = z.string().min(1);
export type Id = z.infer<typeof Id>;

/**
 * Spree document numbers. Spree 4/5: orders `R123456789`, shipments `H12345678`, payments
 * `P7K2M4ZD`, return authorizations `RA123…`. Spree 6 numbers children after their order:
 * `R1029-F1` (fulfillment), `R1029-P1` (payment).
 */
export const SpreeNumber = z
  .string()
  .regex(/^[A-Z]{1,2}[A-Z0-9]{3,}(-[A-Z][A-Z0-9]*)?$/, 'Expected a Spree number like R123456789');

export const IsoDateTime = z.iso.datetime({ offset: true });

/**
 * A state enum that survives newer Spree versions: unknown values become `'unknown'`
 * instead of failing the whole order. Adapters keep the raw value for display if needed.
 */
export function tolerantEnum<const T extends readonly [string, ...string[]]>(values: T) {
  const known = new Set<string>(values);
  return z.preprocess(
    (v) => (typeof v === 'string' && known.has(v) ? v : 'unknown'),
    z.enum([...values, 'unknown'] as [T[number] | 'unknown', ...(T[number] | 'unknown')[]]),
  );
}

export interface Page<T> {
  items: T[];
  /** Opaque cursor for the next page, or null at the end. */
  nextCursor: string | null;
  totalCount?: number;
}
