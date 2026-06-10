import type { Impersonator, User } from '@workos/authkit-session';
import type { AuthKitAuth } from './types.js';

/**
 * The client-safe subset of the session. Crucially this **omits the access
 * token** — never ship `accessToken` to the browser.
 */
export interface ClientAuth {
  user: User | null;
  sessionId: string | null;
  organizationId: string | null;
  role: string | null;
  roles: string[];
  permissions: string[];
  impersonator: Impersonator | null;
}

export type ClientUser = User;

export function emptyClientAuth(): ClientAuth {
  return {
    user: null,
    sessionId: null,
    organizationId: null,
    role: null,
    roles: [],
    permissions: [],
    impersonator: null,
  };
}

/**
 * Project the server-side `AuthKitAuth` down to the client-safe `ClientAuth`.
 * The access token is intentionally dropped here.
 */
export function toClientAuth(auth: AuthKitAuth | undefined): ClientAuth {
  if (!auth?.user) return emptyClientAuth();
  return {
    user: auth.user,
    sessionId: auth.sessionId ?? null,
    organizationId: auth.organizationId ?? null,
    role: auth.role ?? null,
    roles: auth.roles ?? [],
    permissions: auth.permissions ?? [],
    impersonator: auth.impersonator ?? null,
  };
}
