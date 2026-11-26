import { describe, expect, it } from 'vitest';
import type { FetchLike } from '../transport';
import { probeStore } from './probe';

type Routes = Record<string, { status: number; body?: unknown } | 'hang' | 'throw'>;

function routes(map: Routes) {
  const seen: string[] = [];
  const fetch: FetchLike = async (url, init) => {
    const path = new URL(url).pathname;
    seen.push(path);
    const r = map[path] ?? { status: 404, body: { error: 'Not found' } };
    if (r === 'throw') throw new TypeError('Network request failed');
    if (r === 'hang')
      return new Promise((_res, rej) =>
        init.signal?.addEventListener('abort', () => rej(new Error('aborted'))),
      );
    return new Response(r.body === undefined ? '' : JSON.stringify(r.body), {
      status: r.status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fetch, seen };
}

describe('probeStore', () => {
  it('trusts the companion gem over API probes when present', async () => {
    const { fetch } = routes({
      '/api/v2/platform/orders': { status: 401 },
      '/api/admin_native/v1/capabilities': {
        status: 200,
        body: {
          spree_version: '4.2.5',
          gem_version: '0.1.0',
          api_families: ['platform-v2'],
          capabilities: ['orders.read', 'notifications.push', 'beeper.moderation'],
          auth_methods: ['password', 'pairing'],
          store: { name: 'Beeper', currency: 'USD' },
        },
      },
    });
    const probe = await probeStore({ baseUrl: 'admin.beeper.test', fetch });
    expect(probe).toMatchObject({
      baseUrl: 'https://admin.beeper.test',
      preferredApi: 'platform-v2',
      spreeVersion: '4.2.5',
      gem: { version: '0.1.0' },
      storeName: 'Beeper',
      authMethods: ['password', 'pairing'],
    });
    expect(probe.capabilities).toContain('beeper.moderation');
  });

  it('detects a Spree 4.2-style store from Platform API v2', async () => {
    const { fetch } = routes({
      '/api/v2/platform/orders': { status: 401, body: { error: 'The access token is invalid' } },
      '/api/v2/storefront/store': {
        status: 200,
        body: { data: { attributes: { name: 'Northwind', default_currency: 'USD' } } },
      },
    });
    const probe = await probeStore({ baseUrl: 'http://localhost:3042', fetch });
    expect(probe.apiFamilies).toEqual(['platform-v2']);
    expect(probe.preferredApi).toBe('platform-v2');
    expect(probe.storeName).toBe('Northwind');
    expect(probe.capabilities).toContain('orders.read');
    expect(probe.capabilities).not.toContain('analytics.summary');
    expect(probe.authMethods).toEqual(['password', 'oauthClient']);
    expect(probe.gem).toBeNull();
  });

  it('detects a Spree 6-style store from Admin API v3 auth providers', async () => {
    const { fetch } = routes({
      '/api/v3/admin/auth/providers': { status: 200, body: { data: [{ id: 'email', name: 'Email' }] } },
      '/api/v3/admin/orders': { status: 401, body: {} },
    });
    const probe = await probeStore({ baseUrl: 'http://localhost:3060', fetch });
    expect(probe.apiFamilies).toEqual(['admin-v3']);
    expect(probe.preferredApi).toBe('admin-v3');
    expect(probe.capabilities).toEqual(
      expect.arrayContaining(['orders.read', 'webhooks.manage', 'analytics.summary']),
    );
    expect(probe.authMethods).toEqual(['password', 'apiKey']);
  });

  it('prefers Admin API v3 when both families exist (5.4+ with the legacy v2 gem)', async () => {
    const { fetch } = routes({
      '/api/v2/platform/orders': { status: 401 },
      '/api/v3/admin/auth/providers': { status: 200, body: { data: [] } },
    });
    const probe = await probeStore({ baseUrl: 'https://shop.test', fetch });
    expect(probe.apiFamilies).toEqual(['admin-v3', 'platform-v2']);
    expect(probe.preferredApi).toBe('admin-v3');
  });

  it('says "not Spree" when no API answers', async () => {
    const { fetch } = routes({});
    await expect(probeStore({ baseUrl: 'https://example.com', fetch })).rejects.toMatchObject({
      kind: 'notSpree',
    });
  });

  it('reports network failures as network errors, not "not Spree"', async () => {
    const { fetch } = routes({
      '/api/admin_native/v1/capabilities': 'throw',
      '/api/v2/platform/orders': 'throw',
      '/api/v3/admin/auth/providers': 'throw',
      '/api/v2/storefront/store': 'throw',
    });
    await expect(probeStore({ baseUrl: 'https://offline.test', fetch })).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('finishes within the time budget when a probe hangs', async () => {
    const { fetch } = routes({
      '/api/admin_native/v1/capabilities': 'hang',
      '/api/v2/platform/orders': { status: 401 },
      '/api/v3/admin/auth/providers': 'hang',
    });
    const started = Date.now();
    const probe = await probeStore({ baseUrl: 'https://slow.test', fetch, timeoutMs: 100 });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(probe.preferredApi).toBe('platform-v2');
  });
});
