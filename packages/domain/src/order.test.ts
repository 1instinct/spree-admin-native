import { describe, expect, it } from 'vitest';
import fixture from '../test/fixtures/order.json';
import { cityLine } from './address';
import { SpreeNumber } from './common';
import { fulfillmentStatus, needsAction, Order } from './order';

const base = Order.parse(fixture);

describe('Order schema', () => {
  it('parses a complete order', () => {
    expect(base.number).toBe('R482913057');
    expect(base.lineItems).toHaveLength(2);
    expect(base.payments[0]?.sourceSummary).toBe('Visa •••• 4242');
  });

  it('maps unknown states from newer Spree versions to "unknown" instead of failing', () => {
    const order = Order.parse({ ...fixture, state: 'awaiting_pickup', shipmentState: 'in_transit' });
    expect(order.state).toBe('unknown');
    expect(order.shipmentState).toBe('unknown');
  });

  it('keeps null order-level states on carts', () => {
    const cart = Order.parse({
      ...fixture,
      state: 'cart',
      paymentState: null,
      shipmentState: null,
      completedAt: null,
    });
    expect(cart.paymentState).toBeNull();
  });

  it('rejects malformed Spree numbers and float money', () => {
    expect(() => Order.parse({ ...fixture, number: '482913057' })).toThrow();
    expect(() => Order.parse({ ...fixture, total: { amount: 184, currency: 'USD' } })).toThrow();
  });
});

describe('SpreeNumber', () => {
  it.each(['R482913057', 'H38120471', 'P7K2M4ZD', 'RA123456789'])('accepts %s', (n) => {
    expect(SpreeNumber.parse(n)).toBe(n);
  });
  it.each(['r123', 'R12', '', '#R123456'])('rejects %s', (n) => {
    expect(() => SpreeNumber.parse(n)).toThrow();
  });
});

describe('fulfillmentStatus / needsAction', () => {
  it.each([
    [{ state: 'complete', shipmentState: 'ready' }, 'unfulfilled'],
    [{ state: 'complete', shipmentState: 'backorder' }, 'unfulfilled'],
    [{ state: 'complete', shipmentState: 'partial' }, 'partial'],
    [{ state: 'complete', shipmentState: 'shipped' }, 'fulfilled'],
    [{ state: 'canceled', shipmentState: 'ready' }, 'canceled'],
    [{ state: 'cart', shipmentState: null }, 'none'],
  ] as const)('%o → %s', (input, expected) => {
    expect(fulfillmentStatus(input)).toBe(expected);
  });

  it('flags paid-but-unshipped and unpaid completed orders only', () => {
    expect(needsAction(base)).toBe(true);
    expect(needsAction({ ...base, shipmentState: 'shipped' })).toBe(false);
    expect(needsAction({ ...base, shipmentState: 'shipped', paymentState: 'balance_due' })).toBe(true);
    expect(needsAction({ ...base, state: 'canceled' })).toBe(false);
  });
});

describe('cityLine', () => {
  it('formats city and region', () => {
    expect(cityLine(base.shipAddress!)).toBe('Portland, OR');
    expect(cityLine({ city: 'Berlin', stateCode: null, countryIso: 'DE' })).toBe('Berlin, DE');
  });
});
