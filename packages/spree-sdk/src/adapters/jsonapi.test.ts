import { describe, expect, it } from 'vitest';
import { JsonApiGraph, num, str } from './jsonapi';

const doc = {
  data: [
    {
      id: '1',
      type: 'order',
      attributes: { number: 'R1', total: '10.0', item_count: 2 },
      relationships: {
        line_items: {
          data: [
            { id: '5', type: 'line_item' },
            { id: '6', type: 'line_item' },
          ],
        },
        user: { data: { id: '9', type: 'user' } },
        bill_address: { data: null },
      },
    },
  ],
  included: [{ id: '5', type: 'line_item', attributes: { quantity: 1 } }],
};

describe('JsonApiGraph', () => {
  const g = new JsonApiGraph(doc);
  const order = g.get({ id: '1', type: 'order' });

  it('resolves to-many relationships, skipping ones not included', () => {
    expect(g.many(order, 'line_items').map((r) => r.id)).toEqual(['5']);
  });
  it('returns null for missing or empty to-one relationships but keeps the id', () => {
    expect(g.one(order, 'user')).toBeNull();
    expect(g.oneId(order, 'user')).toBe('9');
    expect(g.one(order, 'bill_address')).toBeNull();
  });
  it('reads attributes leniently', () => {
    expect(str(order, 'total')).toBe('10.0');
    expect(num(order, 'total')).toBe(10);
    expect(num(order, 'item_count')).toBe(2);
    expect(str(order, 'missing')).toBeNull();
  });
});
