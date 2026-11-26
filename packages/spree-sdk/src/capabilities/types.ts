export type ApiFamily = 'platform-v2' | 'admin-v3';

export type AuthMethod =
  /** Email + password: OAuth2 password grant (Platform v2) or admin JWT login (Admin v3). */
  | 'password'
  /** OAuth application client id + secret (Platform v2 client credentials). */
  | 'oauthClient'
  /** Secret Admin API key (Admin v3). */
  | 'apiKey'
  /** QR pairing through the companion gem. */
  | 'pairing';

/** Core capabilities. Extensions add namespaced strings such as `beeper.moderation`. */
export const CORE_CAPABILITIES = [
  'orders.read',
  'orders.cancel',
  'orders.capture',
  'orders.refund',
  'orders.note',
  'shipments.ship',
  'products.read',
  'products.write',
  'products.media',
  'inventory.adjust',
  'customers.read',
  'customers.write',
  'promotions.read',
  'promotions.write',
  'settings.store',
  'settings.shipping',
  'settings.tax',
  'settings.payments',
  'analytics.summary',
  'notifications.push',
  'webhooks.manage',
  'markets',
  'priceLists',
  'giftCards',
  'channels',
] as const;
export type CoreCapability = (typeof CORE_CAPABILITIES)[number];
/** A core capability or an extension's namespaced capability (`vendor.feature`). */
export type Capability = CoreCapability | `${string}.${string}`;

export interface GemInfo {
  version: string;
}

export interface StoreProbe {
  baseUrl: string;
  apiFamilies: ApiFamily[];
  preferredApi: ApiFamily;
  capabilities: Capability[];
  authMethods: AuthMethod[];
  storeName: string | null;
  currency: string | null;
  spreeVersion: string | null;
  gem: GemInfo | null;
  probedAt: string;
}
