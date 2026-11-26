import type { Transport } from '../transport';
import { apiKeyAuth } from './apiKey';
import { oauthClientCredentials, oauthPasswordGrant } from './oauth';
import type { SessionAuth, SignInOptions, StoredCredential } from './types';

export * from './apiKey';
export * from './oauth';
export * from './types';

/** Rebuild an auth strategy from what the app stored in the keychain. */
export function restoreAuth(
  transport: Transport,
  stored: StoredCredential,
  options: SignInOptions = {},
): SessionAuth {
  switch (stored.method) {
    case 'oauthPassword':
      return oauthPasswordGrant.restore(transport, stored, options);
    case 'oauthClient':
      return oauthClientCredentials.restore(transport, stored, options);
    case 'apiKey':
      return apiKeyAuth(stored.apiKey);
    case 'adminJwt':
      // Admin API v3 JWT refresh lands with the Spree 6 findings (cookie + CSRF); until then, sign in again on 401.
      return {
        headers: async () => ({ Authorization: `Bearer ${stored.accessToken}` }),
        serialize: () => stored,
      };
  }
}
