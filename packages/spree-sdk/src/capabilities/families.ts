import type { ApiFamily, AuthMethod, Capability } from './types';

/**
 * What each API family is assumed to offer before contract tests say otherwise.
 * The contract suite (packages/spree-sdk/contract) proves or removes each entry per Spree
 * version; keep these conservative.
 */
export const FAMILY_CAPABILITIES: Record<ApiFamily, readonly Capability[]> = {
  'platform-v2': [
    'orders.read',
    'orders.cancel',
    'shipments.ship',
    'products.read',
    'products.write',
    'inventory.adjust',
    'customers.read',
    'promotions.read',
  ],
  'admin-v3': [
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
    'analytics.summary',
    'webhooks.manage',
    'channels',
  ],
};

export const FAMILY_AUTH: Record<ApiFamily, readonly AuthMethod[]> = {
  'platform-v2': ['password', 'oauthClient'],
  'admin-v3': ['password', 'apiKey'],
};
