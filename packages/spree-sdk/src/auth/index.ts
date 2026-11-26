import type { Transport } from '../transport';
import { adminJwt } from './adminJwt';
import { apiKeyAuth, spreeTokenAuth } from './apiKey';
import { oauthClientCredentials, oauthPasswordGrant } from './oauth';
import type { SessionAuth, SignInOptions, StoredCredential } from './types';

export * from './adminJwt';
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
    case 'spreeToken':
      return spreeTokenAuth(stored.token);
    case 'adminJwt':
      return adminJwt.restore(transport, stored, options);
  }
}
