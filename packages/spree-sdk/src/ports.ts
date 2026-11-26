import type { Fulfillment, Order, OrderListFilter, Page, Payment } from '@instincts/spree-domain';
import type { ApiFamily } from './capabilities/types';
import type { CompanionPort } from './companion';

export interface ListOrdersParams {
  filter: OrderListFilter;
  /** Free-text search: order number, email or name. */
  query?: string;
  cursor?: string | null;
  perPage?: number;
}

export type OrderRef = Pick<Order, 'id' | 'number'>;
export type FulfillmentRef = Pick<Fulfillment, 'id' | 'number'>;
export type PaymentRef = Pick<Payment, 'id' | 'number'>;

export interface RefundReason {
  id: string;
  name: string;
}

export interface RefundInput {
  payment: PaymentRef;
  /** Decimal string in the order's currency, e.g. "12.50". */
  amount: string;
  /** Defaults to the store's return-processing (or first) reason. */
  reasonId?: string | null;
}

/**
 * Orders: reads, plus the merchant's actions. Each action returns the order as it now is.
 * An action the store's API can't do throws a `capability` SpreeError; screens gate on the
 * store's capabilities (`orders.capture`, `shipments.ship`, `orders.cancel`, `orders.refund`).
 */
export interface OrdersPort {
  list(params: ListOrdersParams): Promise<Page<Order>>;
  /** By id or order number (`R123456789`). */
  get(idOrNumber: string): Promise<Order>;
  /** Mark a fulfillment (shipment) shipped, with an optional tracking number or link. */
  ship(order: OrderRef, fulfillment: FulfillmentRef, input?: { tracking?: string | null }): Promise<Order>;
  /** Capture an authorized payment in full. */
  capture(order: OrderRef, payment: PaymentRef): Promise<Order>;
  cancel(order: OrderRef): Promise<Order>;
  refund(order: OrderRef, input: RefundInput): Promise<Order>;
  refundReasons(): Promise<RefundReason[]>;
}

/** One Spree API family behind domain-typed ports. Screens and the router only see this. */
export interface SpreeAdapter {
  readonly family: ApiFamily;
  readonly orders: OrdersPort;
  /** Present when the store runs the spree_admin_native gem. */
  readonly companion?: CompanionPort;
}
