import { describe, expect, it, vi } from 'vitest';
import { createTransport, type FetchLike } from '../transport';
import { apiKeyAuth, oauthClientCredentials, oauthPasswordGrant, restoreAuth } from './index';

function recorder(...replies: { status: number; body: unknown }[]) {
  const calls: { url: string; body: unknown; headers: Record<string, string> }[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, body: init.body ? JSON.parse(init.body) : undefined, headers: init.headers });
    const r = replies.shift() ?? { status: 200, body: {} };
    return new Response(JSON.stringify(r.body), {
      status: r.status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fetch, calls };
}

const token = (access: string, refresh = 'r1') => ({
  access_token: access,
  token_type: 'Bearer',
  expires_in: 7200,
  refresh_token: refresh,
  created_at: 1_764_150_000,
  scope: 'admin',
});

describe('oauthPasswordGrant (Platform API v2)', () => {
  it('signs in with the admin scope and sends a bearer token', async () => {
    const { fetch, calls } = recorder({ status: 200, body: token('a1') });
    const t = createTransport({ baseUrl: 'https://shop.test', fetch });
    const auth = await oauthPasswordGrant.signIn(t, { email: 'admin@example.com', password: 'spree123' });
    expect(calls[0]).toMatchObject({
      url: 'https://shop.test/spree_oauth/token',
      body: { grant_type: 'password', username: 'admin@example.com', password: 'spree123', scope: 'admin' },
    });
    expect(await auth.headers()).toEqual({ Authorization: 'Bearer a1' });
    expect(auth.serialize()).toMatchObject({
      method: 'oauthPassword',
      accessToken: 'a1',
      refreshToken: 'r1',
    });
  });

  it('refreshes with the refresh token and reports the new credential', async () => {
    const { fetch, calls } = recorder(
      { status: 200, body: token('a1') },
      { status: 200, body: token('a2', 'r2') },
    );
    const t = createTransport({ baseUrl: 'https://shop.test', fetch });
    const onChange = vi.fn();
    const auth = await oauthPasswordGrant.signIn(t, { email: 'a@b.c', password: 'x' }, { onChange });
    await auth.refresh?.();
    expect(calls[1]?.body).toEqual({ grant_type: 'refresh_token', refresh_token: 'r1' });
    expect(await auth.headers()).toEqual({ Authorization: 'Bearer a2' });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'a2', refreshToken: 'r2' }));
  });

  it('turns a rejected password into an "auth" error with Spree\'s message', async () => {
    const { fetch } = recorder({
      status: 400,
      body: { error: 'invalid_grant', error_description: 'The provided authorization grant is invalid' },
    });
    const t = createTransport({ baseUrl: 'https://shop.test', fetch });
    await expect(oauthPasswordGrant.signIn(t, { email: 'a@b.c', password: 'bad' })).rejects.toMatchObject({
      kind: 'auth',
      message: 'Email or password is incorrect.',
    });
  });
});

describe('oauthClientCredentials (Platform API v2)', () => {
  it('requests a token and re-requests it on refresh', async () => {
    const { fetch, calls } = recorder({ status: 200, body: token('c1') }, { status: 200, body: token('c2') });
    const t = createTransport({ baseUrl: 'https://shop.test', fetch });
    const auth = await oauthClientCredentials.signIn(t, { clientId: 'id', clientSecret: 'secret' });
    await auth.refresh?.();
    expect(calls.map((c) => (c.body as { grant_type: string }).grant_type)).toEqual([
      'client_credentials',
      'client_credentials',
    ]);
    expect(await auth.headers()).toEqual({ Authorization: 'Bearer c2' });
  });
});

describe('apiKeyAuth (Admin API v3)', () => {
  it('sends X-Spree-Api-Key', async () => {
    const auth = apiKeyAuth('sk_test_123');
    expect(await auth.headers()).toEqual({ 'X-Spree-Api-Key': 'sk_test_123' });
    expect(auth.refresh).toBeUndefined();
  });
});

describe('restoreAuth', () => {
  it('rebuilds a strategy from a stored credential', async () => {
    const t = createTransport({ baseUrl: 'https://shop.test', fetch: recorder().fetch });
    const auth = restoreAuth(t, { method: 'apiKey', apiKey: 'sk_1' });
    expect(await auth.headers()).toEqual({ 'X-Spree-Api-Key': 'sk_1' });
    const pw = restoreAuth(t, {
      method: 'oauthPassword',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: null,
    });
    expect(await pw.headers()).toEqual({ Authorization: 'Bearer a' });
  });
});
