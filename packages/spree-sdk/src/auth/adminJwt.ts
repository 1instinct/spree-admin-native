import { isSpreeError, SpreeError } from '../errors';
import type { Transport } from '../transport';
import type { SessionAuth, SignInOptions, StoredCredential } from './types';

const LOGIN = '/api/v3/admin/auth/login';
const REFRESH = '/api/v3/admin/auth/refresh';
const COOKIE = 'spree_admin_refresh_token';

interface TokenBody {
  token: string;
}

/**
 * Pull the refresh cookie out of Set-Cookie when the platform exposes it (Node, web servers,
 * React Native on most builds). When it doesn't, the OS cookie jar keeps it, because requests
 * go out with `credentials: 'include'`.
 */
export function readRefreshCookie(headers: Headers): string | null {
  const values =
    typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [headers.get('set-cookie') ?? ''];
  for (const v of values) {
    const m =
      new RegExp(`(?:^|[,;\\s])${COOKIE}=([^;,\\s]+)`).exec(v) ?? new RegExp(`^${COOKIE}=([^;]+)`).exec(v);
    if (m?.[1]) return m[1];
  }
  return null;
}

type JwtCredential = Extract<StoredCredential, { method: 'adminJwt' }>;

/**
 * Spree 5.5+/6 admin login (infra/spree/FINDINGS.md §d): a 5-minute JWT in the body and a
 * 30-day HttpOnly refresh cookie that rotates on every refresh. No CSRF token is needed.
 */
export const adminJwt = {
  async signIn(
    transport: Transport,
    creds: { email: string; password: string },
    options: SignInOptions = {},
  ): Promise<SessionAuth> {
    try {
      const res = await transport.request<TokenBody>({
        method: 'POST',
        path: LOGIN,
        body: { email: creds.email, password: creds.password },
        auth: 'none',
        credentials: 'include',
      });
      if (!res.data?.token) throw new SpreeError({ kind: 'parse', status: res.status, body: res.data });
      return adminJwt.restore(
        transport,
        { method: 'adminJwt', accessToken: res.data.token, refreshCookie: readRefreshCookie(res.headers) },
        options,
      );
    } catch (e) {
      if (isSpreeError(e) && e.status === 401) {
        throw new SpreeError({
          kind: 'auth',
          status: 401,
          body: e.body,
          message: 'Email or password is incorrect.',
        });
      }
      throw e;
    }
  },

  restore(transport: Transport, stored: JwtCredential, options: SignInOptions = {}): SessionAuth {
    let state: JwtCredential = { ...stored };
    let inflight: Promise<void> | null = null;
    return {
      headers: async () => ({ Authorization: `Bearer ${state.accessToken}` }),
      // Single flight: the cookie rotates, so a second concurrent refresh with the old one would 401.
      refresh: () => {
        inflight ??= (async () => {
          const res = await transport.request<TokenBody>({
            method: 'POST',
            path: REFRESH,
            auth: 'none',
            credentials: 'include',
            headers: state.refreshCookie ? { Cookie: `${COOKIE}=${state.refreshCookie}` } : {},
          });
          state = {
            method: 'adminJwt',
            accessToken: res.data.token,
            refreshCookie: readRefreshCookie(res.headers) ?? state.refreshCookie,
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
