import type { User } from '@workos/authkit-session';
import { describe, expect, it } from 'vitest';
import { checkAuthCondition, emptyClientAuth, toClientAuth } from '../shared.js';
import type { AuthKitAuth } from '../types.js';

const user = { id: 'user_1', email: 'a@b.com', firstName: 'A', lastName: 'B' } as unknown as User;

// Tests exercise the runtime projection; the helper methods on the real
// AuthKitAuth union are irrelevant to it.
const asAuth = (value: Record<string, unknown>) => value as unknown as AuthKitAuth;

describe('toClientAuth (the client-safe projection)', () => {
  it('returns an empty snapshot when there is no user', () => {
    expect(toClientAuth(asAuth({ user: null }))).toEqual(emptyClientAuth());
    expect(toClientAuth(undefined)).toEqual(emptyClientAuth());
  });

  it('NEVER includes the access token', () => {
    const client = toClientAuth(
      asAuth({
        user,
        sessionId: 'session_1',
        accessToken: 'SECRET.JWT.TOKEN',
        organizationId: 'org_1',
        role: 'admin',
        roles: ['admin'],
        permissions: ['widgets:read'],
      }),
    );

    expect(JSON.stringify(client)).not.toContain('SECRET.JWT.TOKEN');
    expect('accessToken' in client).toBe(false);
  });

  it('carries the public session fields through', () => {
    const client = toClientAuth(
      asAuth({
        user,
        sessionId: 'session_1',
        accessToken: 'x',
        organizationId: 'org_1',
        role: 'admin',
        roles: ['admin', 'member'],
        permissions: ['p1'],
        entitlements: ['audit-logs'],
        featureFlags: ['beta'],
      }),
    );

    expect(client.user).toBe(user);
    expect(client.sessionId).toBe('session_1');
    expect(client.organizationId).toBe('org_1');
    expect(client.role).toBe('admin');
    expect(client.roles).toEqual(['admin', 'member']);
    expect(client.permissions).toEqual(['p1']);
    expect(client.entitlements).toEqual(['audit-logs']);
    expect(client.featureFlags).toEqual(['beta']);
  });

  it('normalizes missing optional fields to null / []', () => {
    const client = toClientAuth(asAuth({ user }));
    expect(client.organizationId).toBeNull();
    expect(client.role).toBeNull();
    expect(client.roles).toEqual([]);
    expect(client.permissions).toEqual([]);
    expect(client.entitlements).toEqual([]);
    expect(client.featureFlags).toEqual([]);
    expect(client.impersonator).toBeNull();
  });
});

describe('checkAuthCondition', () => {
  const signedOut = emptyClientAuth();
  const signedIn = {
    ...emptyClientAuth(),
    user,
    role: 'admin',
    roles: ['admin', 'member'],
    permissions: ['widgets:read'],
    entitlements: ['audit-logs'],
    featureFlags: ['beta'],
  };

  it('handles signed-in / signed-out keywords', () => {
    expect(checkAuthCondition(signedIn, 'signed-in')).toBe(true);
    expect(checkAuthCondition(signedIn, 'signed-out')).toBe(false);
    expect(checkAuthCondition(signedOut, 'signed-out')).toBe(true);
  });

  it('object conditions AND their checks and require sign-in', () => {
    expect(checkAuthCondition(signedIn, { role: 'admin' })).toBe(true);
    expect(checkAuthCondition(signedIn, { role: 'member' })).toBe(true);
    expect(checkAuthCondition(signedIn, { role: 'admin', permission: 'widgets:read' })).toBe(true);
    expect(checkAuthCondition(signedIn, { role: 'admin', permission: 'nope' })).toBe(false);
    expect(checkAuthCondition(signedIn, { entitlement: 'audit-logs', featureFlag: 'beta' })).toBe(true);
    expect(checkAuthCondition(signedOut, { role: 'admin' })).toBe(false);
    expect(checkAuthCondition(signedOut, {})).toBe(false);
  });

  it('negates with { not }', () => {
    expect(checkAuthCondition(signedIn, { not: 'signed-out' })).toBe(true);
    expect(checkAuthCondition(signedIn, { not: { role: 'admin' } })).toBe(false);
    expect(checkAuthCondition(signedOut, { not: { role: 'admin' } })).toBe(true);
  });
});
