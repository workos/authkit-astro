/**
 * Client-island auth store.
 *
 * Framework-agnostic nanostores you can read from any Astro island (React, Vue,
 * Svelte, Preact, Solid, or vanilla) via the official `@nanostores/*` bindings.
 *
 * @example React island
 * ```tsx
 * import { useStore } from '@nanostores/react';
 * import { $user } from '@workos/authkit-astro/client';
 *
 * export function Greeting() {
 *   const user = useStore($user);
 *   return <span>{user ? `Hi ${user.firstName}` : 'Signed out'}</span>;
 * }
 * ```
 */
import { atom, computed } from 'nanostores';
import { emptyClientAuth } from './shared.js';
import type { ClientAuth } from './shared.js';

declare global {
  interface Window {
    /** Synchronous auth snapshot injected by the <AuthState /> component. */
    __AUTHKIT_STATE__?: ClientAuth;
  }
}

function initialState(): ClientAuth {
  if (typeof window !== 'undefined' && window.__AUTHKIT_STATE__) {
    return window.__AUTHKIT_STATE__;
  }
  return emptyClientAuth();
}

/** The full client-safe auth state. */
export const $auth = atom<ClientAuth>(initialState());

/** The signed-in user, or `null`. */
export const $user = computed($auth, (auth) => auth.user);

/** Whether a user is signed in. */
export const $signedIn = computed($auth, (auth) => auth.user !== null);

/** Replace the store's value (e.g. after a client-side navigation). */
export function setAuthState(state: ClientAuth): void {
  $auth.set(state);
}

/**
 * Populate the store from the server. Uses the synchronous snapshot from
 * `<AuthState />` when present; otherwise fetches the session endpoint
 * (default `/_authkit/me`, injected by the integration).
 */
export async function hydrateAuth(endpoint = '/_authkit/me'): Promise<ClientAuth> {
  if (typeof window !== 'undefined' && window.__AUTHKIT_STATE__) {
    $auth.set(window.__AUTHKIT_STATE__);
    return $auth.get();
  }

  try {
    const response = await fetch(endpoint, {
      headers: { accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (!response.ok) return $auth.get();
    const state = (await response.json()) as ClientAuth;
    $auth.set(state);
    return state;
  } catch {
    return $auth.get();
  }
}

export type { ClientAuth, ClientUser } from './shared.js';
