import { Order } from '@spree-native/domain';
import { type SpreeAdapter, SpreeError, type StoreProbe } from '@spree-native/spree-sdk';
import { createTRPCClient, unstable_localLink } from '@trpc/client';
import { TRPCError } from '@trpc/server';
import { describe, expect, it, vi } from 'vitest';
import fixture from '../../domain/test/fixtures/order.json';
import { type AppRouter, appRouter, createCaller } from './router';
import type { Context } from './trpc';

const order = Order.parse(fixture);

const probe = (capabilities: string[]): StoreProbe => ({
  baseUrl: 'https://shop.test',
  apiFamilies: ['platform-v2'],
  preferredApi: 'platform-v2',
  capabilities: capabilities as StoreProbe['capabilities'],
  authMethods: ['password'],
  storeName: 'Northwind',
  currency: 'USD',
  spreeVersion: null,
  gem: null,
  probedAt: '2026-11-26T00:00:00Z',
});

function adapter(overrides: Partial<SpreeAdapter['orders']> = {}): SpreeAdapter {
  return {
    family: 'platform-v2',
    orders: {
      list: vi.fn(async () => ({ items: [order], nextCursor: null, totalCount: 1 })),
      get: vi.fn(async () => order),
      ...overrides,
    },
  };
}

const ctx = (capabilities = ['orders.read'], a = adapter()): Context => ({
  session: { probe: probe(capabilities), adapter: a },
});

describe('appRouter', () => {
  it('lists orders through the adapter with defaults', async () => {
    const a = adapter();
    const res = await createCaller(ctx(['orders.read'], a)).orders.list({});
    expect(res.items[0]?.number).toBe('R482913057');
    expect(a.orders.list).toHaveBeenCalledWith({ filter: 'all', perPage: 25, cursor: null });
  });

  it('passes search and filter through', async () => {
    const a = adapter();
    await createCaller(ctx(['orders.read'], a)).orders.list({ filter: 'unfulfilled', query: ' maya ' });
    expect(a.orders.list).toHaveBeenCalledWith({
      filter: 'unfulfilled',
      perPage: 25,
      cursor: null,
      query: 'maya',
    });
  });

  it('requires a connected store', async () => {
    await expect(createCaller({ session: null }).orders.list({})).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('explains a missing capability in plain words', async () => {
    const err = await createCaller(ctx([]))
      .orders.list({})
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TRPCError);
    expect(err).toMatchObject({ code: 'PRECONDITION_FAILED' });
    expect((err as Error).message).toMatch(/reading orders/);
  });

  it('maps SpreeErrors to tRPC codes and keeps the kind', async () => {
    const a = adapter({
      get: async () => {
        throw new SpreeError({ kind: 'notFound', status: 404, message: 'Order not found' });
      },
    });
    const err = await createCaller(ctx(['orders.read'], a))
      .orders.get({ id: 'R1' })
      .catch((e: unknown) => e);
    expect(err).toMatchObject({ code: 'NOT_FOUND', message: 'Order not found' });
    expect((err as TRPCError).cause).toMatchObject({ kind: 'notFound' });
  });

  it('probes a store through the injected fetch', async () => {
    const fetch = async () =>
      new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } });
    const res = await createCaller({ session: null, fetch }).store.probe({ url: 'shop.test' });
    expect(res.baseUrl).toBe('https://shop.test');
  });

  it('runs in-process through unstable_localLink, with spreeKind in error data', async () => {
    const a = adapter({
      list: async () => {
        throw new SpreeError({ kind: 'auth', status: 401 });
      },
    });
    const client = createTRPCClient<AppRouter>({
      links: [unstable_localLink({ router: appRouter, createContext: async () => ctx(['orders.read'], a) })],
    });
    expect((await client.orders.get.query({ id: 'R482913057' })).number).toBe('R482913057');
    const err = await client.orders.list.query({}).catch((e: unknown) => e);
    expect(err).toMatchObject({ data: { code: 'UNAUTHORIZED', spreeKind: 'auth' } });
  });
});
