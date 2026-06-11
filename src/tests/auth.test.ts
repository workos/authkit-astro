import type { AuthResult, User } from '@workos/authkit-session';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildAuth, switchToOrganization } from '../auth.js';
import { configureAuthKit } from '../config.js';
import { makeContext, makeCookies, TEST_CONFIG } from './helpers.js';

const user = { id: 'user_1', email: 'a@b.com' } as unknown as User;

function signedInResult(overrides: Partial<Extract<AuthResult, { user: User }>> = {}): AuthResult {
  return {
    user,
    sessionId: 'session_1',
    accessToken: 'jwt',
    refreshToken: 'refresh',
    claims: { sid: 'session_1', custom: 'yes' },
    organizationId: 'org_1',
    role: 'admin',
    roles: ['admin', 'member'],
    permissions: ['widgets:read'],
    entitlements: ['audit-logs'],
    featureFlags: ['beta'],
    ...overrides,
  } as AuthResult;
}

beforeAll(() => {
  configureAuthKit(TEST_CONFIG);
});

describe('buildAuth', () => {
  it('builds a signed-out auth with inert helpers', () => {
    const ctx = makeContext({ cookies: makeCookies(), pathname: '/page' });
    const auth = buildAuth(null, ctx, '/login');

    expect(auth.user).toBeNull();
    expect(auth.claims).toBeNull();
    expect(auth.has({ role: 'admin' })).toBe(false);
    expect(auth.has({})).toBe(false);

    const res = auth.redirectToSignIn();
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/login?returnTo=%2Fpage');
  });

  it('maps the full signed-in result, including claims / entitlements / feature flags', () => {
    const ctx = makeContext({ cookies: makeCookies() });
    const auth = buildAuth(signedInResult(), ctx, '/login');

    expect(auth.user).toBe(user);
    expect(auth.sessionId).toBe('session_1');
    expect(auth.accessToken).toBe('jwt');
    expect(auth.claims).toMatchObject({ custom: 'yes' });
    expect(auth.organizationId).toBe('org_1');
    expect(auth.entitlements).toEqual(['audit-logs']);
    expect(auth.featureFlags).toEqual(['beta']);
  });

  it('narrows the union on `user` (discriminated union)', () => {
    const ctx = makeContext({ cookies: makeCookies() });
    const auth = buildAuth(signedInResult(), ctx, '/login');

    if (!auth.user) throw new Error('expected a signed-in auth');
    // Type-level assertion: these are plain `string` here, no `!` needed.
    const sessionId: string = auth.sessionId;
    const accessToken: string = auth.accessToken;
    expect(sessionId).toBe('session_1');
    expect(accessToken).toBe('jwt');
  });

  describe('has()', () => {
    const ctx = makeContext({ cookies: makeCookies() });
    const auth = buildAuth(signedInResult(), ctx, '/login');

    it('checks roles (primary role or roles list)', () => {
      expect(auth.has({ role: 'admin' })).toBe(true);
      expect(auth.has({ role: 'member' })).toBe(true);
      expect(auth.has({ role: 'owner' })).toBe(false);
    });

    it('checks permissions, entitlements, and feature flags', () => {
      expect(auth.has({ permission: 'widgets:read' })).toBe(true);
      expect(auth.has({ permission: 'widgets:write' })).toBe(false);
      expect(auth.has({ entitlement: 'audit-logs' })).toBe(true);
      expect(auth.has({ featureFlag: 'beta' })).toBe(true);
      expect(auth.has({ featureFlag: 'alpha' })).toBe(false);
    });

    it('ANDs multiple checks', () => {
      expect(auth.has({ role: 'admin', permission: 'widgets:read' })).toBe(true);
      expect(auth.has({ role: 'admin', permission: 'widgets:write' })).toBe(false);
    });

    it('passes the empty check when signed in', () => {
      expect(auth.has({})).toBe(true);
    });
  });

  it('honours a custom returnTo in redirectToSignIn', () => {
    const ctx = makeContext({ cookies: makeCookies(), pathname: '/a' });
    const auth = buildAuth(null, ctx, '/sign-in');
    expect(auth.redirectToSignIn({ returnTo: '/b' }).headers.get('Location')).toBe('/sign-in?returnTo=%2Fb');
  });
});

describe('switchToOrganization', () => {
  it('rejects when there is no active session', async () => {
    const ctx = makeContext({ cookies: makeCookies() });
    await expect(switchToOrganization(ctx, 'org_2')).rejects.toThrow(/active session/);
  });
});
