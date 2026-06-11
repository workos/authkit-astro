import type { User } from '@workos/authkit-session';
import type { ReadableAtom } from 'nanostores';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  $auth,
  $isLoaded,
  $organizationId,
  $permissions,
  $role,
  $signedIn,
  $user,
  hydrateAuth,
  setAuthState,
} from '../client.js';
import { emptyClientAuth } from '../shared.js';

const user = { id: 'user_1', email: 'a@b.com' } as unknown as User;

// Read a (possibly computed) store by mounting it briefly — robust against
// nanostores' lazy computed evaluation.
function snapshot<T>(store: ReadableAtom<T>): T {
  let value!: T;
  store.subscribe((v) => {
    value = v;
  })();
  return value;
}

beforeEach(() => {
  $auth.set(emptyClientAuth());
  $isLoaded.set(false);
  vi.unstubAllGlobals();
});

describe('client store', () => {
  it('starts signed-out and not loaded', () => {
    expect(snapshot($user)).toBeNull();
    expect(snapshot($signedIn)).toBe(false);
    expect(snapshot($isLoaded)).toBe(false);
  });

  it('reflects setAuthState across the stores, and marks loaded', () => {
    setAuthState({
      ...emptyClientAuth(),
      user,
      sessionId: 's',
      organizationId: 'org_1',
      role: 'admin',
      permissions: ['p1'],
    });
    expect(snapshot($user)).toBe(user);
    expect(snapshot($signedIn)).toBe(true);
    expect(snapshot($organizationId)).toBe('org_1');
    expect(snapshot($role)).toBe('admin');
    expect(snapshot($permissions)).toEqual(['p1']);
    expect(snapshot($isLoaded)).toBe(true);
  });

  it('hydrateAuth pulls the snapshot from the session endpoint', async () => {
    const state = { ...emptyClientAuth(), user, sessionId: 's' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => state })),
    );

    const result = await hydrateAuth('/_authkit/me');

    expect(result.user).toBe(user);
    expect($auth.get().user).toBe(user);
    expect(snapshot($isLoaded)).toBe(true);
  });

  it('hydrateAuth leaves state untouched (but resolves loading) when the endpoint fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, json: async () => ({}) })),
    );
    await hydrateAuth('/_authkit/me');
    expect(snapshot($user)).toBeNull();
    expect(snapshot($isLoaded)).toBe(true);
  });

  it('hydrateAuth prefers the <AuthState /> snapshot, unless refresh is forced', async () => {
    const injected = { ...emptyClientAuth(), user, sessionId: 'injected' };
    const fetched = { ...emptyClientAuth(), user, sessionId: 'fetched' };
    vi.stubGlobal('window', { __AUTHKIT_STATE__: injected });
    const fetchMock = vi.fn<() => Promise<{ ok: boolean; json: () => Promise<unknown> }>>(async () => ({
      ok: true,
      json: async () => fetched,
    }));
    vi.stubGlobal('fetch', fetchMock);

    expect((await hydrateAuth('/_authkit/me')).sessionId).toBe('injected');
    expect(fetchMock).not.toHaveBeenCalled();

    expect((await hydrateAuth('/_authkit/me', { refresh: true })).sessionId).toBe('fetched');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
