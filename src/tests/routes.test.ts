import type { APIContext } from 'astro';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { configureAuthKit } from '../config.js';
import {
  createCallbackHandler,
  createSignOutHandler,
  getSignInUrl,
  handleCallback,
  handleSignIn,
  handleSignOut,
} from '../routes.js';
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

describe('createCallbackHandler', () => {
  it('redirects to errorRedirect with error params instead of 400ing', async () => {
    const handler = createCallbackHandler({ errorRedirect: '/login' });
    const ctx = makeContext({
      cookies: makeCookies(),
      pathname: '/callback',
      search: '?error=access_denied&error_description=nope',
    });

    const res = await handler(ctx);

    expect(res.status).toBe(302);
    const location = res.headers.get('Location') ?? '';
    expect(location).toMatch(/^\/login\?/);
    expect(location).toContain('error=access_denied');
    expect(location).toContain('error_description=nope');
  });

  it('lets onError take over with its own Response', async () => {
    const onError = vi.fn<() => Response>(() => new Response('custom', { status: 503 }));
    const handler = createCallbackHandler({ onError });
    const ctx = makeContext({ cookies: makeCookies(), pathname: '/callback' });

    const res = await handler(ctx);

    expect(res.status).toBe(503);
    expect(onError).toHaveBeenCalledWith(ctx, expect.any(Error));
  });

  it('falls back to errorRedirect when onError returns nothing', async () => {
    const handler = createCallbackHandler({ errorRedirect: '/login', onError: () => undefined });
    const ctx = makeContext({ cookies: makeCookies(), pathname: '/callback' });

    const res = await handler(ctx);

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain('error=missing_code');
  });
});

describe('handleSignOut', () => {
  it('redirects home when there is no session', async () => {
    const ctx = makeContext({ cookies: makeCookies(), locals: { auth: { user: null } } }) as APIContext;
    const res = await handleSignOut(ctx);
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/');
  });

  it('honours a relative ?returnTo=', async () => {
    const ctx = makeContext({
      cookies: makeCookies(),
      search: '?returnTo=/goodbye',
      locals: { auth: { user: null } },
    }) as APIContext;
    const res = await handleSignOut(ctx);
    expect(res.headers.get('Location')).toBe('/goodbye');
  });

  it('rejects absolute and protocol-relative returnTo values (open redirect)', async () => {
    for (const evil of ['https://evil.test', '//evil.test', '/\\evil.test']) {
      const ctx = makeContext({
        cookies: makeCookies(),
        search: `?returnTo=${encodeURIComponent(evil)}`,
        locals: { auth: { user: null } },
      }) as APIContext;
      const res = await handleSignOut(ctx);
      expect(res.headers.get('Location')).toBe('/');
    }
  });
});

describe('createSignOutHandler', () => {
  it('uses the configured afterSignOutUrl', async () => {
    const handler = createSignOutHandler({ afterSignOutUrl: '/farewell' });
    const ctx = makeContext({ cookies: makeCookies(), locals: { auth: { user: null } } }) as APIContext;
    const res = await handler(ctx);
    expect(res.headers.get('Location')).toBe('/farewell');
  });
});
