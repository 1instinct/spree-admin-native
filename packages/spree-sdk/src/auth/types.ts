import type { AuthStrategy } from '../transport';

/** Everything needed to restore a session; apps keep this in the device keychain. */
export type StoredCredential =
  | { method: 'oauthPassword'; accessToken: string; refreshToken: string | null; expiresAt: string | null }
  | { method: 'oauthClient'; clientId: string; clientSecret: string; accessToken: string | null }
  | { method: 'apiKey'; apiKey: string }
  | { method: 'spreeToken'; token: string }
  /** Admin v3: 5-minute JWT plus the rotating refresh cookie value (null when the OS cookie jar holds it). */
  | { method: 'adminJwt'; accessToken: string; refreshCookie: string | null };

export interface SessionAuth extends AuthStrategy {
  serialize(): StoredCredential;
}

export interface SignInOptions {
  /** Called whenever tokens rotate, so the app can persist them. */
  onChange?: (credential: StoredCredential) => void;
}
