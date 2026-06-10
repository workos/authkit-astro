import type { APIContext } from 'astro';
import type { Impersonator, User } from '@workos/authkit-session';

/** Astro's cookie store (`Astro.cookies` / `context.cookies`). */
export type AstroCookies = APIContext['cookies'];

/** The minimal context shape the URL helpers need — satisfied by both an
 *  endpoint's `APIContext` and the `Astro` global in `.astro` files. */
export type CookieContext = Pick<APIContext, 'cookies'>;

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
 * Authentication state exposed on `Astro.locals.auth`. `user` is `null` when
 * signed out; when present, `sessionId` / `accessToken` are also populated.
 */
export interface AuthKitAuth {
  user: User | null;
  sessionId?: string;
  accessToken?: string;
  organizationId?: string | null;
  role?: string | null;
  roles?: string[];
  permissions?: string[];
  impersonator?: Impersonator | null;
}

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
 * Which routes require authentication. Either a list of path prefixes / regexes
 * (the `createRouteMatcher` analogue) or a predicate over the pathname.
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
