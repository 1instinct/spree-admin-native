import type { SessionAuth } from './types';

/** Admin API v3 secret key (`sk_…`). Keys don't refresh; a 401 means the key was revoked. */
export function apiKeyAuth(apiKey: string): SessionAuth {
  return {
    headers: async () => ({ 'X-Spree-Api-Key': apiKey }),
    serialize: () => ({ method: 'apiKey', apiKey }),
  };
}

/**
 * API v1 (Spree 4.2–4.x): the admin user's own Spree API key, generated in Spree admin under
 * Users → edit → API key. Sent as X-Spree-Token; v1 ignores bearer tokens.
 */
export function spreeTokenAuth(token: string): SessionAuth {
  return {
    headers: async () => ({ 'X-Spree-Token': token }),
    serialize: () => ({ method: 'spreeToken', token }),
  };
}
