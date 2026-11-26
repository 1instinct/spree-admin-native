import { z } from 'zod';
import { Address } from './address';
import { Id, IsoDateTime } from './common';
import { Money } from './money';

export const Customer = z.object({
  id: Id,
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  ordersCount: z.number().int().nonnegative().nullable(),
  totalSpent: Money.nullable(),
  createdAt: IsoDateTime,
  defaultAddress: Address.nullable(),
});
export type Customer = z.infer<typeof Customer>;

export function displayName(c: Pick<Customer, 'firstName' | 'lastName' | 'email'>): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  return name || c.email;
}
