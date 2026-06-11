/**
 * Optional React bindings — thin hooks over the framework-agnostic client
 * store, with no extra dependency (`@nanostores/react` works too).
 *
 * @example
 * ```tsx
 * import { useAuth } from '@workos/authkit-astro/react';
 *
 * export function UserBadge() {
 *   const { user, isLoaded } = useAuth();
 *   if (!isLoaded) return null;
 *   return <span>{user ? user.email : 'Signed out'}</span>;
 * }
 * ```
 */
import { useSyncExternalStore } from 'react';
import type { ReadableAtom } from 'nanostores';
import { $auth, $isLoaded } from './client.js';
import type { ClientAuth, ClientUser } from './shared.js';

function useNanostore<T>(store: ReadableAtom<T>): T {
  return useSyncExternalStore(
    (onChange) => store.listen(onChange),
    () => store.get(),
    () => store.get(),
  );
}

/** The client auth snapshot plus hydration status. */
export interface UseAuthReturn extends ClientAuth {
  /** False until the store hydrates — gate "signed out" UI on this. */
  isLoaded: boolean;
  signedIn: boolean;
}

/** The full client-safe auth state, re-rendering on changes. */
export function useAuth(): UseAuthReturn {
  const auth = useNanostore($auth);
  const isLoaded = useNanostore($isLoaded);
  return { ...auth, isLoaded, signedIn: auth.user !== null };
}

/** The signed-in user (or `null`) plus hydration status. */
export function useUser(): { user: ClientUser | null; isLoaded: boolean } {
  const { user, isLoaded } = useAuth();
  return { user, isLoaded };
}
