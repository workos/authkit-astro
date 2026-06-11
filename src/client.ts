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

/**
 * Whether the store has been hydrated. Until this is `true`, a signed-out
 * `$auth` may just mean "not loaded yet" — use it to avoid flashing
 * "signed out" UI. Synchronous (`<AuthState />`) hydration sets it at startup.
 */
export const $isLoaded = atom<boolean>(typeof window !== 'undefined' && Boolean(window.__AUTHKIT_STATE__));

/** The signed-in user, or `null`. */
export const $user = computed($auth, (auth) => auth.user);

/** Whether a user is signed in. */
export const $signedIn = computed($auth, (auth) => auth.user !== null);

/** The active organization id, or `null`. */
export const $organizationId = computed($auth, (auth) => auth.organizationId);

/** The user's role in the active organization, or `null`. */
export const $role = computed($auth, (auth) => auth.role);

/** The user's permissions in the active organization. */
export const $permissions = computed($auth, (auth) => auth.permissions);

/** Replace the store's value (e.g. after a client-side navigation). */
export function setAuthState(state: ClientAuth): void {
  $auth.set(state);
  $isLoaded.set(true);
}

/** Options for {@link hydrateAuth}. */
export interface HydrateAuthOptions {
  /** Skip the `<AuthState />` snapshot and re-fetch from the session endpoint
   *  (used after client-side navigations, where the snapshot may be stale). */
  refresh?: boolean;
}

/**
 * Populate the store from the server. Uses the synchronous snapshot from
 * `<AuthState />` when present; otherwise fetches the session endpoint
 * (default `/_authkit/me`, injected by the integration).
 */
export async function hydrateAuth(endpoint = '/_authkit/me', options: HydrateAuthOptions = {}): Promise<ClientAuth> {
  if (!options.refresh && typeof window !== 'undefined' && window.__AUTHKIT_STATE__) {
    setAuthState(window.__AUTHKIT_STATE__);
    return $auth.get();
  }

  try {
    const response = await fetch(endpoint, {
      headers: { accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (!response.ok) return $auth.get();
    const state = (await response.json()) as ClientAuth;
    setAuthState(state);
    return state;
  } catch {
    return $auth.get();
  } finally {
    // Even a failed attempt resolves the "loading" state — the store now
    // reflects the best-known answer.
    $isLoaded.set(true);
  }
}

export type { AuthCondition, ClientAuth, ClientUser } from './shared.js';
