import { beforeAll, describe, expect, it } from 'vitest';
import { configureAuthKit } from '../config.js';
import { authkitMiddleware } from '../middleware.js';
import { makeContext, makeCookies, TEST_CONFIG } from './helpers.js';

const next = () => Promise.resolve(new Response('ok', { status: 200 }));

beforeAll(() => {
  configureAuthKit(TEST_CONFIG);
});

describe('authkitMiddleware', () => {
  it('populates locals.auth as signed-out when there is no session cookie', async () => {
    const ctx = makeContext({ cookies: makeCookies(), pathname: '/' });
    const res = await authkitMiddleware()(ctx, next);

    expect(res.status).toBe(200);
    expect((ctx.locals as { auth: { user: unknown } }).auth.user).toBeNull();
  });

  it('redirects anonymous visitors away from a protected route', async () => {
    const ctx = makeContext({ cookies: makeCookies(), pathname: '/dashboard', search: '?tab=1' });
    const res = await authkitMiddleware({ protectedRoutes: ['/dashboard'] })(ctx, next);

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/login?returnTo=%2Fdashboard%3Ftab%3D1');
  });

  it('does not gate unprotected routes', async () => {
    const ctx = makeContext({ cookies: makeCookies(), pathname: '/about' });
    const res = await authkitMiddleware({ protectedRoutes: ['/dashboard'] })(ctx, next);
    expect(res.status).toBe(200);
  });

  it('supports a custom signInPath and RegExp / predicate matchers', async () => {
    const regexCtx = makeContext({ cookies: makeCookies(), pathname: '/admin/users' });
    const regexRes = await authkitMiddleware({ protectedRoutes: [/^\/admin/], signInPath: '/sign-in' })(regexCtx, next);
    expect(regexRes.status).toBe(302);
    expect(regexRes.headers.get('Location')).toMatch(/^\/sign-in\?returnTo=/);

    const predCtx = makeContext({ cookies: makeCookies(), pathname: '/secret' });
    const predRes = await authkitMiddleware({ protectedRoutes: (p) => p.startsWith('/secret') })(predCtx, next);
    expect(predRes.status).toBe(302);
  });
});
