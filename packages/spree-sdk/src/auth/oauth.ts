import { isSpreeError, SpreeError } from '../errors';
import type { Transport } from '../transport';
import type { SessionAuth, SignInOptions, StoredCredential } from './types';

/** Spree 4.x–5.x Doorkeeper token endpoint. */
const TOKEN_PATH = '/spree_oauth/token';
const SCOPE = 'admin';

interface TokenResponse {
  access_token: string;
  refresh_token?: string | null;
  expires_in?: number | null;
  created_at?: number | null;
}

function expiresAt(t: TokenResponse): string | null {
  if (!t.expires_in) return null;
  const created = t.created_at ? t.created_at * 1000 : Date.now();
  return new Date(created + t.expires_in * 1000).toISOString();
}

async function requestToken(transport: Transport, body: Record<string, string>): Promise<TokenResponse> {
  try {
    const res = await transport.request<TokenResponse>({
      method: 'POST',
      path: TOKEN_PATH,
      body,
      auth: 'none',
    });
    if (!res.data?.access_token) throw new SpreeError({ kind: 'parse', status: res.status, body: res.data });
    return res.data;
  } catch (e) {
    // Doorkeeper answers a bad password with 400/401 invalid_grant.
    if (isSpreeError(e) && (e.status === 400 || e.status === 401)) {
      const grant = body.grant_type;
      throw new SpreeError({
        kind: 'auth',
        status: e.status,
        body: e.body,
        message:
          grant === 'password'
            ? 'Email or password is incorrect.'
            : grant === 'client_credentials'
              ? 'The OAuth application ID or secret is incorrect, or it lacks the admin scope.'
              : 'Your session has ended. Sign in again.',
      });
    }
    throw e;
  }
}

function bearer(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const oauthPasswordGrant = {
  async signIn(
    transport: Transport,
    creds: { email: string; password: string },
    options: SignInOptions = {},
  ): Promise<SessionAuth> {
    const t = await requestToken(transport, {
      grant_type: 'password',
      username: creds.email,
      password: creds.password,
      scope: SCOPE,
    });
    return oauthPasswordGrant.restore(
      transport,
      {
        method: 'oauthPassword',
        accessToken: t.access_token,
        refreshToken: t.refresh_token ?? null,
        expiresAt: expiresAt(t),
      },
      options,
    );
  },

  restore(
    transport: Transport,
    stored: Extract<StoredCredential, { method: 'oauthPassword' }>,
    options: SignInOptions = {},
  ): SessionAuth {
    let state = { ...stored };
    let inflight: Promise<void> | null = null;
    return {
      headers: async () => bearer(state.accessToken),
      refresh: () => {
        inflight ??= (async () => {
          if (!state.refreshToken) throw new SpreeError({ kind: 'auth', status: 401 });
          const t = await requestToken(transport, {
            grant_type: 'refresh_token',
            refresh_token: state.refreshToken,
          });
          state = {
            method: 'oauthPassword',
            accessToken: t.access_token,
            refreshToken: t.refresh_token ?? state.refreshToken,
            expiresAt: expiresAt(t),
          };
          options.onChange?.(state);
        })().finally(() => {
          inflight = null;
        });
        return inflight;
      },
      serialize: () => state,
    };
  },
};

export const oauthClientCredentials = {
  async signIn(
    transport: Transport,
    creds: { clientId: string; clientSecret: string },
    options: SignInOptions = {},
  ): Promise<SessionAuth> {
    const auth = oauthClientCredentials.restore(
      transport,
      {
        method: 'oauthClient',
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        accessToken: null,
      },
      options,
    );
    await auth.refresh?.();
    return auth;
  },

  restore(
    transport: Transport,
    stored: Extract<StoredCredential, { method: 'oauthClient' }>,
    options: SignInOptions = {},
  ): SessionAuth {
    let state = { ...stored };
    return {
      headers: async () => bearer(state.accessToken),
      refresh: async () => {
        const t = await requestToken(transport, {
          grant_type: 'client_credentials',
          client_id: state.clientId,
          client_secret: state.clientSecret,
          scope: SCOPE,
        });
        state = { ...state, accessToken: t.access_token };
        options.onChange?.(state);
      },
      serialize: () => state,
    };
  },
};
