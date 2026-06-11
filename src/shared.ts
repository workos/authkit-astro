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
  entitlements: string[];
  featureFlags: string[];
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
    entitlements: [],
    featureFlags: [],
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
    entitlements: auth.entitlements ?? [],
    featureFlags: auth.featureFlags ?? [],
    impersonator: auth.impersonator ?? null,
  };
}

/**
 * A declarative auth condition — accepted by the `<Show when={...}>` component
 * and serialized into `<authkit-gate data-when>` for the client-side fallback
 * on prerendered pages.
 */
export type AuthCondition =
  | 'signed-in'
  | 'signed-out'
  | { role?: string; permission?: string; entitlement?: string; featureFlag?: string }
  | { not: AuthCondition };

/** The minimal auth shape a condition can be evaluated against — both the
 *  server-side `AuthKitAuth` and the client `ClientAuth` satisfy it. */
export interface AuthConditionSubject {
  user: unknown;
  role?: string | null;
  roles?: string[];
  permissions?: string[];
  entitlements?: string[];
  featureFlags?: string[];
}

/**
 * Evaluate an {@link AuthCondition}. Object conditions AND their checks and
 * are always `false` when signed out; `{ not: ... }` negates.
 */
export function checkAuthCondition(auth: AuthConditionSubject, condition: AuthCondition): boolean {
  if (condition === 'signed-in') return auth.user != null;
  if (condition === 'signed-out') return auth.user == null;
  if ('not' in condition) return !checkAuthCondition(auth, condition.not);
  if (auth.user == null) return false;
  const { role, permission, entitlement, featureFlag } = condition;
  if (role !== undefined && auth.role !== role && !(auth.roles ?? []).includes(role)) return false;
  if (permission !== undefined && !(auth.permissions ?? []).includes(permission)) return false;
  if (entitlement !== undefined && !(auth.entitlements ?? []).includes(entitlement)) return false;
  if (featureFlag !== undefined && !(auth.featureFlags ?? []).includes(featureFlag)) return false;
  return true;
}
