import type { AuthResult } from '@workos/authkit-session';
import { getInstance } from './config.js';
import { checkAuthCondition } from './shared.js';
import type {
  AuthKitAuth,
  RedirectContext,
  RedirectToSignInOptions,
  SessionContext,
  SignedInAuth,
  SignedOutAuth,
} from './types.js';

// The sign-in path last configured through the middleware (or integration), so
// auth objects built outside the middleware — e.g. by switchToOrganization —
// redirect to the right place.
let activeSignInPath = '/login';

export function setActiveSignInPath(path: string): void {
  activeSignInPath = path;
}

function makeRedirectToSignIn(context: RedirectContext, signInPath: string) {
  return (options: RedirectToSignInOptions = {}): Response => {
    const returnTo = options.returnTo ?? context.url.pathname + context.url.search;
    return context.redirect(`${signInPath}?returnTo=${encodeURIComponent(returnTo)}`);
  };
}

/**
 * Build the `Astro.locals.auth` object from an `AuthResult` (or `null` for
 * signed-out), binding the `has()` / `redirectToSignIn()` helpers.
 */
export function buildAuth(
  result: AuthResult | null | undefined,
  context: RedirectContext,
  signInPath: string = activeSignInPath,
): AuthKitAuth {
  const redirectToSignIn = makeRedirectToSignIn(context, signInPath);

  if (!result?.user) {
    const signedOut: SignedOutAuth = {
      user: null,
      claims: null,
      organizationId: null,
      role: null,
      roles: [],
      permissions: [],
      entitlements: [],
      featureFlags: [],
      impersonator: null,
      has: () => false,
      redirectToSignIn,
    };
    return signedOut;
  }

  const signedIn: SignedInAuth = {
    user: result.user,
    sessionId: result.sessionId,
    accessToken: result.accessToken,
    claims: result.claims,
    organizationId: result.organizationId ?? null,
    role: result.role ?? null,
    roles: result.roles ?? [],
    permissions: result.permissions ?? [],
    entitlements: result.entitlements ?? [],
    featureFlags: result.featureFlags ?? [],
    impersonator: result.impersonator ?? null,
    has: (params) => checkAuthCondition(signedIn, params),
    redirectToSignIn,
  };
  return signedIn;
}

/**
 * Switch the session's active organization. Refreshes the access token scoped
 * to `organizationId`, persists the new session cookie, updates
 * `context.locals.auth`, and returns the new auth state.
 *
 * Throws when there is no active session, or when WorkOS rejects the switch
 * (e.g. the user is not a member, or the organization enforces SSO).
 *
 * @example
 * ```ts
 * // src/pages/api/switch-org.ts
 * import { switchToOrganization } from '@workos/authkit-astro';
 * export const POST: APIRoute = async (context) => {
 *   const { organizationId } = await context.request.json();
 *   const auth = await switchToOrganization(context, organizationId);
 *   return Response.json({ organizationId: auth.organizationId });
 * };
 * ```
 */
export async function switchToOrganization(context: SessionContext, organizationId: string): Promise<AuthKitAuth> {
  const instance = getInstance();
  const session = await instance.getSession(context.cookies);
  if (!session) {
    throw new Error('[authkit-astro] switchToOrganization requires an active session.');
  }

  const { auth, encryptedSession } = await instance.switchOrganization(session, organizationId);
  await instance.saveSession(context.cookies, encryptedSession);

  const built = buildAuth(auth, context);
  context.locals.auth = built;
  return built;
}
