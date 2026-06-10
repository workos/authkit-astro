import type { MiddlewareHandler } from 'astro';
import type { AuthResult } from '@workos/authkit-session';
import { configureAuthKit, getInstance } from './config.js';
import type { AuthKitAuth, AuthkitMiddlewareOptions, ProtectedRoutes } from './types.js';

function toAuthKitAuth(result: AuthResult): AuthKitAuth {
  if (!result.user) return emptyAuth();
  return {
    user: result.user,
    sessionId: result.sessionId,
    accessToken: result.accessToken,
    organizationId: result.organizationId ?? null,
    role: result.role ?? null,
    roles: result.roles ?? [],
    permissions: result.permissions ?? [],
    impersonator: result.impersonator ?? null,
  };
}

function emptyAuth(): AuthKitAuth {
  return {
    user: null,
    sessionId: undefined,
    accessToken: undefined,
    organizationId: null,
    role: null,
    roles: [],
    permissions: [],
    impersonator: null,
  };
}

function isProtected(pathname: string, routes?: ProtectedRoutes): boolean {
  if (!routes) return false;
  if (typeof routes === 'function') return routes(pathname);
  return routes.some((route) =>
    typeof route === 'string'
      ? pathname === route || pathname.startsWith(route.endsWith('/') ? route : `${route}/`)
      : route.test(pathname),
  );
}

/**
 * Astro middleware that validates the WorkOS session on every request,
 * populates `Astro.locals.auth`, refreshes expiring tokens, and (optionally)
 * gates protected routes.
 *
 * @example
 * ```ts
 * // src/middleware.ts
 * import { authkitMiddleware } from '@workos/authkit-astro';
 * export const onRequest = authkitMiddleware({ protectedRoutes: ['/dashboard'] });
 * ```
 */
export function authkitMiddleware(options: AuthkitMiddlewareOptions = {}): MiddlewareHandler {
  const { protectedRoutes, signInPath = '/login', debug = false, onError, config } = options;

  if (config) configureAuthKit(config);

  return async (context, next) => {
    try {
      const instance = getInstance();
      const { auth, refreshedSessionData } = await instance.withAuth(context.cookies);

      context.locals.auth = toAuthKitAuth(auth);

      if (debug) {
        console.log(`[authkit-astro] ${context.url.pathname} → ${auth.user ? auth.user.email : 'anonymous'}`);
      }

      // Persist a refreshed token before continuing. Writing to context.cookies
      // here is enough — Astro flushes it onto the outgoing response.
      if (refreshedSessionData) {
        await instance.saveSession(context.cookies, refreshedSessionData);
      }

      if (!auth.user && isProtected(context.url.pathname, protectedRoutes)) {
        const returnTo = encodeURIComponent(context.url.pathname + context.url.search);
        return context.redirect(`${signInPath}?returnTo=${returnTo}`);
      }

      return next();
    } catch (error) {
      if (debug) console.error('[authkit-astro] middleware error:', error);
      onError?.(error as Error);
      context.locals.auth = emptyAuth();
      return next();
    }
  };
}
