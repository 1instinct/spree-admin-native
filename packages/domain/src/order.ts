import { z } from 'zod';
import { Address } from './address';
import { Id, IsoDateTime, SpreeNumber, tolerantEnum } from './common';
import { Money } from './money';

export const OrderState = tolerantEnum([
  'cart',
  'address',
  'delivery',
  'payment',
  'confirm',
  'complete',
  'canceled',
  'returned',
  'awaiting_return',
  'resumed',
] as const);
/** Order-level payment state. Spree leaves it null on carts. */
export const OrderPaymentState = tolerantEnum([
  'balance_due',
  'paid',
  'credit_owed',
  'failed',
  'void',
] as const);
/** Order-level shipment state (rolled up from its shipments). */
export const OrderShipmentState = tolerantEnum([
  'pending',
  'ready',
  'partial',
  'shipped',
  'backorder',
  'canceled',
] as const);
export const ShipmentState = tolerantEnum(['pending', 'ready', 'shipped', 'canceled'] as const);
export const PaymentState = tolerantEnum([
  'checkout',
  'pending',
  'processing',
  'completed',
  'failed',
  'void',
  'invalid',
] as const);

export const LineItem = z.object({
  id: Id,
  variantId: Id,
  name: z.string(),
  sku: z.string().nullable(),
  optionsText: z.string().nullable(),
  quantity: z.number().int().nonnegative(),
  price: Money,
  total: Money,
  imageUrl: z.string().nullable(),
});
export type LineItem = z.infer<typeof LineItem>;

export const Shipment = z.object({
  id: Id,
  number: SpreeNumber,
  state: ShipmentState,
  trackingNumber: z.string().nullable(),
  trackingUrl: z.string().nullable(),
  shippedAt: IsoDateTime.nullable(),
  shippingMethodName: z.string().nullable(),
  stockLocationName: z.string().nullable(),
  cost: Money,
  lineItemIds: z.array(Id),
});
export type Shipment = z.infer<typeof Shipment>;

export const Payment = z.object({
  id: Id,
  number: SpreeNumber,
  state: PaymentState,
  amount: Money,
  methodName: z.string().nullable(),
  /** e.g. "Visa •••• 4242". */
  sourceSummary: z.string().nullable(),
  createdAt: IsoDateTime,
});
export type Payment = z.infer<typeof Payment>;

export const OrderCustomer = z.object({ id: Id, email: z.string() });

export const Order = z.object({
  id: Id,
  number: SpreeNumber,
  state: OrderState,
  paymentState: OrderPaymentState.nullable(),
  shipmentState: OrderShipmentState.nullable(),
  email: z.string().nullable(),
  customer: OrderCustomer.nullable(),
  currency: z.string().length(3),
  itemCount: z.number().int().nonnegative(),
  itemTotal: Money,
  shipTotal: Money,
  taxTotal: Money,
  promoTotal: Money,
  total: Money,
  completedAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  billAddress: Address.nullable(),
  shipAddress: Address.nullable(),
  lineItems: z.array(LineItem),
  shipments: z.array(Shipment),
  payments: z.array(Payment),
});
export type Order = z.infer<typeof Order>;

/** The order list filters both adapters must support. */
export const OrderListFilter = z.enum(['unfulfilled', 'unpaid', 'open', 'all']);
export type OrderListFilter = z.infer<typeof OrderListFilter>;

export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled' | 'canceled' | 'none';

/** What the merchant sees on the order badge, derived from order-level states. */
export function fulfillmentStatus(order: Pick<Order, 'state' | 'shipmentState'>): FulfillmentStatus {
  if (order.state === 'canceled' || order.shipmentState === 'canceled') return 'canceled';
  switch (order.shipmentState) {
    case 'shipped':
      return 'fulfilled';
    case 'partial':
      return 'partial';
    case 'ready':
    case 'pending':
    case 'backorder':
      return 'unfulfilled';
    default:
      return 'none';
  }
}

/** True when a completed order is waiting on the merchant: unpaid, or paid but not shipped. */
export function needsAction(order: Pick<Order, 'state' | 'paymentState' | 'shipmentState'>): boolean {
  if (order.state !== 'complete') return false;
  return (
    order.paymentState === 'balance_due' ||
    order.paymentState === 'failed' ||
    fulfillmentStatus(order) === 'unfulfilled' ||
    fulfillmentStatus(order) === 'partial'
  );
}
