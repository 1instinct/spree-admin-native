import type { SessionAuth } from './types';

/** Admin API v3 secret key (`sk_…`). Keys don't refresh; a 401 means the key was revoked. */
export function apiKeyAuth(apiKey: string): SessionAuth {
  return {
    headers: async () => ({ 'X-Spree-Api-Key': apiKey }),
    serialize: () => ({ method: 'apiKey', apiKey }),
  };
}
