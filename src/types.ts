import type { APIContext, MiddlewareNext } from 'astro';
import type {
  AuthenticationResponse,
  BaseTokenClaims,
  CustomClaims,
  Impersonator,
  User,
} from '@workos/authkit-session';

/** Astro's cookie store (`Astro.cookies` / `context.cookies`). */
export type AstroCookies = APIContext['cookies'];

/** The minimal context shape the URL helpers need — satisfied by both an
 *  endpoint's `APIContext` and the `Astro` global in `.astro` files. */
export type CookieContext = Pick<APIContext, 'cookies'>;

/** The minimal context shape the auth helpers need to build redirects. */
export type RedirectContext = Pick<APIContext, 'url' | 'redirect'>;

/** Context shape for {@link switchToOrganization} — `Astro` or an `APIContext`. */
export type SessionContext = Pick<APIContext, 'cookies' | 'url' | 'redirect' | 'locals'>;

/**
 * Configuration for the AuthKit Astro integration. Mirrors the cookie-related
 * options of `@workos/authkit-session`.
 */
export interface AuthKitConfig {
  /** WorkOS Client ID. */
  clientId: string;
  /** WorkOS API Key. */
  apiKey: string;
  /** OAuth redirect URI (must match the WorkOS dashboard). */
  redirectUri: string;
  /** Cookie encryption password (min 32 chars). */
  cookiePassword: string;
  /** Custom session cookie name (default: `wos-session`). */
  cookieName?: string;
  /** Cookie domain restriction. */
  cookieDomain?: string;
  /** Cookie max age in seconds (default: 400 days). */
  cookieMaxAge?: number;
}

/**
 * Access checks accepted by `auth.has()`. Every provided condition must pass
 * (logical AND); `has()` always returns `false` when signed out.
 */
export interface HasCheckParams {
  /** Matches `auth.role` or membership in `auth.roles`. */
  role?: string;
  permission?: string;
  entitlement?: string;
  featureFlag?: string;
}

/** Options for `auth.redirectToSignIn()`. */
export interface RedirectToSignInOptions {
  /** Where to land after authentication (defaults to the current URL). */
  returnTo?: string;
}

/** JWT claims for the active session (standard + WorkOS + custom claims). */
export type SessionClaims = BaseTokenClaims & CustomClaims;

interface AuthKitAuthBase {
  entitlements: string[];
  featureFlags: string[];
  /** Role / permission / entitlement / feature-flag check. `false` when signed out. */
  has(params: HasCheckParams): boolean;
  /**
   * Build a redirect `Response` to the sign-in page, preserving the current
   * URL as `returnTo`. Return it from a page or endpoint:
   * `if (!auth.user) return auth.redirectToSignIn();`
   */
  redirectToSignIn(options?: RedirectToSignInOptions): Response;
}

/** `Astro.locals.auth` when a user is signed in. */
export interface SignedInAuth extends AuthKitAuthBase {
  user: User;
  sessionId: string;
  accessToken: string;
  /** Verified claims from the access token (including custom claims). */
  claims: SessionClaims;
  organizationId: string | null;
  role: string | null;
  roles: string[];
  permissions: string[];
  impersonator: Impersonator | null;
}

/** `Astro.locals.auth` when no user is signed in. */
export interface SignedOutAuth extends AuthKitAuthBase {
  user: null;
  sessionId?: undefined;
  accessToken?: undefined;
  claims: null;
  organizationId: null;
  role: null;
  roles: string[];
  permissions: string[];
  impersonator: null;
}

/**
 * Authentication state exposed on `Astro.locals.auth`. A discriminated union
 * on `user` — checking `if (auth.user)` narrows `sessionId`, `accessToken`,
 * and `claims` to their signed-in (non-optional) types.
 */
export type AuthKitAuth = SignedInAuth | SignedOutAuth;

/** Sign-in / sign-up URL options. */
export interface SignInOptions {
  /** Path to return to after authentication. */
  returnTo?: string;
  /** Pre-select an organization. */
  organizationId?: string;
  /** Pre-fill the email address. */
  loginHint?: string;
}

/**
 * Which routes require authentication: a list of patterns (plain-string path
 * prefixes, `path-to-regexp`-style strings like `/dashboard(.*)` or
 * `/orgs/:slug`, or RegExps) or a predicate over the pathname.
 */
export type ProtectedRoutes = (string | RegExp)[] | ((pathname: string) => boolean);

/** Options for {@link authkitMiddleware}. */
export interface AuthkitMiddlewareOptions {
  /** Routes that require a signed-in user; anonymous visitors are redirected. */
  protectedRoutes?: ProtectedRoutes;
  /** Where to send unauthenticated visitors of protected routes (default `/login`). */
  signInPath?: string;
  /** Log per-request diagnostics. */
  debug?: boolean;
  /** Called when session validation throws. */
  onError?: (error: Error) => void;
  /** Runtime configuration (overrides environment variables). */
  config?: AuthKitConfig;
}

/**
 * Custom middleware handler for full per-request control:
 * `authkitMiddleware((auth, context, next) => { ... })`.
 *
 * Runs after `locals.auth` is populated (and after the `protectedRoutes`
 * gate, when one is configured). Return a `Response` to short-circuit, or
 * nothing to continue to the route.
 */
export type AuthKitMiddlewareHandler = (
  auth: AuthKitAuth,
  context: APIContext,
  next: MiddlewareNext,
) => Promise<Response | void> | Response | void;

/** Options for {@link createSignOutHandler}. */
export interface SignOutHandlerOptions {
  /** Post-sign-out destination (default `/`). A `?returnTo=` query param overrides it. */
  afterSignOutUrl?: string;
}

/** The success payload passed to a callback handler's `onSuccess`. */
export interface CallbackSuccess {
  /** Where the user is about to be redirected. */
  returnPathname: string;
  /** The full WorkOS authentication response (user, tokens, etc.). */
  authResponse: AuthenticationResponse;
}

/** Options for {@link createCallbackHandler}. */
export interface CallbackHandlerOptions {
  /**
   * On failure, redirect here (with `?error=` and `?error_description=`
   * appended) instead of returning a 400 response.
   */
  errorRedirect?: string;
  /**
   * Called after a successful code exchange, before the redirect. Return a
   * `Response` to take over entirely, a string to redirect elsewhere, or
   * nothing to keep the default redirect.
   */
  onSuccess?: (
    context: APIContext,
    result: CallbackSuccess,
  ) => Promise<Response | string | void> | Response | string | void;
  /**
   * Called when the callback fails. Return a `Response` to take over;
   * otherwise the `errorRedirect` / 400 behaviour applies.
   */
  onError?: (context: APIContext, error: Error) => Promise<Response | void> | Response | void;
}
