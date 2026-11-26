import { describe, expect, it } from 'vitest';
import fixture from '../test/fixtures/order.json';
import { cityLine } from './address';
import { SpreeNumber } from './common';
import { Order, needsAction } from './order';

const base = Order.parse(fixture);

describe('Order schema', () => {
  it('parses a placed order', () => {
    expect(base.number).toBe('R482913057');
    expect(base.lineItems).toHaveLength(2);
    expect(base.fulfillments[0]?.items).toEqual([
      { lineItemId: '1', quantity: 1 },
      { lineItemId: '2', quantity: 2 },
    ]);
    expect(base.payments[0]?.sourceSummary).toBe('Visa •••• 4242');
  });

  it('maps unknown statuses from newer Spree versions to "unknown" instead of failing', () => {
    const order = Order.parse({ ...fixture, status: 'archived', fulfillmentStatus: 'in_transit', paymentStatus: 'disputed' });
    expect([order.status, order.fulfillmentStatus, order.paymentStatus]).toEqual(['unknown', 'unknown', 'unknown']);
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

describe('needsAction', () => {
  it.each([
    [{ paymentStatus: 'paid', fulfillmentStatus: 'unfulfilled' }, true],
    [{ paymentStatus: 'paid', fulfillmentStatus: 'partial' }, true],
    [{ paymentStatus: 'paid', fulfillmentStatus: 'backorder' }, true],
    [{ paymentStatus: 'unpaid', fulfillmentStatus: 'fulfilled' }, true],
    [{ paymentStatus: 'authorized', fulfillmentStatus: 'fulfilled' }, true],
    [{ paymentStatus: 'failed', fulfillmentStatus: 'fulfilled' }, true],
    [{ paymentStatus: 'paid', fulfillmentStatus: 'fulfilled' }, false],
    [{ paymentStatus: 'refunded', fulfillmentStatus: 'delivered' }, false],
  ] as const)('%o → %s', (patch, expected) => {
    expect(needsAction({ ...base, ...patch })).toBe(expected);
  });

  it('ignores drafts and canceled orders', () => {
    expect(needsAction({ ...base, status: 'draft' })).toBe(false);
    expect(needsAction({ ...base, status: 'canceled' })).toBe(false);
  });
});

describe('cityLine', () => {
  it('formats city and region', () => {
    expect(cityLine(base.shipAddress!)).toBe('Portland, OR');
    expect(cityLine({ city: 'Berlin', stateCode: null, countryIso: 'DE' })).toBe('Berlin, DE');
  });
});
