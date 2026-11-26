import { isSpreeError, SpreeError } from '../errors';
import { createTransport, type FetchLike, type Transport } from '../transport';
import { FAMILY_AUTH, FAMILY_CAPABILITIES } from './families';
import type { ApiFamily, AuthMethod, Capability, StoreProbe } from './types';

export interface ProbeOptions {
  baseUrl: string;
  fetch?: FetchLike;
  /** Per-probe timeout. All probes run in parallel. */
  timeoutMs?: number;
}

const GEM_PATH = '/api/admin_native/v1/capabilities';
const PLATFORM_V2_PATH = '/api/v2/platform/orders';
/** Unauthenticated on Spree 5.5+ / 6: lists sign-in providers. */
const ADMIN_V3_PATH = '/api/v3/admin/auth/providers';
const STOREFRONT_V2_STORE_PATH = '/api/v2/storefront/store';

type Outcome = { status: number; data: unknown } | { error: unknown };

async function attempt(t: Transport, path: string, timeoutMs: number): Promise<Outcome> {
  try {
    const res = await t.request({ path, auth: 'none', timeoutMs, query: { per_page: 1 } });
    return { status: res.status, data: res.data };
  } catch (error) {
    if (isSpreeError(error) && error.status > 0) return { status: error.status, data: error.body };
    return { error };
  }
}

const statusOf = (o: Outcome) => ('status' in o ? o.status : 0);
/** The route exists: it answered, even if only to say "not authorised". */
const exists = (o: Outcome) => [200, 401, 403].includes(statusOf(o));

interface GemPayload {
  spree_version?: string;
  gem_version?: string;
  api_families?: ApiFamily[];
  capabilities?: string[];
  auth_methods?: AuthMethod[];
  store?: { name?: string; currency?: string };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function storefrontStoreInfo(data: unknown): { name: string | null; currency: string | null } {
  const attrs =
    isRecord(data) && isRecord(data.data) && isRecord(data.data.attributes) ? data.data.attributes : {};
  return {
    name: typeof attrs.name === 'string' ? attrs.name : null,
    currency: typeof attrs.default_currency === 'string' ? attrs.default_currency : null,
  };
}

/**
 * Work out what a store can do. Runs every probe in parallel with a short timeout, prefers
 * the companion gem's answer, then Admin API v3, then Platform API v2.
 */
export async function probeStore(options: ProbeOptions): Promise<StoreProbe> {
  const timeoutMs = options.timeoutMs ?? 4000;
  const transportOptions: Parameters<typeof createTransport>[0] = { baseUrl: options.baseUrl, timeoutMs };
  if (options.fetch) transportOptions.fetch = options.fetch;
  const t = createTransport(transportOptions);

  const [gem, adminV3, platformV2, storefront] = (await Promise.all(
    [GEM_PATH, ADMIN_V3_PATH, PLATFORM_V2_PATH, STOREFRONT_V2_STORE_PATH].map((p) =>
      attempt(t, p, timeoutMs),
    ),
  )) as [Outcome, Outcome, Outcome, Outcome];

  const probedAt = new Date().toISOString();
  const info = storefrontStoreInfo(
    'data' in storefront && statusOf(storefront) === 200 ? storefront.data : null,
  );

  if ('data' in gem && gem.status === 200 && isRecord(gem.data)) {
    const g = gem.data as GemPayload;
    const families = g.api_families?.length ? g.api_families : ['platform-v2' as const];
    return {
      baseUrl: t.baseUrl,
      apiFamilies: families,
      preferredApi: families.includes('admin-v3') ? 'admin-v3' : 'platform-v2',
      capabilities: (g.capabilities ?? []) as Capability[],
      authMethods: g.auth_methods ?? ['password', 'pairing'],
      storeName: g.store?.name ?? info.name,
      currency: g.store?.currency ?? info.currency,
      spreeVersion: g.spree_version ?? null,
      gem: { version: g.gem_version ?? 'unknown' },
      probedAt,
    };
  }

  const apiFamilies: ApiFamily[] = [];
  if (exists(adminV3)) apiFamilies.push('admin-v3');
  if (exists(platformV2)) apiFamilies.push('platform-v2');

  if (apiFamilies.length === 0) {
    const all = [gem, adminV3, platformV2, storefront];
    const noResponse = all.every((o) => 'error' in o);
    if (noResponse) {
      const first = all.find((o): o is { error: unknown } => 'error' in o)?.error;
      throw isSpreeError(first) ? first : new SpreeError({ kind: 'network', status: 0, cause: first });
    }
    throw new SpreeError({ kind: 'notSpree', status: 0 });
  }

  const preferredApi = apiFamilies[0] as ApiFamily;
  return {
    baseUrl: t.baseUrl,
    apiFamilies,
    preferredApi,
    capabilities: [...FAMILY_CAPABILITIES[preferredApi]],
    authMethods: [...FAMILY_AUTH[preferredApi]],
    storeName: info.name,
    currency: info.currency,
    spreeVersion: null,
    gem: null,
    probedAt,
  };
}
