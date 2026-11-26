import { z } from 'zod';
import { Id, IsoDateTime, tolerantEnum } from './common';
import { Money } from './money';

export const ProductStatus = tolerantEnum(['active', 'draft', 'archived'] as const);

export const Variant = z.object({
  id: Id,
  sku: z.string().nullable(),
  optionsText: z.string().nullable(),
  isMaster: z.boolean(),
  price: Money.nullable(),
  compareAtPrice: Money.nullable(),
  /** null when inventory isn't tracked for this variant. */
  totalOnHand: z.number().int().nullable(),
  imageUrl: z.string().nullable(),
});
export type Variant = z.infer<typeof Variant>;

export const Product = z.object({
  id: Id,
  name: z.string(),
  slug: z.string(),
  status: ProductStatus,
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  variants: z.array(Variant),
  updatedAt: IsoDateTime,
});
export type Product = z.infer<typeof Product>;

/** Sellable variants: non-master when a product has options, otherwise the master. */
export function sellableVariants(product: Pick<Product, 'variants'>): Variant[] {
  const options = product.variants.filter((v) => !v.isMaster);
  return options.length > 0 ? options : product.variants;
}

export function isLowStock(variant: Pick<Variant, 'totalOnHand'>, threshold = 2): boolean {
  return variant.totalOnHand !== null && variant.totalOnHand <= threshold;
}
