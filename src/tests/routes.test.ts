import type { APIContext } from 'astro';
import { beforeAll, describe, expect, it } from 'vitest';
import { configureAuthKit } from '../config.js';
import { getSignInUrl, handleCallback, handleSignIn, handleSignOut } from '../routes.js';
import { makeContext, makeCookies, TEST_CONFIG } from './helpers.js';

beforeAll(() => {
  configureAuthKit(TEST_CONFIG);
});

describe('handleSignIn', () => {
  it('redirects to WorkOS and writes a PKCE verifier cookie', async () => {
    const cookies = makeCookies();
    const ctx = makeContext({ cookies, pathname: '/login', search: '?returnTo=/dashboard' });

    const res = await handleSignIn(ctx);

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain('workos.com');
    expect(cookies.writes.some((w) => w.name.startsWith('wos-auth-verifier'))).toBe(true);
  });

  it('getSignInUrl returns an authorization URL with the client id', async () => {
    const ctx = makeContext({ cookies: makeCookies() });
    const url = await getSignInUrl(ctx, { returnTo: '/dashboard' });
    expect(url).toContain('client_id=client_test123');
  });
});

describe('handleCallback', () => {
  it('400s when ?code is missing', async () => {
    const ctx = makeContext({ cookies: makeCookies(), pathname: '/callback' });
    const res = await handleCallback(ctx);
    expect(res.status).toBe(400);
  });

  it('400s and clears the verifier on a WorkOS ?error', async () => {
    const cookies = makeCookies();
    const ctx = makeContext({
      cookies,
      pathname: '/callback',
      search: '?error=access_denied&error_description=nope&state=abc',
    });
    const res = await handleCallback(ctx);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('access_denied');
  });
});

describe('handleSignOut', () => {
  it('redirects home when there is no session', async () => {
    const ctx = makeContext({ cookies: makeCookies(), locals: { auth: { user: null } } }) as APIContext;
    const res = await handleSignOut(ctx);
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/');
  });
});
