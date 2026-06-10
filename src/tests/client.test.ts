import type { User } from '@workos/authkit-session';
import type { ReadableAtom } from 'nanostores';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { $auth, $signedIn, $user, hydrateAuth, setAuthState } from '../client.js';
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
  setAuthState(emptyClientAuth());
  vi.unstubAllGlobals();
});

describe('client store', () => {
  it('starts signed-out', () => {
    expect(snapshot($user)).toBeNull();
    expect(snapshot($signedIn)).toBe(false);
  });

  it('reflects setAuthState across $user / $signedIn', () => {
    setAuthState({ ...emptyClientAuth(), user, sessionId: 's' });
    expect(snapshot($user)).toBe(user);
    expect(snapshot($signedIn)).toBe(true);
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
  });

  it('hydrateAuth leaves state untouched when the endpoint fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, json: async () => ({}) })),
    );
    await hydrateAuth('/_authkit/me');
    expect(snapshot($user)).toBeNull();
  });
});
