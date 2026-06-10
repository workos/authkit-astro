import type { User } from '@workos/authkit-session';
import { describe, expect, it } from 'vitest';
import { emptyClientAuth, toClientAuth } from '../shared.js';
import type { AuthKitAuth } from '../types.js';

const user = { id: 'user_1', email: 'a@b.com', firstName: 'A', lastName: 'B' } as unknown as User;

describe('toClientAuth (the client-safe projection)', () => {
  it('returns an empty snapshot when there is no user', () => {
    expect(toClientAuth({ user: null })).toEqual(emptyClientAuth());
    expect(toClientAuth(undefined)).toEqual(emptyClientAuth());
  });

  it('NEVER includes the access token', () => {
    const auth: AuthKitAuth = {
      user,
      sessionId: 'session_1',
      accessToken: 'SECRET.JWT.TOKEN',
      organizationId: 'org_1',
      role: 'admin',
      roles: ['admin'],
      permissions: ['widgets:read'],
    };

    const client = toClientAuth(auth);

    expect(JSON.stringify(client)).not.toContain('SECRET.JWT.TOKEN');
    expect('accessToken' in client).toBe(false);
  });

  it('carries the public session fields through', () => {
    const client = toClientAuth({
      user,
      sessionId: 'session_1',
      accessToken: 'x',
      organizationId: 'org_1',
      role: 'admin',
      roles: ['admin', 'member'],
      permissions: ['p1'],
    });

    expect(client.user).toBe(user);
    expect(client.sessionId).toBe('session_1');
    expect(client.organizationId).toBe('org_1');
    expect(client.role).toBe('admin');
    expect(client.roles).toEqual(['admin', 'member']);
    expect(client.permissions).toEqual(['p1']);
  });

  it('normalizes missing optional fields to null / []', () => {
    const client = toClientAuth({ user });
    expect(client.organizationId).toBeNull();
    expect(client.role).toBeNull();
    expect(client.roles).toEqual([]);
    expect(client.permissions).toEqual([]);
    expect(client.impersonator).toBeNull();
  });
});
