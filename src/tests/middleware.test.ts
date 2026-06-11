import { beforeAll, describe, expect, it, vi } from 'vitest';
import { configureAuthKit } from '../config.js';
import { authkitMiddleware } from '../middleware.js';
import { HTML_HEADERS, makeContext, makeCookies, TEST_CONFIG } from './helpers.js';

const next = () => Promise.resolve(new Response('ok', { status: 200 }));

beforeAll(() => {
  configureAuthKit(TEST_CONFIG);
});

describe('authkitMiddleware', () => {
  it('populates locals.auth as signed-out when there is no session cookie', async () => {
    const ctx = makeContext({ cookies: makeCookies(), pathname: '/' });
    const res = await authkitMiddleware()(ctx, next);

    expect(res.status).toBe(200);
    const auth = ctx.locals.auth;
    expect(auth.user).toBeNull();
    expect(auth.claims).toBeNull();
    expect(auth.has({ role: 'admin' })).toBe(false);
  });

  it('redirects anonymous browser navigations away from a protected route', async () => {
    const ctx = makeContext({
      cookies: makeCookies(),
      pathname: '/dashboard',
      search: '?tab=1',
      headers: HTML_HEADERS,
    });
    const res = await authkitMiddleware({ protectedRoutes: ['/dashboard'] })(ctx, next);

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/login?returnTo=%2Fdashboard%3Ftab%3D1');
  });

  it('401s anonymous non-HTML requests to a protected route', async () => {
    const ctx = makeContext({ cookies: makeCookies(), pathname: '/dashboard' });
    const res = await authkitMiddleware({ protectedRoutes: ['/dashboard'] })(ctx, next);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });

  it('does not gate unprotected routes', async () => {
    const ctx = makeContext({ cookies: makeCookies(), pathname: '/about' });
    const res = await authkitMiddleware({ protectedRoutes: ['/dashboard'] })(ctx, next);
    expect(res.status).toBe(200);
  });

  it('matches path-to-regexp style patterns', async () => {
    const middleware = authkitMiddleware({ protectedRoutes: ['/dashboard(.*)', '/orgs/:slug'] });

    const nested = makeContext({ cookies: makeCookies(), pathname: '/dashboard/settings', headers: HTML_HEADERS });
    expect((await middleware(nested, next)).status).toBe(302);

    const org = makeContext({ cookies: makeCookies(), pathname: '/orgs/acme', headers: HTML_HEADERS });
    expect((await middleware(org, next)).status).toBe(302);

    const deeper = makeContext({ cookies: makeCookies(), pathname: '/orgs/acme/settings', headers: HTML_HEADERS });
    expect((await middleware(deeper, next)).status).toBe(200);
  });

  it('supports a custom signInPath and RegExp / predicate matchers', async () => {
    const regexCtx = makeContext({ cookies: makeCookies(), pathname: '/admin/users', headers: HTML_HEADERS });
    const regexRes = await authkitMiddleware({ protectedRoutes: [/^\/admin/], signInPath: '/sign-in' })(regexCtx, next);
    expect(regexRes.status).toBe(302);
    expect(regexRes.headers.get('Location')).toMatch(/^\/sign-in\?returnTo=/);

    const predCtx = makeContext({ cookies: makeCookies(), pathname: '/secret', headers: HTML_HEADERS });
    const predRes = await authkitMiddleware({ protectedRoutes: (p) => p.startsWith('/secret') })(predCtx, next);
    expect(predRes.status).toBe(302);
  });

  it('exposes a working redirectToSignIn on locals.auth', async () => {
    const ctx = makeContext({ cookies: makeCookies(), pathname: '/pricing', search: '?plan=pro' });
    await authkitMiddleware()(ctx, next);

    const res = ctx.locals.auth.redirectToSignIn();
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/login?returnTo=%2Fpricing%3Fplan%3Dpro');

    const custom = ctx.locals.auth.redirectToSignIn({ returnTo: '/elsewhere' });
    expect(custom.headers.get('Location')).toBe('/login?returnTo=%2Felsewhere');
  });

  it('skips session validation (and gating) on prerendered routes', async () => {
    const ctx = makeContext({
      cookies: makeCookies({ 'wos-session': 'not-a-real-session' }),
      pathname: '/dashboard',
      headers: HTML_HEADERS,
      isPrerendered: true,
    });
    const res = await authkitMiddleware({ protectedRoutes: ['/dashboard'] })(ctx, next);

    expect(res.status).toBe(200);
    expect(ctx.locals.auth.user).toBeNull();
  });

  describe('handler overload', () => {
    it('passes auth and can short-circuit with a Response', async () => {
      const ctx = makeContext({ cookies: makeCookies(), pathname: '/teapot' });
      const res = await authkitMiddleware((auth) => {
        expect(auth.user).toBeNull();
        return new Response('blocked', { status: 418 });
      })(ctx, next);

      expect(res.status).toBe(418);
    });

    it('continues to the route when the handler returns nothing', async () => {
      const ctx = makeContext({ cookies: makeCookies() });
      const res = await authkitMiddleware(() => undefined)(ctx, next);
      expect(await res.text()).toBe('ok');
    });

    it('never invokes next() twice when the handler already called it', async () => {
      const countingNext = vi.fn<typeof next>(next);
      const ctx = makeContext({ cookies: makeCookies() });

      const res = await authkitMiddleware(async (_auth, _context, nextFn) => {
        await nextFn();
      })(ctx, countingNext);

      expect(await res.text()).toBe('ok');
      expect(countingNext).toHaveBeenCalledTimes(1);
    });

    it('runs after the protectedRoutes gate when both are configured', async () => {
      const handler = vi.fn<() => void>();
      const ctx = makeContext({ cookies: makeCookies(), pathname: '/dashboard', headers: HTML_HEADERS });
      const res = await authkitMiddleware(handler, { protectedRoutes: ['/dashboard'] })(ctx, next);

      expect(res.status).toBe(302);
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
