import type { AuthStrategy } from '../transport';

/** Everything needed to restore a session; apps keep this in the device keychain. */
export type StoredCredential =
  | { method: 'oauthPassword'; accessToken: string; refreshToken: string | null; expiresAt: string | null }
  | { method: 'oauthClient'; clientId: string; clientSecret: string; accessToken: string | null }
  | { method: 'apiKey'; apiKey: string }
  | { method: 'adminJwt'; accessToken: string };

export interface SessionAuth extends AuthStrategy {
  serialize(): StoredCredential;
}

export interface SignInOptions {
  /** Called whenever tokens rotate, so the app can persist them. */
  onChange?: (credential: StoredCredential) => void;
}
