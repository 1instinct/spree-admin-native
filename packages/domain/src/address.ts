import { z } from 'zod';

export const Address = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  company: z.string().nullable(),
  address1: z.string(),
  address2: z.string().nullable(),
  city: z.string(),
  zipcode: z.string().nullable(),
  phone: z.string().nullable(),
  stateCode: z.string().nullable(),
  stateName: z.string().nullable(),
  countryIso: z.string().length(2),
});
export type Address = z.infer<typeof Address>;

/** "Portland, OR" style one-liner for list rows and notifications. */
export function cityLine(address: Pick<Address, 'city' | 'stateCode' | 'countryIso'>): string {
  return [address.city, address.stateCode ?? address.countryIso].filter(Boolean).join(', ');
}
