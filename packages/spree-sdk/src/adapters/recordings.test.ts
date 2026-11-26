import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapOrder as mapV3 } from './admin-v3/mapOrder';
import { mapV1Order } from './api-v1/mapOrder';

const rec = (version: string, file: string) =>
  JSON.parse(readFileSync(resolve(__dirname, '../../../../infra/spree/recordings', version, file), 'utf8'));

describe('Spree 4.2 API v1 recordings', () => {
  it('maps a shipped order with line items, shipment and payment', () => {
    const o = mapV1Order(rec('4.2', 'orders.show.json'));
    expect(o).toMatchObject({
      number: 'R420000024',
      status: 'placed',
      paymentStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      total: { amount: '185.95', currency: 'USD' },
      shipTotal: { amount: '5.00', currency: 'USD' },
      amountDue: { amount: '0.00', currency: 'USD' },
    });
    expect(o.lineItems[0]).toMatchObject({
      name: 'Slim Fit Shirt',
      optionsText: 'Color: dark_blue, Size: XS',
      quantity: 2,
    });
    expect(o.fulfillments[0]).toMatchObject({
      number: 'H54274278639',
      status: 'fulfilled',
      methodName: 'UPS Ground (USD)',
    });
    expect(o.fulfillments[0]?.items[0]).toEqual({ lineItemId: '47', quantity: 2 });
    expect(o.payments[0]).toMatchObject({ number: 'P5BGJ27A', status: 'completed', methodName: 'Check' });
    expect(o.shipAddress).toMatchObject({ city: 'New York', stateCode: 'NY', countryIso: 'US' });
  });

  it('maps every list item', () => {
    const list = rec('4.2', 'orders.list.json');
    const orders = list.orders.map(mapV1Order);
    expect(orders).toHaveLength(5);
    for (const o of orders) expect(o.status).not.toBe('unknown');
  });
});

describe('Spree 6.0 Admin API v3 recordings', () => {
  it('maps a fulfilled, partially refunded order', () => {
    const o = mapV3(rec('6.0', 'orders.show.json'));
    expect(o).toMatchObject({
      number: 'R1029',
      status: 'placed',
      paymentStatus: 'partially_refunded',
      fulfillmentStatus: 'fulfilled',
    });
    expect(o.lineItems).toHaveLength(3);
    expect(o.fulfillments[0]?.trackingNumber).toBeTruthy();
    expect(o.payments.length).toBeGreaterThan(0);
    expect(o.shipAddress?.city).toBeTruthy();
  });

  it('maps every list item', () => {
    const orders = rec('6.0', 'orders.list.json').data.map(mapV3);
    expect(orders).toHaveLength(5);
    for (const o of orders) {
      expect(o.status).not.toBe('unknown');
      expect(o.paymentStatus).not.toBe('unknown');
      expect(o.fulfillmentStatus).not.toBe('unknown');
    }
  });
});
